import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { EmptyState } from "@/components/ds";
import { ExecutiveBriefingRefreshButton } from "@/components/executive/executive-briefing-refresh-button";
import { ExecutiveBriefingWindowToggle } from "@/components/executive/executive-briefing-window-toggle";
import { ExecutiveChatSheet } from "@/components/executive/executive-chat-sheet";
import { ExecutiveSourceActivity } from "@/components/executive/executive-source-activity";
import {
  ExecutiveProjectIssueList,
  type ExecutiveProjectIssueEntry,
} from "@/components/executive/executive-project-issue-list";
import type { ExecutiveRelatedTask } from "@/components/executive/executive-signal-card";
import type { ExecutiveProjectOption } from "@/components/executive/executive-project-link-form";
import type { ExecutiveTaskAssigneeOption } from "@/components/executive/executive-task-draft-form";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getExecutiveBriefingDashboard,
  getFollowUpFingerprint,
  type ExecutiveBriefingFollowUp,
} from "@/lib/executive/executive-briefing-workflow";
import { clampDailyBriefWindowDays } from "@/lib/executive/daily-brief";
import {
  buildExecutiveOperatingBrief,
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  type BrandonBriefItem,
  type ExecutiveOperatingBrief,
  type ExecutiveOperatingBriefRiskItem,
  type ExecutiveOperatingBriefShortItem,
} from "@/lib/executive/brandon-daily-update";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Tone = NonNullable<BrandonBriefItem["tone"]>;

type MatchedTask = ExecutiveRelatedTask;

type TodayMeeting = {
  id: string;
  title: string;
  date: string | null;
  project: string | null;
  projectId: number | null;
  summary: string | null;
  durationMinutes: number | null;
};

type ExecutiveActionQueueEntry = {
  section:
    | "needsBrandon"
    | "waitingOnOthers"
    | "importantUpdates"
    | "carryForward";
  item: BrandonBriefItem;
  followUpId?: string;
  daysOpen?: number;
};

const LANE_LABELS: Record<
  keyof ExecutiveOperatingBrief["additionalMaterialItems"],
  string
> = {
  cashMargin: "Cash / Billing / Margin",
  scheduleField: "Schedule / Field",
  customerOwner: "Customer / Owner",
  subcontractorVendor: "Subcontractor / Vendor",
  designPreconstruction: "Design / Preconstruction",
  internalAccountability: "Internal Accountability",
};

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEasternDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

