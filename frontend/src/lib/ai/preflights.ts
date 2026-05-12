import { createServiceClient } from "@/lib/supabase/service";
import { createToolGuardrails } from "@/lib/ai/tools/guardrails";
import type {
  SourceSpecificRagKind,
  SourceSpecificRagRequest,
} from "@/lib/ai/detect-rag-request";
import type { AssistantSourceHealthContext } from "@/lib/ai/source-health";

export type SourceSpecificRagRow = {
  id: string;
  title: string | null;
  source: string | null;
  category: string | null;
  type: string | null;
  date: string | null;
  created_at: string | null;
  content: string | null;
  project_id: number | null;
};

export type SourceSpecificRagAnswer = {
  content: string;
  trace: Record<string, unknown>;
  rows: SourceSpecificRagRow[];
};

function formatSourceSpecificDate(row: SourceSpecificRagRow): string {
  const value = row.date ?? row.created_at;
  if (!value) return "unknown date";
  return value.slice(0, 10);
}

function sourceSpecificSnippet(row: SourceSpecificRagRow, maxLength = 260): string {
  const content = (row.content ?? "").replace(/\s+/g, " ").trim();
  if (!content) return "No text excerpt stored.";
  return content.length > maxLength ? `${content.slice(0, maxLength).trim()}...` : content;
}

function sourceSpecificTitle(row: SourceSpecificRagRow): string {
  return row.title?.trim() || row.id;
}

