import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { GuardrailError } from "@/lib/guardrails/errors";
import { validateResponseContract, withApiGuardrails } from "@/lib/guardrails/api";

const TaskResponseSchema = z.object({
  project_name: z.string().nullable(),
  meeting_title: z.string().nullable(),
});

export const GET = withApiGuardrails("/api/tasks#GET", async () => {
  const supabase = await createClient();

  // Tasks table contains mixed sources (tests/manual/system backfills).
  // This endpoint intentionally serves Fireflies-derived project tasks only.
  const { data: interviewMeetings, error: interviewError } = await supabase
    .from("document_metadata")
    .select("id")
    .or("type.eq.interview,title.ilike.%test%");

  if (interviewError) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/tasks#GET",
      message: "Failed to load interview metadata.",
      details: { reason: interviewError.message },
      cause: interviewError,
    });
  }

  let query = supabase
    .from("tasks")
    .select(`
      *,
      projects (id, name),
      document_metadata:tasks_metadata_id_fkey (title)
    `)
    .eq("source_system", "fireflies")
    .not("metadata_id", "is", null)
    .order("created_at", { ascending: false });

  const interviewIds = (interviewMeetings ?? []).map((m) => m.id).filter(Boolean);
  if (interviewIds.length > 0) {
    query = query.not("metadata_id", "in", `(${interviewIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/tasks#GET",
      message: "Failed to load tasks.",
      details: { reason: error.message },
      cause: error,
    });
  }

  const tasks = (data ?? []).map((task) => {
    const { projects, document_metadata, ...rest } = task as Record<string, unknown>;
    const projectMetadata = projects as Record<string, unknown> | undefined;
    const meetingMetadata = document_metadata as Record<string, unknown> | undefined;
    return {
      ...rest,
      project_name: projectMetadata?.name ?? null,
      meeting_title: (meetingMetadata?.title as string | null) ?? null,
    };
  });

  validateResponseContract(
    z.array(TaskResponseSchema.passthrough()),
    tasks,
    "/api/tasks#GET",
  );

  return NextResponse.json({ data: tasks });
});
