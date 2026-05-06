import { CheckCircledIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { PaymentGuardrailAlerts } from "@/components/accounting/payment-guardrail-alerts";
import { EmptyState } from "@/components/ds";
import { ExecutiveChatSheet } from "@/components/executive/executive-chat-sheet";
import {
  ExecutiveSignalCard,
  type ExecutiveRelatedTask,
} from "@/components/executive/executive-signal-card";
import { ExecutiveSourceActivity } from "@/components/executive/executive-source-activity";
import type { ExecutiveTaskAssigneeOption } from "@/components/executive/executive-task-draft-form";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import { loadPaymentGuardrailAlerts } from "@/lib/accounting/payment-guardrails";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getExecutiveBriefingDashboard,
  getFollowUpFingerprint,
  type ExecutiveBriefingFollowUp,
} from "@/lib/executive/executive-briefing-workflow";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  type BrandonBriefItem,
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

type MatchedInitiativeCard = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: string | null;
  source: string;
  linkId: string | null;
  linkType: string | null;
};

type OperationalSignal = {
  item: BrandonBriefItem;
  linkId: string | null;
  linkType: "executive_source" | "executive_follow_up";
};

const followUpSectionLabels: Record<string, string> = {
  needsBrandon: "Needs Brandon",
  waitingOnOthers: "Waiting on others",
  importantUpdates: "Business signal",
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

function keywordHit(item: BrandonBriefItem, keywords: string[]) {
  const haystack = normalizeWhitespace(
    [
      item.title,
      item.summary,
      item.recommendedAction,
      item.whyItMatters,
      ...item.bullets,
      item.project,
      item.owner,
      item.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  );

  return keywords.some((keyword) => haystack.includes(keyword));
}

function itemKey(item: BrandonBriefItem) {
  return `${item.title}::${item.sourceId ?? item.sourceDetail}`;
}

function excludeAlreadyShown(
  items: BrandonBriefItem[],
  shown: BrandonBriefItem[],
): BrandonBriefItem[] {
  const shownKeys = new Set(shown.map(itemKey));
  return items.filter((item) => !shownKeys.has(itemKey(item)));
}

function buildOperationalSignals(params: {
  liveItems: BrandonBriefItem[];
  staleFollowUps: ExecutiveBriefingFollowUp[];
}) {
  const rawSignals: OperationalSignal[] = [
    ...params.liveItems.map((item) => ({
      item,
      linkId: item.sourceId ?? null,
      linkType: "executive_source" as const,
    })),
    ...params.staleFollowUps.map((followUp) => ({
      item: followUpToItem(followUp),
      linkId: followUp.id,
      linkType: "executive_follow_up" as const,
    })),
  ].filter(({ item }) =>
    keywordHit(item, [
      "insurance",
      "license",
      "licensing",
      "permit",
      "coi",
      "background",
      "employee",
      "termination",
      "laptop",
      "property",
      "access",
      "compliance",
      "renewal",
    ]),
  );

  const deduped = new Map<string, OperationalSignal>();
  for (const signal of rawSignals) {
    const key = [
      signal.item.title,
      signal.item.project,
      signal.linkId ?? signal.item.sourceDetail,
      signal.linkType,
    ].join("::");
    if (!deduped.has(key)) {
      deduped.set(key, signal);
    }
  }

  return Array.from(deduped.values()).slice(0, 6);
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

// ── Section Wrapper ────────────────────────────────────────────────────────────

function ExecutiveListSection({
  title,
  items,
  emptyTitle,
  employees,
  matchedTasksBySourceId,
  followUpsByItemKey,
}: {
  sectionKey: "needsBrandon" | "waitingOnOthers" | "importantUpdates";
  title: string;
  description?: string;
  items: BrandonBriefItem[];
  emptyTitle: string;
  employees: ExecutiveTaskAssigneeOption[];
  matchedTasksBySourceId: Map<string, MatchedTask[]>;
  followUpsByItemKey: Map<string, ExecutiveBriefingFollowUp>;
}) {
  return (
    <section className="space-y-4">
      <SectionDivider title={title} count={items.length} />
      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) =>
            (() => {
              const relatedTasks = item.sourceId
                ? (matchedTasksBySourceId.get(item.sourceId) ?? [])
                : [];
              return (
                <ExecutiveSignalCard
                  key={`${item.title}-${item.sourceId ?? item.sourceDetail}`}
                  item={item}
                  employees={employees}
                  hasMatchingTask={relatedTasks.length > 0}
                  relatedTasks={relatedTasks}
                  followUpId={followUpsByItemKey.get(itemKey(item))?.id}
                />
              );
            })(),
          )}
        </div>
      ) : (
        <EmptyState
          icon={<CheckCircledIcon />}
          title={emptyTitle}
          description="Nothing high-confidence surfaced here in the current packet."
          className="py-8"
        />
      )}
    </section>
  );
}

