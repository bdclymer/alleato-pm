import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

const createRfqSchema = z.object({
  changeEventId: z.string().min(1, "Change event is required"),
  title: z.string().min(3, "Title must be at least 3 characters").max(255).optional(),
  dueDate: z.string().optional(),
  includeAttachments: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

const DATE_FORMAT_LENGTH = 10;

async function buildRfqPayload(projectId: number) {
  const supabase = await createClient();
  const { data: rfqs, error } = await supabase
    .from("change_event_rfqs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  if (!rfqs?.length) {
    return [];
  }

  const changeEventIds = Array.from(new Set(rfqs.map((rfq) => rfq.change_event_id)));
  const rfqIds = rfqs.map((rfq) => rfq.id);

  const [{ data: changeEvents }, { data: responses }] = await Promise.all([
    supabase
      .from("change_events")
      .select("id, number, title")
      .in("id", changeEventIds),
    supabase
      .from("change_event_rfq_responses")
      .select("id, rfq_id")
      .in("rfq_id", rfqIds),
  ]);

  const changeEventMap = new Map(
    (changeEvents ?? []).map((event) => [event.id, event]),
  );

  const responseCountMap = (responses ?? []).reduce<Record<string, number>>(
    (acc, item) => {
      if (!item.rfq_id) return acc;
      acc[item.rfq_id] = (acc[item.rfq_id] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return rfqs.map((rfq) => ({
    ...rfq,
    change_event_number: changeEventMap.get(rfq.change_event_id)?.number ?? null,
    change_event_title: changeEventMap.get(rfq.change_event_id)?.title ?? null,
    response_count: responseCountMap[rfq.id] ?? 0,
  }));
}

async function generateNextRfqNumber(
  projectId: number,
  changeEventId: string,
  changeEventNumber?: string | null,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("change_event_rfqs")
    .select("rfq_number")
    .eq("project_id", projectId)
    .eq("change_event_id", changeEventId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextSequence = 1;
  if (data?.rfq_number) {
    const match = data.rfq_number.match(/-(\d+)$/);
    if (match) {
      nextSequence = parseInt(match[1], 10) + 1;
    }
  }

  const numericBase = changeEventNumber?.replace(/\D/g, "") || "";
  const paddedBase = (numericBase || String(projectId)).slice(-3).padStart(3, "0");
  const paddedSequence = String(nextSequence).padStart(3, "0");
  return `RFQ-${paddedBase}-${paddedSequence}`;
}

export const GET = withApiGuardrails(
  "projects/[projectId]/change-events/rfqs#GET",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const numericProjectId = parseInt(projectId, 10);
    if (!Number.isFinite(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid project id" },
        { status: 400 },
      );
    }

    const payload = await buildRfqPayload(numericProjectId);
    return NextResponse.json({ data: payload });
    },
);

export const POST = withApiGuardrails(
  "projects/[projectId]/change-events/rfqs#POST",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const numericProjectId = parseInt(projectId, 10);
    if (!Number.isFinite(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid project id" },
        { status: 400 },
      );
    }

    const guard = await requirePermission(numericProjectId, "change_orders", "write");
    if (guard.denied) return guard.response;

    const body = await request.json();
    const parsed = createRfqSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/change-events/rfqs#POST", message: "Authentication required." });
    }

    const { data: changeEvent, error: changeEventError } = await supabase
      .from("change_events")
      .select("id, project_id, number, title")
      .eq("project_id", numericProjectId)
      .eq("id", parsed.data.changeEventId)
      .single();

    if (changeEventError || !changeEvent) {
      return NextResponse.json(
        { error: "Change event not found" },
        { status: 404 },
      );
    }

    const rfqNumber = await generateNextRfqNumber(
      numericProjectId,
      parsed.data.changeEventId,
      changeEvent.number,
    );

    const dueDate = parsed.data.dueDate
      ? parsed.data.dueDate.slice(0, DATE_FORMAT_LENGTH)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, DATE_FORMAT_LENGTH);

    const { data: inserted, error: insertError } = await supabase
      .from("change_event_rfqs")
      .insert({
        project_id: numericProjectId,
        change_event_id: changeEvent.id,
        rfq_number: rfqNumber,
        title: parsed.data.title?.trim() || `RFQ for ${changeEvent.title}`,
        include_attachments: parsed.data.includeAttachments ?? true,
        due_date: dueDate,
        notes: parsed.data.notes ?? null,
        status: "Draft",
        created_by: user.id,
        updated_by: user.id,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: "Failed to create RFQ", details: insertError?.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      data: {
        ...inserted,
        change_event_number: changeEvent.number,
        change_event_title: changeEvent.title,
        response_count: 0,
      },
    });
    },
);

