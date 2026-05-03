import Link from "next/link";
import {
  ArrowTopRightIcon,
  CheckCircledIcon,
} from "@radix-ui/react-icons";
import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { PaymentGuardrailAlerts } from "@/components/accounting/payment-guardrail-alerts";
import { EmptyState } from "@/components/ds";
import { InfoAlert } from "@/components/ds/InfoAlert";
import { ExecutiveChatPanel } from "@/components/executive/executive-chat-panel";
import { OperationalImprovementDraftForm } from "@/components/executive/operational-improvement-draft-form";
import { ExecutiveSourceActivity } from "@/components/executive/executive-source-activity";
import {
  ExecutiveTaskDraftForm,
  type ExecutiveTaskAssigneeOption,
} from "@/components/executive/executive-task-draft-form";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

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

const toneAccentClass: Record<Tone, string> = {
  risk: "border-l-[3px] border-destructive",
  watch: "border-l-[3px] border-warning",
  good: "border-l-[3px] border-status-success",
  neutral: "border-l-[3px] border-border",
};

const toneBgClass: Record<Tone, string> = {
  risk: "bg-destructive/5",
  watch: "bg-warning/5",
  good: "bg-success/5",
  neutral: "bg-muted/30",
};

const toneLabelClass: Record<Tone, string> = {
  risk: "text-destructive",
  watch: "text-status-warning",
  good: "text-status-success",
  neutral: "text-muted-foreground",
};

const toneBadgeVariants: Record<
  Tone,
  "outline" | "secondary" | "warning" | "destructive"
