"use client";

import * as React from "react";
import Link from "next/link";
import { format, isPast } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  TrendingDown,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBudgetData } from "@/hooks/use-budget-data";
import { useCurrentUserName } from "@/hooks/use-current-user-name";
import { KpiRow, StatusBadge, Skeleton } from "@/components/ds";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RealtimeCursors } from "@/components/realtime-cursors";
import { EditProjectSidebar } from "@/components/project/edit-project-sidebar";
import type { Database } from "@/types/database.types";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Meeting = Database["public"]["Tables"]["document_metadata"]["Row"];
// changeOrders merges prime_contract_change_orders + contract_change_orders (different shapes)
type ChangeOrder = any;
type RFI = Database["public"]["Tables"]["rfis"]["Row"];
type Contract = Database["public"]["Tables"]["prime_contracts"]["Row"];
type ContractLineItem = Database["public"]["Tables"]["contract_line_items"]["Row"];
type ChangeEvent = Database["public"]["Tables"]["change_events"]["Row"];
type ProjectTeamMember = Database["public"]["Functions"]["get_project_team"]["Returns"][number];

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
  commitmentSovTotal?: number;
  contracts: Contract[];
  contractLineItems?: Pick<ContractLineItem, "contract_id" | "total_cost" | "quantity" | "unit_cost">[];
  changeEvents?: ChangeEvent[];
  schedule?: any[];
  team?: ProjectTeamMember[];
  homeAlerts?: {
    hasPrimeContractWithoutFinancialMarkup: boolean;
    changeOrdersWithoutChangeRequestCount: number;
  };
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

