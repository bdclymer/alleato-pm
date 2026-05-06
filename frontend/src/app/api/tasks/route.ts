import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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

export const GET = withApiGuardrails("/api/tasks#GET", async ({ request }) => {
  const scope = request.nextUrl.searchParams.get("scope") ?? "mine"; // "mine" | "all"

  // Resolve user from JWT cookie directly — no Auth network call, no rate-limit exposure.
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "UNAUTHORIZED",
      where: "/api/tasks#GET",
      message: "Not authenticated.",
      details: { reason: "No valid session cookie" },
    });
  }

  // Admins-only guard for the "all" scope.
  // Use service client so the admin check is immune to RLS edge cases.
  if (scope === "all") {
    const serviceClient = createServiceClient();
    const { data: profileData, error: profileError } = await serviceClient
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "/api/tasks#GET",
        message: "Failed to verify admin status.",
        details: { reason: profileError.message },
        cause: profileError,
      });
    }

    if (profileData?.is_admin !== true) {
      throw new GuardrailError({
        code: "FORBIDDEN",
        where: "/api/tasks#GET",
        message: "Only admins can view all tasks.",
        details: { userId: user.id },
      });
    }
  }

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

  // Scope: mine → filter to this user's assigned tasks (case-insensitive email match).
  if (scope === "mine" && user.email) {
    query = query.ilike("assignee_email", user.email);
  }

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

  return NextResponse.json({ data: tasks, scope });
});
