import type { Metadata } from "next";
import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import { createServiceClient } from "@/lib/supabase/service";
import { getExecutiveBriefingDashboard } from "@/lib/executive/executive-briefing-workflow";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  hydrateExecutiveOperatingBrief,
  type BrandonBriefItem,
  type BrandonDailyUpdatePacket,
} from "@/lib/executive/brandon-daily-update";
import { DailyBriefDocument } from "./daily-brief-document";
import {
  buildBriefBody,
  buildEmptyBody,
  itemKey,
  type BriefCalendarDay,
  type BriefCarryoverItem,
  type BriefMeeting,
} from "./build-brief";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Daily Executive Brief",
  description:
    "Owner-facing daily executive brief — decisions, financial and schedule watch, and per-project status, each traced to its source.",
};

const DAY_MS = 86_400_000;

function easternDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function easternPart(value: Date, option: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    ...option,
  }).format(value);
}

/** Noon-UTC anchor for a YYYY-MM-DD key — safe from any US-timezone DST edge. */
function noonUtc(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00Z`);
}

function meetingTime(dateValue: string | null): string | null {
  if (!dateValue || /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return easternPart(date, { hour: "numeric", minute: "2-digit" });
}

/**
 * Load this week's meetings with real links so each row can open the transcript.
 * Prefers an external URL (Fireflies / Outlook / SharePoint) and falls back to
 * the in-app meeting page. Loaded from the start of the current Eastern week so
 * the calendar strip and the "today's meetings" list share one query.
 */
async function loadWeekMeetings(weekStartKey: string): Promise<BriefMeeting[]> {
  const supabase = createServiceClient();
  const weekStartIso = noonUtc(weekStartKey).toISOString();

  const { data, error } = await supabase
    .from("document_metadata")
    .select(
      "id,title,date,created_at,captured_at,project,project_id,type,category,source_web_url,fireflies_link,meeting_link,url",
    )
    .or("type.eq.meeting,category.eq.meeting,type.eq.meeting_transcript")
    .or(
      `date.gte.${weekStartIso},created_at.gte.${weekStartIso},captured_at.gte.${weekStartIso}`,
    )
    .order("date", { ascending: false, nullsFirst: false })
    .limit(60);

  if (error) {
    throw new Error(`Failed to load this week's meetings: ${error.message}`);
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const date =
      (row.date as string | null) ??
      (row.captured_at as string | null) ??
      (row.created_at as string | null) ??
      null;
    const projectId = (row.project_id as number | null) ?? null;
    const id = row.id as string;
    const externalUrl =
      (row.source_web_url as string | null) ??
      (row.fireflies_link as string | null) ??
      (row.meeting_link as string | null) ??
      (row.url as string | null) ??
      null;
    const href =
      externalUrl && /^https?:\/\//i.test(externalUrl)
        ? externalUrl
        : projectId
          ? `/${projectId}/meetings/${id}`
          : `/meetings/${id}`;
    return {
      id,
      title: (row.title as string | null) ?? "Untitled meeting",
      date,
      project: (row.project as string | null) ?? null,
      projectId,
      href,
    } satisfies BriefMeeting;
  });
}

/** Monday→Sunday of the Eastern week containing `todayKey`. */
function currentWeekStartKey(todayKey: string): string {
  const todayNoon = noonUtc(todayKey);
  const weekdayShort = easternPart(todayNoon, { weekday: "short" });
  const isoIndex =
    ({ Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 } as Record<
      string,
      number
    >)[weekdayShort] ?? 0;
  return easternDateKey(new Date(todayNoon.getTime() - isoIndex * DAY_MS));
}

function buildCalendarDays(
  weekStartKey: string,
  todayKey: string,
  meetings: BriefMeeting[],
): BriefCalendarDay[] {
  const startNoon = noonUtc(weekStartKey);
  return Array.from({ length: 7 }, (_, index) => {
    const dayNoon = new Date(startNoon.getTime() + index * DAY_MS);
    const dateKey = easternDateKey(dayNoon);
    const events = meetings
      .filter((meeting) => {
        if (!meeting.date) return false;
        const parsed = new Date(
          /^\d{4}-\d{2}-\d{2}$/.test(meeting.date)
            ? `${meeting.date}T12:00:00Z`
            : meeting.date,
        );
        return (
          !Number.isNaN(parsed.getTime()) && easternDateKey(parsed) === dateKey
        );
      })
      .slice(0, 4)
      .map((meeting) => ({
        title: meeting.title,
        time: meetingTime(meeting.date),
        href: meeting.href,
        kind: "meeting" as const,
      }));
    return {
      dateKey,
      dow: easternPart(dayNoon, { weekday: "short" }),
      dayNum: easternPart(dayNoon, { day: "numeric" }),
      isToday: dateKey === todayKey,
      isWeekend: index >= 5,
      events,
    } satisfies BriefCalendarDay;
  });
}

type YesterdayItem = Pick<
  BrandonBriefItem,
  | "title"
  | "project"
  | "projectInternalId"
  | "summary"
  | "source"
  | "sourceDetail"
  | "sourceUrl"
  | "sourceId"
  | "date"
>;

/**
 * Read the most recent prior-day executive packet and return its open items
 * (owner decisions + waiting-on-others). These are matched against today's open
 * items to surface what is *still* pending across both days.
 */
