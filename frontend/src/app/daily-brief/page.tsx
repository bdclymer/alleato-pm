import type { Metadata } from "next";
import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import { createServiceClient } from "@/lib/supabase/service";
import { getExecutiveBriefingDashboard } from "@/lib/executive/executive-briefing-workflow";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  hydrateExecutiveOperatingBrief,
} from "@/lib/executive/brandon-daily-update";
import { DailyBriefDocument } from "./daily-brief-document";
import { buildBriefBody, buildEmptyBody, type BriefMeeting } from "./build-brief";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Daily Executive Brief",
  description:
    "Owner-facing daily executive brief — decisions, financial and schedule watch, and per-project status, each traced to its source.",
};

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

/**
 * Load today's meetings with their real links so each row can open the
 * transcript. Prefers an external URL (Fireflies / Outlook / SharePoint) and
 * falls back to the in-app meeting page.
 */
async function loadTodayMeetings(): Promise<BriefMeeting[]> {
  const supabase = createServiceClient();
  const anchor = new Date();
  anchor.setDate(anchor.getDate() - 1);

  const { data, error } = await supabase
    .from("document_metadata")
    .select(
      "id,title,date,created_at,captured_at,project,project_id,type,category,source_web_url,fireflies_link,meeting_link,url",
    )
    .or("type.eq.meeting,category.eq.meeting,type.eq.meeting_transcript")
    .or(
      `date.gte.${anchor.toISOString()},created_at.gte.${anchor.toISOString()},captured_at.gte.${anchor.toISOString()}`,
    )
    .order("date", { ascending: false, nullsFirst: false })
    .limit(30);

  if (error) {
    throw new Error(`Failed to load today's meetings: ${error.message}`);
  }

  const todayKey = easternDateKey(new Date());

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
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
    })
    .filter((meeting) => {
      const parsed = meeting.date ? new Date(meeting.date) : null;
      return parsed && !Number.isNaN(parsed.getTime())
        ? easternDateKey(parsed) === todayKey
        : false;
    })
    .slice(0, 10);
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
    const [dashboard, meetings] = await Promise.all([
      getExecutiveBriefingDashboard({
        windowDays: DEFAULT_EXECUTIVE_WINDOW_DAYS,
      }),
      loadTodayMeetings(),
    ]);
    const packet = dashboard.draft.packet;
    const operatingBrief = hydrateExecutiveOperatingBrief(packet);
    bodyHtml = buildBriefBody({ packet, operatingBrief, meetings });
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
