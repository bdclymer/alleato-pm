import { createHash } from "node:crypto";
import type { Database, Json } from "@/types/database.types";
import { createServiceClient } from "@/lib/supabase/service";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  DEFAULT_EXECUTIVE_BRIEFING_SYNTHESIS_MODEL,
  generateDailyBrief,
  loadLiveDailyBriefSourceCoverage,
  type DailyBriefItem as BrandonBriefItem,
  type DailyBriefPacket as BrandonDailyUpdatePacket,
  type DailyBriefRefreshRecord,
} from "@/lib/executive/daily-brief";

type DailyRecapRow = Database["public"]["Tables"]["daily_recaps"]["Row"];
type DailyRecapInsert = Database["public"]["Tables"]["daily_recaps"]["Insert"];
type FollowUpRow =
  Database["public"]["Tables"]["executive_briefing_follow_ups"]["Row"];
type FollowUpInsert =
  Database["public"]["Tables"]["executive_briefing_follow_ups"]["Insert"];
type FollowUpSection =
  Database["public"]["Tables"]["executive_briefing_follow_ups"]["Row"]["section"];

export type ExecutiveBriefingDraft = {
  id: string;
  recapDate: string;
  workflowStatus: "draft" | "approved";
  approvedAt: string | null;
  approvedBy: string | null;
  packet: BrandonDailyUpdatePacket;
  createdAt: string | null;
  updatedSummary: string;
};

export type ExecutiveBriefingFollowUp = FollowUpRow & {
  daysOpen: number;
};

export type ExecutiveBriefingDashboard = {
  draft: ExecutiveBriefingDraft;
  followUps: ExecutiveBriefingFollowUp[];
  openFollowUps: ExecutiveBriefingFollowUp[];
  staleFollowUps: ExecutiveBriefingFollowUp[];
  liveFingerprints: Set<string>;
  fingerprintMap: Map<string, ExecutiveBriefingFollowUp>;
};

export const CEO_EXECUTIVE_BRIEFING_RECAP_KIND = "executive_briefing";
export const LEGACY_MEETING_DIGEST_RECAP_KIND = "meeting_digest";

function getNow() {
  return new Date();
}

function getEasternDateParts(value: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(value);
}

function getDateRange(windowDays: number) {
  const end = getNow();
  const start = new Date(end);
  start.setDate(end.getDate() - Math.max(windowDays - 1, 0));

  return {
    recapDate: getEasternDateParts(end),
    dateRangeStart: getEasternDateParts(start),
    dateRangeEnd: getEasternDateParts(end),
  };
}

function getAllItems(packet: BrandonDailyUpdatePacket): BrandonBriefItem[] {
  return [
    ...packet.sections.needsBrandon,
    ...packet.sections.waitingOnOthers,
    ...packet.sections.importantUpdates,
  ];
}

function getSectionEntries(packet: BrandonDailyUpdatePacket): Array<{
  section: FollowUpSection;
  item: BrandonBriefItem;
}> {
  return [
    ...packet.sections.needsBrandon.map((item) => ({
      section: "needsBrandon" as const,
      item,
    })),
    ...packet.sections.waitingOnOthers.map((item) => ({
      section: "waitingOnOthers" as const,
      item,
    })),
    ...packet.sections.importantUpdates.map((item) => ({
      section: "importantUpdates" as const,
      item,
    })),
  ];
}

function createFingerprint(item: BrandonBriefItem, section: FollowUpSection) {
  const raw = JSON.stringify({
    section,
    title: item.title.trim().toLowerCase(),
    project: item.project.trim().toLowerCase(),
    source: item.source.trim().toLowerCase(),
    sourceId: item.sourceId?.trim().toLowerCase() ?? "",
    recommendedAction: item.recommendedAction?.trim().toLowerCase() ?? "",
  });

  return createHash("sha256").update(raw).digest("hex");
}

