import { CheckCircledIcon } from "@radix-ui/react-icons";
import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { PaymentGuardrailAlerts } from "@/components/accounting/payment-guardrail-alerts";
import { EmptyState } from "@/components/ds";
import { ExecutiveChatPanel } from "@/components/executive/executive-chat-panel";
import { ExecutiveSignalCard } from "@/components/executive/executive-signal-card";
import { ExecutiveSourceActivity } from "@/components/executive/executive-source-activity";
import type { ExecutiveTaskAssigneeOption } from "@/components/executive/executive-task-draft-form";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import { loadPaymentGuardrailAlerts } from "@/lib/accounting/payment-guardrails";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getExecutiveBriefingDashboard,
  type ExecutiveBriefingFollowUp,
} from "@/lib/executive/executive-briefing-workflow";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  type BrandonBriefItem,
} from "@/lib/executive/brandon-daily-update";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Tone = NonNullable<BrandonBriefItem["tone"]>;

type MatchedTask = {
  id: string;
  description: string;
  status: string;
  dueDate: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  metadataId: string;
  projectName: string | null;
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

function dedupeItems(items: BrandonBriefItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [item.title, item.project, item.sourceId ?? item.sourceDetail].join("::");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getFinancialItems(items: BrandonBriefItem[]) {
  return dedupeItems(
    items.filter((item) =>
      keywordHit(item, [
        "payment",
        "invoice",
        "retainage",
        "wire",
        "cash",
        "billing",
        "receivable",
        "payable",
        "lien",
        "collections",
        "approval",
      ]),
    ),
  ).slice(0, 5);
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
  return {
    title: followUp.title,
    summary: followUp.summary,
    bullets: Array.isArray(payload?.bullets) ? (payload.bullets as unknown[]).filter((value): value is string => typeof value === "string") : [],
    recommendedAction: followUp.recommended_action ?? payload?.recommendedAction,
    whyItMatters: followUp.why_it_matters ?? payload?.whyItMatters,
    source: (payload?.source as BrandonBriefItem["source"]) ?? "Document",
    sourceDetail: followUp.source_detail ?? "Carry-forward executive follow-up",
    sourceUrl: followUp.source_url ?? payload?.sourceUrl,
    sourceId: followUp.source_id ?? payload?.sourceId,
    evidence: typeof payload?.evidence === "string" ? payload.evidence : undefined,
    date: followUp.source_date ?? followUp.last_seen_at,
    project: followUp.project_label ?? "Internal operations",
    owner: followUp.owner ?? payload?.owner,
    status: followUp.status ?? `Open ${followUp.daysOpen} day${followUp.daysOpen === 1 ? "" : "s"}`,
    tone: (followUp.tone as Tone | null) ?? payload?.tone ?? "watch",
    retrieval: typeof payload?.retrieval === "string" ? payload.retrieval : undefined,
  };
}

// ── KPI Strip ─────────────────────────────────────────────────────────────────

// ── Section Divider ────────────────────────────────────────────────────────────

function SectionDivider({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <div className="border-t border-border pt-10">
      <SectionRuleHeading
        label={title}
        className="mb-1"
        actions={
          count !== undefined ? (
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {count} {count === 1 ? "item" : "items"}
            </span>
          ) : undefined
        }
      />
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

// ── Section Wrapper ────────────────────────────────────────────────────────────

function ExecutiveListSection({
  title,
  description,
  items,
  emptyTitle,
  employees,
  matchedTasksBySourceId,
}: {
  title: string;
  description: string;
  items: BrandonBriefItem[];
  emptyTitle: string;
  employees: ExecutiveTaskAssigneeOption[];
  matchedTasksBySourceId: Map<string, MatchedTask[]>;
}) {
  return (
    <section className="space-y-2">
      <SectionDivider title={title} description={description} count={items.length} />
      {items.length > 0 ? (
        <div>
          {items.map((item) => (
            <ExecutiveSignalCard
              key={`${item.title}-${item.sourceId ?? item.sourceDetail}`}
              item={item}
              employees={employees}
              hasMatchingTask={(item.sourceId ? matchedTasksBySourceId.get(item.sourceId) ?? [] : []).length > 0}
            />
          ))}
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

function CarryForwardSection({ followUps }: { followUps: ExecutiveBriefingFollowUp[] }) {
  return (
    <section className="space-y-5">
      <SectionDivider
        title="Carry-Forward Risks"
        description="Important follow-ups that are still open but did not make today's live packet."
        count={followUps.length}
      />

      {followUps.length > 0 ? (
        <div className="space-y-0">
          {followUps.map((followUp) => (
            <div key={followUp.id} className="space-y-2 border-t border-border/50 pt-5 first:border-t-0 first:pt-0 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0 bg-amber-500" />
                <Badge variant="outline" className="rounded-full text-xs">
                  {followUpSectionLabels[followUp.section] ?? followUp.section}
                </Badge>
                <span className="text-xs text-muted-foreground ml-1">
                  Open {followUp.daysOpen} day{followUp.daysOpen === 1 ? "" : "s"}
                </span>
              </div>
              <div className="text-sm font-semibold text-foreground">{followUp.title}</div>
              <p className="text-sm leading-6 text-muted-foreground">{followUp.summary}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {followUp.project_label ?? "Internal operations"}
                </span>
                <span>{followUp.owner ?? "No owner"}</span>
                <span>Last seen {formatGeneratedAt(followUp.last_seen_at)}</span>
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
          .select("id, description, status, due_date, assignee_name, assignee_email, metadata_id, projects(name)")
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
    throw new Error(`Failed to load executive assignees: ${peopleResult.error.message}`);
  }

  if (tasksResult.error) {
    throw new Error(`Failed to load executive linked tasks: ${tasksResult.error.message}`);
  }

  if (initiativeCardsResult.error) {
    throw new Error(
      `Failed to load operational improvement cards: ${initiativeCardsResult.error.message}`,
    );
  }

  const employees: ExecutiveTaskAssigneeOption[] = (peopleResult.data ?? []).map((person) => ({
    id: person.id,
    label: [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || person.email || "Unnamed user",
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
        ((task.projects as { name?: string | null } | null)?.name as string | null | undefined) ??
        null,
    }))
    .filter((task) => !["complete", "completed", "done", "resolved", "closed", "cancelled"].includes(task.status.toLowerCase()));

  const matchedTasksBySourceId = new Map<string, MatchedTask[]>();
  for (const task of openTasks) {
    matchedTasksBySourceId.set(task.metadataId, [...(matchedTasksBySourceId.get(task.metadataId) ?? []), task]);
  }

  const operationalImprovementCards = ((initiativeCardsResult.data ?? []) as Array<
    Record<string, unknown>
  >)
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

  const matchedImprovementCardsByLinkId = new Map<string, MatchedInitiativeCard[]>();
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

  const [dashboard, paymentGuardrailAlerts] = await Promise.all([
    getExecutiveBriefingDashboard({
      windowDays: DEFAULT_EXECUTIVE_WINDOW_DAYS,
    }),
    loadPaymentGuardrailAlerts(),
  ]);
  const { draft, staleFollowUps } = dashboard;
  const packet = draft.packet;
  const allItems = [
    ...packet.sections.needsBrandon,
    ...packet.sections.waitingOnOthers,
    ...packet.sections.importantUpdates,
  ];
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
  const shownInNeedsBrandon = packet.sections.needsBrandon;
  const shownInWaiting = packet.sections.waitingOnOthers;
  const shownAboveFinancial = [...shownInNeedsBrandon, ...shownInWaiting];
  const financialItems = excludeAlreadyShown(getFinancialItems(allItems), shownAboveFinancial);
  const importantUpdates = excludeAlreadyShown(
    packet.sections.importantUpdates,
    [...shownAboveFinancial, ...financialItems],
  );
  const financialAlertCount = financialItems.length + paymentGuardrailAlerts.length;

  return (
    <PageShell
      variant="detailWide"
      eyebrow="Executive briefing"
      title="Daily operating brief"
      description={`Prepared ${generatedAt} · ${packet.windowDays}-day window`}
      contentClassName="pb-16"
    >
      <div className="grid grid-cols-1 gap-12 xl:grid-cols-[1fr_300px]">
        {/* ── Main column ── */}
        <div className="space-y-14">
          <ExecutiveListSection
            title="Needs Brandon Today"
            description="Decisions and confirmations requiring owner-level input."
            items={packet.sections.needsBrandon}
            emptyTitle="No direct owner decisions queued"
            employees={employees}
            matchedTasksBySourceId={matchedTasksBySourceId}
          />

          <ExecutiveListSection
            title="Unblock Your People"
            description="Things the team is waiting on from vendors, clients, or internal approvals."
            items={packet.sections.waitingOnOthers}
            emptyTitle="No unblocks surfaced"
            employees={employees}
            matchedTasksBySourceId={matchedTasksBySourceId}
          />

          <ExecutiveListSection
            title="Financial"
            description="Cash movement, billing friction, retainage, payments, and approval risk."
            items={financialItems}
            emptyTitle="No financial alerts"
            employees={employees}
            matchedTasksBySourceId={matchedTasksBySourceId}
          />

          <ExecutiveListSection
            title="Project Signals"
            description="Important updates worth knowing, even if no immediate decision is needed."
            items={importantUpdates}
            emptyTitle="No project signals surfaced"
            employees={employees}
            matchedTasksBySourceId={matchedTasksBySourceId}
          />

          <CarryForwardSection followUps={staleFollowUps} />

          <section className="space-y-5">
            <SectionDivider
              title="Source Health"
              description="Recent coverage across the channels feeding this briefing."
            />
            <ExecutiveSourceActivity sources={packet.sourceCoverage} />
          </section>

          <ExecutiveChatPanel packet={packet} />
        </div>

        {/* ── Right column ── */}
        <aside className="space-y-8">
          <PaymentGuardrailAlerts
            alerts={paymentGuardrailAlerts}
            emptyMessage=""
          />
        </aside>
      </div>
    </PageShell>
  );
}
