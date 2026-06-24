import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";

const ROUTE_BASE =
  "projects/[projectId]/submittals/[submittalId]/linked-drawings";

/**
 * Checks which drawing IDs have extractable text content ready for AI review.
 *
 * Checks PM APP document_metadata (via drawing_revisions) for rows with
 * status IN ('raw_ingested', 'ocr_partial') — text is available immediately
 * after OCR runs on upload, before the 30-min embedding cron fires.
 */
async function checkVectorizedContent(
  drawingIds: string[],
): Promise<Set<string>> {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("drawing_revisions")
      .select("drawing_id, document_metadata_id")
      .in("drawing_id", drawingIds)
      .not("document_metadata_id", "is", null);

    const metaIds = (data ?? [])
      .map((r) => r.document_metadata_id as string)
      .filter(Boolean);

    if (metaIds.length === 0) return new Set();

    const { data: dmRows } = await service
      .from("document_metadata")
      .select("id")
      .in("id", metaIds)
      .in("status", ["raw_ingested", "ocr_partial"]);

    const readyMetaIds = new Set((dmRows ?? []).map((r) => r.id as string));

    const ids = new Set<string>();
    (data ?? []).forEach((r) => {
      if (readyMetaIds.has(r.document_metadata_id as string)) {
        ids.add(r.drawing_id as string);
      }
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
          discipline
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
      } | null;
      return {
        id: r.id,
        submittal_id: r.submittal_id,
        drawing_id: r.drawing_id,
        drawing_number: d?.drawing_number ?? "",
        title: d?.title ?? "",
        discipline: d?.discipline ?? null,
        // `drawings` has no `revision` column — revisions live in drawing_revisions.
        revision: null as string | null,
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
          discipline
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
          // RAG check skipped on POST to avoid latency — caller can re-fetch
          has_vectorized_content: false,
        },
      },
      { status: 201 },
    );
  },
);
