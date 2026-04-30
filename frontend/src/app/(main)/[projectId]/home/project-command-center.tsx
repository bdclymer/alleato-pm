"use client";

import * as React from "react";
import Link from "next/link";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
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
  Receipt,
  TrendingDown,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBudgetData } from "@/hooks/use-budget-data";
import { useCurrentUserName } from "@/hooks/use-current-user-name";
import { useProjectRoles, type ProjectRole } from "@/hooks/use-project-roles";
import { AssignMemberDialog } from "@/components/domain/directory/AssignMemberDialog";
import {
  Avatar,
  AvatarFallback,
  Button,
  CompactSectionHeader as SectionHeading,
  KpiRow,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  StatusBadge,
  type KpiBlockProps,
} from "@/components/ds";
import { ContentSectionStack } from "@/components/layout";
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
type ContractLineItem =
  Database["public"]["Tables"]["contract_line_items"]["Row"];
type ChangeEvent = Database["public"]["Tables"]["change_events"]["Row"];
type ProjectTeamMember =
  Database["public"]["Functions"]["get_project_team"]["Returns"][number];
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
  revised_contract_amount?: number;
}

interface OwnerInvoice {
  id: number;
  invoice_number: string | null;
  status: string | null;
  gross_amount: number | null;
  paid_amount: number | null;
  billing_date: string | null;
  prime_contract_id: string | null;
}

interface SubcontractorInvoice {
  id: number;
  invoice_number: string | null;
  status: Database["public"]["Enums"]["invoice_status"];
  billing_date: string | null;
  subcontract_id: string | null;
  purchase_order_id: string | null;
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
  contractLineItems?: Pick<
    ContractLineItem,
    "contract_id" | "total_cost" | "quantity" | "unit_cost"
  >[];
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
  ownerInvoices?: OwnerInvoice[];
  subcontractorInvoices?: SubcontractorInvoice[];
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

function ViewAllLink({
  href,
  label = "View All",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
    >
      {label} <ChevronRight className="h-3 w-3" />
    </Link>
  );
}

type HomeTone = "success" | "warning" | "danger" | "neutral";

interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: Exclude<HomeTone, "neutral">;
}

interface HealthCell {
  label: string;
  value: string;
  detail: string;
  href: string;
  tone: HomeTone;
}

function toneTextClass(tone: HomeTone): string {
  if (tone === "success") return "text-status-success";
  if (tone === "warning") return "text-primary";
  if (tone === "danger") return "text-destructive";
  return "text-muted-foreground";
}

function ProjectPageIdentity({
  projectName,
  jobNumber,
  healthScore,
  setupCompletedCount,
  setupTotalCount,
  onOpenSetup,
  onEditProject,
}: {
  projectName: string;
  jobNumber?: string | number | null;
  healthScore?: number | null;
  setupCompletedCount: number;
  setupTotalCount: number;
  onOpenSetup: () => void;
  onEditProject: () => void;
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {jobNumber && (
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Job # {jobNumber}
          </div>
        )}
        <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          {projectName}
        </h1>
      </div>

      <div className="flex shrink-0 items-start gap-2">
        <ReadinessIndicator
          completedCount={setupCompletedCount}
          totalCount={setupTotalCount}
          onOpen={onOpenSetup}
        />
        {healthScore != null && (
          <div className="w-28 rounded-md bg-background/80 px-3 py-2 text-right shadow-sm">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Health
            </div>
            <div className="text-xl font-semibold tabular-nums tracking-tight">
              {healthScore}
              <span className="text-sm font-normal text-muted-foreground">
                /100
              </span>
            </div>
          </div>
        )}
        <Button variant="default" size="sm" onClick={onEditProject}>
          Edit
        </Button>
      </div>
    </header>
  );
}

function ProjectCommandSurface({ healthCells }: { healthCells: HealthCell[] }) {
  const metrics: KpiBlockProps[] = healthCells.slice(0, 4).map((cell) => ({
    label: cell.label,
    value: cell.value,
    context: cell.detail,
    href: cell.href,
  }));

  return (
    <section className="space-y-4">
      <SectionHeading>Project health</SectionHeading>
      <KpiRow metrics={metrics} size="large" />
    </section>
  );
}

