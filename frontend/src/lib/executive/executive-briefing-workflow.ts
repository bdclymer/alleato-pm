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

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
  if (packet.operatingBrief) {
    const brief = packet.operatingBrief;
    const lines = [
      "CEO OPERATING BRIEF",
      `Generated ${packet.generatedAt}`,
      `Source window: last ${packet.windowDays} calendar day${packet.windowDays === 1 ? "" : "s"}`,
      "",
      "START HERE:",
      ...brief.startHere.map((line) => `- ${line}`),
      "",
      "TOP EXECUTIVE FOCUS:",
      ...brief.topExecutiveFocus.map(
        (entry) =>
          `- ${entry.item.project}: ${entry.item.title} | Next: ${entry.recommendedNextMove}`,
      ),
      "",
      "RECOMMENDED MOVES:",
      ...brief.recommendedMoves.map((move, index) => `${index + 1}. ${move}`),
    ];

    return lines.join("\n").trim();
  }

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

function sanitizeSupabaseText(value: string): string {
  let sanitized = "";
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0) continue;

    if (code >= 0xd800 && code <= 0xdbff) {
      const nextCode = value.charCodeAt(index + 1);
      if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
        sanitized += value[index] + value[index + 1];
        index += 1;
      }
      continue;
    }

    if (code >= 0xdc00 && code <= 0xdfff) continue;

    sanitized += value[index];
  }

  return sanitized;
}

function normalizeSupabaseJson(value: unknown): Json {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    return sanitizeSupabaseText(value);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") return value;

  if (typeof value === "bigint") return value.toString();

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) => normalizeSupabaseJson(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, normalizeSupabaseJson(item)]),
    );
  }

  return null;
}

function toSupabaseJson(value: unknown): Json {
  return normalizeSupabaseJson(value);
}

function toSupabaseText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return sanitizeSupabaseText(value);
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

function isFollowUpInsideSourceWindow(
  followUp: ExecutiveBriefingFollowUp,
  cutoffDateKey: string,
) {
  const anchor = parseDate(followUp.source_date) ?? parseDate(followUp.last_seen_at);
  return anchor !== null && getEasternDateParts(anchor) >= cutoffDateKey;
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
    return loadExistingDraftFromAppDb(recapDate);
  }

  return data;
}

function formatDailyRecapError(error: {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}) {
  const details = [
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ]
    .filter(Boolean)
    .join("; ");

  return `Failed to save executive briefing draft: ${error.message}${
    details ? ` (${details})` : ""
  }`;
}

async function withAppDbClient<T>(callback: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const databaseUrl =
    process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    throw new Error("App database URL is not configured for executive briefing fallback.");
  }
  const pg = await import("pg");
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const pool = new pg.Pool({
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 8_000,
      idleTimeoutMillis: 1_000,
    });
    try {
      const client = await pool.connect();
      try {
        await client.query("set statement_timeout = '15000ms'");
        return await callback(client);
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 750));
    } finally {
      await pool.end();
    }
  }
  throw lastError;
}

function toDbValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") return JSON.stringify(value);
  return value;
}

function normalizeDbRow<T extends Record<string, unknown>>(row: T): T {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ]),
  ) as T;
}

async function loadExistingDraftFromAppDb(recapDate: string): Promise<DailyRecapRow | null> {
  return withAppDbClient(async (client) => {
    const result = await client.query(
      `
        select *
        from public.daily_recaps
        where recap_kind = $1
          and recap_date = $2::date
        order by created_at desc
        limit 1
      `,
      [CEO_EXECUTIVE_BRIEFING_RECAP_KIND, recapDate],
    );
    return result.rows[0] ? (normalizeDbRow(result.rows[0]) as DailyRecapRow) : null;
  });
}