function formatMeetingTime(value: string | null) {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value)) return "Today";
  const date = parseDate(value);
  if (!date) return "Today";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function meetingHref(meeting: TodayMeeting) {
  return meeting.projectId
    ? `/${meeting.projectId}/meetings/${meeting.id}`
    : `/meetings/${meeting.id}`;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function actionQueueLabel(entry: ExecutiveActionQueueEntry) {
  if (entry.section === "needsBrandon") return "Needs decision";
  if (entry.section === "waitingOnOthers") return "Waiting on others";
  if (entry.section === "carryForward") {
    return entry.daysOpen
      ? `Carry-forward ${entry.daysOpen}d`
      : "Carry-forward";
  }
  return "FYI";
}

function actionQueueRank(section: ExecutiveActionQueueEntry["section"]) {
  if (section === "needsBrandon") return 0;
  if (section === "waitingOnOthers") return 1;
  if (section === "importantUpdates") return 2;
  return 3;
}

function normalizeProjectLabel(value: string) {
  return normalizeWhitespace(value || "No project linked");
}

function projectHrefFromItem(item: BrandonBriefItem) {
  const id = item.projectInternalId ?? projectIdFromLabel(item.project);
  return id ? `/${id}/home` : null;
}

function projectIdFromItem(item: BrandonBriefItem) {
  return item.projectInternalId ?? projectIdFromLabel(item.project);
}

function projectHrefFromLabel(value: string) {
  const projectId = projectIdFromLabel(value);
  return projectId ? `/${projectId}/home` : null;
}

function projectIdFromLabel(value: string) {
  // Legacy fallback: parse a leading numeric ID from the label string.
  const match = normalizeProjectLabel(value).match(/^(\d{2,5})\b/);
  return match ? Number(match[1]) : null;
}

function isUnlinkedProject(value: string) {
  return /no project linked/i.test(normalizeProjectLabel(value));
}

function queueDedupeKey(entry: ExecutiveActionQueueEntry) {
  const item = entry.item;
  return [
    item.sourceId ?? normalizeWhitespace(item.sourceDetail).toLowerCase(),
    normalizeProjectLabel(item.project).toLowerCase(),
    normalizeWhitespace(item.title).toLowerCase(),
  ].join("::");
}

function buildActionQueue(params: {
  sectionEntries: Array<{
    section: "needsBrandon" | "waitingOnOthers" | "importantUpdates";
    item: BrandonBriefItem;
  }>;
  staleFollowUps: ExecutiveBriefingFollowUp[];
  fingerprintMap: Map<string, ExecutiveBriefingFollowUp>;
}) {
  const entries: ExecutiveActionQueueEntry[] = [];
  const seen = new Map<string, ExecutiveActionQueueEntry>();
  const liveSourceIds = new Set<string>();
  for (const entry of params.sectionEntries) {
    if (entry.item.sourceId) liveSourceIds.add(entry.item.sourceId);
    const followUp = params.fingerprintMap.get(
      getFollowUpFingerprint(entry.item, entry.section),
    );
    const queueEntry: ExecutiveActionQueueEntry = {
      section: entry.section,
      item: entry.item,
      followUpId: followUp?.id,
      daysOpen: followUp?.daysOpen,
    };
    const key = queueDedupeKey(queueEntry);
    const existing = seen.get(key);
    if (
      !existing ||
      actionQueueRank(queueEntry.section) < actionQueueRank(existing.section)
    ) {
      seen.set(key, queueEntry);
    }
  }

  for (const followUp of params.staleFollowUps.slice(0, 6)) {
    if (followUp.source_id && liveSourceIds.has(followUp.source_id)) continue;
    const queueEntry: ExecutiveActionQueueEntry = {
      section: "carryForward",
      item: followUpToItem(followUp),
      followUpId: followUp.id,
      daysOpen: followUp.daysOpen,
    };
    const key = queueDedupeKey(queueEntry);
    if (!seen.has(key)) seen.set(key, queueEntry);
  }

  entries.push(...seen.values());
  return entries.sort((a, b) => {
    const rankDelta = actionQueueRank(a.section) - actionQueueRank(b.section);
    if (rankDelta !== 0) return rankDelta;
    if (isUnlinkedProject(a.item.project) !== isUnlinkedProject(b.item.project)) {
      return isUnlinkedProject(a.item.project) ? -1 : 1;
    }
    return normalizeProjectLabel(a.item.project).localeCompare(
      normalizeProjectLabel(b.item.project),
    );
  });
}

function followUpToItem(followUp: ExecutiveBriefingFollowUp): BrandonBriefItem {
  const payload = followUp.payload as Partial<BrandonBriefItem> | null;
  const source = (payload?.source as BrandonBriefItem["source"]) ?? "Document";
  const sourceDetail =
    followUp.source_detail ?? "Carry-forward executive follow-up";
  const sourceUrl = followUp.source_url ?? payload?.sourceUrl;
  const sourceId = followUp.source_id ?? payload?.sourceId;
  const evidence =
    typeof payload?.evidence === "string" ? payload.evidence : undefined;
  const date = followUp.source_date ?? followUp.last_seen_at;
  const citations =
    Array.isArray(payload?.citations) && payload.citations.length > 0
      ? payload.citations
      : [
          {
            source,
            sourceDetail,
            sourceUrl,
            sourceId,
            evidence,
            date,
          },
        ];

  return {
    title: followUp.title,
    summary: followUp.summary,
    bullets: Array.isArray(payload?.bullets)
      ? (payload.bullets as unknown[]).filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    recommendedAction:
      followUp.recommended_action ?? payload?.recommendedAction,
    whyItMatters: followUp.why_it_matters ?? payload?.whyItMatters,
    source,
    sourceDetail,
    sourceUrl,
    sourceId,
    evidence,
    date,
    citations,
    project: followUp.project_label ?? "Internal operations",
    owner: followUp.owner ?? payload?.owner,
    status:
      followUp.status ??
      `Open ${followUp.daysOpen} day${followUp.daysOpen === 1 ? "" : "s"}`,
    tone: (followUp.tone as Tone | null) ?? payload?.tone ?? "watch",
    retrieval:
      typeof payload?.retrieval === "string" ? payload.retrieval : undefined,
  };
}

// ── KPI Strip ─────────────────────────────────────────────────────────────────

// ── Section Divider ────────────────────────────────────────────────────────────

function SectionDivider({
  title,
  count,
}: {
  title: string;
  description?: string;
  count?: number;
}) {
  return (
    <SectionRuleHeading
      label={title}
      actions={
        count !== undefined ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {count}
          </span>
        ) : undefined
      }
    />
  );
}