async function loadYesterdayOpenItems(
  todayKey: string,
): Promise<YesterdayItem[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("daily_recaps")
    .select("briefing_packet, recap_date")
    .eq("recap_kind", "executive_briefing")
    .lt("recap_date", todayKey)
    .order("recap_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.briefing_packet) return [];

  const packet = data.briefing_packet as unknown as {
    sections?: BrandonDailyUpdatePacket["sections"];
  };
  const sections = packet.sections;
  if (!sections) return [];

  return [
    ...(sections.needsBrandon ?? []),
    ...(sections.waitingOnOthers ?? []),
  ].map((item) => ({
    title: item.title,
    project: item.project,
    projectInternalId: item.projectInternalId ?? null,
    summary: item.summary,
    source: item.source,
    sourceDetail: item.sourceDetail,
    sourceUrl: item.sourceUrl,
    sourceId: item.sourceId,
    date: item.date,
  }));
}

/**
 * Carryover = items open yesterday that are STILL open today (matched by their
 * stable item key). This is a confident "don't forget this" signal — we only
 * surface items confirmed present in both packets, never speculative ones.
 */
function computeCarryover(
  todayPacket: BrandonDailyUpdatePacket,
  yesterday: YesterdayItem[],
  todayKey: string,
): BriefCarryoverItem[] {
  const todayOpenKeys = new Set(
    [
      ...todayPacket.sections.needsBrandon,
      ...todayPacket.sections.waitingOnOthers,
      ...todayPacket.sections.importantUpdates,
    ].map((item) => itemKey(item)),
  );

  const seen = new Set<string>();
  const out: BriefCarryoverItem[] = [];
  const todayNoon = noonUtc(todayKey);
  for (const item of yesterday) {
    const key = itemKey(item);
    if (!todayOpenKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    const sourceNoon = item.date
      ? new Date(
          /^\d{4}-\d{2}-\d{2}$/.test(item.date)
            ? `${item.date}T12:00:00Z`
            : item.date,
        )
      : null;
    const ageDays =
      sourceNoon && !Number.isNaN(sourceNoon.getTime())
        ? Math.max(1, Math.round((todayNoon.getTime() - sourceNoon.getTime()) / DAY_MS))
        : 1;
    out.push({
      key,
      title: item.title,
      project: item.project ?? null,
      summary: item.summary ?? "",
      ageDays,
      projectInternalId: item.projectInternalId ?? null,
      citation: {
        source: item.source,
        sourceDetail: item.sourceDetail,
        sourceUrl: item.sourceUrl,
        sourceId: item.sourceId,
        date: item.date,
      },
    });
  }
  return out;
}

/**
 * Standalone, full-viewport Daily Executive Brief.
 *
 * Bound to the live executive-brief packet (daily_recaps → briefing_packet) —
 * the same data that powers /executive — and rendered in a bespoke editorial
 * layout outside the app's PageShell chrome. Every claim links to its real
 * source (Fireflies transcript, Outlook email, document, or in-app meeting).
 *
 * Access is gated by the same `view_executive_briefing` capability as every
 * other Daily Brief surface — the page exposes owner-level financials, schedule
 * risk, and project detail, so it must not be visible to every authenticated
 * user.
 */
export default async function DailyBriefPage() {
  const canViewExecutiveBriefing = await canCurrentUserAccessAppCapability(
    "view_executive_briefing",
  );

  if (!canViewExecutiveBriefing) {
    return (
      <AppCapabilityAccessDenied
        title="Daily Executive Brief"
        description="This executive brief is limited to users with executive briefing access."
      />
    );
  }

  let bodyHtml: string;
  try {
    const todayKey = easternDateKey(new Date());
    const weekStartKey = currentWeekStartKey(todayKey);

    const [dashboard, weekMeetings, yesterdayItems] = await Promise.all([
      getExecutiveBriefingDashboard({
        windowDays: DEFAULT_EXECUTIVE_WINDOW_DAYS,
      }),
      loadWeekMeetings(weekStartKey),
      loadYesterdayOpenItems(todayKey),
    ]);

    const packet = dashboard.draft.packet;
    const operatingBrief = hydrateExecutiveOperatingBrief(packet);

    const todaysMeetings = weekMeetings
      .filter((meeting) => {
        const parsed = meeting.date
          ? new Date(
              /^\d{4}-\d{2}-\d{2}$/.test(meeting.date)
                ? `${meeting.date}T12:00:00Z`
                : meeting.date,
            )
          : null;
        return parsed && !Number.isNaN(parsed.getTime())
          ? easternDateKey(parsed) === todayKey
          : false;
      })
      .slice(0, 10);

    const calendar = buildCalendarDays(weekStartKey, todayKey, weekMeetings);
    const carryover = computeCarryover(packet, yesterdayItems, todayKey);

    bodyHtml = buildBriefBody({
      packet,
      operatingBrief,
      meetings: todaysMeetings,
      calendar,
      carryover,
    });
  } catch (error) {
    // Fail loudly to the server logs; show a clear state rather than a fake brief.
    console.error("[daily-brief] failed to build brief", error);
    bodyHtml = buildEmptyBody("Couldn't load today's brief");
  }

  return (
    <div className="min-h-screen">
      <DailyBriefDocument bodyHtml={bodyHtml} />
    </div>
  );
}
