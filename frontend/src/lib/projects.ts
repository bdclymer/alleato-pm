import { apiFetch } from "@/lib/api-client";
import type { ProjectSummary, TaskItem, InsightItem } from "@/lib/types";

export async function fetchProjects(): Promise<ProjectSummary[]> {
  const payload = await apiFetch<{ projects?: ProjectSummary[] }>("/api/projects");
  return payload.projects ?? [];
}

export interface ProjectDetailResponse {
  project: ProjectSummary & Record<string, unknown>;
  tasks: TaskItem[];
  insights: InsightItem[];
}

export async function fetchProjectDetail(
  id: string | number,
): Promise<ProjectDetailResponse> {
  return apiFetch<ProjectDetailResponse>(`/api/projects/${id}`);
}