function AttentionSidebarSection({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <SectionHeading>Needs attention</SectionHeading>
      <div className="space-y-3">
        {items.slice(0, 4).map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "group relative block rounded-md px-4 py-3 transition-colors",
              item.tone === "danger"
                ? "bg-destructive/5 hover:bg-destructive/10"
                : "bg-primary/10 hover:bg-primary/15",
            )}
          >
            <span
              className={cn(
                "absolute bottom-0 left-0 top-0 w-1 rounded-l-md",
                item.tone === "danger" ? "bg-destructive/70" : "bg-primary/70",
              )}
            />
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  toneTextClass(item.tone),
                )}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    toneTextClass(item.tone),
                  )}
                >
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.detail}
                </p>
              </div>
              <ChevronRight
                className={cn(
                  "mt-1 h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5",
                  toneTextClass(item.tone),
                )}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ReadinessIndicator({
  completedCount,
  totalCount,
  onOpen,
}: {
  completedCount: number;
  totalCount: number;
  onOpen: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onOpen}
      className="group h-auto w-44 flex-col items-stretch gap-1 px-3 py-2 text-left hover:bg-muted/50"
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Setup readiness
        </span>
        <span className="text-xs font-medium tabular-nums text-primary">
          {completedCount}/{totalCount}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalCount }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full",
              index < completedCount ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
    </Button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Project Team
───────────────────────────────────────────────────────────── */

const DEFAULT_ROLES = ["Project Manager", "Superintendent", "Architect"];