function CarryForwardSection({
  followUps,
}: {
  followUps: ExecutiveBriefingFollowUp[];
}) {
  return (
    <section className="space-y-5">
      <SectionDivider title="Carry-Forward Risks" count={followUps.length} />

      {followUps.length > 0 ? (
        <div className="space-y-0">
          {followUps.map((followUp) => (
            <div
              key={followUp.id}
              className="space-y-2 border-t border-border/50 pt-5 first:border-t-0 first:pt-0 pb-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0 bg-status-warning" />
                <Badge variant="outline" className="rounded-full text-xs">
                  {followUpSectionLabels[followUp.section] ?? followUp.section}
                </Badge>
                <span className="text-xs text-muted-foreground ml-1">
                  Open {followUp.daysOpen} day
                  {followUp.daysOpen === 1 ? "" : "s"}
                </span>
              </div>
              <div className="text-sm font-semibold text-foreground">
                {followUp.title}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {followUp.summary}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {followUp.project_label ?? "Internal operations"}
                </span>
                <span>{followUp.owner ?? "No owner"}</span>
                <span>
                  Last seen {formatGeneratedAt(followUp.last_seen_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CheckCircledIcon />}
          title="No carry-forward risks"
          description="All current executive follow-ups are represented in the live brief."
          className="py-10"
        />
      )}
    </section>
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
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
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

// ── Data Loading ───────────────────────────────────────────────────────────────

async function loadExecutiveActionContext(params: {
  items: BrandonBriefItem[];
  operationalSignals: OperationalSignal[];
}) {
  const metadataIds = Array.from(
    new Set(
      params.items
        .map((item) => item.sourceId)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const operationalLinkIds = Array.from(
    new Set(
      params.operationalSignals
        .map((signal) => signal.linkId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const supabase = createServiceClient();

  const [peopleResult, tasksResult, initiativeCardsResult] = await Promise.all([
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
            "id, description, status, due_date, assignee_name, assignee_email, metadata_id, projects(name)",
          )
          .in("metadata_id", metadataIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    operationalLinkIds.length > 0
      ? supabase
          .from("initiative_cards")
          .select(
            "id, title, description, status, priority, due_date, assignee, source, linked_record_id, linked_record_type, labels",
          )
          .in("linked_record_id", operationalLinkIds)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
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

  if (initiativeCardsResult.error) {
    throw new Error(
      `Failed to load operational improvement cards: ${initiativeCardsResult.error.message}`,
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
      description: task.description as string,
      status: task.status as string,
      dueDate: (task.due_date as string | null) ?? null,
      assigneeName: (task.assignee_name as string | null) ?? null,
      assigneeEmail: (task.assignee_email as string | null) ?? null,
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

  const operationalImprovementCards = (
    (initiativeCardsResult.data ?? []) as Array<Record<string, unknown>>
  )
    .map((card) => ({
      id: card.id as string,
      title: card.title as string,
      description: (card.description as string | null) ?? null,
      status: card.status as string,
      priority: card.priority as string,
      dueDate: (card.due_date as string | null) ?? null,
      assignee: (card.assignee as string | null) ?? null,
      source: (card.source as string | null) ?? "manual",
      linkId: (card.linked_record_id as string | null) ?? null,
      linkType: (card.linked_record_type as string | null) ?? null,
    }))
    .filter((card) => card.linkId);

  const matchedImprovementCardsByLinkId = new Map<
    string,
    MatchedInitiativeCard[]
  >();
  for (const card of operationalImprovementCards) {
    if (!card.linkId) continue;
    matchedImprovementCardsByLinkId.set(card.linkId, [
      ...(matchedImprovementCardsByLinkId.get(card.linkId) ?? []),
      card,
    ]);
  }

  return {
    employees,
    openTasks,
    matchedTasksBySourceId,
    operationalImprovementCards,
    matchedImprovementCardsByLinkId,
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

export default async function ExecutiveDailyInsightsPage() {
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

  const [dashboard, paymentGuardrailAlerts, todayMeetings] = await Promise.all([
    getExecutiveBriefingDashboard({
      windowDays: DEFAULT_EXECUTIVE_WINDOW_DAYS,
    }),
    loadPaymentGuardrailAlerts(),
    loadTodayMeetings(),
  ]);
  const { draft, staleFollowUps, fingerprintMap } = dashboard;
  const packet = draft.packet;
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
  const followUpsByItemKey = new Map<string, ExecutiveBriefingFollowUp>();
  for (const { item, section } of openSectionEntries) {
    const followUp = fingerprintMap.get(getFollowUpFingerprint(item, section));
    if (followUp) followUpsByItemKey.set(itemKey(item), followUp);
  }
  const allItems = openSectionEntries.map(({ item }) => item);
  const visibleSections = {
    needsBrandon: openSectionEntries
      .filter((entry) => entry.section === "needsBrandon")
      .map((entry) => entry.item),
    waitingOnOthers: openSectionEntries
      .filter((entry) => entry.section === "waitingOnOthers")
      .map((entry) => entry.item),
    importantUpdates: openSectionEntries
      .filter((entry) => entry.section === "importantUpdates")
      .map((entry) => entry.item),
  };
  const operationalSignals = buildOperationalSignals({
    liveItems: allItems,
    staleFollowUps,
  });
  const {
    employees,
    openTasks,
    matchedTasksBySourceId,
    operationalImprovementCards,
  } = await loadExecutiveActionContext({
    items: allItems,
    operationalSignals,
  });
  const generatedAt = formatGeneratedAt(packet.generatedAt);
  const shownInNeedsBrandon = visibleSections.needsBrandon;
  const shownInWaiting = visibleSections.waitingOnOthers;
  const shownAboveProjectSignals = [...shownInNeedsBrandon, ...shownInWaiting];
  const importantUpdates = excludeAlreadyShown(
    visibleSections.importantUpdates,
    shownAboveProjectSignals,
  );
  const topStaleFollowUps = staleFollowUps.slice(0, 5);

  return (
    <PageShell
      variant="detailWide"
      eyebrow="Executive briefing"
      title="Daily operating brief"
      description={`Prepared ${generatedAt} · ${packet.windowDays}-day window`}
      actions={<ExecutiveChatSheet packet={packet} />}
      contentClassName="pb-16"
    >
      <div className="grid grid-cols-1 gap-12 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Main column ── */}
        <div className="space-y-8">
          <ExecutiveListSection
            sectionKey="needsBrandon"
            title="Needs Brandon Today"
            items={visibleSections.needsBrandon}
            emptyTitle="No direct owner decisions queued"
            employees={employees}
            matchedTasksBySourceId={matchedTasksBySourceId}
            followUpsByItemKey={followUpsByItemKey}
          />

          <ExecutiveListSection
            sectionKey="waitingOnOthers"
            title="Unblock Your People"
            items={visibleSections.waitingOnOthers}
            emptyTitle="No unblocks surfaced"
            employees={employees}
            matchedTasksBySourceId={matchedTasksBySourceId}
            followUpsByItemKey={followUpsByItemKey}
          />

          <ExecutiveListSection
            sectionKey="importantUpdates"
            title="Project Signals"
            items={importantUpdates}
            emptyTitle="No project signals surfaced"
            employees={employees}
            matchedTasksBySourceId={matchedTasksBySourceId}
            followUpsByItemKey={followUpsByItemKey}
          />

          <CarryForwardSection followUps={topStaleFollowUps} />

          <PaymentGuardrailAlerts
            alerts={paymentGuardrailAlerts}
            emptyMessage=""
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
