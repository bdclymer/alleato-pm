import type { Metadata } from "next";
import Link from "next/link";
import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import { createServiceClient } from "@/lib/supabase/service";
import { getExecutiveBriefingDashboard } from "@/lib/executive/executive-briefing-workflow";
import { buildCanonicalOperatingPacket } from "@/lib/executive/canonical-operating-packet";
import { listDailyExecutiveBriefPackets } from "@/lib/daily-briefs/canonical-packets";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  hydrateExecutiveOperatingBrief,
} from "@/lib/executive/brandon-daily-update";
import { DailyBriefView } from "./daily-brief-view";
import { itemKey } from "./brief-format";
import {
  buildBriefModel,
  type BriefResolvedVM,
  type DailyBriefTaskInput,
} from "./brief-model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Daily Executive Brief",
  description:
    "Owner-facing daily executive brief — decisions, per-project status, and action items, each traced to its source.",
};

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
 * Item keys that were open yesterday AND are still open today — surfaced as a
 * quiet "Carried" marker so nothing pending silently drops off the radar. Both
 * days are routed through the SAME canonical mapper, so their item keys are
 * computed identically and can be matched.
 */
async function loadCarriedKeys(
  todayKey: string,
  todayOpenKeys: Set<string>,
): Promise<Set<string>> {
  const packets = await listDailyExecutiveBriefPackets(60);
  const prior = packets.find(
    (packet) => packet.businessDate && packet.businessDate < todayKey,
  );
  if (!prior) return new Set();

  const yesterday = await buildCanonicalOperatingPacket(prior);
  const carried = new Set<string>();
  for (const item of [
    ...yesterday.sections.needsBrandon,
    ...yesterday.sections.waitingOnOthers,
  ]) {
    const key = itemKey(item);
    if (todayOpenKeys.has(key)) carried.add(key);
  }
  return carried;
}

/**
 * Items resolved earlier today via the feedback loop (signal = "completed",
 * surface = "daily-brief"). This makes "Resolved today" persist across reloads
 * within the day. Fails soft — a query error just yields an empty set so the
 * brief still renders.
 */
async function loadResolvedToday(
  todayKey: string,
): Promise<{ keys: Set<string>; seed: BriefResolvedVM[] }> {
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
    if (error || !data) return { keys: new Set(), seed: [] };

    const keys = new Set<string>();
    const seed: BriefResolvedVM[] = [];
    for (const row of data as Array<Record<string, unknown>>) {
      const key = String(row.subject_id ?? "");
      if (!key || keys.has(key)) continue;
      keys.add(key);
      const snapshot = (row.after_snapshot ?? {}) as {
        title?: string | null;
        project?: string | null;
      };
      seed.push({
        key,
        title: snapshot.title ?? "Resolved item",
        project: snapshot.project ?? null,
        summary: "",
      });
    }
    return { keys, seed };
  } catch {
    return { keys: new Set(), seed: [] };
  }
}

/** Format a task due date into the brief's owner-facing pill label. */
function formatDueLabel(due: string | null | undefined): string | null {
  if (!due) return null;
  const label = new Date(`${due}T00:00:00-04:00`);
  if (Number.isNaN(label.getTime())) return null;
  const short = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(label);
  return due < easternDateKey(new Date()) ? `OVERDUE · ${short}` : `Due ${short}`;
}

/**
 * The real tasks the daily deep read created for its most recent run. These are
 * the shared operating record (also shown on /tasks); when present they drive
 * the brief's "your"/"team" action lists instead of the review-gated candidates.
 * Fails soft — a query error yields an empty list and the brief falls back.
 */
async function loadDeepReadTasks(): Promise<DailyBriefTaskInput[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, priority, due_date, assignee_name, project_id, status, extraction_metadata")
      .eq("source_system", "daily_deep_read")
      .neq("status", "completed");
    if (error || !data?.length) return [];

    const rows = data as Array<Record<string, unknown>>;
    const businessDateOf = (row: Record<string, unknown>) =>
      String((row.extraction_metadata as { business_date?: string } | null)?.business_date ?? "");
    // Only the most recent deep-read run drives the brief's action lists.
    const latest = rows.map(businessDateOf).filter(Boolean).sort().pop() ?? "";
    const current = rows.filter((row) => businessDateOf(row) === latest);

    const projectIds = Array.from(
      new Set(current.map((row) => row.project_id).filter((id): id is number => id != null)),
    );
    const projectNames = new Map<number, string>();
    if (projectIds.length) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds);
      for (const project of projects ?? []) {
        projectNames.set(Number(project.id), String(project.name ?? ""));
      }
    }

    return current
      .map((row) => {
        const meta = (row.extraction_metadata ?? {}) as { category?: string };
        const projectId = row.project_id != null ? Number(row.project_id) : null;
        return {
          id: String(row.id),
          title: String(row.title ?? ""),
          category: meta.category === "brandon" ? "brandon" : "team",
          assigneeName: (row.assignee_name as string | null) ?? null,
          projectName: projectId != null ? projectNames.get(projectId) ?? null : null,
          projectId,
          priority: (row.priority as string | null) ?? null,
          due: formatDueLabel(row.due_date as string | null),
        } satisfies DailyBriefTaskInput;
      })
      .filter((task) => task.title.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * Standalone Daily Executive Brief — an editorial, source-backed morning read
 * for the owner. Bound to the canonical executive-brief packet
 * (`intelligence_packets`, target `daily-executive-brief`), the same deep-read
 * data that powers /executive. Rendered as real interactive React: every item
 * can be resolved, rated for the AI loop, or turned into a task, and each claim
 * links to its real source.
 *
 * Gated by the `view_executive_briefing` capability — it exposes owner-level
 * decisions, financial and schedule risk, and per-project detail.
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

  try {
    const todayKey = easternDateKey(new Date());

    const dashboard = await getExecutiveBriefingDashboard({
      windowDays: DEFAULT_EXECUTIVE_WINDOW_DAYS,
    });
    const packet = dashboard.draft.packet;
    const operatingBrief = hydrateExecutiveOperatingBrief(packet);

    const todayOpenKeys = new Set(
      [
        ...packet.sections.needsBrandon,
        ...packet.sections.waitingOnOthers,
        ...packet.sections.importantUpdates,
      ].map((item) => itemKey(item)),
    );

    const [carriedKeys, resolved, deepReadTasks] = await Promise.all([
      loadCarriedKeys(todayKey, todayOpenKeys),
      loadResolvedToday(todayKey),
      loadDeepReadTasks(),
    ]);

    const model = buildBriefModel({
      packet,
      operatingBrief,
      carriedKeys,
      resolvedKeys: resolved.keys,
      resolvedSeed: resolved.seed,
      preparedFor: "Brandon",
      tasks: deepReadTasks,
    });

    return (
      <div className="min-h-screen bg-background">
        <DailyBriefView model={model} />
      </div>
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
