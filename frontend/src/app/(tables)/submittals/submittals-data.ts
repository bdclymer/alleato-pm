import { createServiceClient } from "@/lib/supabase/service";

export type SubmittalRow = Record<string, unknown>;

const DEFAULT_PROJECT_ID = Number(
  process.env.SUBMITTALS_PROJECT_ID ??
    process.env.NEXT_PUBLIC_SUBMITTALS_PROJECT_ID ??
    25108,
);

export async function fetchSubmittals(projectId?: number): Promise<SubmittalRow[]> {
  const supabase = createServiceClient();

  const targetProjectId = projectId ?? DEFAULT_PROJECT_ID;

  const { data, error } = await (supabase as any)
    .from("active_submittals")
    .select("*")
    .eq("project_id", targetProjectId)
    .order("submission_date", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []) as SubmittalRow[];
}

export function resolveSubmittalsProjectId(projectId?: string | number) {
  if (typeof projectId === "number") {
    return projectId;
  }

  if (projectId) {
    const parsed = Number.parseInt(projectId, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return DEFAULT_PROJECT_ID;
}
