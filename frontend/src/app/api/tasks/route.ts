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
  source_date: z.string().nullable(),
  source_url: z.string().nullable(),
  source_web_url: z.string().nullable(),
  fireflies_link: z.string().nullable(),
  meeting_link: z.string().nullable(),
  source_context: z.string().nullable(),
});

const TASK_SELECT = `
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
    project_id,
    date,
    captured_at,
    created_at,
    content,
    raw_text,
    summary,
    action_items,
    bullet_points,
    notes
  )
`;

export const GET = withApiGuardrails("/api/tasks#GET", async ({ request }) => {
  const projectIdParam = request.nextUrl.searchParams.get("project_id");
  const projectId = projectIdParam ? Number.parseInt(projectIdParam, 10) : null;

  const rawScope = request.nextUrl.searchParams.get("scope") ?? "mine";
  const scope = rawScope === "all" || rawScope === "mine" ? rawScope : "mine";

  if (!["mine", "all"].includes(scope)) {
    throw new GuardrailError({
      code: "VALIDATION_ERROR",
      where: "/api/tasks#GET",
      message: "Invalid task scope.",
      details: { scope },
    });
  }

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

  // Use service client so profile lookup/admin checks are immune to RLS edge cases.
  const serviceClient = createServiceClient();
  const { data: profileData, error: profileError } = await serviceClient
    .from("user_profiles")
    .select("is_admin, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/tasks#GET",
      message: "Failed to verify task access.",
      details: { reason: profileError.message },
      cause: profileError,
    });
  }

  // Admins-only guard for "all" scope.
  if (scope === "all" && profileData?.is_admin !== true) {
    throw new GuardrailError({
      code: "FORBIDDEN",
      where: "/api/tasks#GET",
      message: "Only admins can view all tasks.",
      details: { userId: user.id, scope },
    });
  }

  const supabase = await createClient();

  // Project-scoped: use service client to bypass RLS; deduplicate across three query strategies.
  if (projectId !== null && !Number.isNaN(projectId)) {
    const [byProjectIds, byProjectId, viaDocsMeta] = await Promise.all([
      serviceClient
        .from("tasks")
        .select(TASK_SELECT)
        .contains("project_ids", [projectId])
        .order("created_at", { ascending: false }),
      serviceClient
        .from("tasks")
        .select(TASK_SELECT)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      serviceClient
        .from("tasks")
        .select(TASK_SELECT)
        .eq("document_metadata.project_id", projectId)
        .or("project_ids.is.null,project_ids.eq.{}")
        .order("created_at", { ascending: false }),
    ]);

    if (byProjectIds.error ?? byProjectId.error) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "/api/tasks#GET",
        message: "Failed to load project tasks.",
        details: { projectId, byProjectIdsError: byProjectIds.error?.message, byProjectIdError: byProjectId.error?.message },
      });
    }

    const seenIds = new Set<string>();
    const allRows: JoinedTaskRow[] = [];
    for (const task of [
      ...(byProjectIds.data ?? []),
      ...(byProjectId.data ?? []),
      ...(viaDocsMeta.data ?? []),
    ] as JoinedTaskRow[]) {
      if (task.id && !seenIds.has(task.id)) {
        seenIds.add(task.id);
        allRows.push(task);
      }
    }

    allRows.sort((a, b) => {
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bt - at;
    });

    const tasks = allRows.map(mapTaskRow);
    validateResponseContract(z.array(TaskResponseSchema.passthrough()), tasks, "/api/tasks#GET");
    return NextResponse.json({ data: tasks, scope: "project", projectId });
  }

  const currentUserEmail = user.email?.trim() ?? "";
  const { data: currentPerson, error: currentPersonError } = currentUserEmail
    ? await serviceClient
      .from("people")
      .select("id")
      .ilike("email", currentUserEmail)
      .maybeSingle()
    : { data: null, error: null };

  if (currentPersonError) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/tasks#GET",
      message: "Failed to resolve the current user's task assignee record.",
      details: { reason: currentPersonError.message },
      cause: currentPersonError,
    });
  }

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
    .select(TASK_SELECT)
    .not("metadata_id", "is", null)
    .order("created_at", { ascending: false });

  // Scope: mine → prefer durable people FK, with email/name fallback for legacy rows.
  if (scope === "mine" && currentUserEmail) {
    const fullName = profileData?.full_name?.trim();
    const filters = [`assignee_email.ilike.${currentUserEmail}`];
    if (currentPerson?.id) filters.unshift(`assignee_person_id.eq.${currentPerson.id}`);
    if (fullName) filters.push(`assignee_name.ilike.${fullName}`);
    query = query.or(filters.join(","));
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
