"use client";

import * as React from "react";
import Link from "next/link";
import { format, isPast } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Image,
  TrendingDown,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBudgetData } from "@/hooks/use-budget-data";
import { useCurrentUserName } from "@/hooks/use-current-user-name";
import { useProjectRoles, type ProjectRole } from "@/hooks/use-project-roles";
import { AssignMemberDialog } from "@/components/domain/directory/AssignMemberDialog";
import { KpiRow, StatusBadge, Skeleton } from "@/components/ds";
import { ContentSectionStack } from "@/components/layout";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RealtimeCursors } from "@/components/realtime-cursors";
import { EditProjectSidebar } from "@/components/project/edit-project-sidebar";
import type { Database } from "@/types/database.types";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Meeting = Database["public"]["Tables"]["document_metadata"]["Row"];
type ChangeOrder = any;
type RFI = Database["public"]["Tables"]["rfis"]["Row"];
type Contract = Database["public"]["Tables"]["prime_contracts"]["Row"];
type ContractLineItem = Database["public"]["Tables"]["contract_line_items"]["Row"];
type ChangeEvent = Database["public"]["Tables"]["change_events"]["Row"];
type ProjectTeamMember = Database["public"]["Functions"]["get_project_team"]["Returns"][number];
type Submittal = Database["public"]["Tables"]["submittals"]["Row"];

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
  commitmentTotal?: number;
  contracts: Contract[];
  contractLineItems?: Pick<ContractLineItem, "contract_id" | "total_cost" | "quantity" | "unit_cost">[];
  changeEvents?: ChangeEvent[];
  schedule?: any[];
  team?: ProjectTeamMember[];
  submittals?: Submittal[];
  homeAlerts?: {
    hasPrimeContractWithoutFinancialMarkup: boolean;
    changeOrdersWithoutChangeRequestCount: number;
  };
  pendingSsovReviews?: Array<{
    commitmentId: string;
    commitmentNumber: string;
    commitmentTitle: string;
    submittedAt: string | null;
  }>;
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

function initials(value: string | null | undefined): string {
  const normalized = (value ?? "").trim();
  if (!normalized) return "TM";
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/* ─────────────────────────────────────────────────────────────
   Shared primitives
───────────────────────────────────────────────────────────── */

function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
        {children}
      </span>
      {action}
    </div>
  );
}

