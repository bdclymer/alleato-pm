import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { mapTaskRow, type JoinedTaskRow } from "@/features/tasks/task-utils";
import { GuardrailError } from "@/lib/guardrails/errors";
import { validateResponseContract, withApiGuardrails } from "@/lib/guardrails/api";

const TaskResponseSchema = z.object({
  project_name: z.string().nullable(),
  meeting_title: z.string().nullable(),
  source_title: z.string().nullable(),
  source_type: z.string().nullable(),
  source_url: z.string().nullable(),
  source_web_url: z.string().nullable(),
  fireflies_link: z.string().nullable(),
  meeting_link: z.string().nullable(),
});

export const GET = withApiGuardrails("/api/tasks#GET", async () => {
  const supabase = await createClient();

  // Exclude interview/test transcripts so the tasks table stays focused on real source records.
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
      document_metadata:tasks_metadata_id_fkey (
        id,
        title,
        type,
        source,
        source_system,
        url,
        source_web_url,
        fireflies_link,
        meeting_link,
        project_id
      )
    `)
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

  const tasks = ((data ?? []) as JoinedTaskRow[]).map(mapTaskRow);

  validateResponseContract(
    z.array(TaskResponseSchema.passthrough()),
    tasks,
    "/api/tasks#GET",
  );

  return NextResponse.json({ data: tasks });
});