function formatTaskSource(sourceSystem: string | null | undefined): string {
  const normalized = (sourceSystem ?? "").trim().toLowerCase();
  if (!normalized) return "Unknown";
  if (normalized.includes("fireflies")) return "Fireflies";
  if (normalized.includes("manual")) return "Manual";
  if (normalized.includes("ai")) return "AI";
  if (normalized.includes("import")) return "Imported";
  if (normalized.includes("api")) return "API";
  return normalized
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function truncateSentence(value: string, max = 110): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function initials(value: string | null | undefined): string {
  const normalized = (value ?? "").trim();
  if (!normalized) return "TM";
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
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
      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
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
  commitmentSovTotal = 0,
  contracts,
  contractLineItems = [],
  changeEvents = [],
  budget = [],
  team = [],
  homeAlerts,
}: ProjectCommandCenterProps) {
  const projectId = String(project.id);
  const [isEditProjectSidebarOpen, setIsEditProjectSidebarOpen] = React.useState(false);
  const roomName = `project-home:${projectId}`;
  const currentUserName = useCurrentUserName();
  const { grandTotals, loading: budgetLoading } = useBudgetData(projectId, { silent: true });

  /* ── Derived: Contract ─────────────────────────────── */
  const primaryContract = contracts[0] ?? null;

  /* ── Derived: Budget ───────────────────────────────── */
  const revisedBudget = grandTotals.revisedBudget || grandTotals.originalBudgetAmount;
  const costToDate = grandTotals.jobToDateCostDetail;
  const ecac = grandTotals.estimatedCostAtCompletion;
  const variance = grandTotals.projectedOverUnder;
  const committedCosts = grandTotals.committedCosts;
  const spendPct = pct(costToDate, revisedBudget);
  const varianceTone: "success" | "danger" | "warning" =
    variance > 0 ? "success" : variance < 0 ? "danger" : "warning";

  /* ── Derived: Prime Contract value ────────────────── */
  const primeContractValue = contractLineItems.reduce(
    (sum, li) => sum + (li.total_cost ?? 0),
    0
  );

  /* ── Derived: Commitments total ───────────────────── */
  const commitmentsTotal = commitments.reduce(
    (sum, c) => sum + (c.contract_amount ?? c.original_amount ?? 0),
    0
  );

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
  const sortedChangeEvents = [...changeEvents]
    .filter((ce) => !["closed", "rejected"].includes((ce.status ?? "").toLowerCase()))
    .sort((a, b) => {
      const aTime = new Date(a.updated_at ?? a.created_at).getTime();
      const bTime = new Date(b.updated_at ?? b.created_at).getTime();
      return bTime - aTime;
    })
    .slice(0, 6);
  const potentialChangeOrders = [...changeOrders]
    .filter((co: ChangeOrder) => Boolean(co?.pcco_number))
    .sort((a: ChangeOrder, b: ChangeOrder) => {
      const aTime = new Date(a?.updated_at ?? a?.created_at ?? 0).getTime();
      const bTime = new Date(b?.updated_at ?? b?.created_at ?? 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 6);
  const approvedChangeOrders = [...changeOrders]
    .filter((co: ChangeOrder) => !co?.pcco_number)
    .sort((a: ChangeOrder, b: ChangeOrder) => {
      const aTime = new Date(a?.updated_at ?? a?.created_at ?? 0).getTime();
      const bTime = new Date(b?.updated_at ?? b?.created_at ?? 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 6);
  const hasPipelineData =
    sortedChangeEvents.length > 0 ||
    potentialChangeOrders.length > 0 ||
    approvedChangeOrders.length > 0;

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
  const changeOrdersWithoutChangeRequestCount =
    homeAlerts?.changeOrdersWithoutChangeRequestCount ?? 0;
  const showPrimeContractMarkupAlert =
    homeAlerts?.hasPrimeContractWithoutFinancialMarkup ?? false;
  const hasHomeAlerts =
    showPrimeContractMarkupAlert || changeOrdersWithoutChangeRequestCount > 0;

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
  const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]));

  /* ── Module nav — only routes that actually exist ──── */

  return (
    <div className="flex flex-col min-h-0">
      <RealtimeCursors roomName={roomName} username={currentUserName} />

      {/* ────────────────────────────────────────────────────
          IDENTITY BAND
      ──────────────────────────────────────────────────── */}
      <div className="px-5 lg:px-7 py-4">
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditProjectSidebarOpen(true)}
              >
                Edit
              </Button>
            </div>

            <div className="flex items-start gap-6">
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
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  View Budget <ChevronRight className="h-3 w-3" />
                </Link>
              }
            >
              Financial Overview
            </SectionHeading>

            {budgetLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* KPI Blocks */}
                <KpiRow
                  metrics={[
                    {
                      label: "Budget",
                      value: fmtFull(revisedBudget),
                      href: `/${projectId}/budget`,
                      context: revisedBudget !== grandTotals.originalBudgetAmount
                        ? `Original ${fmtFull(grandTotals.originalBudgetAmount)}`
                        : undefined,
                    },
                    {
                      label: "Prime Contract",
                      value: fmtFull(primeContractValue || null),
                      href: `/${projectId}/prime-contracts`,
                      context: contracts.length > 0
                        ? `${contracts.length} contract${contracts.length !== 1 ? "s" : ""}`
                        : undefined,
                    },
                    {
                      label: "Commitments",
                      value: fmtFull(commitmentSovTotal || null),
                      href: `/${projectId}/commitments`,
                      context: commitments.length > 0
                        ? `${commitments.length} commitment${commitments.length !== 1 ? "s" : ""}`
                        : undefined,
                    },
                    {
                      label: "Direct Costs",
                      value: fmtFull(grandTotals.directCosts || null),
                      href: `/${projectId}/direct-costs`,
                      context: costToDate > 0
                        ? `${pct(grandTotals.directCosts, costToDate)}% of cost to date`
                        : undefined,
                    },
                  ]}
                />

                {/* Spend progress */}
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

                {/* Committed progress */}
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
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  {changeEventsActionLabel} <ChevronRight className="h-3 w-3" />
                </Link>
              }
            >
              Change Pipeline
            </SectionHeading>

            {!hasPipelineData ? (
              <p className="text-sm text-muted-foreground">No pipeline items</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {ceDraft > 0 && <StatPill label="Draft" value={ceDraft} tone="neutral" />}
                  {cePending > 0 && <StatPill label="Open" value={cePending} tone="warning" />}
                  {ceApproved > 0 && <StatPill label="Approved" value={ceApproved} tone="success" />}
                  {ceRejected > 0 && <StatPill label="Rejected" value={ceRejected} tone="danger" />}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-border/70 bg-background">
                    <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Change Events
                      </p>
                      <span className="text-xs text-muted-foreground">{sortedChangeEvents.length}</span>
                    </div>
                    <div className="p-2 space-y-2">
                      {sortedChangeEvents.length === 0 ? (
                        <p className="px-1 py-2 text-xs text-muted-foreground">No active change events</p>
                      ) : (
                        sortedChangeEvents.map((ce) => (
                          <Link
                            key={ce.id}
                            href={`/${projectId}/change-events/${ce.id}`}
                            className="block rounded-md border border-border/60 px-2.5 py-2 hover:bg-muted/50 transition-colors"
                          >
                            <p className="text-sm font-medium leading-snug truncate">
                              {ce.title ?? `Change Event #${ce.number}`}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground truncate">
                              {ce.number ? `#${ce.number} · ` : ""}{ce.type}
                            </p>
                            <div className="mt-2">
                              <StatusBadge status={ce.status ?? "Open"} />
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border border-border/70 bg-background">
                    <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Potential Change Orders
                      </p>
                      <span className="text-xs text-muted-foreground">{potentialChangeOrders.length}</span>
                    </div>
                    <div className="p-2 space-y-2">
                      {potentialChangeOrders.length === 0 ? (
                        <p className="px-1 py-2 text-xs text-muted-foreground">No potential change orders</p>
                      ) : (
                        potentialChangeOrders.map((co: ChangeOrder) => (
                          <Link
                            key={`pco-${co.id}`}
                            href={`/${projectId}/change-orders/prime/${co.id}`}
                            className="block rounded-md border border-border/60 px-2.5 py-2 hover:bg-muted/50 transition-colors"
                          >
                            <p className="text-sm font-medium leading-snug truncate">
                              {co.title ?? "Untitled PCO"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground truncate">
                              {co.pcco_number ?? `PCO #${co.id}`}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <StatusBadge status={co.status ?? "Proposed"} />
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {fmtCompact(co.total_amount)}
                              </span>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border border-border/70 bg-background">
                    <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Change Orders
                      </p>
                      <span className="text-xs text-muted-foreground">{approvedChangeOrders.length}</span>
                    </div>
                    <div className="p-2 space-y-2">
                      {approvedChangeOrders.length === 0 ? (
                        <p className="px-1 py-2 text-xs text-muted-foreground">No change orders</p>
                      ) : (
                        approvedChangeOrders.map((co: ChangeOrder) => {
                          const isCommitmentCo = Boolean(co.change_order_number);
                          const coHref = isCommitmentCo
                            ? `/${projectId}/change-orders/commitment/${co.id}`
                            : `/${projectId}/change-orders/prime/${co.id}`;
                          return (
                          <Link
                            key={`co-${co.id}`}
                            href={coHref}
                            className="block rounded-md border border-border/60 px-2.5 py-2 hover:bg-muted/50 transition-colors"
                          >
                            <p className="text-sm font-medium leading-snug truncate">
                              {co.title ?? "Untitled CO"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground truncate">
                              {co.change_order_number ?? `CO #${co.id}`}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <StatusBadge status={co.status ?? "Pending"} />
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {fmtCompact(co.amount ?? co.total_amount)}
                              </span>
                            </div>
                          </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <Divider />

          {/* TASKS */}
          <section>
            <SectionHeading
              action={
                <Link
                  href={`/${projectId}/tasks`}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  View All <ChevronRight className="h-3 w-3" />
                </Link>
              }
            >
              Tasks
            </SectionHeading>

            {openTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tasks</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border/70 bg-background">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="border-b border-border/70">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned To</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Created</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Associated Meeting</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openTasks.map((task) => {
                      const meeting = meetingsById.get(task.metadata_id);
                      const hasMeetingLink = Boolean(meeting && meeting.type === "meeting");

                      return (
                        <tr key={task.id} className="border-b border-border/50 last:border-0">
                          <td className="px-3 py-2.5 align-top">
                            <p className="font-medium text-foreground">{task.description}</p>
                          </td>
                          <td className="px-3 py-2.5 align-top text-muted-foreground">
                            {task.assignee_name?.trim() || "Unassigned"}
                          </td>
                          <td className="px-3 py-2.5 align-top text-muted-foreground tabular-nums">
                            {format(new Date(task.created_at), "MMM d, yyyy")}
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <StatusBadge status={task.status} />
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            {hasMeetingLink ? (
                              <Link
                                href={`/${projectId}/meetings/${task.metadata_id}`}
                                className="text-primary hover:text-primary/80 transition-colors"
                              >
                                {meeting?.title?.trim() || "Open meeting"}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 align-top text-muted-foreground">
                            {formatTaskSource(task.source_system)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>

        {/* ── RIGHT: Sidebar ──────────────────────────── */}
        <div className="px-5 py-5 space-y-6 bg-muted/20">

          {/* ALERTS */}
          <section>
            <SectionHeading>Alerts</SectionHeading>

            {!hasHomeAlerts ? (
              <div className="flex items-center gap-2 rounded-md px-3 py-2.5 bg-green-50 text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>No financial or change-order alerts</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {showPrimeContractMarkupAlert && (
                  <Link
                    href={`/${projectId}/prime-contracts`}
                    className="flex items-center justify-between rounded-md px-3 py-2.5 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span className="text-sm font-medium text-red-700">
                        Prime contract created without financial markup
                      </span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-red-500" />
                  </Link>
                )}
                {changeOrdersWithoutChangeRequestCount > 0 && (
                  <Link
                    href={`/${projectId}/change-orders`}
                    className="flex items-center justify-between rounded-md px-3 py-2.5 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span className="text-sm font-medium text-red-700">
                        {changeOrdersWithoutChangeRequestCount} change order
                        {changeOrdersWithoutChangeRequestCount !== 1 ? "s" : ""} without change request
                      </span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-red-500" />
                  </Link>
                )}
              </div>
            )}
          </section>

          <Divider />

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

          {/* PROJECT TEAM */}
          <section>
            <SectionHeading
              action={
                <Link
                  href={`/${projectId}/directory`}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  View Team <ChevronRight className="h-3 w-3" />
                </Link>
              }
            >
              Project Team
            </SectionHeading>

            {team.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members assigned</p>
            ) : (
              <div>
                {team.slice(0, 6).map((member) => {
                  const displayName = member.full_name?.trim() || "Team Member";
                  const avatarSrc = member.person_id
                    ? `/api/avatar/${member.person_id}?projectId=${projectId}`
                    : undefined;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0"
                    >
                      <Avatar className="h-8 w-8 rounded-full">
                        <AvatarImage src={avatarSrc} alt={displayName} />
                        <AvatarFallback className="text-xs">{initials(displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {member.role || "Team Member"}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
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

          {/* RECENT MEETINGS */}
          <section>
            <SectionHeading
              action={
                <Link
                  href={`/${projectId}/meetings`}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
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
              <div className="space-y-1">
                {recentMeetings.map((m) => {
                  const meetingDateLabel = m.date
                    ? format(new Date(m.date), "MMM d")
                    : null;

                  return (
                    <Link
                      key={m.id}
                      href={`/${projectId}/meetings/${m.id}`}
                      className="group flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate group-hover:text-primary transition-colors">
                          {m.title ?? "Meeting"}
                        </p>
                      </div>
                      {meetingDateLabel && (
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                          {meetingDateLabel}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </div>

      <EditProjectSidebar
        project={project}
        open={isEditProjectSidebarOpen}
        onOpenChange={setIsEditProjectSidebarOpen}
      />
    </div>
  );
}
