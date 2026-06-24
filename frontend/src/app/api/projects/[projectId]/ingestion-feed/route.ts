export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createRagServiceClient, createServiceClient } from "@/lib/supabase/service";

/**
 * Per-project, per-day ingestion feed for the Project Intelligence dashboard.
 *
 * Returns, for one calendar day (UTC, by ingestion time `created_at`), the items
 * that landed in `document_metadata` for this project — split into the four
 * sources the dashboard shows: meetings, SharePoint/OneDrive documents, emails,
 * and Teams messages. Also returns any active pipeline alerts (`system_alerts`,
 * RAG DB) so a source going dark is loud on the page, not just in a Teams DM.
 *
 * `document_metadata` (PM APP) holds all four categories with `project_id` + a
 * date, so this is a single table read, not a cross-DB fan-out.
 */

export type IngestionItem = {
  id: string;
  title: string;
  fileName: string | null;
  date: string | null; // the document's own date (meeting/received date)
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

export type IngestionFeedResponse = {
  date: string; // YYYY-MM-DD (UTC) this feed covers
  counts: { meetings: number; documents: number; emails: number; teams: number };
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

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

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
    date: row.date,
    ingestedAt: row.created_at,
    link: row.source_web_url || row.url || row.meeting_link || row.fireflies_link || null,
    sourceSystem: row.source_system,
  };
}

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
    const date = requested && DATE_RE.test(requested) ? requested : todayUtc();
    const { start, end } = dayBounds(date);

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("document_metadata")
      .select(
        "id, title, file_name, type, source_system, date, created_at, source_web_url, url, fireflies_link, meeting_link",
      )
      .eq("project_id", numericProjectId)
      .is("deleted_at", null)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json(
        { error: `Could not read document_metadata: ${error.message}` },
        { status: 502 },
      );
    }

    const rows = (data ?? []) as DocRow[];
    const meetings: IngestionItem[] = [];
    const documents: IngestionItem[] = [];
    const emails: IngestionItem[] = [];
    const teams: IngestionItem[] = [];

    for (const row of rows) {
      const type = (row.type || "").toLowerCase();
      const sourceSystem = (row.source_system || "").toLowerCase();
      if (type === "meeting") {
        meetings.push(toItem(row));
      } else if (type === "email" || type === "email_attachment") {
        emails.push(toItem(row));
      } else if (type.startsWith("teams")) {
        teams.push(toItem(row));
      } else if (
        sourceSystem.includes("sharepoint") ||
        sourceSystem.includes("onedrive") ||
        type === "document"
      ) {
        documents.push(toItem(row));
      }
    }

    // Active pipeline alerts (operational health) — same rows the Teams notifier
    // and /rag banner read. Best-effort: a broken alert feed must not break the page.
    let errors: IngestionFeedError[] = [];
    try {
      const rag = createRagServiceClient();
      const { data: alertRows } = await rag
        .from("system_alerts")
        .select("severity, source, title, message, last_seen_at")
        .eq("status", "active")
        .order("last_seen_at", { ascending: false })
        .limit(20);
      errors = (alertRows ?? []).map((a) => ({
        severity: ((s) => (s === "critical" || s === "warning" ? s : "info"))(
          String(a.severity ?? "warning"),
        ),
        source: String(a.source ?? "unknown"),
        title: String(a.title ?? "Pipeline alert"),
        message: String(a.message ?? ""),
        lastSeenAt: a.last_seen_at ?? null,
      }));
    } catch {
      errors = [];
    }

    return NextResponse.json({
      date,
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
