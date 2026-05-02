import Link from "next/link";
import {
  ArrowTopRightIcon,
  CheckCircledIcon,
  DotFilledIcon,
} from "@radix-ui/react-icons";
import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { EmptyState } from "@/components/ds";
import { ExecutiveBriefEmailForm } from "@/components/executive/executive-brief-email-form";
import { ExecutiveChatPanel } from "@/components/executive/executive-chat-panel";
import { ExecutiveSourceActivity } from "@/components/executive/executive-source-activity";
import {
  ExecutiveTaskDraftForm,
  type ExecutiveTaskAssigneeOption,
} from "@/components/executive/executive-task-draft-form";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
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

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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

const toneDotStyles: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  good: "text-status-success",
  watch: "text-status-warning",
  risk: "text-destructive",
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

function getOperationalItems(items: BrandonBriefItem[]) {
  return dedupeItems(
    items.filter((item) =>
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
    ),
  ).slice(0, 5);
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

function ExecutiveSummaryCard({
  label,
  value,
  context,
}: {
  label: string;
  value: string;
  context: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-4">
      <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{label}</div>
      <div className="mt-1 text-sm leading-6 text-muted-foreground">{context}</div>
    </div>
  );
}

function ExecutiveEmailStatus({
  status,
  message,
}: {
  status: "sent" | "failed";
  message: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        status === "sent"
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-destructive/25 bg-destructive/5 text-foreground",
      )}
    >
      <div className="font-medium">
        {status === "sent" ? "Executive brief email sent" : "Executive brief email failed"}
      </div>
      <p className="mt-1 text-sm opacity-90">{message}</p>
    </div>
  );
}

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
    <article className="rounded-2xl border border-border bg-background p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DotFilledIcon className={cn("h-4 w-4 shrink-0", toneDotStyles[tone])} />
                <Badge variant="outline" className="rounded-full">
                  Needs Brandon
                </Badge>
                <div className="text-lg font-semibold tracking-tight text-foreground">
                  {item.title}
                </div>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground">{item.summary}</p>
            </div>
            {item.status ? (
              <Badge variant={toneBadgeVariants[tone]} className="rounded-full">
                {item.status}
              </Badge>
            ) : null}
          </div>

          {item.bullets.length > 0 ? (
            <ul className="grid gap-2 text-sm leading-6 text-foreground/85 md:grid-cols-2">
              {item.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/35" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {item.recommendedAction ? (
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm leading-6 text-foreground">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Recommended next move
              </div>
              <p className="mt-1">{item.recommendedAction}</p>
            </div>
          ) : null}

          {item.whyItMatters ? (
            <div className="rounded-xl border border-border bg-muted/10 px-4 py-3 text-sm leading-6 text-muted-foreground">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Why this matters
              </div>
              <p className="mt-1">{item.whyItMatters}</p>
            </div>
          ) : null}

          <SourceMeta item={item} />
        </div>

        <div className="space-y-4 border-t border-border pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Owner
            </div>
            <div className="text-sm font-medium text-foreground">{item.owner ?? "Not assigned"}</div>
          </div>

          <ExecutiveTaskDraftForm
            sourceId={item.sourceId}
            title={item.title}
            description={item.recommendedAction ?? item.summary}
            employees={employees}
            hasMatchingTask={matchedTasks.length > 0}
          />

          {matchedTasks.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                In-flight tasks
              </div>
              <div className="space-y-2">
                {matchedTasks.map((task) => (
                  <div key={task.id} className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium text-foreground">{task.assigneeName ?? task.assigneeEmail ?? "Unassigned"}</div>
                      <Badge variant="outline" className="rounded-full">
                        {task.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{task.description}</p>
                    <div className="mt-2 text-xs text-muted-foreground">Due {formatTaskDate(task.dueDate)}</div>
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
    <section className="space-y-4">
      <div className="space-y-1">
        <SectionRuleHeading label={title} className="mb-0 pb-0" />
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => {
            const tone = item.tone ?? "neutral";
            return (
              <article key={`${item.title}-${item.sourceId ?? item.sourceDetail}`} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <DotFilledIcon className={cn("h-4 w-4 shrink-0", toneDotStyles[tone])} />
                      <div className="text-base font-semibold text-foreground">{item.title}</div>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{item.summary}</p>
                  </div>
                  {item.status ? (
                    <Badge variant={toneBadgeVariants[tone]} className="rounded-full">
                      {item.status}
                    </Badge>
                  ) : null}
                </div>
                {item.recommendedAction ? (
                  <div className="mt-3 rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-foreground">
                    <span className="font-medium">Recommended move:</span> {item.recommendedAction}
                  </div>
                ) : null}
                <div className="mt-3">
                  <SourceMeta item={item} />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<CheckCircledIcon />}
          title={emptyTitle}
          description="Nothing high-confidence surfaced here in the current packet."
          className="border border-dashed border-border/80 py-10"
        />
      )}
    </section>
  );
}

function InFlightTaskSection({
  tasks,
}: {
  tasks: MatchedTask[];
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <SectionRuleHeading label="Already Assigned / In Flight" className="mb-0 pb-0" />
        <p className="text-sm leading-6 text-muted-foreground">
          Open tasks already tied to the same executive-source records so Brandon does not duplicate work.
        </p>
      </div>

      {tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <article key={task.id} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {task.assigneeName ?? task.assigneeEmail ?? "Unassigned"}{task.projectName ? ` • ${task.projectName}` : ""}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{task.description}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className="rounded-full">
                    {task.status.replace(/_/g, " ")}
                  </Badge>
                  <div className="text-xs text-muted-foreground">Due {formatTaskDate(task.dueDate)}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CheckCircledIcon />}
          title="No linked in-flight tasks yet"
          description="Once executive items are assigned into tasks, they will appear here."
          className="border border-dashed border-border/80 py-10"
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
    <section className="space-y-4">
      <div className="space-y-1">
        <SectionRuleHeading label="Carry-Forward Risks" className="mb-0 pb-0" />
        <p className="text-sm leading-6 text-muted-foreground">
          Important follow-ups that are still open but did not make today’s live packet.
        </p>
      </div>

      {followUps.length > 0 ? (
        <div className="space-y-3">
          {followUps.map((followUp) => (
            <article key={followUp.id} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      {followUpSectionLabels[followUp.section] ?? followUp.section}
                    </Badge>
                    <div className="text-base font-semibold text-foreground">{followUp.title}</div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{followUp.summary}</p>
                </div>
                <Badge variant="warning" className="rounded-full">
                  Open {followUp.daysOpen} day{followUp.daysOpen === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{followUp.project_label ?? "Internal operations"}</span>
                <span>{followUp.owner ?? "No owner"}</span>
                <span>Last seen {formatGeneratedAt(followUp.last_seen_at)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CheckCircledIcon />}
          title="No carry-forward risks"
          description="All current executive follow-ups are represented in the live brief."
          className="border border-dashed border-border/80 py-10"
        />
      )}
    </section>
  );
}

async function loadExecutiveTaskContext(items: BrandonBriefItem[]) {
  const metadataIds = Array.from(
    new Set(items.map((item) => item.sourceId).filter((value): value is string => Boolean(value))),
  );

  const supabase = createServiceClient();

  const [peopleResult, tasksResult] = await Promise.all([
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
  ]);

  if (peopleResult.error) {
    throw new Error(`Failed to load executive assignees: ${peopleResult.error.message}`);
  }

  if (tasksResult.error) {
    throw new Error(`Failed to load executive linked tasks: ${tasksResult.error.message}`);
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

  return {
    employees,
    openTasks,
    matchedTasksBySourceId,
  };
}

export default async function ExecutiveDailyInsightsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
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

  const dashboard = await getExecutiveBriefingDashboard({
    windowDays: DEFAULT_EXECUTIVE_WINDOW_DAYS,
  });
  const { draft, staleFollowUps } = dashboard;
  const packet = draft.packet;
  const allItems = [
    ...packet.sections.needsBrandon,
    ...packet.sections.waitingOnOthers,
    ...packet.sections.importantUpdates,
  ];
  const { employees, openTasks, matchedTasksBySourceId } = await loadExecutiveTaskContext(allItems);
  const generatedAt = formatGeneratedAt(packet.generatedAt);
  const financialItems = getFinancialItems(allItems);
  const operationalItems = getOperationalItems([
    ...allItems,
    ...staleFollowUps.map(followUpToItem),
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const emailStatusRaw = Array.isArray(resolvedSearchParams.emailStatus)
    ? resolvedSearchParams.emailStatus[0]
    : resolvedSearchParams.emailStatus;
  const emailMessageRaw = Array.isArray(resolvedSearchParams.emailMessage)
    ? resolvedSearchParams.emailMessage[0]
    : resolvedSearchParams.emailMessage;
  const emailStatus =
    emailStatusRaw === "sent" || emailStatusRaw === "failed" ? emailStatusRaw : null;
  const defaultRecipientEmail =
    employees.find((employee) => employee.email && /brandon/i.test(employee.label))?.email ?? "";
  const defaultSubject = `Daily operating brief — ${draft.recapDate}`;

  return (
    <PageShell
      variant="dashboard"
      eyebrow="Executive briefing"
      title="Daily operating brief"
      contentClassName="space-y-8"
    >
      {emailStatus && emailMessageRaw ? (
        <ExecutiveEmailStatus status={emailStatus} message={emailMessageRaw} />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="rounded-full">
                Executive report
              </Badge>
              <span>Prepared {generatedAt}</span>
              <span>Window {packet.windowDays} day{packet.windowDays === 1 ? "" : "s"}</span>
            </div>

            <div className="max-w-4xl">
              <div className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Owner-level decisions, in-flight work, and business risks in one operating view.
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                This page is now optimized for action first: what Brandon needs to decide, what is
                already assigned, where money or compliance is at risk, and what still needs a
                named follow-through.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ExecutiveSummaryCard
              label="Needs Brandon"
              value={String(packet.sections.needsBrandon.length)}
              context="Owner-level calls or confirmations surfaced in the current packet."
            />
            <ExecutiveSummaryCard
              label="In Flight"
              value={String(openTasks.length)}
              context="Open tasks already linked to the same executive-source records."
            />
            <ExecutiveSummaryCard
              label="Financial Alerts"
              value={String(financialItems.length)}
              context="Money, billing, retainage, payment, or approval signals in the brief."
            />
            <ExecutiveSummaryCard
              label="Carry-Forward"
              value={String(staleFollowUps.length)}
              context="Still-open follow-ups that did not make today’s live shortlist."
            />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="space-y-1">
              <SectionRuleHeading label="Send Brief" className="mb-0 pb-0" />
              <p className="text-sm leading-6 text-muted-foreground">
                Manual testing path for sending the current brief to Brandon or any employee. This
                uses the shared email pipeline now, and a future scheduled job can call the same
                send action later.
              </p>
            </div>
            <div className="mt-4">
              <ExecutiveBriefEmailForm
                draftId={draft.id}
                defaultRecipients={defaultRecipientEmail}
                defaultSubject={defaultSubject}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="space-y-1">
              <SectionRuleHeading label="Executive Agent" className="mb-0 pb-0" />
              <p className="text-sm leading-6 text-muted-foreground">
                Embedded below with the current executive brief as its starting packet. The full
                assistant remains available for broader cross-project work.
              </p>
            </div>
            <div className="mt-4">
              <Button asChild size="sm" variant="outline">
                <Link href="/ai-assistant">Open full assistant</Link>
              </Button>
            </div>
          </div>

          <ExecutiveSourceActivity sources={packet.sourceCoverage} />
        </aside>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <SectionRuleHeading label="Needs Brandon Today" className="mb-0 pb-0" />
          <p className="text-sm leading-6 text-muted-foreground">
            Highest-priority decisions and confirmations, each with direct task drafting and linked
            in-flight work if it already exists.
          </p>
        </div>

        {packet.sections.needsBrandon.length > 0 ? (
          <div className="space-y-4">
            {packet.sections.needsBrandon.map((item) => (
              <ExecutiveActionCard
                key={`${item.title}-${item.sourceId ?? item.sourceDetail}`}
                item={item}
                employees={employees}
                matchedTasks={item.sourceId ? matchedTasksBySourceId.get(item.sourceId) ?? [] : []}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CheckCircledIcon />}
            title="No direct owner decisions queued"
            description="Nothing in the current packet rose to the level of a Brandon-only decision."
            className="border border-dashed border-border/80 py-10"
          />
        )}
      </section>

      <InFlightTaskSection tasks={openTasks} />

      <section className="grid gap-6 xl:grid-cols-2">
        <ExecutiveListSection
          title="Financial Recap"
          description="Items in the packet that point to cash movement, billing friction, retainage, payments, or approval risk."
          items={financialItems}
          emptyTitle="No financial alert lane yet"
        />
        <ExecutiveListSection
          title="Operational Breakdowns"
          description="Company-level failures and process risks that should become operational follow-through, not just transient updates."
          items={operationalItems}
          emptyTitle="No operational breakdowns surfaced"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ExecutiveListSection
          title="Unblock Your People"
          description="Things the team is waiting on from vendors, clients, design inputs, or internal approvals."
          items={packet.sections.waitingOnOthers}
          emptyTitle="No unblocks surfaced"
        />
        <ExecutiveListSection
          title="Project Signals"
          description="Important project or business signals worth knowing even when they do not require an immediate owner decision."
          items={packet.sections.importantUpdates}
          emptyTitle="No project signals surfaced"
        />
      </section>

      <CarryForwardSection followUps={staleFollowUps} />

      <ExecutiveChatPanel packet={packet} />
    </PageShell>
  );
}
