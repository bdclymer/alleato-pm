import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import {
  createRagServiceClient,
  isRagDatabaseReadsEnabled,
} from "@/lib/supabase/service";
import { z } from "zod";

const ROUTE_BASE =
  "projects/[projectId]/submittals/[submittalId]/linked-drawings";

/**
 * Checks the RAG AI Database to see which drawing IDs have vectorized content
 * (i.e. at least one document_chunk with metadata.source_id matching the drawing id
 * and metadata.document_type === "drawing").
 *
 * Returns an empty Set when RAG reads are disabled or the query fails — callers
 * should treat every drawing as non-vectorized in that case.
 */
async function checkVectorizedContent(
  drawingIds: string[],
): Promise<Set<string>> {
  if (!isRagDatabaseReadsEnabled()) return new Set();
  try {
    const rag = createRagServiceClient();
    const { data } = await rag
      .from("document_chunks")
      .select("metadata")
      .in("metadata->>source_id", drawingIds)
      .eq("metadata->>document_type", "drawing")
      .limit(drawingIds.length * 2);
    const ids = new Set<string>();
    (data ?? []).forEach((row) => {
      const sourceId = (
        row.metadata as Record<string, string> | null
      )?.source_id;
      if (sourceId) ids.add(sourceId);
    });
    return ids;
  } catch {
    return new Set();
  }
}

/**
 * GET /api/projects/[projectId]/submittals/[submittalId]/linked-drawings
 * Returns all drawings linked to this submittal, enriched with drawing metadata
 * and a flag indicating whether the drawing has been vectorized into the RAG store.
 */
export const GET = withApiGuardrails<{
  projectId: string;
  submittalId: string;
}>(
  `${ROUTE_BASE}#GET`,
  async ({ params }) => {
    const { submittalId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new GuardrailError({
        code: "UNAUTHORIZED",
        where: `${ROUTE_BASE}#GET`,
        message: "Not authenticated",
      });
    }

    const { data, error } = await supabase
      .from("submittal_linked_drawings")
      .select(
        `
        id,
        submittal_id,
        drawing_id,
        drawings!submittal_linked_drawings_drawing_id_fkey (
          drawing_number,
          title,
          discipline,
          revision
        )
      `,
      )
      .eq("submittal_id", submittalId);

    if (error) {
      throw new GuardrailError({
        code: "DB_ERROR",
        where: `${ROUTE_BASE}#GET`,
        message: error.message,
      });
    }

    const drawingIds = (data ?? []).map((r) => r.drawing_id);
    const vectorized =
      drawingIds.length > 0
        ? await checkVectorizedContent(drawingIds)
        : new Set<string>();

    const linkedDrawings = (data ?? []).map((r) => {
      const d = r.drawings as {
        drawing_number: string;
        title: string;
        discipline: string | null;
        revision: string | null;
      } | null;
      return {
        id: r.id,
        submittal_id: r.submittal_id,
        drawing_id: r.drawing_id,
        drawing_number: d?.drawing_number ?? "",
        title: d?.title ?? "",
        discipline: d?.discipline ?? null,
        revision: d?.revision ?? null,
        has_vectorized_content: vectorized.has(r.drawing_id),
      };
    });

    return Response.json({ linkedDrawings });
  },
);

const PostBody = z.object({ drawingId: z.string().uuid() });

/**
 * POST /api/projects/[projectId]/submittals/[submittalId]/linked-drawings
 * Body: { drawingId: string (UUID) }
 * Links a drawing to the submittal. Returns { alreadyLinked: true } if the
 * drawing is already linked (idempotent — not an error).
 */
export const POST = withApiGuardrails<{
  projectId: string;
  submittalId: string;
}>(
  `${ROUTE_BASE}#POST`,
  async ({ request, params }) => {
    const { submittalId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new GuardrailError({
        code: "UNAUTHORIZED",
        where: `${ROUTE_BASE}#POST`,
        message: "Not authenticated",
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new GuardrailError({
        code: "BAD_REQUEST",
        where: `${ROUTE_BASE}#POST`,
        message: "Request body must be valid JSON.",
      });
    }

    let parsed: z.infer<typeof PostBody>;
    try {
      parsed = PostBody.parse(body);
    } catch {
      throw new GuardrailError({
        code: "BAD_REQUEST",
        where: `${ROUTE_BASE}#POST`,
        message: "Body must be { drawingId: string (UUID) }.",
      });
    }

    const { data, error } = await supabase
      .from("submittal_linked_drawings")
      .insert({ submittal_id: submittalId, drawing_id: parsed.drawingId })
      .select(
        `
        id,
        submittal_id,
        drawing_id,
        drawings!submittal_linked_drawings_drawing_id_fkey (
          drawing_number,
          title,
          discipline,
          revision
        )
      `,
      )
      .single();

    if (error) {
      // Postgres unique violation code — drawing is already linked
      if (error.code === "23505") {
        return Response.json({ alreadyLinked: true }, { status: 200 });
      }
      throw new GuardrailError({
        code: "DB_ERROR",
        where: `${ROUTE_BASE}#POST`,
        message: error.message,
      });
    }

    const d = data.drawings as {
      drawing_number: string;
      title: string;
      discipline: string | null;
      revision: string | null;
    } | null;

    return Response.json(
      {
        linkedDrawing: {
          id: data.id,
          submittal_id: data.submittal_id,
          drawing_id: data.drawing_id,
          drawing_number: d?.drawing_number ?? "",
          title: d?.title ?? "",
          discipline: d?.discipline ?? null,
          revision: d?.revision ?? null,
          // RAG check skipped on POST to avoid latency — caller can re-fetch
          has_vectorized_content: false,
        },
      },
      { status: 201 },
    );
  },
);