function ProjectTeamSection({ projectId }: { projectId: string }) {
  const { roles, isLoading, updateRoleMembers, createRole } =
    useProjectRoles(projectId);
  const [assignDialog, setAssignDialog] = React.useState<{
    open: boolean;
    role: ProjectRole | null;
  }>({ open: false, role: null });
  const [creating, setCreating] = React.useState<string | null>(null);

  const slots = DEFAULT_ROLES.map((roleName) => {
    const dbRole = roles.find(
      (r) => r.role_name.toLowerCase() === roleName.toLowerCase(),
    );
    const firstMember = dbRole?.members[0] ?? null;
    const person = firstMember?.person ?? null;
    return { roleName, dbRole: dbRole ?? (null as ProjectRole | null), person };
  });

  const openDialog = async (dbRole: ProjectRole | null, roleName: string) => {
    if (dbRole) {
      setAssignDialog({ open: true, role: dbRole });
      return;
    }
    // Role doesn't exist in DB yet — create it first
    setCreating(roleName);
    try {
      const newRole = await createRole(roleName);
      setAssignDialog({ open: true, role: newRole });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to create ${roleName} role`,
      );
    } finally {
      setCreating(null);
    }
  };

  return (
    <section>
      <SectionHeading
        action={
          <ViewAllLink
            href={`/${projectId}/directory`}
            label="Project Directory"
          />
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
            const isCreating = creating === roleName;

            return (
              <Button
                key={roleName}
                type="button"
                variant="ghost"
                onClick={() => openDialog(dbRole, roleName)}
                disabled={isCreating}
                className={cn(
                  "h-auto w-full justify-start gap-3 border-b border-border/50 py-2.5 text-left last:border-0",
                  "group hover:bg-muted/40 -mx-3 px-3 rounded-md transition-colors cursor-pointer",
                )}
              >
                {person ? (
                  <>
                    <Avatar className="h-8 w-8 shrink-0 rounded-full">
                      <AvatarFallback className="text-xs bg-primary-surface text-primary">
                        {initials(displayName ?? roleName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {displayName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {roleName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      Edit
                    </span>
                  </>
                ) : (
                  <>
                    <div className="h-8 w-8 shrink-0 rounded-full border border-dashed border-border bg-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-muted-foreground italic">
                        Not Assigned
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {roleName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-primary">
                      {isCreating ? "..." : "Assign"}
                    </span>
                  </>
                )}
              </Button>
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
   Section: Change Events
───────────────────────────────────────────────────────────── */

function ChangeEventsSection({
  projectId,
  changeEvents,
}: {
  projectId: string;
  changeEvents: ChangeEvent[];
}) {
  const open = changeEvents.filter(
    (ce) =>
      !["closed", "rejected", "approved"].includes(
        (ce.status ?? "").toLowerCase(),
      ),
  );
  const approved = changeEvents.filter(
    (ce) => (ce.status ?? "").toLowerCase() === "approved",
  );
  const recent = [...changeEvents]
    .sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at).getTime() -
        new Date(a.updated_at ?? a.created_at).getTime(),
    )
    .slice(0, 3);

  return (
    <section>
      <SectionHeading
        action={
          <ViewAllLink href={`/${projectId}/change-events`} label="View All" />
        }
      >
        Change Events
      </SectionHeading>
      {changeEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No change events</p>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-3">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {open.length}
              </span>{" "}
              open
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {approved.length}
              </span>{" "}
              approved
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {changeEvents.length}
              </span>{" "}
              total
            </span>
          </div>
          <div>
            {recent.map((ce) => (
              <Link
                key={ce.id}
                href={`/${projectId}/change-events/${ce.id}`}
                className="-mx-2 flex items-center gap-2.5 rounded-md border-b border-border/50 px-2 py-2 last:border-0 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {ce.title ?? `Change Event #${ce.number}`}
                  </p>
                </div>
                <StatusBadge status={ce.status ?? "Draft"} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Change Orders
───────────────────────────────────────────────────────────── */

function ChangeOrdersSection({
  projectId,
  changeOrders,
}: {
  projectId: string;
  changeOrders: ChangeOrder[];
}) {
  const pending = changeOrders.filter(
    (co: ChangeOrder) =>
      !["approved", "rejected", "closed"].includes(
        (co.status ?? "").toLowerCase(),
      ),
  );
  const approved = changeOrders.filter(
    (co: ChangeOrder) => (co.status ?? "").toLowerCase() === "approved",
  );
  const approvedTotal = approved.reduce(
    (sum: number, co: ChangeOrder) => sum + (co.amount ?? co.total_amount ?? 0),
    0,
  );
  const recent: ChangeOrder[] = [...changeOrders]
    .sort(
      (a: ChangeOrder, b: ChangeOrder) =>
        new Date(b?.updated_at ?? b?.created_at ?? 0).getTime() -
        new Date(a?.updated_at ?? a?.created_at ?? 0).getTime(),
    )
    .slice(0, 3);

  return (
    <section>
      <SectionHeading
        action={
          <ViewAllLink href={`/${projectId}/change-orders`} label="View All" />
        }
      >
        Change Orders
      </SectionHeading>
      {changeOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No change orders</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-semibold tabular-nums">
              {fmtCompact(approvedTotal || null)}
            </span>
            <span className="text-xs text-muted-foreground">
              {pending.length} pending · {approved.length} approved
            </span>
          </div>
          <div>
            {recent.map((co: ChangeOrder) => {
              const isPrime = !co.change_order_number;
              const href = isPrime
                ? `/${projectId}/change-orders/prime/${co.id}`
                : `/${projectId}/change-orders/commitment/${co.id}`;
              return (
                <Link
                  key={co.id}
                  href={href}
                  className="-mx-2 flex items-center gap-2.5 rounded-md border-b border-border/50 px-2 py-2 last:border-0 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {co.title ?? "Change Order"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {fmtCompact(co.amount ?? co.total_amount)}
                    </span>
                    <StatusBadge status={co.status ?? "Pending"} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section: Invoices & Payments
───────────────────────────────────────────────────────────── */

function InvoicesPaymentsSection({
  projectId,
  ownerInvoices,
  subcontractorInvoices,
}: {
  projectId: string;
  ownerInvoices: OwnerInvoice[];
  subcontractorInvoices: SubcontractorInvoice[];
}) {
  const totalBilled = ownerInvoices.reduce(
    (sum, inv) => sum + (inv.gross_amount ?? 0),
    0,
  );
  const totalPaid = ownerInvoices.reduce(
    (sum, inv) => sum + (inv.paid_amount ?? 0),
    0,
  );
  const subPending = subcontractorInvoices.filter(
    (inv) =>
      !["approved", "paid", "void"].includes((inv.status ?? "").toLowerCase()),
  );
  const hasAny = ownerInvoices.length > 0 || subcontractorInvoices.length > 0;

  return (
    <section>
      <SectionHeading
        action={
          <ViewAllLink href={`/${projectId}/invoices`} label="View All" />
        }
      >
        Invoices &amp; Payments
      </SectionHeading>
      {!hasAny ? (
        <p className="text-sm text-muted-foreground">No invoices</p>
      ) : (
        <div className="space-y-3">
          {ownerInvoices.length > 0 && (
            <div className="rounded-md bg-muted/50 px-3 py-2.5">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Owner Invoices
              </p>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Billed</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {fmtCompact(totalBilled)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {fmtCompact(totalPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Count</p>
                  <p className="text-sm font-semibold">
                    {ownerInvoices.length}
                  </p>
                </div>
              </div>
            </div>
          )}
          {subcontractorInvoices.length > 0 && (
            <div className="rounded-md bg-muted/50 px-3 py-2.5">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Subcontractor Invoices
              </p>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-sm font-semibold">
                    {subcontractorInvoices.length}
                  </p>
                </div>
                {subPending.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-sm font-semibold text-status-warning">
                      {subPending.length}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <Link
            href={`/${projectId}/invoices`}
            className="flex items-center gap-2 text-xs text-primary transition-colors hover:text-primary/80"
          >
            <Receipt className="h-3.5 w-3.5" />
            View invoicing dashboard
            <ChevronRight className="h-3 w-3" />
          </Link>
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
  pendingSsovReviews: NonNullable<
    ProjectCommandCenterProps["pendingSsovReviews"]
  >;
  variance: number;
  varianceTone: "success" | "danger" | "warning";
  ecac: number;
}) {
  const hasPendingSsov = pendingSsovReviews.length > 0;
  const hasVariance = variance !== 0;
  const hasAlerts =
    showPrimeContractMarkupAlert ||
    changeOrdersWithoutChangeRequestCount > 0 ||
    hasPendingSsov ||
    hasVariance;

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
                    {variance > 0 ? "under" : "over"} budget by{" "}
                    {fmtCompact(Math.abs(variance))}
                  </strong>
                  {" · ECAC "}
                  {fmtFull(ecac)}
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
                      {item.commitmentNumber
                        ? `${item.commitmentNumber} · `
                        : ""}
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
                  {changeOrdersWithoutChangeRequestCount !== 1 ? "s" : ""}{" "}
                  without change request
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

interface DueSoonItem {
  id: string;
  title: string;
  detail: string;
  href: string;
  dueDate: string;
  overdue: boolean;
}

function DueSoonSection({ items }: { items: DueSoonItem[] }) {
  return (
    <section>
      <SectionHeading>Due soon</SectionHeading>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No dated RFIs, submittals, or tasks need attention.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {items.slice(0, 6).map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="-mx-2 flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/45"
            >
              <Clock
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                  item.overdue ? "text-destructive" : "text-muted-foreground",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.detail}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-xs tabular-nums",
                  item.overdue ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {format(new Date(item.dueDate), "MMM d")}
              </span>
            </Link>
          ))}
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
      <SheetContent side="right" className="flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="text-base font-semibold">
            Project Setup
          </SheetTitle>
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
                      <Check
                        className="h-4 w-4 text-status-success"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Icon
                        className="h-4 w-4 text-primary"
                        strokeWidth={1.75}
                      />
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
                    <p
                      className={cn(
                        "text-xs",
                        done
                          ? "text-muted-foreground/60"
                          : "text-muted-foreground",
                      )}
                    >
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
  ownerInvoices = [],
  subcontractorInvoices = [],
}: ProjectCommandCenterProps) {
  const projectId = String(project.id);
  const [isEditProjectSidebarOpen, setIsEditProjectSidebarOpen] =
    React.useState(false);
  const [isSetupOpen, setIsSetupOpen] = React.useState(false);
  const roomName = `project-home:${projectId}`;
  const currentUserName = useCurrentUserName();
  const { grandTotals, loading: budgetLoading } = useBudgetData(projectId, {
    silent: true,
  });

  /* ── Budget ────────────────────────────────────────────── */
  const revisedBudget =
    grandTotals.revisedBudget || grandTotals.originalBudgetAmount;
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

  /* ── RFIs ──────────────────────────────────────────────── */
  const rfisOpen = rfis.filter((r) => r.status.toLowerCase() !== "closed");
  const rfisOverdue = rfisOpen.filter(
    (r) => r.due_date && isPast(new Date(r.due_date)),
  );
  /* ── Tasks ─────────────────────────────────────────────── */
  const openTasks = tasks
    .filter((t) => !["done", "cancelled"].includes(t.status.toLowerCase()))
    .slice(0, 6);

  /* ── Alerts ────────────────────────────────────────────── */
  const showPrimeContractMarkupAlert =
    homeAlerts?.hasPrimeContractWithoutFinancialMarkup ?? false;
  const changeOrdersWithoutChangeRequestCount =
    homeAlerts?.changeOrdersWithoutChangeRequestCount ?? 0;

  /* ── Project meta ──────────────────────────────────────── */
  const jobNumber = project["job number"] ?? project.project_number;

  const hasTeam = (team ?? []).length > 0;
  const hasBudget = (budget ?? []).length > 0 || revisedBudget > 0;
  const hasContracts = contracts.length > 0;
  const hasSchedule = (schedule ?? []).length > 0;
  const trackableSetupTotal = 4;
  const setupCompletedCount = [
    hasTeam,
    hasBudget,
    hasContracts,
    hasSchedule,
  ].filter(Boolean).length;
  const openChangeEvents = changeEvents.filter(
    (ce) =>
      !["closed", "rejected", "approved"].includes(
        (ce.status ?? "").toLowerCase(),
      ),
  );
  const pendingChangeOrders = changeOrders.filter(
    (co: ChangeOrder) =>
      !["approved", "rejected", "closed"].includes(
        (co.status ?? "").toLowerCase(),
      ),
  );
  const openSubmittals = submittals.filter(
    (s) => !["closed"].includes((s.status ?? "").toLowerCase()),
  );
  const pendingSubInvoices = subcontractorInvoices.filter(
    (inv) =>
      !["approved", "paid", "void"].includes((inv.status ?? "").toLowerCase()),
  );

  const attentionItems: AttentionItem[] = [
    ...(variance < 0
      ? [
          {
            id: "budget-variance",
            title: `Forecast over budget by ${fmtCompact(Math.abs(variance))}`,
            detail: `Estimated cost at completion is ${fmtFull(ecac)}.`,
            href: `/${projectId}/budget`,
            tone: "danger" as const,
          },
        ]
      : []),
    ...(showPrimeContractMarkupAlert
      ? [
          {
            id: "prime-markup",
            title: "Prime contract missing financial markup",
            detail:
              "Markup settings are required before contract financials can be trusted.",
            href: `/${projectId}/prime-contracts`,
            tone: "danger" as const,
          },
        ]
      : []),
    ...(changeOrdersWithoutChangeRequestCount > 0
      ? [
          {
            id: "orphan-change-orders",
            title: `${changeOrdersWithoutChangeRequestCount} change order${changeOrdersWithoutChangeRequestCount !== 1 ? "s" : ""} missing change request`,
            detail:
              "Link change orders back to change events before reporting exposure.",
            href: `/${projectId}/change-orders`,
            tone: "danger" as const,
          },
        ]
      : []),
    ...(pendingSsovReviews.length > 0
      ? [
          {
            id: "pending-ssov",
            title: `${pendingSsovReviews.length} subcontractor SOV pending review`,
            detail:
              "Review submitted schedule of values before invoice flow starts.",
            href: `/${projectId}/commitments`,
            tone: "warning" as const,
          },
        ]
      : []),
    ...(rfisOverdue.length > 0
      ? [
          {
            id: "overdue-rfis",
            title: `${rfisOverdue.length} overdue RFI${rfisOverdue.length !== 1 ? "s" : ""}`,
            detail: "Resolve field questions before they slow downstream work.",
            href: `/${projectId}/rfis`,
            tone: "warning" as const,
          },
        ]
      : []),
  ];

  const healthCells: HealthCell[] = [
    {
      label: "Budget",
      value: budgetLoading ? "Loading" : fmtCompact(revisedBudget || null),
      detail: budgetLoading
        ? "Refreshing totals"
        : revisedBudget > 0
          ? `${spendPct}% spent`
          : "Budget not built",
      href: `/${projectId}/budget`,
      tone: budgetLoading
        ? "neutral"
        : revisedBudget === 0
          ? "warning"
          : spendPct > 90
            ? "danger"
            : "success",
    },
    {
      label: "Prime contract",
      value: fmtCompact(primeContractValue || null),
      detail:
        contracts.length > 0
          ? `${contracts.length} active record${contracts.length !== 1 ? "s" : ""}`
          : "Not created",
      href: `/${projectId}/prime-contracts`,
      tone:
        contracts.length > 0
          ? showPrimeContractMarkupAlert
            ? "danger"
            : "success"
          : "warning",
    },
    {
      label: "Commitments",
      value: fmtCompact(commitmentTotal || null),
      detail:
        commitments.length > 0
          ? `${commitments.length} commitment${commitments.length !== 1 ? "s" : ""}`
          : "No buyout yet",
      href: `/${projectId}/commitments`,
      tone: commitments.length > 0 ? "success" : "warning",
    },
    {
      label: "Change exposure",
      value: String(openChangeEvents.length + pendingChangeOrders.length),
      detail: `${openChangeEvents.length} events, ${pendingChangeOrders.length} orders`,
      href: `/${projectId}/change-events`,
      tone:
        changeOrdersWithoutChangeRequestCount > 0
          ? "danger"
          : openChangeEvents.length + pendingChangeOrders.length > 0
            ? "warning"
            : "success",
    },
    {
      label: "RFIs / Submittals",
      value: String(rfisOpen.length + openSubmittals.length),
      detail: `${rfisOpen.length} RFIs, ${openSubmittals.length} submittals`,
      href: `/${projectId}/rfis`,
      tone:
        rfisOverdue.length > 0
          ? "danger"
          : rfisOpen.length + openSubmittals.length > 0
            ? "warning"
            : "success",
    },
    {
      label: "Invoices",
      value: String(ownerInvoices.length + subcontractorInvoices.length),
      detail:
        pendingSubInvoices.length > 0
          ? `${pendingSubInvoices.length} subcontractor pending`
          : "No pending invoice risk",
      href: `/${projectId}/invoices`,
      tone: pendingSubInvoices.length > 0 ? "warning" : "success",
    },
  ];

  const dueSoonItems: DueSoonItem[] = [
    ...rfisOpen
      .filter((rfi) => rfi.due_date)
      .map((rfi) => ({
        id: `rfi-${rfi.id}`,
        title: rfi.subject ?? "RFI",
        detail: "RFI response due",
        href: `/${projectId}/rfis/${rfi.id}`,
        dueDate: rfi.due_date as string,
        overdue: isPast(new Date(rfi.due_date as string)),
      })),
    ...openSubmittals
      .filter((submittal) => submittal.final_due_date)
      .map((submittal) => ({
        id: `submittal-${submittal.id}`,
        title: submittal.title ?? "Submittal",
        detail: "Submittal final due date",
        href: `/${projectId}/submittals/${submittal.id}`,
        dueDate: submittal.final_due_date as string,
        overdue: isPast(new Date(submittal.final_due_date as string)),
      })),
    ...openTasks
      .filter((task) => task.due_date)
      .map((task) => ({
        id: `task-${task.id}`,
        title: task.description,
        detail: task.assignee_name
          ? `Assigned to ${task.assignee_name}`
          : "Open task",
        href: `/${projectId}/tasks`,
        dueDate: task.due_date as string,
        overdue: isPast(new Date(task.due_date as string)),
      })),
  ].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );

  return (
    <div className="flex min-h-0 flex-col">
      <RealtimeCursors roomName={roomName} username={currentUserName} />

      <div className="space-y-10 px-4 py-6 sm:px-5 lg:px-6">
        <ProjectPageIdentity
          projectName={project.name ?? "Untitled Project"}
          jobNumber={jobNumber}
          healthScore={project.health_score}
          setupCompletedCount={setupCompletedCount}
          setupTotalCount={trackableSetupTotal}
          onOpenSetup={() => setIsSetupOpen(true)}
          onEditProject={() => setIsEditProjectSidebarOpen(true)}
        />

        <div className="grid grid-cols-1 gap-y-12 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-x-20 xl:gap-y-0 2xl:gap-x-28">
          <div className="min-w-0 space-y-10">
            <ProjectCommandSurface healthCells={healthCells} />
            <ContentSectionStack>
              {changeEvents.length > 0 && (
                <ChangeEventsSection
                  projectId={projectId}
                  changeEvents={changeEvents}
                />
              )}
              {changeOrders.length > 0 && (
                <ChangeOrdersSection
                  projectId={projectId}
                  changeOrders={changeOrders}
                />
              )}
              {(ownerInvoices.length > 0 ||
                subcontractorInvoices.length > 0) && (
                <InvoicesPaymentsSection
                  projectId={projectId}
                  ownerInvoices={ownerInvoices}
                  subcontractorInvoices={subcontractorInvoices}
                />
              )}
            </ContentSectionStack>
          </div>

          <aside>
            <ContentSectionStack className="space-y-12">
              <AttentionSidebarSection items={attentionItems} />
              {dueSoonItems.length > 0 && (
                <DueSoonSection items={dueSoonItems} />
              )}
              <ProjectTeamSection projectId={projectId} />
            </ContentSectionStack>
          </aside>
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
        hasTeam={hasTeam}
        hasBudget={hasBudget}
        hasContracts={hasContracts}
        hasSchedule={hasSchedule}
      />
    </div>
  );
}