function buildRecapText(packet: BrandonDailyUpdatePacket) {
  const sections = [
    ["Critical Actions", packet.sections.needsBrandon],
    ["Unblock Your People", packet.sections.waitingOnOthers],
    ["Business Signal", packet.sections.importantUpdates],
  ] as const;

  const lines = [
    "DAILY OPERATING BRIEF",
    `Generated ${packet.generatedAt}`,
    `Source window: last ${packet.windowDays} calendar day${packet.windowDays === 1 ? "" : "s"}`,
    "",
  ];

  for (const [label, items] of sections) {
    lines.push(`${label.toUpperCase()}:`);
    if (items.length === 0) {
      lines.push("- No items.");
      lines.push("");
      continue;
    }

    for (const item of items) {
      lines.push(`- ${item.title} (${item.project})`);
      lines.push(`  ${item.summary}`);
      if (item.recommendedAction) {
        lines.push(`  Action: ${item.recommendedAction}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

function projectCount(packet: BrandonDailyUpdatePacket) {
  return new Set(
    getAllItems(packet)
      .map((item) => item.project)
      .filter(Boolean),
  ).size;
}

function briefItemCounts(packet: BrandonDailyUpdatePacket) {
  return {
    needsBrandon: packet.sections.needsBrandon.length,
    waitingOnOthers: packet.sections.waitingOnOthers.length,
    importantUpdates: packet.sections.importantUpdates.length,
  };
}

function buildRefreshRecord(
  packet: BrandonDailyUpdatePacket,
  version: number,
  storedAt: string,
): DailyBriefRefreshRecord {
  return {
    version,
    generatedAt: packet.generatedAt,
    storedAt,
    windowDays: packet.windowDays,
    itemCounts: briefItemCounts(packet),
  };
}

function withDailyBriefVersionMetadata(
  packet: BrandonDailyUpdatePacket,
  previousPacket: BrandonDailyUpdatePacket | null,
): BrandonDailyUpdatePacket {
  const storedAt = new Date().toISOString();
  const previousHistory = previousPacket?.refreshHistory ?? [];
  const previousVersion = previousPacket
    ? (previousPacket.briefVersion ?? Math.max(previousHistory.length, 1))
    : 0;
  const nextVersion = previousVersion + 1;
  const history = [...previousHistory];

  if (previousPacket) {
    const previousRecord = buildRefreshRecord(
      previousPacket,
      previousVersion,
      storedAt,
    );
    const alreadyRecorded = history.some(
      (record) =>
        record.version === previousRecord.version &&
        record.generatedAt === previousRecord.generatedAt,
    );
    if (!alreadyRecorded) {
      history.push(previousRecord);
    }
  }

  return {
    ...packet,
    canonicalName: "Daily Brief",
    audiencePreset: "brandon",
    briefVersion: nextVersion,
    refreshHistory: history.slice(-20),
  };
}

function toSupabaseJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function backfillCitations(item: BrandonBriefItem): BrandonBriefItem {
  if (Array.isArray(item.citations) && item.citations.length > 0) return item;
  return {
    ...item,
    citations: [
      {
        source: item.source,
        sourceDetail: item.sourceDetail,
        sourceUrl: item.sourceUrl,
        sourceId: item.sourceId,
        evidence: item.evidence,
        date: item.date,
      },
    ],
  };
}

function parseStoredPacket(
  value: Json | null,
): BrandonDailyUpdatePacket | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.generatedAt !== "string" ||
    typeof candidate.windowDays !== "number" ||
    typeof candidate.sections !== "object" ||
    candidate.sections === null
  ) {
    return null;
  }

  const packet = candidate as unknown as BrandonDailyUpdatePacket;
  return {
    ...packet,
    sections: {
      needsBrandon: (packet.sections?.needsBrandon ?? []).map(
        backfillCitations,
      ),
      waitingOnOthers: (packet.sections?.waitingOnOthers ?? []).map(
        backfillCitations,
      ),
      importantUpdates: (packet.sections?.importantUpdates ?? []).map(
        backfillCitations,
      ),
    },
  };
}

function daysOpen(firstSeenAt: string) {
  const first = new Date(firstSeenAt);
  if (Number.isNaN(first.getTime())) return 0;
  const diff = getNow().getTime() - first.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function toDashboardFollowUp(row: FollowUpRow): ExecutiveBriefingFollowUp {
  return {
    ...row,
    daysOpen: daysOpen(row.first_seen_at),
  };
}

async function loadExistingDraft(recapDate: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("daily_recaps")
    .select("*")
    .eq("recap_kind", CEO_EXECUTIVE_BRIEFING_RECAP_KIND)
    .eq("recap_date", recapDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load executive briefing draft: ${error.message}`,
    );
  }

  return data;
}

async function upsertFollowUps(
  recapId: string,
  packet: BrandonDailyUpdatePacket,
) {
  const supabase = createServiceClient();
  const entries = getSectionEntries(packet);
  if (entries.length === 0) {
    return new Map<string, ExecutiveBriefingFollowUp>();
  }

  const existingResponse = await supabase
    .from("executive_briefing_follow_ups")
    .select("*")
    .in(
      "fingerprint",
      entries.map(({ item, section }) => createFingerprint(item, section)),
    );

  if (existingResponse.error) {
    throw new Error(
      `Failed to load existing executive follow-ups: ${existingResponse.error.message}`,
    );
  }

  const existingByFingerprint = new Map(
    (existingResponse.data ?? []).map((row) => [row.fingerprint, row]),
  );

  const rows: FollowUpInsert[] = entries.map(({ item, section }) => {
    const fingerprint = createFingerprint(item, section);
    const existing = existingByFingerprint.get(fingerprint);

    return {
      fingerprint,
      section,
      title: item.title,
      summary: item.summary,
      recommended_action: item.recommendedAction ?? null,
      why_it_matters: item.whyItMatters ?? null,
      owner: item.owner ?? null,
      status: item.status ?? null,
      tone: item.tone ?? null,
      state: existing?.state ?? "open",
      source_type: item.source,
      source_detail: item.sourceDetail,
      source_id: item.sourceId ?? null,
      source_url: item.sourceUrl ?? null,
      project_label: item.project,
      source_date: item.date,
      first_seen_recap_id: existing?.first_seen_recap_id ?? recapId,
      last_seen_recap_id: recapId,
      first_seen_at: existing?.first_seen_at ?? new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      resolved_at: existing?.resolved_at ?? null,
      resolved_by: existing?.resolved_by ?? null,
      resolution_note: existing?.resolution_note ?? null,
      payload: item as unknown as Json,
    };
  });

  const { data, error } = await supabase
    .from("executive_briefing_follow_ups")
    .upsert(rows, { onConflict: "fingerprint" })
    .select("*");

  if (error) {
    throw new Error(`Failed to upsert executive follow-ups: ${error.message}`);
  }

  return new Map(
    (data ?? []).map((row) => [row.fingerprint, toDashboardFollowUp(row)]),
  );
}

export async function regenerateExecutiveBriefingDraft(options?: {
  windowDays?: number;
  sourceBackedOnly?: boolean;
}) {
  const windowDays = options?.windowDays ?? DEFAULT_EXECUTIVE_WINDOW_DAYS;
  const packet = await generateDailyBrief({
    windowDays,
    preset: "brandon",
    sourceBackedOnly: options?.sourceBackedOnly,
  });
  const dateRange = getDateRange(windowDays);
  const existingDraft = await loadExistingDraft(dateRange.recapDate);
  const previousPacket = parseStoredPacket(existingDraft?.briefing_packet ?? null);
  const versionedPacket = withDailyBriefVersionMetadata(packet, previousPacket);
  const supabase = createServiceClient();
  const recapText = buildRecapText(versionedPacket);

  const row: DailyRecapInsert = {
    id: existingDraft?.id,
    recap_kind: CEO_EXECUTIVE_BRIEFING_RECAP_KIND,
    recap_date: dateRange.recapDate,
    date_range_start: dateRange.dateRangeStart,
    date_range_end: dateRange.dateRangeEnd,
    recap_text: recapText,
    recap_html: null,
    meeting_count:
      versionedPacket.sourceCoverage.find((source) => source.label === "Meeting")
        ?.count ?? 0,
    project_count: projectCount(versionedPacket),
    briefing_packet: toSupabaseJson(versionedPacket),
    workflow_status: "approved",
    approved_at: new Date().toISOString(),
    approved_by: null,
    approval_notes: null,
    model_used: (
      process.env.EXECUTIVE_BRIEFING_SYNTHESIS_MODEL?.trim() ||
      DEFAULT_EXECUTIVE_BRIEFING_SYNTHESIS_MODEL
    ).replace(/^openai\//, ""),
    generation_time_seconds: null,
    meetings_analyzed: null,
    blockers: null,
    commitments: null,
    decisions: null,
    recipients: null,
    risks: null,
    wins: null,
    sent_at: null,
    sent_email: false,
    sent_teams: false,
  };

  const { data, error } = await supabase
    .from("daily_recaps")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Failed to save executive briefing draft: ${error.message}`,
    );
  }

  await upsertFollowUps(data.id, versionedPacket);

  return {
    draft: {
      id: data.id,
      recapDate: data.recap_date,
      workflowStatus: data.workflow_status as "draft" | "approved",
      approvedAt: data.approved_at,
      approvedBy: data.approved_by,
      packet: versionedPacket,
      createdAt: data.created_at,
      updatedSummary: data.recap_text,
    },
  };
}

async function loadFollowUps() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("executive_briefing_follow_ups")
    .select("*")
    .order("last_seen_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load executive follow-ups: ${error.message}`);
  }

  return (data ?? []).map(toDashboardFollowUp);
}

export async function getExecutiveBriefingDashboard(options?: {
  windowDays?: number;
}) {
  const windowDays = options?.windowDays ?? DEFAULT_EXECUTIVE_WINDOW_DAYS;
  const { recapDate } = getDateRange(windowDays);
  const existingDraft = await loadExistingDraft(recapDate);
  const storedPacket = parseStoredPacket(existingDraft?.briefing_packet ?? null);
  const packet = storedPacket
    ? {
        ...storedPacket,
        sourceCoverage: await loadLiveDailyBriefSourceCoverage(windowDays),
      }
    : null;
  const draft =
    existingDraft && packet
      ? {
          id: existingDraft.id,
          recapDate: existingDraft.recap_date,
          workflowStatus: existingDraft.workflow_status as "draft" | "approved",
          approvedAt: existingDraft.approved_at,
          approvedBy: existingDraft.approved_by,
          packet,
          createdAt: existingDraft.created_at,
          updatedSummary: existingDraft.recap_text,
        }
      : (await regenerateExecutiveBriefingDraft({ windowDays })).draft;

  const followUps = await loadFollowUps();
  const openFollowUps = followUps.filter(
    (followUp) => followUp.state === "open",
  );
  const liveFingerprints = new Set(
    getSectionEntries(draft.packet).map(({ item, section }) =>
      createFingerprint(item, section),
    ),
  );
  const fingerprintMap = new Map(
    followUps.map((followUp) => [followUp.fingerprint, followUp]),
  );
  const staleFollowUps = openFollowUps.filter(
    (followUp) => !liveFingerprints.has(followUp.fingerprint),
  );

  return {
    draft,
    followUps,
    openFollowUps,
    staleFollowUps,
    liveFingerprints,
    fingerprintMap,
  } satisfies ExecutiveBriefingDashboard;
}

export async function approveExecutiveBriefingDraft(
  draftId: string,
  approvedBy: string | null,
) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("daily_recaps")
    .update({
      workflow_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
    })
    .eq("id", draftId)
    .eq("recap_kind", CEO_EXECUTIVE_BRIEFING_RECAP_KIND);

  if (error) {
    throw new Error(
      `Failed to approve executive briefing draft: ${error.message}`,
    );
  }
}

export async function setExecutiveFollowUpState(params: {
  followUpId: string;
  nextState: "open" | "resolved";
  userId: string | null;
}) {
  const supabase = createServiceClient();
  const update =
    params.nextState === "resolved"
      ? {
          state: "resolved" as const,
          resolved_at: new Date().toISOString(),
          resolved_by: params.userId,
          resolution_note: "Marked resolved from the executive briefing.",
        }
      : {
          state: "open" as const,
          resolved_at: null,
          resolved_by: null,
          resolution_note: null,
        };

  const { error } = await supabase
    .from("executive_briefing_follow_ups")
    .update(update)
    .eq("id", params.followUpId);

  if (error) {
    throw new Error(
      `Failed to update executive follow-up state: ${error.message}`,
    );
  }
}

export function getFollowUpFingerprint(
  item: BrandonBriefItem,
  section: FollowUpSection,
) {
  return createFingerprint(item, section);
}
