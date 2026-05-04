import type { Database } from "@/types/database.types";

type TaskTableRow = Database["public"]["Tables"]["tasks"]["Row"];
type ProjectMeta = {
  id: number | null;
  name: string | null;
};
type SourceMeta = Pick<
  Database["public"]["Tables"]["document_metadata"]["Row"],
  | "id"
  | "title"
  | "type"
  | "source"
  | "source_system"
  | "url"
  | "source_web_url"
  | "fireflies_link"
  | "meeting_link"
  | "project_id"
>;

export type JoinedTaskRow = TaskTableRow & {
  projects?: ProjectMeta | null;
  document_metadata?: SourceMeta | null;
};

export interface TasksRow {
  id: string | null;
  metadata_id: string | null;
  segment_id: string | null;
  source_chunk_id: string | null;
  description: string | null;
  assignee_name: string | null;
  assignee_email: string | null;
  meeting_title: string | null;
  project_id: number | null;
  project_name: string | null;
  client_id: number | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  source_system: string | null;
  embedding: unknown;
  created_at: string | null;
  updated_at: string | null;
  project_ids: number[] | null;
  file_name: string | null;
  source_title: string | null;
  source_type: string | null;
  source_url: string | null;
  source_web_url: string | null;
  fireflies_link: string | null;
  meeting_link: string | null;
  title: string | null;
  assigned_by: string | null;
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function humanizeToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/[_-]+/g, " ").trim();
  return normalized ? titleCase(normalized) : null;
}

export function mapTaskRow(task: JoinedTaskRow): TasksRow {
  return {
    id: task.id ?? null,
    metadata_id: task.metadata_id ?? null,
    segment_id: task.segment_id ?? null,
    source_chunk_id: task.source_chunk_id ?? null,
    description: task.description ?? null,
    assignee_name: task.assignee_name ?? null,
    assignee_email: task.assignee_email ?? null,
    meeting_title: task.document_metadata?.title ?? null,
    project_id: task.project_id ?? task.document_metadata?.project_id ?? null,
    project_name: task.projects?.name ?? null,
    client_id: task.client_id ?? null,
    due_date: task.due_date ?? null,
    priority: task.priority ?? null,
    status: task.status ?? null,
    source_system: task.source_system ?? task.document_metadata?.source_system ?? null,
    embedding: task.embedding ?? null,
    created_at: task.created_at ?? null,
    updated_at: task.updated_at ?? null,
    project_ids: task.project_ids ?? null,
    file_name: task.file_name ?? null,
    source_title: task.document_metadata?.title ?? null,
    source_type: task.document_metadata?.type ?? null,
    source_url: task.document_metadata?.url ?? task.document_metadata?.source ?? null,
    source_web_url: task.document_metadata?.source_web_url ?? null,
    fireflies_link: task.document_metadata?.fireflies_link ?? null,
    meeting_link: task.document_metadata?.meeting_link ?? null,
    title: task.title ?? null,
    assigned_by: task.assigned_by ?? null,
  };
}

export function getTaskSourceLabel(task: Pick<TasksRow, "source_system" | "source_type" | "source_url">): string {
  const normalized = `${task.source_system ?? ""} ${task.source_type ?? ""} ${task.source_url ?? ""}`.toLowerCase();

  if (normalized.includes("team")) return "Teams";
  if (normalized.includes("outlook") || normalized.includes("email")) return "Email";
  if (normalized.includes("fireflies") || normalized.includes("meeting")) return "Meeting";
  if (normalized.includes("manual")) return "Manual";
  if (
    normalized.includes("sharepoint") ||
    normalized.includes("onedrive") ||
    normalized.includes("document")
  ) {
    return "Document";
  }

  return humanizeToken(task.source_system) ?? humanizeToken(task.source_type) ?? "Unknown";
}

export function getTaskSourceTitle(
  task: Pick<TasksRow, "source_title" | "meeting_title" | "file_name" | "metadata_id">,
): string {
  return (
    task.source_title ??
    task.meeting_title ??
    task.file_name ??
    (task.metadata_id ? `Source ${task.metadata_id}` : "Source record")
  );
}

export function getTaskSourceTarget(
  task: Pick<
    TasksRow,
    | "metadata_id"
    | "source_type"
    | "source_system"
    | "source_url"
    | "source_web_url"
    | "fireflies_link"
    | "meeting_link"
  >,
  projectId?: string | null,
): { href: string; external: boolean } | null {
  const normalized = `${task.source_system ?? ""} ${task.source_type ?? ""}`.toLowerCase();
  const externalHref =
    task.meeting_link ?? task.fireflies_link ?? task.source_web_url ?? task.source_url;

  if (task.metadata_id && (normalized.includes("meeting") || normalized.includes("fireflies"))) {
    return {
      href: projectId ? `/${projectId}/meetings/${task.metadata_id}` : `/meetings/${task.metadata_id}`,
      external: false,
    };
  }

  if (externalHref && /^https?:\/\//i.test(externalHref)) {
    return { href: externalHref, external: true };
  }

  return null;
}
