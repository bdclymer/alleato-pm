"use client";

import * as React from "react";
import Link from "next/link";
import { format, isPast } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  FileText,
  Layers,
  MapPin,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBudgetData } from "@/hooks/use-budget-data";
import { useCurrentUserName } from "@/hooks/use-current-user-name";
import { StatusBadge, Skeleton } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { EditProjectSidebar } from "@/components/project/edit-project-sidebar";
import { RealtimeAvatarStack } from "@/components/realtime-avatar-stack";
import { RealtimeCursors } from "@/components/realtime-cursors";
import type { Database } from "@/types/database.types";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Meeting = Database["public"]["Tables"]["document_metadata"]["Row"];
// changeOrders merges prime_contract_change_orders + contract_change_orders (different shapes)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChangeOrder = any;
type RFI = Database["public"]["Tables"]["rfis"]["Row"];
type Contract = Database["public"]["Tables"]["prime_contracts"]["Row"];
type ChangeEvent = Database["public"]["Tables"]["change_events"]["Row"];

interface Commitment {
  id: string;
  project_id: number;
  number: string;
  contract_company_id: string | null;
  title: string | null;
  status: string;
  executed: boolean;
  type: "subcontract" | "purchase_order";
  contract_amount?: number;
  retention_percentage: number | null;
  start_date: string | null;
  executed_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  original_amount?: number;
}

interface ProjectCommandCenterProps {
  project: Project;
  tasks: Task[];
  meetings: Meeting[];
  changeOrders: ChangeOrder[];
  rfis: RFI[];
  commitments: Commitment[];
  contracts: Contract[];
  changeEvents?: ChangeEvent[];
  schedule?: any[];
  // unused but accepted for API compatibility
  dailyLogs?: any[];
  budget?: any[];
  sov?: any[];
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

function fmtFull(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function pct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.min(100, Math.round((numerator / denominator) * 100));
}

function truncateSentence(value: string, max = 110): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */

function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </span>
      {action}
    </div>
  );
}

function Divider() {
  return <hr className="border-border my-5" />;
}

interface StatPillProps {
  label: string;
  value: string | number;
  tone?: "neutral" | "warning" | "danger" | "success";
}
function StatPill({ label, value, tone = "neutral" }: StatPillProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
        tone === "danger" && "bg-red-50 text-red-700",
        tone === "warning" && "bg-amber-50 text-amber-700",
        tone === "success" && "bg-green-50 text-green-700",
        tone === "neutral" && "bg-muted text-muted-foreground"
      )}
    >
      <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