async function persistExecutiveBriefingDraftToAppDb(
  row: DailyRecapInsert,
): Promise<DailyRecapRow> {
  return withAppDbClient(async (client) => {
    const entries = Object.entries(row).filter(([, value]) => value !== undefined);
    if (row.id) {
      const updateEntries = entries.filter(([key]) => key !== "id");
      const assignments = updateEntries.map(([key], index) => `${key} = $${index + 1}`);
      const values = updateEntries.map(([, value]) => toDbValue(value));
      const result = await client.query(
        `
          update public.daily_recaps
          set ${assignments.join(", ")}
          where id = $${values.length + 1}
          returning *
        `,
        [...values, row.id],
      );
      if (result.rows[0]) return normalizeDbRow(result.rows[0]) as DailyRecapRow;
    }

    const columns = entries.map(([key]) => key);
    const placeholders = entries.map(([, _value], index) => `$${index + 1}`);
    const values = entries.map(([, value]) => toDbValue(value));
    const updateColumns = columns.filter((column) => column !== "id");
    const result = await client.query(
      `
        insert into public.daily_recaps (${columns.join(", ")})
        values (${placeholders.join(", ")})
        on conflict (recap_date) where recap_kind = 'executive_briefing'
        do update set ${updateColumns.map((column) => `${column} = excluded.${column}`).join(", ")}
        returning *
      `,
      values,
    );
    return normalizeDbRow(result.rows[0]) as DailyRecapRow;
  });
}

async function persistExecutiveBriefingDraft(
  row: DailyRecapInsert,
  recapDate: string,
) {
  const supabase = createServiceClient();

  const runUpsert = (payload: DailyRecapInsert) =>
    supabase.from("daily_recaps").upsert(payload, { onConflict: "id" }).select("*").single();

  let response = await runUpsert(row);

  // Another request may have inserted today's recap after we checked. Reload the
  // canonical row for the day and overwrite it instead of crashing the page.
  if (response.error?.code === "23505" && !row.id) {
    const duplicateDraft = await loadExistingDraft(recapDate);
    if (duplicateDraft?.id) {
      response = await runUpsert({
        ...row,
        id: duplicateDraft.id,
      });
    }
  }

  if (response.error) {
    return persistExecutiveBriefingDraftToAppDb(row);
  }

  return response.data;
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
    return upsertFollowUpsToAppDb(recapId, packet);
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
      title: toSupabaseText(item.title) ?? "",
      summary: toSupabaseText(item.summary) ?? "",
      recommended_action: toSupabaseText(item.recommendedAction),
      why_it_matters: toSupabaseText(item.whyItMatters),
      owner: toSupabaseText(item.owner),
      status: toSupabaseText(item.status),
      tone: item.tone ?? null,
      state: existing?.state ?? "open",
      source_type: toSupabaseText(item.source) ?? "Document",
      source_detail: toSupabaseText(item.sourceDetail) ?? "",
      source_id: toSupabaseText(item.sourceId),
      source_url: toSupabaseText(item.sourceUrl),
      project_label: toSupabaseText(item.project) ?? "No project linked",
      source_date: toSupabaseText(item.date) ?? "",
      first_seen_recap_id: existing?.first_seen_recap_id ?? recapId,
      last_seen_recap_id: recapId,
      first_seen_at: existing?.first_seen_at ?? new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      resolved_at: existing?.resolved_at ?? null,
      resolved_by: existing?.resolved_by ?? null,
      resolution_note: existing?.resolution_note ?? null,
      payload: toSupabaseJson(item),
    };
  });

  const { data, error } = await supabase
    .from("executive_briefing_follow_ups")
    .upsert(rows, { onConflict: "fingerprint" })
    .select("*");

  if (error) {
    return upsertFollowUpsToAppDb(recapId, packet);
  }

  return new Map(
    (data ?? []).map((row) => [row.fingerprint, toDashboardFollowUp(row)]),
  );
}