function TodayMeetingsSection({ meetings }: { meetings: TodayMeeting[] }) {
  return (
    <section className="space-y-4">
      <SectionDivider title="Today's Meetings" count={meetings.length} />

      {meetings.length > 0 ? (
        <div className="divide-y divide-border">
          {meetings.map((meeting) => (
            <Link
              key={meeting.id}
              href={meetingHref(meeting)}
              className="block py-3 transition-colors hover:text-primary"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="text-xs font-medium leading-5 text-foreground">
                    {meeting.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatMeetingTime(meeting.date)}</span>
                    {meeting.project ? <span>{meeting.project}</span> : null}
                    {meeting.durationMinutes ? (
                      <span>{meeting.durationMinutes} min</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays />}
          title="No meetings found for today"
          description="No meeting records matched today's Eastern-time date."
          className="py-8"
        />
      )}
    </section>
  );
}

function ExecutiveBriefStartHere({
  brief,
}: {
  brief: ExecutiveOperatingBrief;
}) {
  return (
    <section className="space-y-4">
      <SectionDivider title="Start Here" />
      {brief.hasUnusualExecutiveLoad ? (
        <p className="text-sm font-medium text-destructive">
          Today has more than the usual number of executive-level items.
        </p>
      ) : null}
      <div className="space-y-2 text-sm leading-6 text-foreground">
        {brief.startHere.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}

function TopExecutiveFocusSection({
  brief,
}: {
  brief: ExecutiveOperatingBrief;
}) {
  return (
    <section className="space-y-4">
      <SectionDivider
        title="Top Executive Focus"
        count={brief.topExecutiveFocus.length}
      />
      <div className="divide-y divide-border/70">
        {brief.topExecutiveFocus.map((entry) => {
          const projectHref = projectHrefFromItem(entry.item);
          const sourceHref = entry.item.sourceUrl;
          return (
            <article
              key={`${entry.item.title}-${entry.item.sourceId ?? entry.item.sourceDetail}`}
              className="py-4 first:pt-0"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {projectHref ? (
                  <Link
                    href={projectHref}
                    className="font-medium text-primary hover:underline"
                  >
                    {entry.item.project}
                  </Link>
                ) : (
                  <span className="font-medium text-primary">
                    {entry.item.project}
                  </span>
                )}
                <span>{LANE_LABELS[entry.lane]}</span>
                {entry.owner ? <span>Owner: {entry.owner}</span> : null}
              </div>
              {sourceHref ? (
                <a
                  href={sourceHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-base font-semibold text-foreground hover:text-primary hover:underline"
                >
                  {entry.item.title}
                </a>
              ) : projectHref ? (
                <Link
                  href={projectHref}
                  className="mt-1 block text-base font-semibold text-foreground hover:text-primary hover:underline"
                >
                  {entry.item.title}
                </Link>
              ) : (
                <div className="mt-1 text-base font-semibold text-foreground">
                  {entry.item.title}
                </div>
              )}
              <dl className="mt-3 space-y-3 text-sm leading-6">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    What changed
                  </dt>
                  <dd>{entry.whatChanged}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Why it matters
                  </dt>
                  <dd>{entry.whyItMatters}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Recommended next move
                  </dt>
                  <dd>{entry.recommendedNextMove}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ShortItemList({
  items,
  empty,
}: {
  items: ExecutiveOperatingBriefShortItem[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="divide-y divide-border/70">
      {items.map((entry) => (
        <div
          key={`${entry.item.title}-${entry.item.sourceId ?? entry.item.sourceDetail}`}
          className="grid gap-2 py-3 text-sm leading-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.6fr)]"
        >
          <div>
            <div className="font-medium text-foreground">{entry.item.title}</div>
            <div className="text-xs text-muted-foreground">
              {entry.item.project}
              {entry.owner ? ` · Owner: ${entry.owner}` : ""}
            </div>
          </div>
          <div className="text-muted-foreground">{entry.nextAction}</div>
        </div>
      ))}
    </div>
  );
}

function AdditionalMaterialItemsSection({
  brief,
}: {
  brief: ExecutiveOperatingBrief;
}) {
  const lanes = Object.entries(brief.additionalMaterialItems).filter(
    ([, items]) => items.length > 0,
  ) as Array<
    [
      keyof ExecutiveOperatingBrief["additionalMaterialItems"],
      ExecutiveOperatingBriefShortItem[],
    ]
  >;

  return (
    <section className="space-y-5">
      <SectionDivider title="Additional Material Items" />
      {lanes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No material overflow items beyond the top focus set.
        </p>
      ) : (
        lanes.map(([lane, items]) => (
          <div key={lane} className="space-y-2">
            <div className="text-sm font-semibold text-foreground">
              {LANE_LABELS[lane]}
            </div>
            <ShortItemList
              items={items}
              empty={`No current ${LANE_LABELS[lane].toLowerCase()} items.`}
            />
          </div>
        ))
      )}
    </section>
  );
}

function RiskTable({
  title,
  items,
}: {
  title: string;
  items: ExecutiveOperatingBriefRiskItem[];
}) {
  return (
    <section className="space-y-4">
      <SectionDivider title={title} count={items.length} />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No current items.</p>
      ) : (
        <div className="overflow-hidden border-y border-border/70">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="py-2 pr-4 font-medium">Project / area</th>
                <th className="py-2 pr-4 font-medium">Risk</th>
                <th className="py-2 pr-4 font-medium">Impact</th>
                <th className="py-2 font-medium">Next action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {items.map((entry) => (
                <tr key={`${entry.item.title}-${entry.item.sourceId ?? entry.item.sourceDetail}`}>
                  <td className="py-3 pr-4 align-top text-muted-foreground">
                    {entry.item.project}
                  </td>
                  <td className="py-3 pr-4 align-top font-medium text-foreground">
                    {entry.item.title}
                  </td>
                  <td className="py-3 pr-4 align-top text-muted-foreground">
                    {entry.impact}
                  </td>
                  <td className="py-3 align-top text-muted-foreground">
                    {entry.nextAction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function WaitingSection({ brief }: { brief: ExecutiveOperatingBrief }) {
  return (
    <section className="space-y-5">
      <SectionDivider title="Waiting on Others / Others Waiting on Brandon" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            Brandon is waiting on
          </div>
          <ShortItemList
            items={brief.waitingOn.brandonWaitingOn}
            empty="No active blockers waiting on someone else."
          />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            Others are waiting on Brandon
          </div>
          <ShortItemList
            items={brief.waitingOn.othersWaitingOnBrandon}
            empty="No active owner decisions or approvals due."
          />
        </div>
      </div>
    </section>
  );
}

function BusinessSignalsSection({
  brief,
}: {
  brief: ExecutiveOperatingBrief;
}) {
  return (
    <section className="space-y-4">
      <SectionDivider title="Important Business Signals" />
      {brief.importantBusinessSignals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No pattern-level signal surfaced in this packet.
        </p>
      ) : (
        <ul className="space-y-2 text-sm leading-6 text-foreground">
          {brief.importantBusinessSignals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecommendedMovesSection({
  brief,
}: {
  brief: ExecutiveOperatingBrief;
}) {
  return (
    <section className="space-y-4">
      <SectionDivider title="Recommended Moves" count={brief.recommendedMoves.length} />
      <ol className="space-y-2 text-sm leading-6 text-foreground">
        {brief.recommendedMoves.map((move, index) => (
          <li key={`${move}-${index}`} className="flex gap-3">
            <span className="w-5 shrink-0 text-muted-foreground">
              {index + 1}.
            </span>
            <span>{move}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── Data Loading ───────────────────────────────────────────────────────────────

async function loadExecutiveActionContext(params: {
  items: BrandonBriefItem[];
}) {
  const metadataIds = Array.from(
    new Set(
      params.items
        .map((item) => item.sourceId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const supabase = createServiceClient();

  const [peopleResult, tasksResult, projectsResult] = await Promise.all([
    supabase
      .from("people")
      .select("id, first_name, last_name, email")
      .in("person_type", ["employee", "user"])
      .neq("status", "inactive")
      .order("first_name", { ascending: true }),
    metadataIds.length > 0
      ? supabase
          .from("tasks")
          .select(
            "id, title, description, status, priority, due_date, assignee_person_id, assignee_name, assignee_email, metadata_id, projects(name)",
          )
          .in("metadata_id", metadataIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("projects")
      .select("id, name, project_number")
      .eq("archived", false)
      .order("name", { ascending: true })
      .limit(500),
  ]);

  if (peopleResult.error) {
    throw new Error(
      `Failed to load executive assignees: ${peopleResult.error.message}`,
    );
  }

  if (tasksResult.error) {
    throw new Error(
      `Failed to load executive linked tasks: ${tasksResult.error.message}`,
    );
  }

  if (projectsResult.error) {
    throw new Error(
      `Failed to load executive project options: ${projectsResult.error.message}`,
    );
  }

  const employees: ExecutiveTaskAssigneeOption[] = (
    peopleResult.data ?? []
  ).map((person) => ({
    id: person.id,
    label:
      [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
      person.email ||
      "Unnamed user",
    email: person.email ?? null,
  }));

  const openTasks = ((tasksResult.data ?? []) as Array<Record<string, unknown>>)
    .map((task) => ({
      id: task.id as string,
      title: (task.title as string | null) ?? null,
      description: task.description as string,
      status: task.status as string,
      priority: (task.priority as string | null) ?? null,
      dueDate: (task.due_date as string | null) ?? null,
      assigneeName: (task.assignee_name as string | null) ?? null,
      assigneeEmail: (task.assignee_email as string | null) ?? null,
      assigneePersonId: (task.assignee_person_id as string | null) ?? null,
      metadataId: task.metadata_id as string,
      projectName:
        ((task.projects as { name?: string | null } | null)?.name as
          | string
          | null
          | undefined) ?? null,
    }))
    .filter(
      (task) =>
        ![
          "complete",
          "completed",
          "done",
          "resolved",
          "closed",
          "cancelled",
        ].includes(task.status.toLowerCase()),
    );

  const matchedTasksBySourceId = new Map<string, MatchedTask[]>();
  for (const task of openTasks) {
    matchedTasksBySourceId.set(task.metadataId, [
      ...(matchedTasksBySourceId.get(task.metadataId) ?? []),
      task,
    ]);
  }

  return {
    employees,
    matchedTasksBySourceId,
    projects: (projectsResult.data ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      projectNumber: project.project_number,
    })),
  };
}

async function loadTodayMeetings(): Promise<TodayMeeting[]> {
  const supabase = createServiceClient();
  const todayKey = getEasternDateKey(new Date());
  const recentAnchor = new Date();
  recentAnchor.setDate(recentAnchor.getDate() - 1);

  const { data, error } = await supabase
    .from("document_metadata")
    .select(
      "id,title,date,created_at,captured_at,project,project_id,summary,overview,duration_minutes,type,category",
    )
    .or("type.eq.meeting,category.eq.meeting,type.eq.meeting_transcript")
    .or(
      `date.gte.${recentAnchor.toISOString()},created_at.gte.${recentAnchor.toISOString()},captured_at.gte.${recentAnchor.toISOString()}`,
    )
    .order("date", { ascending: true, nullsFirst: false })
    .limit(30);

  if (error) {
    throw new Error(`Failed to load today's meetings: ${error.message}`);
  }

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      const date =
        (row.date as string | null) ??
        (row.captured_at as string | null) ??
        (row.created_at as string | null) ??
        null;
      return {
        id: row.id as string,
        title: (row.title as string | null) ?? "Untitled meeting",
        date,
        project: (row.project as string | null) ?? null,
        projectId: (row.project_id as number | null) ?? null,
        summary:
          ((row.summary as string | null) ?? (row.overview as string | null)) ||
          null,
        durationMinutes: (row.duration_minutes as number | null) ?? null,
      };
    })
    .filter((meeting) => {
      const parsed = parseDate(meeting.date);
      return parsed ? getEasternDateKey(parsed) === todayKey : false;
    })
    .slice(0, 8);
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ExecutiveDailyInsightsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const canViewExecutiveBriefing = await canCurrentUserAccessAppCapability(
    "view_executive_briefing",
  );

  if (!canViewExecutiveBriefing) {
    return (
      <AppCapabilityAccessDenied
        title="Executive briefing"
        description="This executive briefing is limited to users with executive briefing access."
      />
    );
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawWindowDays = Array.isArray(resolvedSearchParams.windowDays)
    ? resolvedSearchParams.windowDays[0]
    : resolvedSearchParams.windowDays;
  const requestedWindowDays = rawWindowDays ? Number(rawWindowDays) : NaN;
  const windowDays = Number.isFinite(requestedWindowDays)
    ? clampDailyBriefWindowDays(requestedWindowDays)
    : DEFAULT_EXECUTIVE_WINDOW_DAYS;

  const [dashboard, todayMeetings] = await Promise.all([
    getExecutiveBriefingDashboard({ windowDays }),
    loadTodayMeetings(),
  ]);
  const { draft, staleFollowUps, fingerprintMap } = dashboard;
  const packet = draft.packet;
  const operatingBrief =
    packet.operatingBrief ?? buildExecutiveOperatingBrief(packet.sections);
  const sectionEntries = [
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
  const openSectionEntries = sectionEntries.filter(({ item, section }) => {
    const followUp = fingerprintMap.get(getFollowUpFingerprint(item, section));
    return followUp?.state !== "resolved";
  });
  const actionQueueEntries = buildActionQueue({
    sectionEntries: openSectionEntries,
    staleFollowUps,
    fingerprintMap,
  });
  const { employees, matchedTasksBySourceId, projects } =
    await loadExecutiveActionContext({
      items: actionQueueEntries.map((entry) => entry.item),
    });
  const projectIssueEntries: ExecutiveProjectIssueEntry[] = actionQueueEntries.map(
    (entry) => {
      const item = entry.item;
      const relatedTasks = item.sourceId
        ? (matchedTasksBySourceId.get(item.sourceId) ?? [])
        : [];

      return {
        id: `${entry.section}-${item.title}-${item.sourceId ?? item.sourceDetail}`,
        section: entry.section,
        item,
        relatedTasks,
        followUpId: entry.followUpId,
        actionLabel:
          entry.section === "importantUpdates"
            ? undefined
            : actionQueueLabel(entry),
        projectHref: projectHrefFromItem(item),
        currentProjectId: projectIdFromItem(item),
      };
    },
  );
  const generatedAt = formatGeneratedAt(packet.generatedAt);

  return (
    <PageShell
      variant="detailWide"
      eyebrow="Executive briefing"
      title="Daily operating brief"
      description={`Prepared ${generatedAt} · ${packet.windowDays}-day window${
        packet.windowDays !== windowDays
          ? ` (selected: ${windowDays}-day — click Regenerate to apply)`
          : ""
      }`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/executive/capabilities">Brandon dashboard</Link>
          </Button>
          <ExecutiveBriefingWindowToggle windowDays={windowDays} />
          <ExecutiveBriefingRefreshButton windowDays={windowDays} />
          <ExecutiveChatSheet packet={packet} />
        </div>
      }
      contentClassName="pb-16"
    >
      <div className="grid grid-cols-1 gap-12 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-20 2xl:gap-24">
        {/* ── Main column ── */}
        <div className="space-y-8">
          <ExecutiveBriefStartHere brief={operatingBrief} />
          <TopExecutiveFocusSection brief={operatingBrief} />
          <AdditionalMaterialItemsSection brief={operatingBrief} />
          <RiskTable
            title="Project Risk Radar"
            items={operatingBrief.projectRiskRadar}
          />
          <RiskTable
            title="Cash and Margin Watch"
            items={operatingBrief.cashAndMarginWatch}
          />
          <WaitingSection brief={operatingBrief} />
          <section className="space-y-4">
            <SectionDivider
              title="People and Accountability"
              count={operatingBrief.peopleAndAccountability.length}
            />
            <ShortItemList
              items={operatingBrief.peopleAndAccountability}
              empty="No execution-critical accountability gaps surfaced."
            />
          </section>
          <BusinessSignalsSection brief={operatingBrief} />
          <RecommendedMovesSection brief={operatingBrief} />
          {operatingBrief.lowerPriorityMomentum.length > 0 ? (
            <section className="space-y-4">
              <SectionDivider
                title="Lower-Priority Momentum"
                count={operatingBrief.lowerPriorityMomentum.length}
              />
              <ShortItemList
                items={operatingBrief.lowerPriorityMomentum}
                empty="No lower-priority momentum items."
              />
            </section>
          ) : null}
          <SectionDivider title="Tasking Surface" count={projectIssueEntries.length} />
          <ExecutiveProjectIssueList
            entries={projectIssueEntries}
            employees={employees}
            projects={projects}
          />
        </div>

        {/* ── Right column: operating context ── */}
        <aside className="space-y-8 xl:sticky xl:top-6 xl:self-start">
          <TodayMeetingsSection meetings={todayMeetings} />
          <ExecutiveSourceActivity sources={packet.sourceCoverage} />
        </aside>
      </div>
    </PageShell>
  );
}