interface ProgressBarProps {
  value: number; // 0–100
  tone?: "neutral" | "warning" | "danger" | "success";
}
function ProgressBar({ value, tone = "neutral" }: ProgressBarProps) {
  return (
    <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          tone === "danger" && "bg-red-500",
          tone === "warning" && "bg-amber-400",
          tone === "success" && "bg-green-500",
          tone === "neutral" && "bg-primary"
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

interface ItemRowProps {
  dot?: "red" | "amber" | "green" | "muted";
  title: string;
  meta?: string;
  right?: React.ReactNode;
}
function ItemRow({ dot = "muted", title, meta, right }: ItemRowProps) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-border/50 last:border-0">
      <span
        className={cn(
          "mt-[5px] h-1.5 w-1.5 rounded-full shrink-0",
          dot === "red" && "bg-red-500",
          dot === "amber" && "bg-amber-400",
          dot === "green" && "bg-green-500",
          dot === "muted" && "bg-muted-foreground/30"
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug truncate">{title}</p>
        {meta && <p className="text-xs text-muted-foreground mt-0.5">{meta}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */

export function ProjectCommandCenter({
  project,
  tasks,
  meetings,
  changeOrders,
  rfis,
  commitments,
  contracts,
  changeEvents = [],
  schedule = [],
  budget = [],
}: ProjectCommandCenterProps) {
  const [isEditSidebarOpen, setIsEditSidebarOpen] = React.useState(false);
  const projectId = String(project.id);
  const roomName = `project-home:${projectId}`;
  const currentUserName = useCurrentUserName();
  const { grandTotals, loading: budgetLoading } = useBudgetData(projectId, { silent: true });

  /* ── Derived: Contract ─────────────────────────────── */
  const primaryContract = contracts[0] ?? null;
  const contractValue =
    (primaryContract?.revised_contract_value as number | null) ??
    (primaryContract?.original_contract_value as number | null) ??
    null;
  const primeContractHref = primaryContract
    ? `/${projectId}/prime-contracts/${primaryContract.id}`
    : `/${projectId}/prime-contracts/new`;
  const primeContractActionLabel = primaryContract ? "View" : "Create";

  /* ── Derived: Budget ───────────────────────────────── */
  const revisedBudget = grandTotals.revisedBudget || grandTotals.originalBudgetAmount;
  const costToDate = grandTotals.jobToDateCostDetail;
  const ecac = grandTotals.estimatedCostAtCompletion;
  const variance = grandTotals.projectedOverUnder;
  const committedCosts = grandTotals.committedCosts;
  const spendPct = pct(costToDate, revisedBudget);
  const varianceTone: "success" | "danger" | "warning" =
    variance > 0 ? "success" : variance < 0 ? "danger" : "warning";
  const budgetHref = `/${projectId}/budget`;
  const budgetActionLabel = "View";
  const hasCommitments = commitments.length > 0;
  const commitmentsHref = hasCommitments
    ? `/${projectId}/commitments`
    : `/${projectId}/commitments/new?type=subcontract`;
  const commitmentsActionLabel = hasCommitments ? "View" : "Create";

  /* ── Derived: Approved change orders total ─────────── */
  const approvedCOTotal = changeOrders
    .filter((co: ChangeOrder) =>
      ["approved", "executed"].includes((co.status ?? "").toLowerCase())
    )
    .reduce((sum: number, co: ChangeOrder) => sum + ((co.total_amount as number | null) ?? 0), 0);

  /* ── Derived: Change pipeline by status ────────────── */
  const ceByStatus = changeEvents.reduce<Record<string, number>>((acc, ce) => {
    const s = (ce.status ?? "draft").toLowerCase();
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  const cePending = (ceByStatus["open"] ?? 0) + (ceByStatus["pending"] ?? 0);
  const ceApproved = ceByStatus["approved"] ?? 0;
  const ceRejected = ceByStatus["rejected"] ?? 0;
  const ceDraft = ceByStatus["draft"] ?? 0;
  const hasChangeEvents = changeEvents.length > 0;
  const changeEventsHref = hasChangeEvents
    ? `/${projectId}/change-events`
    : `/${projectId}/change-events/new`;
  const changeEventsActionLabel = hasChangeEvents ? "View All" : "Create Change Event";

  /* ── Derived: RFIs ──────────────────────────────────── */
  const rfisOpen = rfis.filter((r) => r.status.toLowerCase() !== "closed");
  const rfisOverdue = rfisOpen.filter(
    (r) => r.due_date && isPast(new Date(r.due_date))
  );
  const rfisSort = [...rfisOpen].sort((a, b) => {
    if (a.due_date && b.due_date)
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  /* ── Derived: Tasks ─────────────────────────────────── */
  const openTasks = tasks
    .filter((t) => !["done", "cancelled"].includes(t.status.toLowerCase()))
    .slice(0, 6);
  const overdueTasks = openTasks.filter(
    (t) => t.due_date && isPast(new Date(t.due_date))
  );

  /* ── Derived: Schedule milestones ───────────────────── */
  const milestones = schedule
    .filter((s: any) => s.is_milestone)
    .sort((a: any, b: any) => {
      if (a.finish_date && b.finish_date)
        return new Date(a.finish_date).getTime() - new Date(b.finish_date).getTime();
      return 0;
    })
    .slice(0, 5);

  const completedScheduleTasks = schedule.filter(
    (s: any) => (s.status ?? "").toLowerCase() === "completed"
  );
  const schedulePct = pct(completedScheduleTasks.length, schedule.length || 1);

  /* ── Derived: Days to completion ───────────────────── */
  const completionDate =
    (primaryContract?.substantial_completion_date as string | null) ??
    project["est completion"] ??
    null;
  const infoDate = project["start date"] ?? completionDate;
  const jobNumber = project["job number"] ?? project.project_number;
  const projectLocation = project.state ?? project.address;

  /* ── Recent meetings ────────────────────────────────── */
  const recentMeetings = [...meetings]
    .filter((m) => m.type === "meeting")
    .sort((a, b) => {
      if (a.date && b.date)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      return 0;
    })
    .slice(0, 4);

  /* ── Module nav — only routes that actually exist ──── */
  const modules = [
    { label: "Budget", href: `/${projectId}/budget`, icon: BarChart3 },
    { label: "Commitments", href: `/${projectId}/commitments`, icon: Layers },
    { label: "Change Events", href: `/${projectId}/change-events`, icon: TrendingUp },
    { label: "Change Orders", href: `/${projectId}/change-orders`, icon: FileText },
    { label: "Prime Contracts", href: `/${projectId}/prime-contracts`, icon: FileText },
    { label: "Schedule", href: `/${projectId}/schedule`, icon: Calendar },
    { label: "RFIs", href: `/${projectId}/rfis`, icon: FileText },
    { label: "Daily Log", href: `/${projectId}/daily-log`, icon: Clock },
    { label: "Drawings", href: `/${projectId}/drawings`, icon: FileText },
    { label: "Submittals", href: `/${projectId}/submittals`, icon: FileText },
    { label: "Directory", href: `/${projectId}/directory`, icon: Users },
  ];

  return (
    <div className="flex flex-col min-h-0">
      <RealtimeCursors roomName={roomName} username={currentUserName} />

      {/* ────────────────────────────────────────────────────
          IDENTITY BAND
      ──────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card px-5 lg:px-7 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            {jobNumber && (
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
                Job # {jobNumber}
              </div>
            )}
            <h1 className="text-xl font-semibold text-foreground leading-snug">
              {project.name ?? "Untitled Project"}
            </h1>

            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
              {project.client && (
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-4 w-4" />
                  {project.client}
                </span>
              )}

              {infoDate && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(infoDate), "MMMM d, yyyy")}
                </span>
              )}

              {projectLocation && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {projectLocation}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/${projectId}/setup`}>Edit</Link>
              </Button>
              <Button size="sm" onClick={() => setIsEditSidebarOpen(true)}>
                Project Checklist
              </Button>
            </div>

            <div className="flex items-start gap-6">
              <div className="min-w-40 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Collaborators
                </div>
                <div className="flex justify-end">
                  <RealtimeAvatarStack roomName={roomName} />
                </div>
              </div>

              {project.health_score != null && (
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Health
                  </div>
                  <div className="text-2xl font-semibold tabular-nums tracking-tight">
                    {project.health_score}
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditProjectSidebar
        project={project}
        open={isEditSidebarOpen}
        onOpenChange={setIsEditSidebarOpen}
      />

      {/* ────────────────────────────────────────────────────
          KPI RAIL
      ──────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-background">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-border">
          {/* Contract Value */}
          <div className="relative px-5 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Contract Value
            </span>
            <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
              {fmtCompact(contractValue)}
            </span>
            {approvedCOTotal > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                +{fmtCompact(approvedCOTotal)} in COs
              </p>
            )}
            <Link
              href={primeContractHref}
              className="absolute right-5 top-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {primeContractActionLabel} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Budget */}
          <div className="relative px-5 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Budget
            </span>
            {budgetLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <>
                <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
                  {fmtCompact(revisedBudget)}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {spendPct}% spent
                </p>
              </>
            )}
            <Link
              href={budgetHref}
              className="absolute right-5 top-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {budgetActionLabel} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Cost to Date */}
          <div className="px-5 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Cost to Date
            </span>
            {budgetLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <>
                <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
                  {fmtCompact(costToDate)}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  of {fmtCompact(revisedBudget)}
                </p>
              </>
            )}
          </div>

          {/* Committed */}
          <div className="relative px-5 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Committed
            </span>
            {budgetLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <>
                <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
                  {fmtCompact(committedCosts)}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {commitments.length} contract{commitments.length !== 1 ? "s" : ""}
                </p>
              </>
            )}
            <Link
              href={commitmentsHref}
              className="absolute right-5 top-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {commitmentsActionLabel} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Forecast Variance */}
          <div className="px-5 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Forecast Variance
            </span>
            {budgetLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      "text-xl font-semibold tabular-nums tracking-tight",
                      varianceTone === "success"
                        ? "text-green-600"
                        : varianceTone === "danger"
                        ? "text-red-600"
                        : "text-foreground"
                    )}
                  >
                    {variance > 0 ? "+" : ""}
                    {fmtCompact(variance)}
                  </span>
                  {varianceTone === "success" ? (
                    <TrendingDown className="h-3.5 w-3.5 text-green-500" />
                  ) : varianceTone === "danger" ? (
                    <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ECAC {fmtCompact(ecac)}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────
          MODULE NAV
      ──────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card px-5 lg:px-7 py-2.5 overflow-x-auto">
        <div className="flex items-center gap-0.5 min-w-max">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Icon className="h-3.5 w-3.5" />
                {mod.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────
          BODY — 2-col layout
      ──────────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* ── LEFT: Main content ──────────────────────── */}
        <div className="px-5 lg:px-7 py-5 space-y-6 min-w-0">

          {/* FINANCIAL OVERVIEW */}
          <section>
            <SectionHeading
              action={
                <Link
                  href={`/${projectId}/budget`}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View Budget <ChevronRight className="h-3 w-3" />
                </Link>
              }
            >
              Financial Overview
            </SectionHeading>

            {budgetLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Spend */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Cost to Date</span>
                    <span className="tabular-nums font-medium">
                      {fmtCompact(costToDate)} / {fmtCompact(revisedBudget)}
                    </span>
                  </div>
                  <ProgressBar
                    value={spendPct}
                    tone={spendPct > 90 ? "danger" : spendPct > 75 ? "warning" : "neutral"}
                  />
                </div>

                {/* Committed */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Committed Costs</span>
                    <span className="tabular-nums font-medium">
                      {fmtCompact(committedCosts)} ({pct(committedCosts, revisedBudget || 1)}%)
                    </span>
                  </div>
                  <ProgressBar
                    value={pct(committedCosts, revisedBudget || 1)}
                    tone="neutral"
                  />
                </div>

                {/* Variance callout */}
                {variance !== 0 && (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                      varianceTone === "success"
                        ? "bg-green-50 text-green-700"
                        : varianceTone === "danger"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                    )}
                  >
                    {varianceTone === "success" ? (
                      <TrendingDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                    )}
                    <span>
                      Forecast{" "}
                      <strong>
                        {variance > 0 ? "under" : "over"} budget by{" "}
                        {fmtCompact(Math.abs(variance))}
                      </strong>
                      {" "}· ECAC {fmtFull(ecac)}
                    </span>
                  </div>
                )}

                {/* Stat row */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <StatPill
                    label="Approved COs"
                    value={fmtCompact(grandTotals.approvedCOs)}
                    tone="neutral"
                  />
                  {grandTotals.pendingChanges > 0 && (
                    <StatPill
                      label="Pending"
                      value={fmtCompact(grandTotals.pendingChanges)}
                      tone="warning"
                    />
                  )}
                  <StatPill
                    label="Forecast to Complete"
                    value={fmtCompact(grandTotals.forecastToComplete)}
                    tone="neutral"
                  />
                </div>
              </div>
            )}
          </section>

          <Divider />

          {/* CHANGE PIPELINE */}
          <section>
            <SectionHeading
              action={
                <Link
                  href={changeEventsHref}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {changeEventsActionLabel} <ChevronRight className="h-3 w-3" />
                </Link>
              }
            >
              Change Pipeline
            </SectionHeading>

            {changeEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No change events</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {ceDraft > 0 && <StatPill label="Draft" value={ceDraft} tone="neutral" />}
                  {cePending > 0 && <StatPill label="Open" value={cePending} tone="warning" />}
                  {ceApproved > 0 && (
                    <StatPill label="Approved" value={ceApproved} tone="success" />
                  )}
                  {ceRejected > 0 && (
                    <StatPill label="Rejected" value={ceRejected} tone="danger" />
                  )}
                </div>
                <div>
                  {changeEvents
                    .filter((ce) =>
                      ["open", "pending", "draft"].includes(
                        (ce.status ?? "").toLowerCase()
                      )
                    )
                    .slice(0, 5)
                    .map((ce) => (
                      <ItemRow
                        key={ce.id}
                        dot={
                          (ce.status ?? "").toLowerCase() === "open" ? "amber" : "muted"
                        }
                        title={ce.title ?? `Change Event #${ce.number}`}
                        meta={(ce.type ?? "") + (ce.status ? ` · ${ce.status}` : "")}
                        right={<StatusBadge status={ce.status ?? "Draft"} />}
                      />
                    ))}
                </div>
              </div>
            )}
          </section>

          <Divider />

          {/* SCHEDULE MILESTONES */}
          <section>
            <SectionHeading
              action={
                <Link
                  href={`/${projectId}/schedule`}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View Schedule <ChevronRight className="h-3 w-3" />
                </Link>
              }
            >
              Milestones
            </SectionHeading>

            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No milestones set</p>
            ) : (
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-muted-foreground">
                    {completedScheduleTasks.length} of {schedule.length} tasks complete
                  </span>
                  <span className="tabular-nums font-medium">{schedulePct}%</span>
                </div>
                <ProgressBar value={schedulePct} />
                <div className="mt-3">
                  {milestones.map((m: any, i: number) => {
                    const isCompleted =
                      (m.status ?? "").toLowerCase() === "completed";
                    const isOverdue =
                      m.finish_date &&
                      isPast(new Date(m.finish_date)) &&
                      !isCompleted;
                    return (
                      <ItemRow
                        key={m.id ?? i}
                        dot={isCompleted ? "green" : isOverdue ? "red" : "muted"}
                        title={m.name ?? `Milestone ${i + 1}`}
                        meta={
                          m.finish_date
                            ? format(new Date(m.finish_date), "MMM d, yyyy")
                            : undefined
                        }
                        right={
                          isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : isOverdue ? (
                            <span className="text-xs font-medium text-red-600">
                              Overdue
                            </span>
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground/40" />
                          )
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <Divider />

          {/* RECENT MEETINGS */}
          <section>
            <SectionHeading
              action={
                <Link
                  href={`/${projectId}/meetings`}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View All <ChevronRight className="h-3 w-3" />
                </Link>
              }
            >
              Recent Meetings
            </SectionHeading>

            {recentMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meetings recorded</p>
            ) : (
              <div>
                {recentMeetings.map((m) => {
                  const meetingDescriptionSource =
                    m.summary ??
                    m.overview ??
                    m.description ??
                    m.notes ??
                    m.action_items ??
                    null;
                  const meetingDescription = meetingDescriptionSource
                    ? truncateSentence(meetingDescriptionSource)
                    : "Review agenda, decisions, and action items.";

                  return (
                  <Link
                    key={m.id}
                    href={`/${projectId}/meetings/${m.id}`}
                    className="flex items-start gap-2.5 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{m.title ?? "Meeting"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {meetingDescription}
                      </p>
                      {m.date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(m.date), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                  </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT: Sidebar ──────────────────────────── */}
        <div className="px-5 py-5 space-y-6 bg-muted/20">

          {/* ACTION REQUIRED */}
          <section>
            <SectionHeading>Action Required</SectionHeading>

            {rfisOverdue.length === 0 && overdueTasks.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md px-3 py-2.5 bg-green-50 text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>No overdue items</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {rfisOverdue.length > 0 && (
                  <Link
                    href={`/${projectId}/rfis`}
                    className="flex items-center justify-between rounded-md px-3 py-2.5 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span className="text-sm font-medium text-red-700">
                        {rfisOverdue.length} overdue RFI
                        {rfisOverdue.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-red-500" />
                  </Link>
                )}
                {overdueTasks.length > 0 && (
                  <div className="flex items-center gap-2 rounded-md px-3 py-2.5 bg-amber-50">
                    <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="text-sm font-medium text-amber-700">
                      {overdueTasks.length} overdue task
                      {overdueTasks.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>

          <Divider />

          {/* OPEN RFIs */}
          <section>
            <SectionHeading
              action={
                <Link
                  href={`/${projectId}/rfis`}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  All RFIs <ChevronRight className="h-3 w-3" />
                </Link>
              }
            >
              Open RFIs{rfisOpen.length > 0 ? ` (${rfisOpen.length})` : ""}
            </SectionHeading>

            {rfisSort.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open RFIs</p>
            ) : (
              <div>
                {rfisSort.slice(0, 5).map((rfi) => {
                  const overdue = rfi.due_date && isPast(new Date(rfi.due_date));
                  return (
                    <Link
                      key={rfi.id}
                      href={`/${projectId}/rfis/${rfi.id}`}
                      className="flex items-start gap-2.5 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                    >
                      <span
                        className={cn(
                          "mt-[5px] h-1.5 w-1.5 rounded-full shrink-0",
                          overdue ? "bg-red-500" : "bg-amber-400"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{rfi.subject}</p>
                        {rfi.due_date && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Due {format(new Date(rfi.due_date), "MMM d")}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={rfi.status} />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <Divider />

          {/* OPEN TASKS */}
          {openTasks.length > 0 && (
            <section>
              <SectionHeading>
                Tasks ({openTasks.length})
              </SectionHeading>
              <div>
                {openTasks.map((task) => {
                  const overdue =
                    task.due_date && isPast(new Date(task.due_date));
                  return (
                    <ItemRow
                      key={task.id}
                      dot={overdue ? "red" : "muted"}
                      title={task.description}
                      meta={
                        task.due_date
                          ? `Due ${format(new Date(task.due_date), "MMM d")}`
                          : task.assignee_name ?? undefined
                      }
                      right={<StatusBadge status={task.status} />}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {openTasks.length > 0 && <Divider />}

          {/* COMMITMENTS SUMMARY */}
          <section>
            <SectionHeading
              action={
                <Link
                  href={`/${projectId}/commitments`}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View All <ChevronRight className="h-3 w-3" />
                </Link>
              }
            >
              Commitments
            </SectionHeading>

            {commitments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No commitments</p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {(["subcontract", "purchase_order"] as const).map((type) => {
                    const count = commitments.filter((c) => c.type === type).length;
                    if (!count) return null;
                    return (
                      <StatPill
                        key={type}
                        label={type === "subcontract" ? "Subcontracts" : "POs"}
                        value={count}
                        tone="neutral"
                      />
                    );
                  })}
                  <StatPill
                    label="Executed"
                    value={commitments.filter((c) => c.executed).length}
                    tone="success"
                  />
                </div>
                <div>
                  {commitments.slice(0, 4).map((c) => (
                    <Link
                      key={c.id}
                      href={`/${projectId}/commitments/${c.id}`}
                      className="flex items-start gap-2.5 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                    >
                      <span
                        className={cn(
                          "mt-[5px] h-1.5 w-1.5 rounded-full shrink-0",
                          c.executed ? "bg-green-500" : "bg-muted-foreground/30"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{c.title ?? c.number}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {c.type === "subcontract" ? "Subcontract" : "PO"} · {c.status}
                        </p>
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                        {fmtCompact(c.contract_amount ?? c.original_amount)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
