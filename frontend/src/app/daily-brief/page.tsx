import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Lato, Montserrat, Oswald } from "next/font/google";

import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { PageShell } from "@/components/layout";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import {
  listDailyExecutiveBriefPackets,
  loadCurrentDailyExecutiveBriefPacket,
} from "@/lib/daily-briefs/canonical-packets";
import {
  loadMorningBriefRailTasks,
  type RailData,
} from "@/lib/daily-briefs/morning-brief-tasks";
import { createServiceClient } from "@/lib/supabase/service";

import { MorningBriefClient } from "../(main)/executive/morning-brief/morning-brief-client";
import {
  briefV3IssueKey,
  buildMorningBriefModel,
  type MBResolvedSeed,
} from "../(main)/executive/morning-brief/morning-brief-view-model";
import "../(main)/executive/morning-brief/morning-brief.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Daily Executive Brief",
  description:
    "Owner-facing daily executive brief — decisions, per-project status, and action items, each traced to its source.",
};

const displayFont = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mb-display",
  display: "swap",
});
const headFont = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mb-head",
  display: "swap",
});
const bodyFont = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-mb-body",
  display: "swap",
});
const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mb-mono",
  display: "swap",
});

const fontClassName = `${displayFont.variable} ${headFont.variable} ${bodyFont.variable} ${monoFont.variable}`;

function easternDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Keys of BriefV3 action items that appeared in yesterday's brief AND are still
 * open today. Used to render a quiet "Carried" badge so nothing pending silently
 * drops off the radar. Both days are keyed through the same `briefV3IssueKey`
 * so the sets can be intersected directly.
 */
async function loadCarriedIssueKeys(
  todayKey: string,
  todayIssueKeys: Set<string>,
): Promise<Set<string>> {
  try {
    const packets = await listDailyExecutiveBriefPackets(5);
    const prior = packets.find(
      (packet) => packet.businessDate && packet.businessDate < todayKey,
    );
    const priorBrief = prior?.brief;
    if (!priorBrief) return new Set();

    const carried = new Set<string>();
    for (const project of priorBrief.projects) {
      for (const item of project.actionItems) {
        const key = briefV3IssueKey(item.text, project.name);
        if (todayIssueKeys.has(key)) carried.add(key);
      }
    }
    return carried;
  } catch (error) {
    console.error("[daily-brief] could not load carried issue keys — badges disabled", error);
    return new Set();
  }
}

/**
 * Items resolved earlier today via the feedback loop (signal = "completed",
 * surface = "daily-brief"). Persists across reloads within the day. Fails soft
 * — a query error yields an empty seed so the brief still renders.
 */
async function loadResolvedToday(todayKey: string): Promise<MBResolvedSeed[]> {
  try {
    const supabase = createServiceClient();
    const startIso = new Date(`${todayKey}T00:00:00-04:00`).toISOString();
    const { data, error } = await supabase
      .from("ai_feedback_events")
      .select("subject_id, after_snapshot, created_at")
      .eq("surface", "daily-brief")
      .eq("signal", "completed")
      .gte("created_at", startIso)
      .order("created_at", { ascending: false });
    if (error || !data) {
      if (error) console.error("[daily-brief] loadResolvedToday query failed", error);
      return [];
    }

    const seen = new Set<string>();
    const seed: MBResolvedSeed[] = [];
    for (const row of data as Array<Record<string, unknown>>) {
      const key = String(row.subject_id ?? "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const snapshot = (row.after_snapshot ?? {}) as {
        title?: string | null;
        project?: string | null;
      };
      seed.push({
        id: key,
        project: snapshot.project ?? "",
        text: snapshot.title ?? "Resolved item",
      });
    }
    return seed;
  } catch (err) {
    console.error("[daily-brief] loadResolvedToday unexpected failure", err);
    return [];
  }
}

/**
 * Standalone Daily Executive Brief — an editorial, source-backed morning read
 * for the owner. Reads the canonical BriefV3 packet, adds carryover from
 * yesterday's brief, hydrates "Resolved today" from `ai_feedback_events`, and
 * hands the shaped model to the interactive Morning Brief client (the two-
 * column layout with a real task rail).
 *
 * Gated by the `view_executive_briefing` capability — it exposes owner-level
 * decisions, financial and schedule risk, and per-project detail.
 */
export default async function DailyBriefPage() {
  const canView = await canCurrentUserAccessAppCapability("view_executive_briefing");

  if (!canView) {
    return (
      <AppCapabilityAccessDenied
        title="Daily Executive Brief"
        description="This executive brief is limited to users with executive briefing access."
      />
    );
  }

  try {
    const todayKey = easternDateKey(new Date());
    const packet = await loadCurrentDailyExecutiveBriefPacket();

    const todayIssueKeys = new Set<string>();
    for (const project of packet.brief?.projects ?? []) {
      for (const item of project.actionItems) {
        todayIssueKeys.add(briefV3IssueKey(item.text, project.name));
      }
    }

    const [carriedIssueKeys, resolvedSeed] = await Promise.all([
      loadCarriedIssueKeys(todayKey, todayIssueKeys),
      loadResolvedToday(todayKey),
    ]);

    const model = buildMorningBriefModel(packet, { carriedIssueKeys, resolvedSeed });
    let rail: RailData;
    try {
      rail = await loadMorningBriefRailTasks(model.businessDate);
    } catch (railError) {
      console.error("[daily-brief] failed to load rail tasks — degrading to empty rail", railError);
      rail = { your: [], team: [], brandonPersonId: null };
    }

    return (
      <PageShell
        variant="table"
        title="Daily Executive Brief"
        showHeader={false}
        containerPaddingClassName="p-0"
        contentClassName="p-0"
      >
        <div className={fontClassName}>
          <div className="morning-brief">
            <MorningBriefClient model={model} rail={rail} />
          </div>
        </div>
      </PageShell>
    );
  } catch (error) {
    console.error("[daily-brief] failed to build brief", error);
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Couldn&apos;t load today&apos;s brief
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Today&apos;s executive brief hasn&apos;t been generated yet, or no material items
          surfaced in the current window. Check back after the next daily run, or open the
          operating brief at{" "}
          <Link href="/executive" className="text-primary hover:underline">
            /executive
          </Link>
          .
        </p>
      </div>
    );
  }
}