async function upsertFollowUpsToAppDb(
  recapId: string,
  packet: BrandonDailyUpdatePacket,
): Promise<Map<string, ExecutiveBriefingFollowUp>> {
  const entries = getSectionEntries(packet);
  if (entries.length === 0) {
    return new Map<string, ExecutiveBriefingFollowUp>();
  }

  return withAppDbClient(async (client) => {
    const fingerprints = entries.map(({ item, section }) => createFingerprint(item, section));
    const existingResult = await client.query<FollowUpRow>(
      `
        select *
        from public.executive_briefing_follow_ups
        where fingerprint = any($1::text[])
      `,
      [fingerprints],
    );
    const existingByFingerprint = new Map(
      existingResult.rows.map((row) => [row.fingerprint, normalizeDbRow(row)]),
    );
    const now = new Date().toISOString();
    const savedRows: FollowUpRow[] = [];

    for (const { item, section } of entries) {
      const fingerprint = createFingerprint(item, section);
      const existing = existingByFingerprint.get(fingerprint);
      const row: FollowUpInsert = {
        fingerprint,
        section,
        title: toSupabaseText(item.title) ?? "",
        summary: toSupabaseText(item.summary) ?? "",
        recommended_action: toSupabaseText(item.recommendedAction),
        why_it_matters: toSupabaseText(item.whyItMatters),
        owner: toSupabaseText(item.owner),
        status: toSupabaseText(item.status),
        tone: item.tone ?? null,
        state: existing?.state ?? "open",
        source_type: toSupabaseText(item.source) ?? "Document",
        source_detail: toSupabaseText(item.sourceDetail) ?? "",
        source_id: toSupabaseText(item.sourceId),
        source_url: toSupabaseText(item.sourceUrl),
        project_label: toSupabaseText(item.project) ?? "No project linked",
        source_date: toSupabaseText(item.date) ?? "",
        first_seen_recap_id: existing?.first_seen_recap_id ?? recapId,
        last_seen_recap_id: recapId,
        first_seen_at: existing?.first_seen_at ?? now,
        last_seen_at: now,
        resolved_at: existing?.resolved_at ?? null,
        resolved_by: existing?.resolved_by ?? null,
        resolution_note: existing?.resolution_note ?? null,
        payload: toSupabaseJson(item),
      };
      const columns = Object.keys(row) as Array<keyof FollowUpInsert>;
      const values = columns.map((column) => toDbValue(row[column]));
      const placeholders = columns.map((_, index) => `$${index + 1}`);
      const updates = columns
        .filter((column) => column !== "fingerprint")
        .map((column) => `${column} = excluded.${column}`);
      const result = await client.query<FollowUpRow>(
        `
          insert into public.executive_briefing_follow_ups (${columns.join(", ")})
          values (${placeholders.join(", ")})
          on conflict (fingerprint)
          do update set ${updates.join(", ")}
          returning *
        `,
        values,
      );
      savedRows.push(normalizeDbRow(result.rows[0]) as FollowUpRow);
    }

    return new Map(
      savedRows.map((row) => [row.fingerprint, toDashboardFollowUp(row)]),
    );
  });
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
  const recapText = toSupabaseText(buildRecapText(versionedPacket)) ?? "";

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
    workflow_status: "draft",
    approved_at: null,
    approved_by: null,
    approval_notes: null,
    model_used:
      toSupabaseText(
        (
          process.env.EXECUTIVE_BRIEFING_SYNTHESIS_MODEL?.trim() ||
          DEFAULT_EXECUTIVE_BRIEFING_SYNTHESIS_MODEL
        ).replace(/^openai\//, ""),
      ) ?? DEFAULT_EXECUTIVE_BRIEFING_SYNTHESIS_MODEL,
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

  const data = await persistExecutiveBriefingDraft(row, dateRange.recapDate);

  try {
    await upsertFollowUps(data.id, versionedPacket);
  } catch (error) {
    console.error("[executive-briefing] follow-up persistence failed", error);
  }

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
    return loadFollowUpsFromAppDb();
  }

  return (data ?? []).map(toDashboardFollowUp);
}

async function loadFollowUpsFromAppDb(): Promise<ExecutiveBriefingFollowUp[]> {
  return withAppDbClient(async (client) => {
    const result = await client.query<FollowUpRow>(
      `
        select *
        from public.executive_briefing_follow_ups
        order by last_seen_at desc
      `,
    );
    return result.rows.map((row) => toDashboardFollowUp(normalizeDbRow(row) as FollowUpRow));
  });
}

export async function getExecutiveBriefingDashboard(options?: {
  windowDays?: number;
}) {
  const windowDays = options?.windowDays ?? DEFAULT_EXECUTIVE_WINDOW_DAYS;
  const { recapDate, dateRangeStart } = getDateRange(windowDays);
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
    (followUp) =>
      !liveFingerprints.has(followUp.fingerprint) &&
      isFollowUpInsideSourceWindow(followUp, dateRangeStart),
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
