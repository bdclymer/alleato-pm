export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createRagServiceClient, createServiceClient } from "@/lib/supabase/service";

/**
 * Per-project source-ingestion feed for the Project Intelligence dashboard.
 *
 * Default mode = "recent": the most recent items PER CATEGORY (meetings,
 * SharePoint/OneDrive documents, emails, Teams messages) for the project,
 * regardless of day. This is what users actually want — to SEE the project's
 * content. (A single-day filter showed 0 on most days because ingestion is
 * sporadic, and a fixed time window still zeroes out categories whose newest
 * item is older than the window, e.g. documents synced months ago.)
 *
 * Optional `?date=YYYY-MM-DD` switches to "day" mode — only items ingested that
 * calendar day (UTC, by created_at) — for drill-down.
 *
 * `document_metadata` (PM APP) holds all four categories with project_id + a
 * date, so this is one table, four small reads. Also returns active pipeline
 * alerts (`system_alerts`, RAG DB) so a source going dark is loud on the page.
 */

const PER_CATEGORY_LIMIT = 25;
const SELECT_COLS =
  "id, title, file_name, type, source_system, date, created_at, source_web_url, url, fireflies_link, meeting_link";

export type IngestionItem = {
  id: string;
  title: string;
  fileName: string | null;
  date: string | null; // the item's own date (meeting/received date), falls back to ingestedAt
  ingestedAt: string | null; // created_at — when the pipeline brought it in
  link: string | null;
  sourceSystem: string | null;
};

export type IngestionFeedError = {
  severity: "info" | "warning" | "critical";
  source: string;
  title: string;
  message: string;
  lastSeenAt: string | null;
};

export type IngestionCategory = "meetings" | "documents" | "emails" | "teams";

export type IngestionFeedResponse = {
  mode: "recent" | "day";
  date: string | null; // set in "day" mode
  perCategoryLimit: number;
  counts: Record<IngestionCategory, number>;
  meetings: IngestionItem[];
  documents: IngestionItem[];
  emails: IngestionItem[];
  teams: IngestionItem[];
  errors: IngestionFeedError[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type DocRow = {
  id: string;
  title: string | null;
  file_name: string | null;
  type: string | null;
  source_system: string | null;
  date: string | null;
  created_at: string | null;
  source_web_url: string | null;
  url: string | null;
  fireflies_link: string | null;
  meeting_link: string | null;
};

function dayBounds(date: string): { start: string; end: string } {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function toItem(row: DocRow): IngestionItem {
  return {
    id: row.id,
    title: (row.title || row.file_name || "Untitled").trim(),
    fileName: row.file_name,
    date: row.date ?? row.created_at,
    ingestedAt: row.created_at,
    link: row.source_web_url || row.url || row.meeting_link || row.fireflies_link || null,
    sourceSystem: row.source_system,
  };
}

type Filter = (q: ReturnType<ReturnType<typeof createServiceClient>["from"]>) => unknown;

const CATEGORY_FILTERS: Record<IngestionCategory, Filter> = {
  meetings: (q) => (q as { eq: (c: string, v: string) => unknown }).eq("type", "meeting"),
  emails: (q) => (q as { in: (c: string, v: string[]) => unknown }).in("type", ["email", "email_attachment"]),
  teams: (q) => (q as { ilike: (c: string, v: string) => unknown }).ilike("type", "teams%"),
  documents: (q) =>
    (q as { or: (f: string) => unknown }).or(
      "source_system.ilike.%sharepoint%,source_system.ilike.%onedrive%,type.eq.document",
    ),
};

export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/ingestion-feed#GET",
  async ({ request, params }): Promise<NextResponse> => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/ingestion-feed#GET",
        message: "Authentication required.",
      });
    }

    const { projectId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);
    if (Number.isNaN(numericProjectId)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }

    const requested = new URL(request.url).searchParams.get("date");
    const day = requested && DATE_RE.test(requested) ? requested : null;
    const bounds = day ? dayBounds(day) : null;

    const supabase = createServiceClient();

    async function loadCategory(category: IngestionCategory): Promise<IngestionItem[]> {
      let query = supabase
        .from("document_metadata")
        .select(SELECT_COLS)
        .eq("project_id", numericProjectId)
        .is("deleted_at", null);
      query = CATEGORY_FILTERS[category](query) as typeof query;
      if (bounds) {
        query = query.gte("created_at", bounds.start).lt("created_at", bounds.end);
      }
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(bounds ? 500 : PER_CATEGORY_LIMIT);
      if (error) throw new Error(`${category}: ${error.message}`);
      // Fetched newest-ingested first; present newest by the item's own date so the
      // Date column reads cleanly (a meeting's date, not when we synced it).
      return ((data ?? []) as DocRow[])
        .map(toItem)
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    }

    let meetings: IngestionItem[];
    let documents: IngestionItem[];
    let emails: IngestionItem[];
    let teams: IngestionItem[];
    try {
      [meetings, documents, emails, teams] = await Promise.all([
        loadCategory("meetings"),
        loadCategory("documents"),
        loadCategory("emails"),
        loadCategory("teams"),
      ]);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not read document_metadata" },
        { status: 502 },
      );
    }

    // Active pipeline alerts (operational health). Best-effort: a broken alert
    // feed must not break the page.
    let errors: IngestionFeedError[] = [];
    try {
      const rag = createRagServiceClient() as unknown as SystemAlertReader;
      const { data: alertRows } = await rag
        .from("system_alerts")
        .select("severity, source, title, message, last_seen_at")
        .eq("status", "active")
        .order("last_seen_at", { ascending: false })
        .limit(20);
      errors = (alertRows ?? []).map((a) => ({
        severity: ((s) => (s === "critical" || s === "warning" ? s : "info"))(String(a.severity ?? "warning")),
        source: String(a.source ?? "unknown"),
        title: String(a.title ?? "Pipeline alert"),
        message: String(a.message ?? ""),
        lastSeenAt: a.last_seen_at ?? null,
      }));
    } catch {
      errors = [];
    }

    return NextResponse.json({
      mode: day ? "day" : "recent",
      date: day,
      perCategoryLimit: PER_CATEGORY_LIMIT,
      counts: {
        meetings: meetings.length,
        documents: documents.length,
        emails: emails.length,
        teams: teams.length,
      },
      meetings,
      documents,
      emails,
      teams,
      errors,
    } satisfies IngestionFeedResponse);
  },
);

// `system_alerts` lives in the RAG DB but is not in the generated RagDatabase
// types yet, so read it through a narrowly-typed view of the client (no `any`).
type SystemAlertRow = {
  severity: string | null;
  source: string | null;
  title: string | null;
  message: string | null;
  last_seen_at: string | null;
};

type SystemAlertReader = {
  from: (table: "system_alerts") => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          opts: { ascending: boolean },
        ) => {
          limit: (count: number) => PromiseLike<{ data: SystemAlertRow[] | null; error: { message: string } | null }>;
        };
      };
    };
  };
};
