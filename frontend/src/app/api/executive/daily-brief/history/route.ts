import { NextResponse } from "next/server";

import { requireCurrentUserAppCapability } from "@/lib/app-capabilities";
import { CEO_EXECUTIVE_BRIEFING_RECAP_KIND } from "@/lib/executive/executive-briefing-workflow";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";
import type {
  DailyBriefHistoryItem,
  DailyBriefHistoryResponse,
} from "@/lib/daily-briefs/types";

type DailyRecapRow = Pick<
  Database["public"]["Tables"]["daily_recaps"]["Row"],
  | "id"
  | "recap_date"
  | "date_range_start"
  | "date_range_end"
  | "workflow_status"
  | "approved_at"
  | "sent_at"
  | "sent_teams"
  | "sent_email"
  | "created_at"
  | "briefing_packet"
  | "model_used"
>;

type ParsedDailyBriefPacket = {
  generatedAt: string | null;
  windowDays: number | null;
  needsBrandon: unknown[];
  waitingOnOthers: unknown[];
  importantUpdates: unknown[];
  sourceCoverage: unknown[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parsePacket(
  value: DailyRecapRow["briefing_packet"],
): ParsedDailyBriefPacket | null {
  if (!isRecord(value)) return null;
  const sections = value.sections;
  if (!isRecord(sections)) return null;

  return {
    generatedAt: stringValue(value.generatedAt),
    windowDays: numberValue(value.windowDays),
    needsBrandon: arrayValue(sections.needsBrandon),
    waitingOnOthers: arrayValue(sections.waitingOnOthers),
    importantUpdates: arrayValue(sections.importantUpdates),
    sourceCoverage: arrayValue(value.sourceCoverage),
  };
}

function toHistoryItem(row: DailyRecapRow): DailyBriefHistoryItem {
  const packet = parsePacket(row.briefing_packet);
  const needsBrandon = packet?.needsBrandon.length ?? 0;
  const waitingOnOthers = packet?.waitingOnOthers.length ?? 0;
  const importantUpdates = packet?.importantUpdates.length ?? 0;
  const sourceCoverage = packet?.sourceCoverage ?? [];
  const sourceWarningCount = sourceCoverage.filter(
    (source) => isRecord(source) && source.status === "warning",
  ).length;

  return {
    id: row.id,
    recapDate: row.recap_date,
    dateRangeStart: row.date_range_start,
    dateRangeEnd: row.date_range_end,
    workflowStatus: row.workflow_status,
    approvedAt: row.approved_at,
    sentAt: row.sent_at,
    sentTeams: row.sent_teams === true,
    sentEmail: row.sent_email === true,
    createdAt: row.created_at,
    generatedAt: packet?.generatedAt ?? null,
    modelUsed: row.model_used,
    windowDays: packet?.windowDays ?? null,
    hasPacket: packet !== null,
    itemCounts: {
      needsBrandon,
      waitingOnOthers,
      importantUpdates,
      total: needsBrandon + waitingOnOthers + importantUpdates,
    },
    sourceCoverageCount: sourceCoverage.length,
    sourceWarningCount,
  };
}

export const GET = withApiGuardrails(
  "/api/executive/daily-brief/history#GET",
  async () => {
    await requireCurrentUserAppCapability(
      "view_executive_briefing",
      "/api/executive/daily-brief/history#GET",
      "Daily Brief history access required.",
    );

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("daily_recaps")
      .select(
        "id, recap_date, date_range_start, date_range_end, workflow_status, approved_at, sent_at, sent_teams, sent_email, created_at, briefing_packet, model_used",
      )
      .eq("recap_kind", CEO_EXECUTIVE_BRIEFING_RECAP_KIND)
      .order("recap_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      throw new Error(`Failed to load Daily Brief history: ${error.message}`);
    }

    return NextResponse.json({
      briefs: ((data ?? []) as DailyRecapRow[]).map(toHistoryItem),
    } satisfies DailyBriefHistoryResponse);
  },
);