> = {
  neutral: "outline",
  good: "secondary",
  watch: "warning",
  risk: "destructive",
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

function formatTaskDate(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
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

function toOperationalPriority(
  tone: Tone | null | undefined,
): "urgent" | "high" | "medium" | "low" {
  if (tone === "risk") return "urgent";
  if (tone === "watch") return "high";
  if (tone === "good") return "low";
  return "medium";
}

function humanizeCardStatus(value: string) {
  return value.replace(/_/g, " ");
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
    bullets: Array.isArray(payload?.bullets) ? payload!.bullets.filter((value): value is string => typeof value === "string") : [],
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

function SourceMeta({ item }: { item: BrandonBriefItem }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{item.source}</span>
      <span>{item.sourceDetail}</span>
      <span>{item.date}</span>
      <span className="font-medium text-foreground">{item.project}</span>
      {item.sourceUrl ? (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
        >
          Open source
          <ArrowTopRightIcon className="h-3 w-3" />
        </a>
      ) : null}
      {!item.sourceUrl && item.sourceId ? <span>Source ID {item.sourceId}</span> : null}
    </div>
  );
}

// ── KPI Strip ─────────────────────────────────────────────────────────────────

function KpiStrip({
  needsBrandonCount,
  inFlightCount,
  financialCount,
  carryForwardCount,
  improvementsCount,
  generatedAt,
  windowDays,
}: {
  needsBrandonCount: number;
  inFlightCount: number;
  financialCount: number;
  carryForwardCount: number;
  improvementsCount: number;
  generatedAt: string;
  windowDays: number;
}) {
  const metrics = [
    {
      value: needsBrandonCount,
      label: "Needs Brandon",
      urgent: needsBrandonCount > 0,
    },
    {
      value: inFlightCount,
      label: "In flight",
      urgent: false,
    },
    {
      value: financialCount,
      label: "Financial alerts",
      urgent: financialCount > 0,
    },
    {
      value: carryForwardCount,
      label: "Carry-forward",
      urgent: carryForwardCount > 3,
    },
    {
      value: improvementsCount,
      label: "Improvements",
      urgent: false,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="rounded-full text-xs">
          Executive report
        </Badge>
        <span>Prepared {generatedAt}</span>
        <span>&middot;</span>
        <span>
          {windowDays}-day window
        </span>
        <span className="ml-auto">
          <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
            <Link href="/actions">Manual actions</Link>
          </Button>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="bg-background px-5 py-4"
          >
            <div
              className={cn(
                "text-3xl font-semibold tracking-tight tabular-nums",
                metric.urgent && metric.value > 0
                  ? "text-destructive"
                  : "text-foreground",
              )}
            >
              {metric.value}
            </div>
            <div className="mt-1 text-xs font-medium text-muted-foreground">
              {metric.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

// ── Action Card (Needs Brandon) ────────────────────────────────────────────────

function ExecutiveActionCard({
  item,
  employees,
  matchedTasks,
}: {
  item: BrandonBriefItem;
  employees: ExecutiveTaskAssigneeOption[];
  matchedTasks: MatchedTask[];
}) {
  const tone = item.tone ?? "neutral";

  return (
    <article
      className={cn(
        "rounded-xl pl-4 pr-5 py-5",
        toneBgClass[tone],
        toneAccentClass[tone],
      )}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_300px]">
        {/* Left: signal content */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("text-xs font-semibold uppercase tracking-widest", toneLabelClass[tone])}>
                {tone === "risk" ? "Risk" : tone === "watch" ? "Watch" : tone === "good" ? "Good" : "Update"}
              </span>
              {item.status ? (
                <Badge variant={toneBadgeVariants[tone]} className="rounded-full">
                  {item.status}
                </Badge>
              ) : null}
            </div>
            <div className="text-base font-semibold leading-snug text-foreground">
              {item.title}
            </div>
            <p className="text-sm leading-6 text-foreground/80">{item.summary}</p>
          </div>

          {item.bullets.length > 0 ? (
            <ul className="grid gap-2 text-sm leading-6 text-foreground/75 md:grid-cols-2">
              {item.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/30" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {item.recommendedAction ? (
            <InfoAlert variant="info">
              <span>
                <span className="font-semibold">Recommended next move: </span>
                {item.recommendedAction}
              </span>
            </InfoAlert>
          ) : null}

          {item.whyItMatters ? (
            <InfoAlert variant="warning">
              <span>
                <span className="font-semibold">Why this matters: </span>
                {item.whyItMatters}
              </span>
            </InfoAlert>
          ) : null}

          <SourceMeta item={item} />
        </div>

        {/* Right: action panel */}
        <div className="space-y-4 border-t border-border/50 pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          {item.owner ? (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Owner
              </div>
              <div className="text-sm font-medium text-foreground">{item.owner}</div>
            </div>
          ) : null}

          <ExecutiveTaskDraftForm
            sourceId={item.sourceId}
            title={item.title}
            description={item.recommendedAction ?? item.summary}
            employees={employees}
            hasMatchingTask={matchedTasks.length > 0}
          />

          {matchedTasks.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                In-flight tasks
              </div>
              <div className="space-y-2">
                {matchedTasks.map((task) => (
                  <div key={task.id} className="rounded-lg bg-background/60 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium text-foreground">
                        {task.assigneeName ?? task.assigneeEmail ?? "Unassigned"}
                      </div>
                      <Badge variant="outline" className="rounded-full text-xs">
                        {task.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {task.description}
                    </p>
                    <div className="mt-1.5 text-xs text-muted-foreground">
                      Due {formatTaskDate(task.dueDate)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

// ── Simple List Item ───────────────────────────────────────────────────────────

function SignalListItem({ item }: { item: BrandonBriefItem }) {
  const tone = item.tone ?? "neutral";
  return (
    <article
      className={cn(
        "rounded-lg px-4 py-4 pl-4",
        toneBgClass[tone],
        toneAccentClass[tone],
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-[10px] font-semibold uppercase tracking-widest", toneLabelClass[tone])}>
              {tone === "risk" ? "Risk" : tone === "watch" ? "Watch" : tone === "good" ? "Good" : "Update"}
            </span>
          </div>
          <div className="text-sm font-semibold text-foreground">{item.title}</div>
          <p className="text-sm leading-6 text-muted-foreground">{item.summary}</p>
          {item.recommendedAction ? (
            <p className="text-sm text-foreground">
              <span className="font-medium">Move: </span>
              {item.recommendedAction}
            </p>
          ) : null}
          <SourceMeta item={item} />
        </div>
        {item.status ? (
          <Badge variant={toneBadgeVariants[tone]} className="shrink-0 rounded-full">
            {item.status}
          </Badge>
        ) : null}
      </div>
    </article>
  );
}

// ── Section Wrappers ───────────────────────────────────────────────────────────

function ExecutiveListSection({
  title,
  description,
  items,
  emptyTitle,
}: {
  title: string;
  description: string;
  items: BrandonBriefItem[];
  emptyTitle: string;
}) {
  return (
    <section className="space-y-5">
      <SectionDivider title={title} description={description} count={items.length} />

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <SignalListItem
              key={`${item.title}-${item.sourceId ?? item.sourceDetail}`}
              item={item}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CheckCircledIcon />}
          title={emptyTitle}
          description="Nothing high-confidence surfaced here in the current packet."
          className="py-10"
        />
      )}
    </section>
  );
}

function InFlightTaskSection({ tasks }: { tasks: MatchedTask[] }) {
  return (
    <section className="space-y-5">
      <SectionDivider
        title="Already Assigned / In Flight"
        description="Open tasks already tied to the same executive-source records — nothing to re-assign here."
        count={tasks.length}
      />

      {tasks.length > 0 ? (
        <div className="divide-y divide-border rounded-xl bg-muted/20">
          {tasks.map((task) => (
            <div key={task.id} className="flex flex-wrap items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-sm font-semibold text-foreground">
                  {task.assigneeName ?? task.assigneeEmail ?? "Unassigned"}
                  {task.projectName ? (
                    <span className="ml-2 font-normal text-muted-foreground">{task.projectName}</span>
                  ) : null}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{task.description}</p>
                <div className="text-xs text-muted-foreground">Due {formatTaskDate(task.dueDate)}</div>
              </div>
              <Badge variant="outline" className="shrink-0 rounded-full">
                {task.status.replace(/_/g, " ")}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CheckCircledIcon />}
          title="No linked in-flight tasks yet"
          description="Once executive items are assigned into tasks, they will appear here."
          className="py-10"
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
        <div className="space-y-3">
          {followUps.map((followUp) => (
            <div key={followUp.id} className="rounded-lg bg-warning/5 border-l-[3px] border-warning px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full text-xs">
                      {followUpSectionLabels[followUp.section] ?? followUp.section}
                    </Badge>
                    <Badge variant="warning" className="rounded-full text-xs">
                      Open {followUp.daysOpen} day{followUp.daysOpen === 1 ? "" : "s"}
                    </Badge>
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

function OperationalImprovementsSection({
  signals,
  employees,
  matchedCardsByLinkId,
}: {
  signals: OperationalSignal[];
  employees: ExecutiveTaskAssigneeOption[];
  matchedCardsByLinkId: Map<string, MatchedInitiativeCard[]>;
}) {
  return (
    <section className="space-y-5">
      <SectionDivider
        title="Operational Improvements"
        description="Durable prevention and process-improvement cards linked back to the executive signals that surfaced the business problem."
        count={signals.length}
      />

      {signals.length > 0 ? (
        <div className="space-y-4">
          {signals.map((signal) => {
            const matchedCards = signal.linkId
              ? matchedCardsByLinkId.get(signal.linkId) ?? []
              : [];

            return (
              <article
                key={`${signal.linkType}:${signal.linkId ?? signal.item.title}`}
                className="rounded-xl bg-muted/30 px-5 py-5"
              >
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_300px]">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full text-xs">
                        {signal.linkType === "executive_follow_up"
                          ? "Carry-forward issue"
                          : "Live executive signal"}
                      </Badge>
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {signal.item.title}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {signal.item.summary}
                    </p>
                    <InfoAlert variant="info">
                      <span>
                        <span className="font-semibold">Recommended fix: </span>
                        {signal.item.recommendedAction ?? signal.item.summary}
                      </span>
                    </InfoAlert>
                    <InfoAlert variant="warning">
                      <span>
                        <span className="font-semibold">Prevention step: </span>
                        {signal.item.whyItMatters ??
                          "Document the root cause and assign a process owner so this does not recur."}
                      </span>
                    </InfoAlert>
                    <SourceMeta item={signal.item} />
                  </div>

                  <div className="space-y-4 border-t border-border/50 pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                    <OperationalImprovementDraftForm
                      linkId={signal.linkId}
                      linkType={signal.linkType}
                      title={signal.item.title}
                      problemSummary={signal.item.summary}
                      recommendedFix={signal.item.recommendedAction ?? signal.item.summary}
                      preventionStep={
                        signal.item.whyItMatters ??
                        "Capture the root cause, owner, and prevention step."
                      }
                      priority={toOperationalPriority(signal.item.tone)}
                      employees={employees}
                      hasMatchingCard={matchedCards.length > 0}
                    />

                    {matchedCards.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Existing improvement cards
                        </div>
                        <div className="space-y-2">
                          {matchedCards.map((card) => (
                            <div key={card.id} className="rounded-lg bg-background/60 px-3 py-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm font-medium text-foreground">
                                  {card.title}
                                </div>
                                <Badge variant="outline" className="rounded-full text-xs">
                                  {humanizeCardStatus(card.status)}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {card.description ?? "No description"}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>{card.assignee ?? "Unassigned"}</span>
                                <span>Priority {card.priority}</span>
                                <span>Due {formatTaskDate(card.dueDate)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<CheckCircledIcon />}
          title="No operational improvements queued"
          description="No current executive signal is pointing to a process-improvement card yet."
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
    matchedImprovementCardsByLinkId,
  } = await loadExecutiveActionContext({
    items: allItems,
    operationalSignals,
  });
  const generatedAt = formatGeneratedAt(packet.generatedAt);
  const financialItems = getFinancialItems(allItems);
  const financialAlertCount = financialItems.length + paymentGuardrailAlerts.length;

  return (
    <PageShell
      variant="dashboard"
      eyebrow="Executive briefing"
      title="Daily operating brief"
      contentClassName="space-y-0 pb-16"
    >
      {/* ── KPI Strip ── */}
      <KpiStrip
        needsBrandonCount={packet.sections.needsBrandon.length}
        inFlightCount={openTasks.length}
        financialCount={financialAlertCount}
        carryForwardCount={staleFollowUps.length}
        improvementsCount={operationalImprovementCards.length}
        generatedAt={generatedAt}
        windowDays={packet.windowDays}
      />

      <section className="space-y-5 border-t border-border pt-10 mt-10">
        <PaymentGuardrailAlerts
          alerts={paymentGuardrailAlerts}
          emptyMessage="No duplicate outgoing or incoming payment patterns were detected in the Acumatica mirror over the last 90 days."
        />
      </section>

      {/* ── Needs Brandon ── highest priority, shown first ── */}
      <section className="space-y-5 pt-10 border-t border-border mt-10">
        <div>
          <SectionRuleHeading
            label="Needs Brandon Today"
            className="mb-1"
            actions={
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {packet.sections.needsBrandon.length}{" "}
                {packet.sections.needsBrandon.length === 1 ? "item" : "items"}
              </span>
            }
          />
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Highest-priority decisions and confirmations requiring owner-level input.
            Each card includes direct task drafting and linked in-flight work.
          </p>
        </div>

        {packet.sections.needsBrandon.length > 0 ? (
          <div className="space-y-4">
            {packet.sections.needsBrandon.map((item) => (
              <ExecutiveActionCard
                key={`${item.title}-${item.sourceId ?? item.sourceDetail}`}
                item={item}
                employees={employees}
                matchedTasks={
                  item.sourceId ? matchedTasksBySourceId.get(item.sourceId) ?? [] : []
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CheckCircledIcon />}
            title="No direct owner decisions queued"
            description="Nothing in the current packet rose to the level of a Brandon-only decision."
            className="py-10"
          />
        )}
      </section>

      {/* ── Two-column: Financial + Operational ── */}
      <div className="grid gap-0 xl:grid-cols-2 xl:gap-12">
        <ExecutiveListSection
          title="Financial Recap"
          description="Cash movement, billing friction, retainage, payments, and approval risk."
          items={financialItems}
          emptyTitle="No financial alert lane yet"
        />
        <ExecutiveListSection
          title="Operational Breakdowns"
          description="Company-level failures and process risks that should become follow-through, not just transient updates."
          items={operationalSignals.map((signal) => signal.item)}
          emptyTitle="No operational breakdowns surfaced"
        />
      </div>

      {/* ── In-flight ── */}
      <InFlightTaskSection tasks={openTasks} />

      {/* ── Operational Improvements ── */}
      <OperationalImprovementsSection
        signals={operationalSignals}
        employees={employees}
        matchedCardsByLinkId={matchedImprovementCardsByLinkId}
      />

      {/* ── Two-column: Waiting + Signals ── */}
      <div className="grid gap-0 xl:grid-cols-2 xl:gap-12">
        <ExecutiveListSection
          title="Unblock Your People"
          description="Things the team is waiting on from vendors, clients, or internal approvals."
          items={packet.sections.waitingOnOthers}
          emptyTitle="No unblocks surfaced"
        />
        <ExecutiveListSection
          title="Project Signals"
          description="Important project or business signals worth knowing, even if no immediate owner decision is needed."
          items={packet.sections.importantUpdates}
          emptyTitle="No project signals surfaced"
        />
      </div>

      {/* ── Carry-forward ── */}
      <CarryForwardSection followUps={staleFollowUps} />

      {/* ── Source activity ── */}
      <section className="space-y-5">
        <SectionDivider
          title="Source Health"
          description="Recent coverage across the channels feeding this briefing."
        />
        <ExecutiveSourceActivity sources={packet.sourceCoverage} />
      </section>

      {/* ── AI Chat ── */}
      <ExecutiveChatPanel packet={packet} />
    </PageShell>
  );
}