function groupTeamsRows(rows: SourceSpecificRagRow[]): Array<{
  key: string;
  title: string;
  date: string;
  rows: SourceSpecificRagRow[];
}> {
  const groups = new Map<string, { key: string; title: string; date: string; rows: SourceSpecificRagRow[] }>();

  for (const row of rows) {
    const title = sourceSpecificTitle(row);
    const date = formatSourceSpecificDate(row);
    const key = `${title}::${date}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(key, { key, title, date, rows: [row] });
    }
  }

  return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date));
}

function formatSourceSpecificRagContent(
  request: SourceSpecificRagRequest,
  rows: SourceSpecificRagRow[],
): string {
  const sourceLine = `Source checked: ${request.label} in Supabase document_metadata/document_chunks-backed RAG index.`;
  if (rows.length === 0) {
    const windowLabel = request.date
      ? ` for ${request.date}`
      : request.startDate && request.endDate
        ? ` from ${request.startDate} through ${request.endDate}`
        : "";
    return [
      `**${request.label}**`,
      "",
      `I did not find matching ${request.label.toLowerCase()}${windowLabel}.`,
      "",
      `**Observability**`,
      `- ${sourceLine}`,
      "- Retrieval returned 0 rows, so I am not inventing a list.",
      "",
      "**Next Step**",
      "- Check the sync/vectorization health for this source before using it for an owner-ready update.",
    ].join("\n");
  }

  if (request.kind === "recent_teams_discussions") {
    const conversationGroups = groupTeamsRows(rows);
    return [
      `**Main Teams Discussions (${request.startDate} to ${request.endDate})**`,
      "",
      ...conversationGroups.slice(0, request.limit).map((group, index) => {
        const examples = group.rows
          .slice(0, 3)
          .map((row) => sourceSpecificSnippet(row, 180))
          .join(" ");
        const sourceIds = group.rows.slice(0, 3).map((row) => row.id).join(", ");
        return `${index + 1}. **${group.title}** - ${group.date}. ${examples} [Sources: ${sourceIds}]`;
      }),
      "",
      `**Observability**`,
      `- ${sourceLine}`,
      `- Retrieved ${rows.length} Teams row(s), grouped into ${conversationGroups.length} conversation/day bucket(s), and answered from concrete Teams snippets/titles.`,
      "",
      "**Next Step**",
      "- Use these grouped conversations as the audit sample and compare them against graph_sync_state errors for any inaccessible chats.",
    ].join("\n");
  }

  const heading =
    request.kind === "meetings_on_date"
      ? `Meetings Conducted on ${request.date}`
      : request.kind === "recent_meetings"
        ? "Recent Meetings"
        : request.kind === "recent_emails"
          ? "Last Five Emails in Supabase"
          : "Most Recent OneDrive Documents";

  const rowFormatter =
    request.kind === "recent_meetings"
      ? (row: SourceSpecificRagRow, index: number) =>
          `${index + 1}. **${sourceSpecificTitle(row)}** — ${formatSourceSpecificDate(row)}\n   ${sourceSpecificSnippet(row, 300)} [Source: ${row.id}]`
      : (row: SourceSpecificRagRow, index: number) =>
          `${index + 1}. **${sourceSpecificTitle(row)}** — ${formatSourceSpecificDate(row)} [Source: ${row.id}]`;

  return [
    `**${heading}**`,
    "",
    ...rows.slice(0, request.limit).map((row, index) => rowFormatter(row, index)),
    "",
    `**Observability**`,
    `- ${sourceLine}`,
    `- Retrieved ${rows.length} row(s) from ${request.label}; answer titles/dates are copied from Supabase rows.`,
    "",
    "**Next Step**",
    "- Use this same source-specific check as a regression gate so generic source questions cannot fall back to tool discovery only.",
  ].join("\n");
}

export function appendSourceHealthSummary(
  content: string,
  sourceHealth: AssistantSourceHealthContext | null,
): string {
  if (!sourceHealth) return content;
  const { metadata } = sourceHealth;
  const alertLines = metadata.alerts.slice(0, 4).map((alert) => {
    return `- ${alert.severity} ${alert.code}: ${alert.message}`;
  });
  return [
    content,
    "",
    "**Current Source Health**",
    `- Overall status: ${metadata.overallStatus}`,
    `- Likely gap if evidence is missing: ${metadata.missingStage ?? "none detected"}`,
    `- Backlog: ${metadata.counts.unembedded} unembedded, ${metadata.counts.uncompiled} uncompiled`,
    ...alertLines,
  ].join("\n");
}

export async function buildSourceSpecificRagAnswer(params: {
  supabase: ReturnType<typeof createServiceClient>;
  request: SourceSpecificRagRequest;
  scope: Awaited<ReturnType<ReturnType<typeof createToolGuardrails>["getScope"]>>;
}): Promise<SourceSpecificRagAnswer> {
  const { supabase, request, scope } = params;
  let rows: SourceSpecificRagRow[] = [];

  const adminOnlyKinds = new Set<SourceSpecificRagKind>([
    "recent_emails",
    "recent_teams_discussions",
  ]);

  if (adminOnlyKinds.has(request.kind) && !scope.isAdmin) {
    const content = [
      `**${request.label}**`,
      "",
      `${request.label} access is admin-only in Alleato. I can still use meetings, project records, and documents you have access to.`,
      "",
      `**Observability**`,
      `- Blocked by permissions (user is not an admin).`,
      "",
      "**Next Step**",
      "- Ask an admin to run this query or share the relevant thread/email context you want analyzed.",
    ].join("\n");

    return {
      content,
      rows: [],
      trace: {
        tool: "sourceSpecificRagRetrieval",
        input: request,
        output: { blocked: true, reason: "admin_only", kind: request.kind },
        timestamp: new Date().toISOString(),
      },
    };
  }

  if (!scope.isAdmin && scope.allowedProjectIds.length === 0) {
    const content = [
      `**${request.label}**`,
      "",
      "I cannot run this source-specific query because you are not assigned to any projects in the current database scope.",
      "",
      `**Observability**`,
      `- Project scope resolved to 0 allowed projects for this user.`,
      "",
      "**Next Step**",
      "- Confirm the user has an active project directory membership before expecting project-scoped retrieval to work.",
    ].join("\n");

    return {
      content,
      rows: [],
      trace: {
        tool: "sourceSpecificRagRetrieval",
        input: request,
        output: { blocked: true, reason: "no_project_scope" },
        timestamp: new Date().toISOString(),
      },
    };
  }

  const applyProjectScope = <T extends { in: (column: string, values: number[]) => T }>(
    query: T,
  ): T => {
    if (typeof scope.pinnedProjectId === "number") {
      return query.in("project_id", [scope.pinnedProjectId]);
    }
    if (scope.isAdmin) return query;
    return query.in("project_id", scope.allowedProjectIds);
  };

  const applyMeetingProjectScope = <T extends {
    in: (column: string, values: number[]) => T;
    or: (filters: string) => T;
  }>(
    query: T,
  ): T => {
    if (typeof scope.pinnedProjectId === "number") {
      return query.in("project_id", [scope.pinnedProjectId]);
    }
    if (scope.isAdmin) return query;
    return query.or(`project_id.in.(${scope.allowedProjectIds.join(",")}),project_id.is.null`);
  };

  if (request.kind === "meetings_on_date") {
    const { data, error } = await applyProjectScope(
      supabase
        .from("document_metadata")
        .select("id,title,source,category,type,date,created_at,content,project_id")
        .or("source.eq.fireflies,source.eq.Zapier,type.eq.meeting,type.eq.meeting_transcript,category.eq.meeting")
        .gte("date", `${request.date}T00:00:00.000Z`)
        .lte("date", `${request.date}T23:59:59.999Z`)
        .order("date", { ascending: false })
        .limit(request.limit),
    );
    if (error) throw new Error(error.message);
    rows = (data ?? []) as SourceSpecificRagRow[];

    if (rows.length === 0) {
      const { data: createdRows, error: createdError } = await applyMeetingProjectScope(
        supabase
          .from("document_metadata")
          .select("id,title,source,category,type,date,created_at,content,project_id")
          .or("source.eq.fireflies,source.eq.Zapier,type.eq.meeting,type.eq.meeting_transcript,category.eq.meeting")
          .gte("created_at", `${request.date}T00:00:00.000Z`)
          .lte("created_at", `${request.date}T23:59:59.999Z`)
          .order("created_at", { ascending: false })
          .limit(request.limit),
      );
      if (createdError) throw new Error(createdError.message);
      rows = (createdRows ?? []) as SourceSpecificRagRow[];
    }
  }

  if (request.kind === "recent_meetings") {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const startIso = request.startDate ? `${request.startDate}T00:00:00.000Z` : cutoff.toISOString();
    const endIso = request.endDate ? `${request.endDate}T23:59:59.999Z` : null;
    let query = applyMeetingProjectScope(
      supabase
        .from("document_metadata")
        .select("id,title,source,category,type,date,created_at,content,project_id")
        .or("source.eq.fireflies,source.eq.Zapier,type.eq.meeting,type.eq.meeting_transcript,category.eq.meeting")
        .gte("date", startIso)
        .order("date", { ascending: false })
        .limit(request.limit),
    );
    if (endIso) query = query.lte("date", endIso);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    rows = (data ?? []) as SourceSpecificRagRow[];

    if (rows.length === 0) {
      let createdQuery = applyMeetingProjectScope(
        supabase
          .from("document_metadata")
          .select("id,title,source,category,type,date,created_at,content,project_id")
          .or("source.eq.fireflies,source.eq.Zapier,type.eq.meeting,type.eq.meeting_transcript,category.eq.meeting")
          .gte("created_at", startIso)
          .order("created_at", { ascending: false })
          .limit(request.limit),
      );
      if (endIso) createdQuery = createdQuery.lte("created_at", endIso);
      const { data: createdRows, error: createdError } = await createdQuery;
      if (createdError) throw new Error(createdError.message);
      rows = (createdRows ?? []) as SourceSpecificRagRow[];
    }
  }

  if (request.kind === "recent_emails") {
    const { data, error } = await applyProjectScope(
      supabase
        .from("document_metadata")
        .select("id,title,source,category,type,date,created_at,content,project_id")
        .eq("source", "microsoft_graph")
        .eq("category", "email")
        .order("date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(request.limit),
    );
    if (error) throw new Error(error.message);
    rows = (data ?? []) as SourceSpecificRagRow[];
  }

  if (request.kind === "recent_onedrive_documents") {
    const { data, error } = await applyProjectScope(
      supabase
        .from("document_metadata")
        .select("id,title,source,category,type,date,created_at,content,project_id")
        .eq("source", "microsoft_graph")
        .eq("category", "document")
        .order("date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(request.limit),
    );
    if (error) throw new Error(error.message);
    rows = (data ?? []) as SourceSpecificRagRow[];
  }

  if (request.kind === "recent_teams_discussions") {
    const { data, error } = await applyProjectScope(
      supabase
        .from("document_metadata")
        .select("id,title,source,category,type,date,created_at,content,project_id")
        .eq("source", "microsoft_graph")
        .eq("category", "teams_message")
        .gte("date", `${request.startDate}T00:00:00.000Z`)
        .lte("date", `${request.endDate}T23:59:59.999Z`)
        .order("date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(request.limit),
    );
    if (error) throw new Error(error.message);
    rows = (data ?? []) as SourceSpecificRagRow[];
  }

  const content = formatSourceSpecificRagContent(request, rows);
  return {
    content,
    rows,
    trace: {
      tool: "sourceSpecificRagRetrieval",
      input: request,
      output: {
        rowCount: rows.length,
        rows: rows.map((row) => ({
          id: row.id,
          documentId: row.id,
          title: row.title,
          date: row.date,
          source: row.source,
          category: row.category,
          type: row.type,
          projectId: row.project_id,
        })),
      },
      timestamp: new Date().toISOString(),
    },
  };
}