function ViewAllLink({ href, label = "View All" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
    >
      {label} <ChevronRight className="h-3 w-3" />
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Financial Overview
───────────────────────────────────────────────────────────── */

interface FinancialOverviewSectionProps {
  projectId: string;
  budgetLoading: boolean;
  revisedBudget: number;
  costToDate: number;
  spendPct: number;
  originalBudgetAmount: number;
  primeContractValue: number;
  commitmentTotal: number;
  commitments: Commitment[];
  contracts: Contract[];
  directCosts: number;
}

function FinancialOverviewSection({
  projectId,
  budgetLoading,
  revisedBudget,
  costToDate,
  spendPct,
  originalBudgetAmount,
  primeContractValue,
  commitmentTotal,
  commitments,
  contracts,
  directCosts,
}: FinancialOverviewSectionProps) {
  return (
    <section>
      <SectionHeading action={<ViewAllLink href={`/${projectId}/budget`} label="View Budget" />}>
        Financial Overview
      </SectionHeading>

      {budgetLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <KpiRow
            metrics={[
              {
                label: "Budget",
                value: fmtFull(revisedBudget),
                href: `/${projectId}/budget`,
                context: costToDate > 0
                  ? `${fmtCompact(costToDate)} of ${fmtCompact(revisedBudget)} spent`
                  : revisedBudget !== originalBudgetAmount
                  ? `Original ${fmtFull(originalBudgetAmount)}`
                  : undefined,
                progress: {
                  value: spendPct,
                  tone: spendPct > 90 ? "danger" : spendPct > 75 ? "warning" : "neutral",
                },
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
                value: fmtFull(commitmentTotal || null),
                href: `/${projectId}/commitments`,
                context: commitments.length > 0
                  ? `${commitments.length} commitment${commitments.length !== 1 ? "s" : ""}`
                  : undefined,
              },
              {
                label: "Direct Costs",
                value: fmtFull(directCosts || null),
                href: `/${projectId}/direct-costs`,
                context: costToDate > 0
                  ? `${pct(directCosts, costToDate)}% of cost to date`
                  : undefined,
              },
            ]}
          />

        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Project Team
───────────────────────────────────────────────────────────── */

const DEFAULT_ROLES = ["Project Manager", "Superintendent", "Architect"];

function ProjectTeamSection({ projectId }: { projectId: string }) {
  const { roles, isLoading, updateRoleMembers } = useProjectRoles(projectId);
  const [assignDialog, setAssignDialog] = React.useState<{
    open: boolean;
    role: ProjectRole | null;
  }>({ open: false, role: null });

  const slots = DEFAULT_ROLES.map((roleName) => {
    const dbRole = roles.find(
      (r) => r.role_name.toLowerCase() === roleName.toLowerCase(),
    );
    const firstMember = dbRole?.members[0] ?? null;
    const person = firstMember?.person ?? null;
    return { roleName, dbRole: dbRole ?? null as ProjectRole | null, person };
  });

  const openDialog = (dbRole: ProjectRole | null) => {
    if (!dbRole) return;
    setAssignDialog({ open: true, role: dbRole });
  };

  return (
    <section>
      <SectionHeading
        action={
          <ViewAllLink href={`/${projectId}/directory`} label="Project Directory" />
        }
      >
        Project Team
      </SectionHeading>

      {isLoading ? (
        <div className="space-y-2 py-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <div className="h-8 w-8 shrink-0 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {slots.map(({ roleName, dbRole, person }) => {
            const displayName = person
              ? `${person.first_name} ${person.last_name}`.trim()
              : null;
            const isClickable = !!dbRole;

            return (
              <button
                key={roleName}
                type="button"
                onClick={() => openDialog(dbRole)}
                disabled={!isClickable}
                className={cn(
                  "w-full flex items-center gap-3 border-b border-border/50 py-2.5 last:border-0 text-left",
                  isClickable && "group hover:bg-muted/40 -mx-3 px-3 rounded-md transition-colors cursor-pointer"
                )}
              >
                {person ? (
                  <>
                    <Avatar className="h-8 w-8 shrink-0 rounded-full">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {initials(displayName ?? roleName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{displayName}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{roleName}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      Edit
                    </span>
                  </>
                ) : (
                  <>
                    <div className="h-8 w-8 shrink-0 rounded-full border border-dashed border-border bg-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-muted-foreground italic">Not Assigned</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{roleName}</p>
                    </div>
                    {isClickable && (
                      <span className="shrink-0 text-xs text-primary">Assign</span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      <AssignMemberDialog
        open={assignDialog.open}
        onOpenChange={(open) => setAssignDialog((prev) => ({ ...prev, open }))}
        role={assignDialog.role}
        onSave={updateRoleMembers}
        projectId={projectId}
      />
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Recent Meetings
───────────────────────────────────────────────────────────── */

function RecentMeetingsSection({
  projectId,
  meetings,
}: {
  projectId: string;
  meetings: Meeting[];
}) {
  return (
    <section>
      <SectionHeading action={<ViewAllLink href={`/${projectId}/meetings`} />}>
        Recent Meetings
      </SectionHeading>

      {meetings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No meetings recorded</p>
      ) : (
        <div className="space-y-1">
          {meetings.map((m) => {
            const dateLabel = m.date ? format(new Date(m.date), "MMM d") : null;
            return (
              <Link
                key={m.id}
                href={`/${projectId}/meetings/${m.id}`}
                className="-mx-2 group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm transition-colors group-hover:text-primary">
                  {m.title ?? "Meeting"}
                </p>
                {dateLabel && (
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    {dateLabel}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Change Pipeline
───────────────────────────────────────────────────────────── */

interface ChangePipelineSectionProps {
  projectId: string;
  hasPipelineData: boolean;
  actionHref: string;
  actionLabel: string;
  changeEvents: ChangeEvent[];
  potentialChangeOrders: ChangeOrder[];
  approvedChangeOrders: ChangeOrder[];
}

function ChangePipelineSection({
  projectId,
  hasPipelineData,
  actionHref,
  actionLabel,
  changeEvents,
  potentialChangeOrders,
  approvedChangeOrders,
}: ChangePipelineSectionProps) {
  const pipelineRows = [
    ...changeEvents.map((ce) => ({
      id: `ce-${ce.id}`,
      href: `/${projectId}/change-events/${ce.id}`,
      type: "CE",
      title: ce.title ?? `Change Event #${ce.number}`,
      amount: null as number | null,
      status: ce.status ?? "Draft",
    })),
    ...potentialChangeOrders.map((co: ChangeOrder) => ({
      id: `pco-${co.id}`,
      href: `/${projectId}/change-orders/prime/${co.id}`,
      type: "PCO",
      title: co.title ?? "Untitled PCO",
      amount: co.total_amount ?? null,
      status: co.status ?? "Proposed",
    })),
    ...approvedChangeOrders.map((co: ChangeOrder) => ({
      id: `co-${co.id}`,
      href: Boolean(co.change_order_number)
        ? `/${projectId}/change-orders/commitment/${co.id}`
        : `/${projectId}/change-orders/prime/${co.id}`,
      type: "CO",
      title: co.title ?? "Untitled CO",
      amount: co.amount ?? co.total_amount ?? null,
      status: co.status ?? "Pending",
    })),
  ];

  return (
    <section>
      <SectionHeading action={<ViewAllLink href={actionHref} label={actionLabel} />}>
        Change Pipeline
      </SectionHeading>

      {!hasPipelineData ? (
        <p className="text-sm text-muted-foreground">No pipeline items</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border/70 bg-background">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-16 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Type
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Title
                </TableHead>
                <TableHead className="w-28 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Amount
                </TableHead>
                <TableHead className="w-36 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pipelineRows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  <TableCell className="py-2.5 align-middle">
                    <span className="inline-flex rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-muted-foreground">
                      {row.type}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 align-middle">
                    <Link
                      href={row.href}
                      className="block truncate text-sm text-foreground transition-colors hover:text-primary"
                    >
                      {row.title}
                    </Link>
                  </TableCell>
                  <TableCell className="py-2.5 text-right align-middle">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {row.amount == null ? "—" : fmtCompact(row.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 text-right align-middle">
                    <StatusBadge
                      status={row.status}
                      variant={row.status.toLowerCase() === "open" ? "info" : undefined}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Alerts
───────────────────────────────────────────────────────────── */

function AlertsSection({
  projectId,
  showPrimeContractMarkupAlert,
  changeOrdersWithoutChangeRequestCount,
  pendingSsovReviews,
  variance,
  varianceTone,
  ecac,
}: {
  projectId: string;
  showPrimeContractMarkupAlert: boolean;
  changeOrdersWithoutChangeRequestCount: number;
  pendingSsovReviews: NonNullable<ProjectCommandCenterProps["pendingSsovReviews"]>;
  variance: number;
  varianceTone: "success" | "danger" | "warning";
  ecac: number;
}) {
  const hasPendingSsov = pendingSsovReviews.length > 0;
  const hasVariance = variance !== 0;
  const hasAlerts =
    showPrimeContractMarkupAlert || changeOrdersWithoutChangeRequestCount > 0 || hasPendingSsov || hasVariance;

  return (
    <section>
      <SectionHeading>Alerts</SectionHeading>

      {!hasAlerts ? (
        <div className="flex items-center gap-2 rounded-md bg-status-success/10 px-3 py-2.5 text-sm text-status-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>No financial or change-order alerts</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {hasVariance && (
            <Link
              href={`/${projectId}/budget`}
              className={cn(
                "flex items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-colors",
                varianceTone === "danger"
                  ? "border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10"
                  : "border-border bg-muted text-foreground hover:bg-muted/80",
              )}
            >
              <div className="flex items-center gap-2">
                {varianceTone === "success" ? (
                  <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>
                  Forecast{" "}
                  <strong>
                    {variance > 0 ? "under" : "over"} budget by {fmtCompact(Math.abs(variance))}
                  </strong>
                  {" · ECAC "}{fmtFull(ecac)}
                </span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </Link>
          )}
          {hasPendingSsov && (
            <div className="overflow-hidden rounded-md border border-status-warning/30 bg-status-warning/5">
              <Link
                href={`/${projectId}/commitments`}
                className="flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-status-warning/10"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-status-warning" />
                  <span className="text-sm font-medium text-status-warning">
                    {pendingSsovReviews.length} subcontractor SOV
                    {pendingSsovReviews.length !== 1 ? "s" : ""} pending review
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-status-warning" />
              </Link>
              {pendingSsovReviews.slice(0, 3).map((item) => (
                <Link
                  key={item.commitmentId}
                  href={`/${projectId}/commitments/${item.commitmentId}?tab=subcontractor-sov`}
                  className="flex items-start justify-between gap-2 border-t border-status-warning/20 px-3 py-2.5 transition-colors hover:bg-status-warning/10"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.commitmentNumber ? `${item.commitmentNumber} · ` : ""}
                      {item.commitmentTitle} pending SSOV review
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Submitted{" "}
                      {item.submittedAt
                        ? format(new Date(item.submittedAt), "MMM d, yyyy")
                        : "recently"}
                    </p>
                  </div>
                  <StatusBadge status="Under Review" />
                </Link>
              ))}
            </div>
          )}

          {showPrimeContractMarkupAlert && (
            <Link
              href={`/${projectId}/prime-contracts`}
              className="flex items-center justify-between rounded-md bg-destructive/10 px-3 py-2.5 transition-colors hover:bg-destructive/15"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  Prime contract created without financial markup
                </span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-destructive" />
            </Link>
          )}
          {changeOrdersWithoutChangeRequestCount > 0 && (
            <Link
              href={`/${projectId}/change-orders`}
              className="flex items-center justify-between rounded-md bg-destructive/10 px-3 py-2.5 transition-colors hover:bg-destructive/15"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  {changeOrdersWithoutChangeRequestCount} change order
                  {changeOrdersWithoutChangeRequestCount !== 1 ? "s" : ""} without change request
                </span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-destructive" />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Action Required
───────────────────────────────────────────────────────────── */

interface ActionRequiredSectionProps {
  projectId: string;
  rfisOverdue: RFI[];
  overdueTasks: Task[];
}

function ActionRequiredSection({
  projectId,
  rfisOverdue,
  overdueTasks,
}: ActionRequiredSectionProps) {
  const hasActions = rfisOverdue.length > 0 || overdueTasks.length > 0;

  return (
    <section>
      <SectionHeading>Action Required</SectionHeading>

      {!hasActions ? (
        <div className="flex items-center gap-2 rounded-md bg-status-success/10 px-3 py-2.5 text-sm text-status-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>No overdue items</span>
        </div>
      ) : (
        <div className="space-y-3">
          {rfisOverdue.length > 0 && (
            <Link
              href={`/${projectId}/rfis`}
              className="flex items-center justify-between rounded-md bg-destructive/10 px-3 py-2.5 transition-colors hover:bg-destructive/15"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  {rfisOverdue.length} overdue RFI{rfisOverdue.length !== 1 ? "s" : ""}
                </span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-destructive" />
            </Link>
          )}

          {overdueTasks.length > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-status-warning/10 px-3 py-2.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-status-warning" />
              <span className="text-sm font-medium text-status-warning">
                {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Open RFIs
───────────────────────────────────────────────────────────── */

function OpenRFIsSection({
  projectId,
  rfisOpen,
  rfisSort,
}: {
  projectId: string;
  rfisOpen: RFI[];
  rfisSort: RFI[];
}) {
  return (
    <section>
      <SectionHeading action={<ViewAllLink href={`/${projectId}/rfis`} label="All RFIs" />}>
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
                className="-mx-2 flex items-start gap-2.5 rounded-md border-b border-border/50 px-2 py-2.5 last:border-0 transition-colors hover:bg-muted/50"
              >
                <span
                  className={cn(
                    "mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full",
                    overdue ? "bg-destructive" : "bg-amber-500 dark:bg-amber-400",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{rfi.subject}</p>
                  {rfi.due_date && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
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
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Open Submittals
───────────────────────────────────────────────────────────── */

function OpenSubmittalsSection({
  projectId,
  submittals,
}: {
  projectId: string;
  submittals: Submittal[];
}) {
  const open = submittals.filter(
    (s) => !["Closed", "closed"].includes(s.status ?? ""),
  );
  const sorted = [...open].sort(
    (a, b) =>
      new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
      new Date(a.updated_at ?? a.created_at ?? 0).getTime(),
  );

  return (
    <section>
      <SectionHeading
        action={<ViewAllLink href={`/${projectId}/submittals`} label="All Submittals" />}
      >
        Open Submittals{open.length > 0 ? ` (${open.length})` : ""}
      </SectionHeading>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open submittals</p>
      ) : (
        <div>
          {sorted.slice(0, 5).map((s) => {
            const overdue = s.final_due_date && isPast(new Date(s.final_due_date));
            return (
              <Link
                key={s.id}
                href={`/${projectId}/submittals/${s.id}`}
                className="-mx-2 flex items-start gap-2.5 rounded-md border-b border-border/50 px-2 py-2.5 last:border-0 transition-colors hover:bg-muted/50"
              >
                <span
                  className={cn(
                    "mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full",
                    overdue ? "bg-destructive" : "bg-blue-500 dark:bg-blue-400",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {s.submittal_number ? `${s.submittal_number} – ` : ""}{s.title}
                  </p>
                  {s.final_due_date && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Due {format(new Date(s.final_due_date), "MMM d")}
                    </p>
                  )}
                </div>
                <StatusBadge status={s.status ?? "Open"} />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Project Setup
───────────────────────────────────────────────────────────── */

interface SetupItemDef {
  id: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  href: (id: string) => string;
}

const SETUP_ITEMS: SetupItemDef[] = [
  {
    id: "directory",
    icon: Users,
    title: "Update Directory",
    description: "Add team members and assign roles",
    href: (id) => `/${id}/directory`,
  },
  {
    id: "budget",
    icon: DollarSign,
    title: "Create Budget",
    description: "Set up project budget and line items",
    href: (id) => `/${id}/budget`,
  },
  {
    id: "prime-contract",
    icon: Building2,
    title: "Create Prime Contract",
    description: "Establish primary contract terms",
    href: (id) => `/${id}/prime-contracts`,
  },
  {
    id: "specifications",
    icon: FileText,
    title: "Add Specifications",
    description: "Upload project specifications",
    href: (id) => `/${id}/specifications`,
  },
  {
    id: "drawings",
    icon: Image,
    title: "Upload Drawings",
    description: "Add architectural and engineering drawings",
    href: (id) => `/${id}/drawings`,
  },
  {
    id: "schedule",
    icon: Calendar,
    title: "Create Schedule",
    description: "Build project timeline and milestones",
    href: (id) => `/${id}/schedule`,
  },
];

interface ProjectSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  hasTeam: boolean;
  hasBudget: boolean;
  hasContracts: boolean;
  hasSchedule: boolean;
}

function ProjectSetupSheet({
  open,
  onOpenChange,
  projectId,
  hasTeam,
  hasBudget,
  hasContracts,
  hasSchedule,
}: ProjectSetupSheetProps) {
  const completionMap: Record<string, boolean> = {
    directory: hasTeam,
    budget: hasBudget,
    "prime-contract": hasContracts,
    specifications: false,
    drawings: false,
    schedule: hasSchedule,
  };

  const trackableIds = ["directory", "budget", "prime-contract", "schedule"];
  const completedCount = trackableIds.filter((id) => completionMap[id]).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="text-base font-semibold">Project Setup</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Complete these steps to get your project running.
          </p>
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">
              {completedCount} of {trackableIds.length} complete
            </p>
            <div className="flex items-center gap-1">
              {trackableIds.map((id) => (
                <div
                  key={id}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors duration-300",
                    completionMap[id] ? "bg-primary" : "bg-muted",
                  )}
                />
              ))}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-1">
            {SETUP_ITEMS.map((item) => {
              const Icon = item.icon;
              const done = completionMap[item.id] ?? false;
              return (
                <Link
                  key={item.id}
                  href={item.href(projectId)}
                  onClick={() => onOpenChange(false)}
                  className="group flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-muted/60"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
                      done
                        ? "bg-status-success/10"
                        : "bg-primary/10 group-hover:bg-primary/15",
                    )}
                  >
                    {done ? (
                      <Check className="h-4 w-4 text-status-success" strokeWidth={2.5} />
                    ) : (
                      <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm leading-none mb-1",
                        done
                          ? "font-normal text-muted-foreground line-through decoration-muted-foreground/40"
                          : "font-medium text-foreground",
                      )}
                    >
                      {item.title}
                    </p>
                    <p className={cn("text-xs", done ? "text-muted-foreground/60" : "text-muted-foreground")}>
                      {item.description}
                    </p>
                  </div>
                  <ArrowRight
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-all",
                      done
                        ? "text-muted-foreground/20"
                        : "text-muted-foreground/30 group-hover:translate-x-0.5 group-hover:text-primary",
                    )}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
  commitmentTotal = 0,
  contracts,
  contractLineItems = [],
  changeEvents = [],
  homeAlerts,
  pendingSsovReviews = [],
  team,
  budget,
  schedule,
  submittals = [],
}: ProjectCommandCenterProps) {
  const projectId = String(project.id);
  const [isEditProjectSidebarOpen, setIsEditProjectSidebarOpen] = React.useState(false);
  const [isSetupOpen, setIsSetupOpen] = React.useState(false);
  const roomName = `project-home:${projectId}`;
  const currentUserName = useCurrentUserName();
  const { grandTotals, loading: budgetLoading } = useBudgetData(projectId, { silent: true });

  /* ── Budget ────────────────────────────────────────────── */
  const revisedBudget = grandTotals.revisedBudget || grandTotals.originalBudgetAmount;
  const costToDate = grandTotals.jobToDateCostDetail;
  const ecac = grandTotals.estimatedCostAtCompletion;
  const variance = grandTotals.projectedOverUnder;
  const spendPct = pct(costToDate, revisedBudget);
  const varianceTone: "success" | "danger" | "warning" =
    variance > 0 ? "success" : variance < 0 ? "danger" : "warning";
  const primeContractValue = contractLineItems.reduce(
    (sum, li) => sum + (li.total_cost ?? 0),
    0,
  );

  /* ── Change pipeline ───────────────────────────────────── */
  const sortedChangeEvents = [...changeEvents]
    .filter((ce) => !["closed", "rejected"].includes((ce.status ?? "").toLowerCase()))
    .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())
    .slice(0, 6);
  const potentialChangeOrders = [...changeOrders]
    .filter((co: ChangeOrder) => Boolean(co?.pcco_number))
    .sort((a: ChangeOrder, b: ChangeOrder) =>
      new Date(b?.updated_at ?? b?.created_at ?? 0).getTime() -
      new Date(a?.updated_at ?? a?.created_at ?? 0).getTime(),
    )
    .slice(0, 6);
  const approvedChangeOrders = [...changeOrders]
    .filter((co: ChangeOrder) => !co?.pcco_number)
    .sort((a: ChangeOrder, b: ChangeOrder) =>
      new Date(b?.updated_at ?? b?.created_at ?? 0).getTime() -
      new Date(a?.updated_at ?? a?.created_at ?? 0).getTime(),
    )
    .slice(0, 6);
  const hasPipelineData =
    sortedChangeEvents.length > 0 ||
    potentialChangeOrders.length > 0 ||
    approvedChangeOrders.length > 0;
  const hasChangeEvents = changeEvents.length > 0;
  const changeEventsHref = hasChangeEvents
    ? `/${projectId}/change-events`
    : `/${projectId}/change-events/new`;
  const changeEventsActionLabel = hasChangeEvents ? "View All" : "Create Change Event";

  /* ── RFIs ──────────────────────────────────────────────── */
  const rfisOpen = rfis.filter((r) => r.status.toLowerCase() !== "closed");
  const rfisOverdue = rfisOpen.filter((r) => r.due_date && isPast(new Date(r.due_date)));
  const rfisSort = [...rfisOpen].sort((a, b) => {
    if (a.due_date && b.due_date)
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  /* ── Tasks ─────────────────────────────────────────────── */
  const openTasks = tasks
    .filter((t) => !["done", "cancelled"].includes(t.status.toLowerCase()))
    .slice(0, 6);
  const overdueTasks = openTasks.filter((t) => t.due_date && isPast(new Date(t.due_date)));

  /* ── Alerts ────────────────────────────────────────────── */
  const showPrimeContractMarkupAlert = homeAlerts?.hasPrimeContractWithoutFinancialMarkup ?? false;
  const changeOrdersWithoutChangeRequestCount =
    homeAlerts?.changeOrdersWithoutChangeRequestCount ?? 0;

  /* ── Project meta ──────────────────────────────────────── */
  const jobNumber = project["job number"] ?? project.project_number;

  /* ── Meetings ──────────────────────────────────────────── */
  const recentMeetings = [...meetings]
    .filter((m) => m.type === "meeting")
    .sort((a, b) => {
      if (a.date && b.date)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      return 0;
    })
    .slice(0, 4);

  return (
    <div className="flex min-h-0 flex-col">
      <RealtimeCursors roomName={roomName} username={currentUserName} />

      {/* Identity Band */}
      <div className="px-4 py-4 sm:px-5 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            {jobNumber && (
              <div className="mb-1.5 text-sm font-semibold uppercase tracking-normal text-muted-foreground">
                Job # {jobNumber}
              </div>
            )}
            <h1 className="text-3xl font-semibold leading-snug text-foreground sm:text-2xl">
              {project.name ?? "Untitled Project"}
            </h1>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSetupOpen(true)}
              >
                Project Setup
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditProjectSidebarOpen(true)}
              >
                Edit
              </Button>
            </div>
            {project.health_score != null && (
              <div className="text-right">
                <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Health
                </div>
                <div className="text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">
                  {project.health_score}
                  <span className="text-sm font-normal text-muted-foreground">/100</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body — 2-col layout */}
      <div className="flex-1 grid grid-cols-1 gap-y-8 lg:grid-cols-[minmax(0,1fr)_560px] lg:gap-x-12 lg:gap-y-0">
        {/* Left: Main */}
        <div className="min-w-0 px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <ContentSectionStack>
            <FinancialOverviewSection
              projectId={projectId}
              budgetLoading={budgetLoading}
              revisedBudget={revisedBudget}
              costToDate={costToDate}
              spendPct={spendPct}
              originalBudgetAmount={grandTotals.originalBudgetAmount}
              primeContractValue={primeContractValue}
              commitmentTotal={commitmentTotal}
              commitments={commitments}
              contracts={contracts}
              directCosts={grandTotals.directCosts}
            />
            <ProjectTeamSection projectId={projectId} />
            <RecentMeetingsSection projectId={projectId} meetings={recentMeetings} />
            <ChangePipelineSection
              projectId={projectId}
              hasPipelineData={hasPipelineData}
              actionHref={changeEventsHref}
              actionLabel={changeEventsActionLabel}
              changeEvents={sortedChangeEvents}
              potentialChangeOrders={potentialChangeOrders}
              approvedChangeOrders={approvedChangeOrders}
            />
          </ContentSectionStack>
        </div>

        {/* Right: Sidebar */}
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <ContentSectionStack>
            <AlertsSection
              projectId={projectId}
              showPrimeContractMarkupAlert={showPrimeContractMarkupAlert}
              changeOrdersWithoutChangeRequestCount={changeOrdersWithoutChangeRequestCount}
              pendingSsovReviews={pendingSsovReviews}
              variance={variance}
              varianceTone={varianceTone}
              ecac={ecac}
            />
            <ActionRequiredSection
              projectId={projectId}
              rfisOverdue={rfisOverdue}
              overdueTasks={overdueTasks}
            />
            <OpenRFIsSection
              projectId={projectId}
              rfisOpen={rfisOpen}
              rfisSort={rfisSort}
            />
            <OpenSubmittalsSection
              projectId={projectId}
              submittals={submittals}
            />
          </ContentSectionStack>
        </div>
      </div>

      <EditProjectSidebar
        project={project}
        open={isEditProjectSidebarOpen}
        onOpenChange={setIsEditProjectSidebarOpen}
      />
      <ProjectSetupSheet
        open={isSetupOpen}
        onOpenChange={setIsSetupOpen}
        projectId={projectId}
        hasTeam={(team ?? []).length > 0}
        hasBudget={(budget ?? []).length > 0}
        hasContracts={contracts.length > 0}
        hasSchedule={(schedule ?? []).length > 0}
      />
    </div>
  );
}
