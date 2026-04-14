/**
 * Project intelligence helpers backed by the live meeting_segments and tasks schema.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface DocumentMetadataSummary {
  id: string;
  title: string | null;
  fireflies_id: string | null;
  project_id: number | null;
}

interface MeetingSegmentRow {
  id: string;
  metadata_id: string;
  project_ids: number[] | null;
  risks: unknown;
  created_at: string;
}

export interface Risk {
  id: string;
  description: string;
  category: string | null;
  likelihood: string | null;
  impact: string | null;
  status: string;
  metadata_id: string;
  segment_id: string | null;
  project_ids: number[];
  mitigation_plan: string | null;
  created_at: string;
  document_metadata?: {
    id: string;
    title: string;
    fireflies_id: string;
  } | null;
}

export interface Opportunity {
  id: string;
  description: string;
  type: string | null;
  status: string;
  metadata_id: string;
  segment_id: string | null;
  project_ids: number[];
  owner_name: string | null;
  created_at: string;
  document_metadata?: {
    id: string;
    title: string;
    fireflies_id: string;
  } | null;
}

export interface Task {
  id: string;
  description: string;
  assignee_name: string | null;
  assignee_email: string | null;
  due_date: string | null;
  priority: string | null;
  status: string;
  metadata_id: string;
  segment_id: string | null;
  project_ids: number[];
  created_at: string;
  document_metadata?: {
    id: string;
    title: string;
    fireflies_id: string;
  } | null;
}

export interface ProjectIntelligence {
  risks: Risk[];
  opportunities: Opportunity[];
  tasks: Task[];
  errors: {
    risks: Error | null;
    opportunities: Error | null;
    tasks: Error | null;
  };
}

/** Normalizes unknown JSON into an array for meeting-derived intelligence extraction. */
function toJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
}

/** Extracts a readable string field from a JSON object. */
function readString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

/** Loads meeting metadata needed to enrich task and risk responses. */
async function loadDocumentMetadata(
  metadataIds: string[],
): Promise<Map<string, DocumentMetadataSummary>> {
  if (metadataIds.length === 0) return new Map();

  const { data } = await supabase
    .from("document_metadata")
    .select("id, title, fireflies_id, project_id")
    .in("id", metadataIds);

  return new Map(
    (data || []).map((row) => [row.id, row as DocumentMetadataSummary]),
  );
}

/** Reads meeting-derived risk signals from the live meeting_segments table. */
async function listRiskSignals(projectId?: number): Promise<Risk[]> {
  let query = supabase
    .from("meeting_segments")
    .select("id, metadata_id, project_ids, risks, created_at");

  if (projectId != null) {
    query = query.contains("project_ids", [projectId]);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data || []) as MeetingSegmentRow[];
  const metadataMap = await loadDocumentMetadata(
    Array.from(new Set(rows.map((row) => row.metadata_id))),
  );

  return rows.flatMap((row) =>
    toJsonArray(row.risks).map((entry, index) => {
      const record =
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>)
          : { description: String(entry) };
      const meeting = metadataMap.get(row.metadata_id);
      const projectIds =
        row.project_ids && row.project_ids.length > 0
          ? row.project_ids
          : meeting?.project_id != null
            ? [meeting.project_id]
            : [];

      return {
        id: `${row.id}:risk:${index}`,
        description:
          readString(record, ["description", "risk", "title", "summary"]) ??
          "Unnamed risk",
        category: readString(record, ["category", "type"]),
        likelihood: readString(record, ["likelihood", "probability"]),
        impact: readString(record, ["impact", "severity"]),
        status: readString(record, ["status"]) ?? "open",
        metadata_id: row.metadata_id,
        segment_id: row.id,
        project_ids: projectIds,
        mitigation_plan: readString(record, [
          "mitigation_plan",
          "mitigation",
          "next_step",
        ]),
        created_at: row.created_at,
        document_metadata: meeting
          ? {
              id: meeting.id,
              title: meeting.title ?? "Untitled meeting",
              fireflies_id: meeting.fireflies_id ?? "",
            }
          : null,
      };
    }),
  );
}

/** There is no live opportunity relation today, so return an explicit empty set. */
async function listOpportunitySignals(projectId?: number): Promise<Opportunity[]> {
  void projectId;
  return [];
}

/** Reads project tasks and enriches them with meeting metadata from the live schema. */
async function listProjectTasks(projectId: number): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, description, assignee_name, assignee_email, due_date, priority, status, metadata_id, segment_id, project_ids, created_at",
    )
    .contains("project_ids", [projectId])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const tasks = data || [];
  const metadataMap = await loadDocumentMetadata(
    Array.from(
      new Set(
        tasks
          .map((task) => task.metadata_id)
          .filter((metadataId): metadataId is string => Boolean(metadataId)),
      ),
    ),
  );

  return tasks.map((task) => {
    const meeting = task.metadata_id ? metadataMap.get(task.metadata_id) : undefined;
    return {
      ...task,
      document_metadata: meeting
        ? {
            id: meeting.id,
            title: meeting.title ?? "Untitled meeting",
            fireflies_id: meeting.fireflies_id ?? "",
          }
        : null,
    };
  }) as Task[];
}

export async function listAllRisks(): Promise<Risk[]> {
  return listRiskSignals();
}

export async function listProjectRisks(projectId: number): Promise<Risk[]> {
  return listRiskSignals(projectId);
}

/**
 * Fetch all intelligence for a specific project using the live schema only.
 */
export async function getProjectIntelligence(
  projectId: number,
): Promise<ProjectIntelligence> {
  const [risksResult, opportunitiesResult, tasksResult] = await Promise.allSettled([
    listProjectRisks(projectId),
    listOpportunitySignals(projectId),
    listProjectTasks(projectId),
  ]);

  return {
    risks: risksResult.status === "fulfilled" ? risksResult.value : [],
    opportunities:
      opportunitiesResult.status === "fulfilled" ? opportunitiesResult.value : [],
    tasks: tasksResult.status === "fulfilled" ? tasksResult.value : [],
    errors: {
      risks: risksResult.status === "rejected" ? risksResult.reason as Error : null,
      opportunities:
        opportunitiesResult.status === "rejected"
          ? opportunitiesResult.reason as Error
          : null,
      tasks: tasksResult.status === "rejected" ? tasksResult.reason as Error : null,
    },
  };
}

/**
 * Get summary counts of intelligence items for a project.
 */
export async function getProjectIntelligenceCounts(projectId: number) {
  const intelligence = await getProjectIntelligence(projectId);

  return {
    risks: intelligence.risks.length,
    opportunities: intelligence.opportunities.length,
    tasks: intelligence.tasks.length,
    total:
      intelligence.risks.length +
      intelligence.opportunities.length +
      intelligence.tasks.length,
  };
}

/**
 * Get only open or active project intelligence items.
 */
export async function getActiveProjectIntelligence(projectId: number) {
  const intelligence = await getProjectIntelligence(projectId);

  return {
    risks: intelligence.risks.filter((risk) => risk.status === "open"),
    opportunities: intelligence.opportunities.filter((opportunity) =>
      ["open", "in_review"].includes(opportunity.status),
    ),
    tasks: intelligence.tasks.filter((task) =>
      ["open", "in_progress"].includes(task.status),
    ),
  };
}
