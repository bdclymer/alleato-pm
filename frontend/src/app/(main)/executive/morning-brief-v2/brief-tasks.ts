import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

import type { BriefTask } from "./brief-content";

// Loads the REAL action items for the brief — the tasks the daily deep read
// wrote to public.tasks (source_system = 'daily_deep_read'), the same records
// the /tasks page and the live brief serve. Only the most recent run's open
// tasks are surfaced. Fails soft: any error yields an empty list so the page
// falls back to its static snapshot rather than rendering blank.

function formatDue(due: string | null): string | null {
  if (!due) return null;
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

export async function loadRealBriefTasks(): Promise<BriefTask[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, assignee_name, project_id, status, priority, due_date, extraction_metadata")
      .eq("source_system", "daily_deep_read")
      .neq("status", "completed");
    if (error || !data?.length) return [];

    const rows = data as Array<Record<string, unknown>>;
    const businessDateOf = (row: Record<string, unknown>) =>
      String((row.extraction_metadata as { business_date?: string } | null)?.business_date ?? "");
    // Only the most recent deep-read run drives the brief's action list.
    const latest = rows.map(businessDateOf).filter(Boolean).sort().pop() ?? "";
    const current = latest
      ? rows.filter((row) => businessDateOf(row) === latest)
      : rows;

    const projectIds = Array.from(
      new Set(current.map((row) => row.project_id).filter((id): id is number => id != null)),
    );
    const projectNames = new Map<number, string>();
    if (projectIds.length) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds);
      for (const project of projects ?? []) {
        projectNames.set(Number(project.id), String(project.name ?? ""));
      }
    }

    return current
      .map((row) => {
        const meta = (row.extraction_metadata ?? {}) as { category?: string };
        const projectId = row.project_id != null ? Number(row.project_id) : null;
        return {
          id: String(row.id),
          group: meta.category === "brandon" ? "you" : "team",
          project:
            projectId != null ? projectNames.get(projectId) ?? `Project ${projectId}` : "General",
          owner: (row.assignee_name as string | null) ?? null,
          action: String(row.title ?? ""),
          due: formatDue(row.due_date as string | null),
        } satisfies BriefTask;
      })
      .filter((task) => task.action.trim().length > 0);
  } catch {
    return [];
  }
}
