"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { isPast } from "date-fns";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBudgetData } from "@/hooks/use-budget-data";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ds";
import { EmptyState } from "@/components/ds/empty-state";
import { SectionRuleHeading } from "@/components/layout/spacing";
import {
  buildBudgetDivisionSummaries,
  ProjectSetupSheet,
  ReadinessIndicator,
  SidebarTeamSection,
} from "./project-command-center";
import type { Database } from "@/types/database.types";
import type { BudgetGrandTotals } from "@/types/budget";

const EditProjectSidebar = dynamic(
  () => import("@/components/project/edit-project-sidebar").then((mod) => mod.EditProjectSidebar),
  { ssr: false },
);

/* ─────────────────────────────────────────────────────────────
   Types — mirror the props the home page server component sends.
───────────────────────────────────────────────────────────── */

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];
type RFI = Database["public"]["Tables"]["rfis"]["Row"];
type Contract = Database["public"]["Tables"]["prime_contracts"]["Row"];
type ContractLineItem = Database["public"]["Tables"]["contract_line_items"]["Row"];
type ProjectTeamMember = Database["public"]["Functions"]["get_project_team"]["Returns"][number];
type Meeting = Pick<
  Database["public"]["Tables"]["document_metadata"]["Row"],
  "id" | "title" | "file_name" | "date" | "created_at" | "summary" | "overview" | "description" | "notes"
>;
type DailyLog = Pick<
  Database["public"]["Tables"]["daily_logs"]["Row"],
  "id" | "log_date" | "general_notes" | "status" | "weather_conditions"
>;

interface ChangeOrder {
  id: string | number;
  title: string | null;
  status: string | null;
  amount?: number | null;
  total_amount?: number | null;
  created_at: string | null;
  change_order_number?: string | null;
}

interface OwnerInvoice {
  id: string | number;
  invoice_number: string | null;
  status: string | null;
  gross_amount: number | null;
  paid_amount: number | null;
  billing_date: string | null;
}

interface BudgetLineSummary {
  id: string;
  project_id: number;
  original_amount: number | null;
  cost_code_id: string | null;
  cost_code?: {
    division_id: string | null;
    division_title: string | null;
    title: string | null;
  } | null;
}

export interface ProjectHomeV2Props {
  project: Project;
  tasks: Task[];
  changeOrders: ChangeOrder[];
  rfis: RFI[];
  commitments: Array<{ contract_amount?: number; revised_contract_amount?: number; original_amount?: number }>;
  commitmentTotal?: number;
  contracts: Contract[];
  contractLineItems?: Array<
    Pick<ContractLineItem, "contract_id" | "total_cost" | "quantity" | "unit_cost" | "cost_code_id">
  >;
  budget?: BudgetLineSummary[];
  budgetGrandTotals?: BudgetGrandTotals;
  schedule?: Array<{ id: string }>;
  team?: ProjectTeamMember[];
  homeAlerts?: {
    hasPrimeContractWithoutFinancialMarkup: boolean;
    changeOrdersWithoutChangeRequestCount: number;
  };
  pendingSsovReviews?: Array<{ commitmentId: string; commitmentNumber: string; commitmentTitle: string; submittedAt: string | null }>;
  ownerInvoices?: OwnerInvoice[];
}

/* ─────────────────────────────────────────────────────────────
   Formatting helpers
───────────────────────────────────────────────────────────── */

function fmtCompact(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(value);
}

function formatShortDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMonthDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDateMs(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = parseLocalDate(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function oneSentence(value: string | null | undefined, fallback: string): string {
  const text = (value ?? "").trim();
  if (!text) return fallback;
  const stop = text.search(/[.!?]\s/);
  return stop > 0 ? text.slice(0, stop + 1) : text;
}

function initials(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function pctOf(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

/* ─────────────────────────────────────────────────────────────
   Micro components
───────────────────────────────────────────────────────────── */

function HealthRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  const tone = score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`Health score ${score}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="4" className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          className={cn("stroke-current transition-[stroke-dashoffset] duration-1000", tone)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("text-[13px] font-semibold", tone)}>{score}</span>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, tone = "primary", h = 6 }: { value: number; max: number; tone?: "primary" | "success" | "destructive" | "warning"; h?: number }) {
  const p = Math.min(100, Math.max(0, max ? Math.round((value / max) * 100) : 0));
  const fill = { primary: "bg-primary", success: "bg-success", destructive: "bg-destructive", warning: "bg-warning" }[tone];
  return (
    <div className="flex-1 overflow-hidden rounded-full bg-muted" style={{ height: h }}>
      <div className={cn("h-full rounded-full transition-[width] duration-700", fill)} style={{ width: `${p}%` }} />
    </div>
  );
}

const EYE = "text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground";

function SectionHeading({ title, count, action }: { title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <div className="flex items-baseline gap-2">
        <SectionRuleHeading label={title} className="mb-0 pb-0" />
        {count != null && <span className="text-[13px] text-muted-foreground/60">{count}</span>}
      </div>
      {action}
    </div>
  );
}

function ViewAllLink({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link href={href} prefetch={false} className="text-xs text-muted-foreground transition-colors hover:text-primary">
      {label} →
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────── */

export function ProjectHomeCommandCenterV2({
  project,
  tasks,
  changeOrders,
  rfis,
  contracts,
  contractLineItems,
  budget,
  budgetGrandTotals,
  schedule,
  team,
  homeAlerts,
  pendingSsovReviews = [],
  ownerInvoices = [],
}: ProjectHomeV2Props) {
  const projectId = String(project.id);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isSetupOpen, setIsSetupOpen] = React.useState(false);
  const [showAllBudget, setShowAllBudget] = React.useState(false);

  // Lazily fetch meetings + daily logs via the existing tab-data endpoint.
  const [meetings, setMeetings] = React.useState<Meeting[]>([]);
  const [dailyLogs, setDailyLogs] = React.useState<DailyLog[]>([]);
  const [commsLoading, setCommsLoading] = React.useState(true);
  React.useEffect(() => {
    let cancelled = false;
    setCommsLoading(true);
    Promise.allSettled([
      apiFetch<{ kind: "meetings"; data: Meeting[] }>(`/api/projects/${projectId}/home/tab-data?kind=meetings`),
      apiFetch<{ kind: "daily-logs"; data: DailyLog[] }>(`/api/projects/${projectId}/home/tab-data?kind=daily-logs`),
    ]).then((results) => {
      if (cancelled) return;
      if (results[0].status === "fulfilled") setMeetings(results[0].value.data ?? []);
      if (results[1].status === "fulfilled") setDailyLogs(results[1].value.data ?? []);
      setCommsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  /* ── Budget / financials ───────────────────────────────── */
  const { grandTotals } = useBudgetData(projectId, {
    enabled: !budgetGrandTotals,
    initialGrandTotals: budgetGrandTotals,
    showErrorToast: false,
  });
  const revisedBudget = grandTotals.revisedBudget || grandTotals.originalBudgetAmount;
  const committedCosts = grandTotals.committedCosts;
  const ecac = grandTotals.estimatedCostAtCompletion;
  const variance = grandTotals.projectedOverUnder; // > 0 under budget, < 0 over budget
  const billedToDate = ownerInvoices.reduce((sum, i) => sum + (Number(i.gross_amount) || 0), 0);
  const paidToDate = ownerInvoices.reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);

  const budgetDivisions = React.useMemo(
    () => buildBudgetDivisionSummaries({ budget: budget ?? [], contractLineItems: contractLineItems ?? [] }),
    [budget, contractLineItems],
  );
  const sortedDivisions = React.useMemo(
    () => [...budgetDivisions].sort((a, b) => b.budget - a.budget),
    [budgetDivisions],
  );

  /* ── Project facts ─────────────────────────────────────── */
  const meta = project as unknown as Record<string, unknown>;
  const startDate = (meta["start date"] as string) ?? (meta["start_date"] as string) ?? null;
  const completionDate = (meta["est completion"] as string) ?? (meta["completion_date"] as string) ?? null;
  const summaryMeta = (project.summary_metadata as Record<string, unknown> | null) ?? null;
  const substantialCompletion =
    typeof summaryMeta?.substantial_completion === "string" ? summaryMeta.substantial_completion : null;
  const completionPct = Math.max(0, Math.min(100, Number(project.completion_percentage) || 0));
  const healthScore = project.health_score != null ? Number(project.health_score) : null;
  const phase = project.phase || project.stage || null;
  const jobNumber = (meta["job number"] as string) ?? project.project_number ?? null;
  const address = [project.address, summaryMeta?.city as string | undefined, project.state]
    .filter(Boolean)
    .join(", ");

  const pm = React.useMemo(() => {
    const members = team ?? [];
    return (
      members.find((m) => (m.role ?? "").toLowerCase().includes("project manager")) ??
      members.find((m) => (m.role ?? "").toLowerCase().includes("manager")) ??
      members[0] ??
      null
    );
  }, [team]);

  /* ── Timeline ──────────────────────────────────────────── */
  const timeline = React.useMemo(() => {
    if (!startDate || !completionDate) return null;
    const start = parseLocalDate(startDate).getTime();
    const end = parseLocalDate(completionDate).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
    const now = Date.now();
    const totalDays = Math.round((end - start) / 86_400_000);
    const elapsedDays = Math.round((Math.min(Math.max(now, start), end) - start) / 86_400_000);
    const remainingDays = Math.max(0, Math.round((end - Math.min(now, end)) / 86_400_000));
    const elapsedPct = Math.round((elapsedDays / totalDays) * 100);
    return { totalDays, elapsedDays, remainingDays, elapsedPct };
  }, [startDate, completionDate]);

  /* ── Needs attention ───────────────────────────────────── */
  const openTasks = React.useMemo(
    () => tasks.filter((t) => !["done", "cancelled", "closed", "complete", "completed"].includes((t.status ?? "").toLowerCase())),
    [tasks],
  );
  const overdueTasks = React.useMemo(
    () => openTasks.filter((t) => t.due_date && isPast(new Date(t.due_date))),
    [openTasks],
  );
  const openRfis = React.useMemo(() => rfis.filter((r) => (r.status ?? "").toLowerCase() !== "closed"), [rfis]);
  const overdueRfis = React.useMemo(
    () => openRfis.filter((r) => r.due_date && isPast(new Date(r.due_date))),
    [openRfis],
  );
  const pendingChangeOrders = React.useMemo(
    () => changeOrders.filter((c) => !["approved", "executed", "closed", "void", "rejected"].includes((c.status ?? "").toLowerCase())),
    [changeOrders],
  );
  const pendingCoAmount = pendingChangeOrders.reduce(
    (sum, c) => sum + (Number(c.total_amount ?? c.amount) || 0),
    0,
  );
  const pendingInvoices = React.useMemo(
    () => ownerInvoices.filter((i) => !["paid", "approved", "void"].includes((i.status ?? "").toLowerCase())),
    [ownerInvoices],
  );
  const pendingInvoiceAmount = pendingInvoices.reduce((sum, i) => sum + (Number(i.gross_amount) || 0), 0);

  type AttentionItem = { label: string; count: number; meta?: string; severity: "error" | "warning" | "neutral"; href: string };
  const attentionItems: AttentionItem[] = [
    overdueTasks.length > 0 && { label: "Overdue action items", count: overdueTasks.length, severity: "error" as const, href: `/${projectId}/tasks` },
    (homeAlerts?.changeOrdersWithoutChangeRequestCount ?? 0) > 0 && {
      label: "Change orders missing change request",
      count: homeAlerts!.changeOrdersWithoutChangeRequestCount,
      severity: "error" as const,
      href: `/${projectId}/change-orders`,
    },
    pendingChangeOrders.length > 0 && {
      label: "Pending change orders",
      count: pendingChangeOrders.length,
      meta: pendingCoAmount ? fmtCompact(pendingCoAmount) : undefined,
      severity: "warning" as const,
      href: `/${projectId}/change-orders`,
    },
    openRfis.length > 0 && {
      label: "Open RFIs",
      count: openRfis.length,
      meta: overdueRfis.length ? `${overdueRfis.length} overdue` : undefined,
      severity: overdueRfis.length ? ("warning" as const) : ("neutral" as const),
      href: `/${projectId}/rfis`,
    },
    pendingSsovReviews.length > 0 && {
      label: "Subcontractor SOVs to review",
      count: pendingSsovReviews.length,
      severity: "warning" as const,
      href: `/${projectId}/commitments`,
    },
    pendingInvoices.length > 0 && {
      label: "Invoices pending approval",
      count: pendingInvoices.length,
      meta: pendingInvoiceAmount ? fmtCompact(pendingInvoiceAmount) : undefined,
      severity: "neutral" as const,
      href: `/${projectId}/invoicing`,
    },
    homeAlerts?.hasPrimeContractWithoutFinancialMarkup && {
      label: "Prime contract missing markup",
      count: 1,
      severity: "warning" as const,
      href: `/${projectId}/prime-contracts`,
    },
  ].filter(Boolean) as AttentionItem[];

  /* ── Project brief ─────────────────────────────────────── */
  const summaryText = (project.summary ?? "").trim();
  const computedBrief = React.useMemo(() => {
    const parts: string[] = [];
    parts.push(`${project.name ?? "This project"} is ${completionPct}% complete`);
    if (timeline) parts[0] += ` with ${timeline.remainingDays} days to estimated completion`;
    parts[0] += ".";
    if (revisedBudget > 0) {
      parts.push(
        `Budget is ${fmtCompact(revisedBudget)} with ${fmtCompact(committedCosts)} committed (${pctOf(committedCosts, revisedBudget)}%).`,
      );
      if (variance !== 0) {
        parts.push(`Forecast is ${variance >= 0 ? "under" : "over"} budget by ${fmtCompact(Math.abs(variance))}.`);
      }
    }
    const watch: string[] = [];
    if (openRfis.length) watch.push(`${openRfis.length} open RFI${openRfis.length !== 1 ? "s" : ""}`);
    if (overdueTasks.length) watch.push(`${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? "s" : ""}`);
    if (pendingChangeOrders.length) watch.push(`${pendingChangeOrders.length} pending change order${pendingChangeOrders.length !== 1 ? "s" : ""}`);
    if (watch.length) parts.push(`Open items: ${watch.join(", ")}.`);
    return parts.join(" ");
  }, [project.name, completionPct, timeline, revisedBudget, committedCosts, variance, openRfis.length, overdueTasks.length, pendingChangeOrders.length]);

  /* ── Setup readiness ───────────────────────────────────── */
  const hasTeam = (team ?? []).length > 0;
  const hasBudget = (budget ?? []).length > 0 || revisedBudget > 0;
  const hasContracts = contracts.length > 0;
  const hasSchedule = (schedule ?? []).length > 0;
  const setupCompleted = [hasTeam, hasBudget, hasContracts, hasSchedule].filter(Boolean).length;

  const recentMeetings = React.useMemo(
    () => [...meetings].sort((a, b) => getDateMs(b.date ?? b.created_at) - getDateMs(a.date ?? a.created_at)).slice(0, 3),
    [meetings],
  );
  const recentDailyLogs = React.useMemo(
    () => [...dailyLogs].sort((a, b) => getDateMs(b.log_date) - getDateMs(a.log_date)).slice(0, 3),
    [dailyLogs],
  );

  return (
    <div className="min-h-full">
      {/* ── HEADER ───────────────────────────────────────── */}
      <div className="mb-6 border-b border-border pb-5">
        <div className="mb-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Link href="/projects" prefetch={false} className="transition-colors hover:text-foreground">
            Projects
          </Link>
          <span className="opacity-50">›</span>
          <span className="font-medium text-foreground">{project.name ?? "Untitled Project"}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div>
              {jobNumber && <span className="text-[11px] text-muted-foreground">{jobNumber}</span>}
              <h1 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
                {project.name ?? "Untitled Project"}
              </h1>
            </div>
            {healthScore != null && <HealthRing score={healthScore} />}
          </div>
          <div className="flex items-center gap-2">
            <ReadinessIndicator completedCount={setupCompleted} totalCount={4} onOpen={() => setIsSetupOpen(true)} />
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
              Edit project
            </Button>
          </div>
        </div>
      </div>

      {/* ── BODY: main + rail ────────────────────────────── */}
      <div className="flex flex-col gap-8 xl:flex-row">
        <div className="min-w-0 flex-1 space-y-9">
          {/* AI / status brief */}
          <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="h-3 w-3" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-primary">
                {summaryText ? "AI Project Brief" : "At a Glance"}
              </span>
              {summaryText && project.summary_updated_at && (
                <span className="ml-auto text-[10px] text-muted-foreground">
                  Updated {formatShortDate(project.summary_updated_at)}
                </span>
              )}
            </div>
            <p className="text-[13px] leading-relaxed text-foreground/80">{summaryText || computedBrief}</p>
          </div>

          {/* Snapshot */}
          <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border md:grid-cols-4 md:divide-y-0">
            <div className="p-4">
              <div className={EYE}>Phase</div>
              <div className="mt-1 text-[15px] font-semibold text-foreground">{phase ?? "—"}</div>
              {project.type ? <div className="mt-0.5 text-[11px] text-muted-foreground">{project.type}</div> : null}
            </div>
            <div className="p-4">
              <div className={EYE}>Completion</div>
              <div className="mt-1 text-[15px] font-semibold text-foreground">{completionPct}%</div>
              <div className="mt-2 flex">
                <ProgressBar value={completionPct} max={100} />
              </div>
            </div>
            <div className="p-4">
              <div className={EYE}>Est. Completion</div>
              <div className="mt-1 text-[15px] font-semibold text-foreground">
                {formatShortDate(completionDate) ?? "—"}
              </div>
              {timeline && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">{timeline.remainingDays} days remaining</div>
              )}
            </div>
            <div className="p-4">
              <div className={EYE}>Project Manager</div>
              {pm ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                    {initials(pm.full_name)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-foreground">{pm.full_name}</div>
                    {pm.company_name ? (
                      <div className="truncate text-[11px] text-muted-foreground">{pm.company_name}</div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mt-1 text-[13px] text-muted-foreground/50">Unassigned</div>
              )}
            </div>
          </div>

          {/* Schedule timeline */}
          {timeline && (
            <section>
              <SectionHeading title="Schedule" action={<ViewAllLink href={`/${projectId}/schedule`} label="View schedule" />} />
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="mb-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>{formatShortDate(startDate)}</span>
                  <span>{formatShortDate(completionDate)}</span>
                </div>
                <div className="relative mt-5 h-7 overflow-visible rounded-md bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-l-md bg-primary transition-[width] duration-1000"
                    style={{ width: `${timeline.elapsedPct}%` }}
                  />
                  <div className="absolute inset-y-0 z-[2] w-1 rounded bg-foreground" style={{ left: `${timeline.elapsedPct}%` }}>
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-foreground">Today</div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>Day {timeline.elapsedDays} of {timeline.totalDays}</span>
                  <span>{timeline.elapsedPct}% timeline · {completionPct}% work</span>
                </div>
                {Math.abs(timeline.elapsedPct - completionPct) > 3 && (
                  <div
                    className={cn(
                      "mt-3 rounded-md border px-3 py-2 text-[11px]",
                      timeline.elapsedPct > completionPct
                        ? "border-warning/20 bg-warning/10 text-warning"
                        : "border-success/20 bg-success/10 text-success",
                    )}
                  >
                    {timeline.elapsedPct > completionPct
                      ? `Work (${completionPct}%) is trailing the timeline (${timeline.elapsedPct}%) — may need acceleration.`
                      : `Work (${completionPct}%) is outpacing the timeline (${timeline.elapsedPct}%).`}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Financials */}
          {revisedBudget > 0 && (
            <section>
              <SectionHeading title="Financials" action={<ViewAllLink href={`/${projectId}/budget`} label="View budget" />} />
              <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
                <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
                  {[
                    { l: "Budget", v: fmtCompact(revisedBudget), c: "Revised" },
                    { l: "Committed", v: fmtCompact(committedCosts), c: `${pctOf(committedCosts, revisedBudget)}% of budget` },
                    { l: "Billed to Date", v: fmtCompact(billedToDate), c: paidToDate ? `${fmtCompact(paidToDate)} collected` : "No invoices" },
                    { l: "Forecast (ECAC)", v: fmtCompact(ecac), c: "At completion" },
                    {
                      l: "Variance",
                      v: fmtCompact(Math.abs(variance)),
                      c: variance >= 0 ? "Under budget" : "Over budget",
                      badge: { positive: variance >= 0, text: variance >= 0 ? "under" : "over" },
                    },
                  ].map((k) => (
                    <div key={k.l} className="p-4">
                      <div className={cn(EYE, "mb-1.5")}>{k.l}</div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-semibold tracking-tight text-foreground">{k.v}</span>
                        {k.badge && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-px text-[11px] font-medium",
                              k.badge.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                            )}
                          >
                            {k.badge.text}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{k.c}</div>
                    </div>
                  ))}
                </div>
                {billedToDate > 0 && (
                  <div className="border-t border-border bg-muted/30 px-5 py-3">
                    <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
                      <span>Billing progress</span>
                      <span>{pctOf(billedToDate, revisedBudget)}% billed</span>
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="bg-success" style={{ width: `${pctOf(paidToDate, revisedBudget)}%` }} />
                      <div className="bg-warning" style={{ width: `${pctOf(billedToDate - paidToDate, revisedBudget)}%` }} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success" />Paid ({fmtCompact(paidToDate)})</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-warning" />Unpaid ({fmtCompact(billedToDate - paidToDate)})</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-muted-foreground/40" />Unbilled ({fmtCompact(Math.max(0, revisedBudget - billedToDate))})</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Needs attention */}
          {attentionItems.length > 0 && (
            <section>
              <SectionHeading title="Needs Attention" />
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
                {attentionItems.map((it) => (
                  <Link
                    key={it.label}
                    href={it.href}
                    prefetch={false}
                    className="flex items-center justify-between gap-3 bg-card px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          it.severity === "error" ? "bg-destructive" : it.severity === "warning" ? "bg-warning" : "bg-muted-foreground/50",
                        )}
                      />
                      <span className="truncate text-[13px] text-foreground/80">{it.label}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {it.meta && <span className="text-xs text-muted-foreground">{it.meta}</span>}
                      <span
                        className={cn(
                          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                          it.severity === "error"
                            ? "bg-destructive/10 text-destructive"
                            : it.severity === "warning"
                              ? "bg-warning/10 text-warning"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {it.count}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Budget by cost code */}
          {sortedDivisions.length > 0 && (
            <section>
              <SectionHeading
                title="Budget by Division"
                action={
                  sortedDivisions.length > 6 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllBudget((v) => !v)}
                      className="h-auto px-0 py-0 text-xs text-muted-foreground hover:bg-transparent hover:text-primary"
                    >
                      {showAllBudget ? "Show less" : "Show all"} →
                    </Button>
                  ) : (
                    <ViewAllLink href={`/${projectId}/budget`} label="View budget" />
                  )
                }
              />
              <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className={cn("px-4 py-2.5 text-left", EYE)}>Division</th>
                      <th className={cn("px-4 py-2.5 text-right", EYE)}>Budget</th>
                      <th className={cn("px-4 py-2.5 text-right", EYE)}>Committed</th>
                      <th className={cn("px-4 py-2.5 text-right", EYE)}>Variance</th>
                      <th className={cn("w-28 px-4 py-2.5", EYE)} />
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllBudget ? sortedDivisions : sortedDivisions.slice(0, 6)).map((d) => {
                      const v = d.budget - d.committed;
                      return (
                        <tr key={d.id} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-2.5 font-medium text-foreground">{d.label}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{fmtCompact(d.budget)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{fmtCompact(d.committed)}</td>
                          <td className={cn("px-4 py-2.5 text-right font-medium tabular-nums", v >= 0 ? "text-success" : "text-destructive")}>
                            {v >= 0 ? "+" : ""}
                            {fmtCompact(v)}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex">
                              <ProgressBar value={d.committed} max={d.budget || 1} tone={v >= 0 ? "success" : "destructive"} h={4} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Meetings */}
          <section>
            <SectionHeading
              title="Recent Meetings"
              count={meetings.length || undefined}
              action={<ViewAllLink href={`/${projectId}/meetings`} />}
            />
            {commsLoading ? (
              <div className="py-4 text-sm text-muted-foreground">Loading meetings…</div>
            ) : recentMeetings.length === 0 ? (
              <EmptyState title="No meetings yet" description="Synced meeting recaps and decisions will appear here." />
            ) : (
              <div className="divide-y divide-border/60">
                {recentMeetings.map((m) => {
                  const title = m.title || m.file_name || "Untitled meeting";
                  return (
                    <Link
                      key={m.id}
                      href={`/${projectId}/meetings/${m.id}`}
                      prefetch={false}
                      className="group grid gap-2 py-3.5 transition-colors sm:grid-cols-[minmax(0,1fr)_6rem] sm:items-start"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">{title}</p>
                        <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
                          {oneSentence(m.summary ?? m.overview ?? m.description ?? m.notes, "No summary captured yet.")}
                        </p>
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground sm:justify-self-end sm:pt-0.5">
                        {formatMonthDay(m.date ?? m.created_at) || "No date"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Daily log */}
          {(commsLoading || recentDailyLogs.length > 0) && (
            <section>
              <SectionHeading title="Daily Log" action={<ViewAllLink href={`/${projectId}/daily-log`} />} />
              {commsLoading ? (
                <div className="py-4 text-sm text-muted-foreground">Loading daily reports…</div>
              ) : (
                <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
                  {recentDailyLogs.map((lg) => (
                    <Link
                      key={lg.id}
                      href={`/${projectId}/daily-log`}
                      prefetch={false}
                      className="bg-card p-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[13px] font-medium text-foreground">{formatShortDate(lg.log_date) ?? `Log ${lg.id}`}</span>
                        {lg.weather_conditions ? (
                          <span className="text-[11px] text-muted-foreground">{lg.weather_conditions}</span>
                        ) : null}
                      </div>
                      <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">
                        {oneSentence(lg.general_notes, "No daily report notes captured yet.")}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── RIGHT RAIL ──────────────────────────────────── */}
        <aside className="w-full shrink-0 space-y-6 xl:w-64">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className={cn(EYE, "mb-2")}>Project Info</div>
            <div className="space-y-2 text-[12px] leading-relaxed text-muted-foreground">
              {address && <div className="text-foreground/80">{address}</div>}
              {jobNumber && (
                <div>
                  <span className="text-muted-foreground/60">Job #:</span> {jobNumber}
                </div>
              )}
              {startDate && (
                <div>
                  <span className="text-muted-foreground/60">Start:</span> {formatShortDate(startDate)}
                </div>
              )}
              {substantialCompletion && (
                <div>
                  <span className="text-muted-foreground/60">Substantial:</span> {formatShortDate(substantialCompletion)}
                </div>
              )}
              {project.delivery_method && (
                <div>
                  <span className="text-muted-foreground/60">Delivery:</span> {project.delivery_method}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className={cn(EYE, "flex items-center gap-1.5")}>
                <Users className="h-3.5 w-3.5" /> Team
              </div>
              <Link
                href={`/${projectId}/directory`}
                prefetch={false}
                className="text-[11px] text-muted-foreground transition-colors hover:text-primary"
              >
                Directory <ArrowRight className="inline h-3 w-3" />
              </Link>
            </div>
            <SidebarTeamSection projectId={projectId} team={team} />
          </div>
        </aside>
      </div>

      {isEditOpen ? (
        <EditProjectSidebar project={project} open={isEditOpen} onOpenChange={setIsEditOpen} />
      ) : null}
      {isSetupOpen ? (
        <ProjectSetupSheet
          open={isSetupOpen}
          onOpenChange={setIsSetupOpen}
          projectId={projectId}
          hasTeam={hasTeam}
          hasBudget={hasBudget}
          hasContracts={hasContracts}
          hasSchedule={hasSchedule}
        />
      ) : null}
    </div>
  );
}
