"use client";

import * as React from "react";
import dynamic from "next/dynamic";
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
  DollarSign,
  ExternalLink,
  FileText,
  Image,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBudgetData } from "@/hooks/use-budget-data";
import { useCurrentUserName } from "@/hooks/use-current-user-name";
import { useProjectRoles, type ProjectRole } from "@/hooks/use-project-roles";
import {
  Avatar,
  AvatarFallback,
  Button,
  InlineTable,
  InlineTableHeader,
  InlineTableHeaderRow,
  InlineTableHeaderCell,
  InlineTableBody,
  InlineTableRow,
  InlineTableCell,
  PageTabs,
  StatusBadge,
} from "@/components/ds";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import type { Database } from "@/types/database.types";
import type { BudgetGrandTotals } from "@/types/budget";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Meeting = Pick<
  Database["public"]["Tables"]["document_metadata"]["Row"],
  "id" | "title" | "file_name" | "date" | "created_at" | "duration_minutes" | "type"
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
type RFI = Database["public"]["Tables"]["rfis"]["Row"];
type Contract = Database["public"]["Tables"]["prime_contracts"]["Row"];
type ContractLineItem = Database["public"]["Tables"]["contract_line_items"]["Row"];
type ChangeEvent = Database["public"]["Tables"]["change_events"]["Row"];
type ProjectDocument = Pick<
  Database["public"]["Tables"]["project_documents"]["Row"],
  | "id"
  | "title"
  | "file_name"
  | "status"
  | "category"
  | "folder"
  | "source_system"
  | "created_at"
  | "updated_at"
  | "reviewed_at"
>;
type ProjectTeamMember = Database["public"]["Functions"]["get_project_team"]["Returns"][number];
type BudgetLineSummary = Pick<Database["public"]["Tables"]["budget_lines"]["Row"], "id" | "project_id" | "original_amount">;
type ScheduleSummary = Pick<Database["public"]["Tables"]["schedule_tasks"]["Row"], "id">;
type Submittal = Pick<
  Database["public"]["Tables"]["submittals"]["Row"],
  | "id"
  | "title"
  | "submittal_number"
  | "ball_in_court"
  | "final_due_date"
  | "required_approval_date"
  | "created_at"
  | "status"
>;
type DailyLog = Pick<Database["public"]["Tables"]["daily_logs"]["Row"], "id" | "log_date">;
type LazyHomeTabKind = "meetings" | "documents" | "daily-logs" | "submittals";

type LazyHomeTabPayload =
  | { kind: "meetings"; data: Meeting[] }
  | { kind: "documents"; data: ProjectDocument[] }
  | { kind: "daily-logs"; data: DailyLog[] }
  | { kind: "submittals"; data: Submittal[] };

type LazyHomeTabStatus = {
  loaded: boolean;
  loading: boolean;
  error: string | null;
};

const BudgetBarChart = dynamic(
  () => import("./budget-bar-chart").then((mod) => mod.BudgetBarChart),
  {
    ssr: false,
    loading: () => <div className="h-32 w-full animate-pulse rounded-md bg-muted/40" />,
  },
);

const AssignMemberDialog = dynamic(
  () => import("@/components/domain/directory/AssignMemberDialog").then((mod) => mod.AssignMemberDialog),
  { ssr: false },
);

const EditProjectSidebar = dynamic(
  () => import("@/components/project/edit-project-sidebar").then((mod) => mod.EditProjectSidebar),
  { ssr: false },
);

const RealtimeCursors = dynamic(
  () => import("@/components/realtime/realtime-cursors").then((mod) => mod.RealtimeCursors),
  { ssr: false },
);

type ProjectWithNormalizedDates = Project & {
  start_date?: string | null;
  completion_date?: string | null;
};

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

interface ProjectCommandCenterProps {
  project: Project;
  tasks: Task[];
  meetings?: Meeting[];
  changeOrders: ChangeOrder[];
  rfis: RFI[];
  commitments: Commitment[];
  commitmentTotal?: number;
  contracts: Contract[];
  contractLineItems?: Pick<ContractLineItem, "contract_id" | "total_cost" | "quantity" | "unit_cost">[];
  changeEvents?: ChangeEvent[];
  schedule?: ScheduleSummary[];
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
  dailyLogs?: DailyLog[];
  budget?: BudgetLineSummary[];
  budgetGrandTotals?: BudgetGrandTotals;
  ownerInvoices?: OwnerInvoice[];
  projectDocuments?: ProjectDocument[];
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

function getDateMs(value: string | null | undefined): number {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatShortDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "MMM d, yyyy");
}

function formatMonthDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "MMM d");
}

function isClosedStatus(status: string | null | undefined): boolean {
  return ["approved", "cancelled", "closed", "complete", "completed", "done", "paid", "rejected", "void"].includes(
    (status ?? "").toLowerCase(),
  );
}

/* ─────────────────────────────────────────────────────────────
   WorkCompletedGauge — SVG circular progress
───────────────────────────────────────────────────────────── */

function WorkCompletedGauge({ pctComplete, label, sub }: { pctComplete: number; label: string; sub: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pctComplete / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="96" height="96" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <span className="text-xl font-semibold tabular-nums text-foreground">
          {pctComplete}%
        </span>
      </div>
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MetricCard — top KPI cards wrapper
───────────────────────────────────────────────────────────── */

function MetricCard({
  label,
  href,
  children,
  className,
}: {
  label: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-lg bg-card p-5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Link
          href={href}
          prefetch={false}
          className="flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          View <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   AlertsBand — notifications strip
───────────────────────────────────────────────────────────── */

interface Alert {
  id: string;
  title: string;
  detail?: string;
  href: string;
  tone: "danger" | "warning";
}

function AlertsBand({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {alerts.map((alert) => (
        <Link
          key={alert.id}
          href={alert.href}
          prefetch={false}
          className={cn(
            "flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm transition-colors",
            alert.tone === "danger"
              ? "bg-destructive/8 text-destructive hover:bg-destructive/12"
              : "bg-primary/8 text-primary hover:bg-primary/12",
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 font-medium">{alert.title}</span>
          {alert.detail && (
            <span className="hidden text-xs opacity-70 sm:inline">{alert.detail}</span>
          )}
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Link>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   InlineDataRow — consistent row for all tab tables
───────────────────────────────────────────────────────────── */

function InlineDataRow({
  href,
  primary,
  secondary,
  tertiary,
  status,
  badge,
}: {
  href: string;
  primary: string;
  secondary?: string | null;
  tertiary?: string | null;
  status?: string | null;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/40 -mx-2"
    >
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/30 group-hover:bg-primary/50 transition-colors" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          {primary}
        </p>
        {(secondary || tertiary) && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {[secondary, tertiary].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      {badge ?? (status && <StatusBadge status={status} />)}
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   TabSection — tabbed table section with search
───────────────────────────────────────────────────────────── */

interface TabConfig {
  id: string;
  label: string;
  count?: number;
  content: (search: string) => React.ReactNode;
  viewAllHref: string;
  lazyKind?: LazyHomeTabKind;
  isLoaded?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function TabSection({
  tabs,
  defaultTab,
}: {
  title?: string;
  tabs: TabConfig[];
  defaultTab?: string;
}) {
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState(defaultTab ?? tabs[0]?.id ?? "");

  React.useEffect(() => {
    setSearch("");
  }, [activeTab]);

  const pageTabs = tabs.map((tab) => ({
    label: typeof tab.count === "number" && tab.count > 0 ? `${tab.label} (${tab.count})` : tab.label,
    href: `#${tab.id}`,
    isActive: activeTab === tab.id,
  }));

  const activeTabConfig = tabs.find((t) => t.id === activeTab);

  React.useEffect(() => {
    if (
      !activeTabConfig?.lazyKind ||
      activeTabConfig.isLoaded ||
      activeTabConfig.isLoading ||
      activeTabConfig.error
    ) {
      return;
    }
    activeTabConfig.onRetry?.();
  }, [activeTabConfig]);

  return (
    <div className="rounded-lg bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3">
        <PageTabs
          tabs={pageTabs}
          variant="inline"
          onTabClick={(href) => setActiveTab(href.replace("#", ""))}
          className="mb-0 md:mb-0 flex-1 min-w-0"
        />
        <div className="relative shrink-0 mb-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-7 w-40 pl-7 text-xs"
          />
        </div>
      </div>
      {activeTabConfig && (
        <div className="px-4 pb-1">
          <div className="divide-y divide-border/50">
            {activeTabConfig.isLoading ? (
              <div className="py-5 text-sm text-muted-foreground">Loading {activeTabConfig.label.toLowerCase()}…</div>
            ) : activeTabConfig.error ? (
              <div className="flex items-center justify-between gap-3 py-5 text-sm">
                <span className="text-destructive">{activeTabConfig.error}</span>
                {activeTabConfig.onRetry && (
                  <Button type="button" variant="outline" size="sm" onClick={activeTabConfig.onRetry}>
                    Retry
                  </Button>
                )}
              </div>
            ) : (
              activeTabConfig.content(search)
            )}
          </div>
          <div className="py-2.5">
            <Link
              href={activeTabConfig.viewAllHref}
              prefetch={false}
              className="flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
            >
              View all {activeTabConfig.label.toLowerCase()} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyTabState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
      <CheckCircle2 className="h-4 w-4 text-muted-foreground/50" />
      <span>No {label} to show.</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ProjectDetailsSidebar — right panel
───────────────────────────────────────────────────────────── */

const SIDEBAR_ROLES = ["VP", "Project Manager", "Superintendent", "Architect"];

function SidebarTeamSection({
  projectId,
  team = [],
}: {
  projectId: string;
  team?: ProjectTeamMember[];
}) {
  const { roles, isLoading, updateRoleMembers, createRole, refetch } = useProjectRoles(projectId, {
    enabled: false,
  });
  const [assignDialog, setAssignDialog] = React.useState<{ open: boolean; role: ProjectRole | null }>({
    open: false,
    role: null,
  });
  const [creating, setCreating] = React.useState<string | null>(null);
  const [loadingRoleName, setLoadingRoleName] = React.useState<string | null>(null);
  const rolesByName = React.useMemo(
    () => new Map(roles.map((role) => [role.role_name.toLowerCase(), role])),
    [roles],
  );
  const teamByRoleName = React.useMemo(() => {
    const roleMap = new Map<string, ProjectTeamMember>();
    for (const member of team) {
      const roleName = member.role?.trim().toLowerCase();
      if (roleName && !roleMap.has(roleName)) {
        roleMap.set(roleName, member);
      }
    }
    return roleMap;
  }, [team]);

  const slots = SIDEBAR_ROLES.map((roleName) => {
    const dbRole = rolesByName.get(roleName.toLowerCase());
    const firstMember = dbRole?.members[0] ?? null;
    const initialMember = teamByRoleName.get(roleName.toLowerCase()) ?? null;
    const person = firstMember?.person ?? initialMember;
    return { roleName, dbRole: dbRole ?? null, person };
  });

  const openDialog = async (dbRole: ProjectRole | null, roleName: string) => {
    setLoadingRoleName(roleName);
    try {
      if (dbRole) {
        setAssignDialog({ open: true, role: dbRole });
        return;
      }

      const hydratedRoles = await refetch();
      const hydratedRole = hydratedRoles.find((role) => role.role_name.toLowerCase() === roleName.toLowerCase());
      if (hydratedRole) {
        setAssignDialog({ open: true, role: hydratedRole });
        return;
      }

      setCreating(roleName);
      const newRole = await createRole(roleName);
      setAssignDialog({ open: true, role: newRole });
    } catch (error) {
      toast.error(`Failed to create ${roleName} role`);
    } finally {
      setCreating(null);
      setLoadingRoleName(null);
    }
  };

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Team</p>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-2.5 w-24 rounded bg-muted animate-pulse" />
                <div className="h-2 w-16 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-0.5">
          {slots.map(({ roleName, dbRole, person }) => {
            const displayName = person ? `${person.first_name} ${person.last_name}`.trim() : null;
            const isCreating = creating === roleName || loadingRoleName === roleName;
            return (
              <Button
                key={roleName}
                type="button"
                variant="ghost"
                onClick={() => openDialog(dbRole, roleName)}
                disabled={isCreating}
                className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-left hover:bg-muted/40 -mx-2 rounded-md"
              >
                {person ? (
                  <>
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {initials(displayName ?? roleName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
                      <p className="text-[11px] text-muted-foreground">{roleName}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-6 w-6 shrink-0 rounded-full border border-dashed border-border/60" />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-xs text-muted-foreground italic">Unassigned</p>
                      <p className="text-[11px] text-muted-foreground">{roleName}</p>
                    </div>
                  </>
                )}
              </Button>
            );
          })}
        </div>
      )}
      {assignDialog.open && assignDialog.role ? (
        <AssignMemberDialog
          open={assignDialog.open}
          onOpenChange={(open) => setAssignDialog((prev) => ({ ...prev, open }))}
          role={assignDialog.role}
          onSave={updateRoleMembers}
          projectId={projectId}
        />
      ) : null}
    </div>
  );
}

function ProjectDetailsSidebar({
  project,
  projectId,
  team,
  onEditProject,
}: {
  project: Project;
  projectId: string;
  team?: ProjectTeamMember[];
  onEditProject: () => void;
}) {
  const normalizedProject = project as ProjectWithNormalizedDates;
  const startDate = normalizedProject["start date"] || normalizedProject.start_date;
  const completionDate = normalizedProject["est completion"] || normalizedProject.completion_date;
  const meta = project.summary_metadata as Record<string, unknown> | null;
  const substantialCompletion =
    typeof meta?.substantial_completion === "string" ? meta.substantial_completion : null;
  const address = [project.address, (meta?.city as string), project.state]
    .filter(Boolean)
    .join(", ");

  const quickLinks = [
    { label: "Specifications", href: `/${projectId}/specifications` },
    { label: "Drawings", href: `/${projectId}/drawings` },
    { label: "Submittals", href: `/${projectId}/submittals` },
    { label: "Directory", href: `/${projectId}/directory` },
  ];

  return (
    <div className="space-y-6 rounded-lg bg-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Project Details
          </p>
          {project.client && (
            <p className="mt-0.5 text-xs text-muted-foreground">{project.client}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onEditProject} className="h-7 text-xs px-2">
          Edit
        </Button>
      </div>

      {address && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          <span>{address}</span>
        </div>
      )}

      {/* Team */}
      <SidebarTeamSection projectId={projectId} team={team} />

      {/* Schedule */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Schedule
        </p>
        <div className="space-y-2">
          {[
            { label: "Start Date", value: formatShortDate(startDate) },
            { label: "Est. Completion", value: formatShortDate(completionDate) },
            { label: "Substantial Completion", value: formatShortDate(substantialCompletion) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={cn("text-xs font-medium", value ? "text-foreground" : "text-muted-foreground/50")}>
                {value ?? "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Links
        </p>
        <div className="space-y-0.5">
          {quickLinks.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              prefetch={false}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground -mx-2"
            >
              {label}
              <ExternalLink className="h-3 w-3 opacity-40" />
            </Link>
          ))}
        </div>
      </div>

      {/* Description/Comments */}
      {project.summary && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Notes
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-4">
            {project.summary}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Setup Sheet (keep existing)
───────────────────────────────────────────────────────────── */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ds";

const SETUP_ITEMS = [
  { id: "directory", icon: Users, title: "Update Directory", description: "Add team members and assign roles", href: (id: string) => `/${id}/directory` },
  { id: "budget", icon: DollarSign, title: "Create Budget", description: "Set up project budget and line items", href: (id: string) => `/${id}/budget` },
  { id: "prime-contract", icon: Building2, title: "Create Prime Contract", description: "Establish primary contract terms", href: (id: string) => `/${id}/prime-contracts` },
  { id: "specifications", icon: FileText, title: "Add Specifications", description: "Upload project specifications", href: (id: string) => `/${id}/specifications` },
  { id: "drawings", icon: Image, title: "Upload Drawings", description: "Add architectural and engineering drawings", href: (id: string) => `/${id}/drawings` },
  { id: "schedule", icon: Calendar, title: "Create Schedule", description: "Build project timeline and milestones", href: (id: string) => `/${id}/schedule` },
];

function ProjectSetupSheet({
  open,
  onOpenChange,
  projectId,
  hasTeam,
  hasBudget,
  hasContracts,
  hasSchedule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  hasTeam: boolean;
  hasBudget: boolean;
  hasContracts: boolean;
  hasSchedule: boolean;
}) {
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
          <SheetTitle className="text-base font-semibold">Project Setup</SheetTitle>
          <p className="text-sm text-muted-foreground">Complete these steps to get your project running.</p>
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">{completedCount} of {trackableIds.length} complete</p>
            <div className="flex items-center gap-1">
              {trackableIds.map((id) => (
                <div key={id} className={cn("h-1.5 flex-1 rounded-full transition-colors", completionMap[id] ? "bg-primary" : "bg-muted")} />
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
                  prefetch={false}
                  onClick={() => onOpenChange(false)}
                  className="group flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-muted/60"
                >
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors", done ? "bg-status-success/10" : "bg-primary/10 group-hover:bg-primary/15")}>
                    {done ? <Check className="h-4 w-4 text-status-success" strokeWidth={2.5} /> : <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm leading-none mb-1", done ? "font-normal text-muted-foreground line-through" : "font-medium text-foreground")}>{item.title}</p>
                    <p className={cn("text-xs", done ? "text-muted-foreground/60" : "text-muted-foreground")}>{item.description}</p>
                  </div>
                  <ArrowRight className={cn("h-3.5 w-3.5 shrink-0 transition-all", done ? "text-muted-foreground/20" : "text-muted-foreground/30 group-hover:translate-x-0.5 group-hover:text-primary")} />
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
   ReadinessIndicator
───────────────────────────────────────────────────────────── */

function ReadinessIndicator({ completedCount, totalCount, onOpen }: { completedCount: number; totalCount: number; onOpen: () => void }) {
  if (completedCount >= totalCount) return null;
  return (
    <Button type="button" variant="ghost" onClick={onOpen} className="group h-auto flex-col items-stretch gap-1 px-3 py-2 text-left hover:bg-muted/50">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Setup</span>
        <span className="text-xs font-medium tabular-nums text-primary">{completedCount}/{totalCount}</span>
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalCount }).map((_, i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full", i < completedCount ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
    </Button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */

export function ProjectCommandCenter({
  project,
  tasks,
  meetings = [],
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
  dailyLogs = [],
  ownerInvoices = [],
  projectDocuments = [],
  budgetGrandTotals,
}: ProjectCommandCenterProps) {
  const projectId = String(project.id);
  const [isEditProjectSidebarOpen, setIsEditProjectSidebarOpen] = React.useState(false);
  const [isSetupOpen, setIsSetupOpen] = React.useState(false);
  const [showRealtimeCursors, setShowRealtimeCursors] = React.useState(false);
  const roomName = `project-home:${projectId}`;
  const currentUserName = useCurrentUserName();
  const [lazyTabData, setLazyTabData] = React.useState({
    meetings,
    projectDocuments,
    dailyLogs,
    submittals,
  });
  const [lazyTabStatus, setLazyTabStatus] = React.useState<Record<LazyHomeTabKind, LazyHomeTabStatus>>({
    meetings: { loaded: meetings.length > 0, loading: false, error: null },
    documents: { loaded: projectDocuments.length > 0, loading: false, error: null },
    "daily-logs": { loaded: dailyLogs.length > 0, loading: false, error: null },
    submittals: { loaded: submittals.length > 0, loading: false, error: null },
  });
  React.useEffect(() => {
    const timeout = window.setTimeout(() => setShowRealtimeCursors(true), 1200);
    return () => window.clearTimeout(timeout);
  }, []);
  const loadLazyTabData = React.useCallback(
    async (kind: LazyHomeTabKind) => {
      const currentStatus = lazyTabStatus[kind];
      if (currentStatus.loaded || currentStatus.loading) return;

      setLazyTabStatus((current) => ({
        ...current,
        [kind]: { ...current[kind], loading: true, error: null },
      }));

      try {
        const payload = await apiFetch<LazyHomeTabPayload>(
          `/api/projects/${projectId}/home/tab-data?kind=${encodeURIComponent(kind)}`,
        );
        setLazyTabData((current) => {
          if (payload.kind === "meetings") {
            return { ...current, meetings: payload.data };
          }
          if (payload.kind === "documents") {
            return { ...current, projectDocuments: payload.data };
          }
          if (payload.kind === "daily-logs") {
            return { ...current, dailyLogs: payload.data };
          }
          return { ...current, submittals: payload.data };
        });
        setLazyTabStatus((current) => ({
          ...current,
          [kind]: { loaded: true, loading: false, error: null },
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : `Failed to load ${kind}.`;
        setLazyTabStatus((current) => ({
          ...current,
          [kind]: { loaded: false, loading: false, error: message },
        }));
        toast.error(message);
      }
    },
    [lazyTabStatus, projectId],
  );
  const { grandTotals, loading: budgetLoading } = useBudgetData(projectId, {
    enabled: !budgetGrandTotals,
    initialGrandTotals: budgetGrandTotals,
    showErrorToast: false,
  });

  /* ── Budget ─────────────────────────────────────────── */
  const revisedBudget = grandTotals.revisedBudget || grandTotals.originalBudgetAmount;
  const costToDate = grandTotals.jobToDateCostDetail;
  const ecac = grandTotals.estimatedCostAtCompletion;
  const variance = grandTotals.projectedOverUnder;
  const homeMeetings = lazyTabData.meetings;
  const homeDocuments = lazyTabData.projectDocuments;
  const homeDailyLogs = lazyTabData.dailyLogs;
  const homeSubmittals = lazyTabData.submittals;
  const primeContractValue = React.useMemo(
    () => contractLineItems.reduce((sum, li) => sum + (li.total_cost ?? 0), 0),
    [contractLineItems],
  );

  /* ── Work Completed ──────────────────────────────────── */
  const totalBilled = React.useMemo(
    () => ownerInvoices.reduce((sum, inv) => sum + (inv.gross_amount ?? 0), 0),
    [ownerInvoices],
  );
  const contractBase = primeContractValue || revisedBudget;
  const billedPct = contractBase > 0 ? pct(totalBilled, contractBase) : pct(costToDate, revisedBudget);

  /* ── Open items ──────────────────────────────────────── */
  const rfisOpen = React.useMemo(
    () => rfis.filter((r) => r.status.toLowerCase() !== "closed"),
    [rfis],
  );
  const rfisOverdue = React.useMemo(
    () => rfisOpen.filter((r) => r.due_date && isPast(new Date(r.due_date))),
    [rfisOpen],
  );
  const openTasks = React.useMemo(
    () => tasks.filter((t) => !isClosedStatus(t.status)),
    [tasks],
  );
  const openChangeEvents = React.useMemo(
    () =>
      changeEvents.filter(
        (ce) => !["closed", "rejected", "approved"].includes((ce.status ?? "").toLowerCase()),
      ),
    [changeEvents],
  );
  const pendingChangeOrders = React.useMemo(
    () =>
      changeOrders.filter(
        (co: ChangeOrder) => !["approved", "rejected", "closed"].includes((co.status ?? "").toLowerCase()),
      ),
    [changeOrders],
  );
  /* ── Setup ───────────────────────────────────────────── */
  const hasTeam = (team ?? []).length > 0;
  const hasBudget = (budget ?? []).length > 0 || revisedBudget > 0;
  const hasContracts = contracts.length > 0;
  const hasSchedule = (schedule ?? []).length > 0;
  const setupTotal = 4;
  const setupCompleted = [hasTeam, hasBudget, hasContracts, hasSchedule].filter(Boolean).length;

  /* ── Alerts ──────────────────────────────────────────── */
  const showPrimeMarkupAlert = homeAlerts?.hasPrimeContractWithoutFinancialMarkup ?? false;
  const coWithoutChangeRequestCount = homeAlerts?.changeOrdersWithoutChangeRequestCount ?? 0;

  const alerts: Alert[] = [
    ...(variance < 0
      ? [{ id: "budget-variance", title: `Forecast over budget by ${fmtCompact(Math.abs(variance))}`, detail: `ECAC ${fmtFull(ecac)}`, href: `/${projectId}/budget`, tone: "danger" as const }]
      : []),
    ...(showPrimeMarkupAlert
      ? [{ id: "prime-markup", title: "Prime contract missing financial markup", href: `/${projectId}/prime-contracts`, tone: "danger" as const }]
      : []),
    ...(coWithoutChangeRequestCount > 0
      ? [{ id: "orphan-co", title: `${coWithoutChangeRequestCount} change order${coWithoutChangeRequestCount !== 1 ? "s" : ""} missing change request`, href: `/${projectId}/change-orders`, tone: "danger" as const }]
      : []),
    ...(pendingSsovReviews.length > 0
      ? [{ id: "pending-ssov", title: `${pendingSsovReviews.length} subcontractor SOV${pendingSsovReviews.length !== 1 ? "s" : ""} pending review`, href: `/${projectId}/commitments`, tone: "warning" as const }]
      : []),
    ...(rfisOverdue.length > 0
      ? [{ id: "overdue-rfis", title: `${rfisOverdue.length} overdue RFI${rfisOverdue.length !== 1 ? "s" : ""}`, href: `/${projectId}/rfis`, tone: "warning" as const }]
      : []),
  ];

  /* ── Tab content builders ────────────────────────────── */

  const tasksContent = (search: string) => {
    const filtered = openTasks
      .filter((t) => t.description?.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10);
    if (filtered.length === 0) return <EmptyTabState label="open tasks" />;
    return (
      <InlineTable variant="read">
        <InlineTableHeader>
          <InlineTableHeaderRow>
            <InlineTableHeaderCell>Task</InlineTableHeaderCell>
            <InlineTableHeaderCell>Assignee</InlineTableHeaderCell>
            <InlineTableHeaderCell>Due</InlineTableHeaderCell>
            <InlineTableHeaderCell>Status</InlineTableHeaderCell>
          </InlineTableHeaderRow>
        </InlineTableHeader>
        <InlineTableBody>
          {filtered.map((task) => {
            const overdue = task.due_date ? isPast(new Date(task.due_date)) : false;
            return (
              <InlineTableRow key={task.id}>
                <InlineTableCell className="max-w-xs">
                  <Link
                    href={`/${projectId}/tasks`}
                    prefetch={false}
                    className="line-clamp-2 text-foreground hover:text-primary transition-colors"
                  >
                    {task.description}
                  </Link>
                </InlineTableCell>
                <InlineTableCell>
                  <span className="text-muted-foreground">{task.assignee_name || "—"}</span>
                </InlineTableCell>
                <InlineTableCell>
                  <span className={cn("whitespace-nowrap", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                    {task.due_date ? formatMonthDay(task.due_date) : "—"}
                  </span>
                </InlineTableCell>
                <InlineTableCell>
                  <StatusBadge status={overdue ? "Overdue" : (task.priority || task.status || "Open")} />
                </InlineTableCell>
              </InlineTableRow>
            );
          })}
        </InlineTableBody>
      </InlineTable>
    );
  };

  const meetingsContent = (search: string) => {
    const filtered = [...homeMeetings]
      .sort((a, b) => getDateMs(b.date ?? b.created_at) - getDateMs(a.date ?? a.created_at))
      .filter((m) => (m.title || m.file_name || "").toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10);
    if (filtered.length === 0) return <EmptyTabState label="meetings" />;
    return (
      <InlineTable variant="read">
        <InlineTableHeader>
          <InlineTableHeaderRow>
            <InlineTableHeaderCell>Meeting</InlineTableHeaderCell>
            <InlineTableHeaderCell>Date</InlineTableHeaderCell>
            <InlineTableHeaderCell>Duration</InlineTableHeaderCell>
            <InlineTableHeaderCell>Type</InlineTableHeaderCell>
          </InlineTableHeaderRow>
        </InlineTableHeader>
        <InlineTableBody>
          {filtered.map((m) => (
            <InlineTableRow key={m.id}>
              <InlineTableCell className="max-w-xs">
                <Link
                  href={`/${projectId}/meetings/${m.id}`}
                  prefetch={false}
                  className="line-clamp-1 text-foreground hover:text-primary transition-colors"
                >
                  {m.title || m.file_name || "Untitled Meeting"}
                </Link>
              </InlineTableCell>
              <InlineTableCell>
                <span className="whitespace-nowrap text-muted-foreground">
                  {formatMonthDay(m.date ?? m.created_at) || "—"}
                </span>
              </InlineTableCell>
              <InlineTableCell>
                <span className="text-muted-foreground">
                  {m.duration_minutes ? `${m.duration_minutes} min` : "—"}
                </span>
              </InlineTableCell>
              <InlineTableCell>
                <StatusBadge status={m.type || "Meeting"} />
              </InlineTableCell>
            </InlineTableRow>
          ))}
        </InlineTableBody>
      </InlineTable>
    );
  };

  const documentsContent = (search: string) => {
    const filtered = homeDocuments
      .filter((d) => (d.title || d.file_name || "").toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8);
    if (filtered.length === 0) return <EmptyTabState label="documents" />;
    return filtered.map((d) => (
      <InlineDataRow
        key={d.id}
        href={`/${projectId}/documents`}
        primary={d.title || d.file_name || "Untitled"}
        secondary={d.category}
        tertiary={formatMonthDay(d.updated_at ?? d.created_at)}
        status={d.status}
      />
    ));
  };

  const changeEventsContent = (search: string) => {
    const filtered = changeEvents
      .filter((ce) => (ce.title ?? `Change Event #${ce.number}`).toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8);
    if (filtered.length === 0) return <EmptyTabState label="change events" />;
    return filtered.map((ce) => (
      <InlineDataRow
        key={ce.id}
        href={`/${projectId}/change-events/${ce.id}`}
        primary={ce.title ?? `Change Event #${ce.number}`}
        secondary={ce.number ? `#${ce.number}` : null}
        tertiary={formatMonthDay(ce.updated_at ?? ce.created_at)}
        status={ce.status ?? "Draft"}
      />
    ));
  };

  const changeOrdersContent = (search: string) => {
    const filtered = changeOrders
      .filter((co: ChangeOrder) => (co.title ?? "Change Order").toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8);
    if (filtered.length === 0) return <EmptyTabState label="change orders" />;
    return filtered.map((co: ChangeOrder) => {
      const isPrime = !co.change_order_number;
      return (
        <InlineDataRow
          key={co.id}
          href={isPrime ? `/${projectId}/change-orders/prime/${co.id}` : `/${projectId}/change-orders/commitment/${co.id}`}
          primary={co.title ?? "Change Order"}
          secondary={fmtCompact(co.amount ?? co.total_amount)}
          tertiary={formatMonthDay(co.created_at)}
          status={co.status ?? "Pending"}
        />
      );
    });
  };

  const pccosContent = (search: string) => {
    const pccos = changeOrders.filter((co: ChangeOrder) => !co.change_order_number);
    const filtered = pccos
      .filter((co: ChangeOrder) => (co.title ?? "PCCO").toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8);
    if (filtered.length === 0) return <EmptyTabState label="PCCOs" />;
    return filtered.map((co: ChangeOrder) => (
      <InlineDataRow
        key={co.id}
        href={`/${projectId}/change-orders/prime/${co.id}`}
        primary={co.title ?? "PCCO"}
        secondary={fmtCompact(co.amount ?? co.total_amount)}
        tertiary={formatMonthDay(co.created_at)}
        status={co.status ?? "Pending"}
      />
    ));
  };

  const rfisContent = (search: string) => {
    const filtered = rfis
      .filter((r) => r.subject?.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8);
    if (filtered.length === 0) return <EmptyTabState label="RFIs" />;
    return filtered.map((r) => {
      const overdue = r.due_date ? isPast(new Date(r.due_date)) : false;
      return (
        <InlineDataRow
          key={r.id}
          href={`/${projectId}/rfis/${r.id}`}
          primary={`RFI #${r.number}: ${r.subject}`}
          secondary={r.ball_in_court ? `BIC: ${r.ball_in_court}` : null}
          tertiary={r.due_date ? `Due ${formatMonthDay(r.due_date)}` : null}
          status={overdue ? "Overdue" : r.status}
        />
      );
    });
  };

  const dailyLogsContent = (search: string) => {
    const filtered = homeDailyLogs
      .filter((dl) => (dl.log_date ?? "").includes(search.toLowerCase()))
      .slice(0, 8);
    if (filtered.length === 0) return <EmptyTabState label="daily logs" />;
    return filtered.map((dl) => (
      <InlineDataRow
        key={dl.id}
        href={`/${projectId}/daily-log`}
        primary={formatShortDate(dl.log_date) ?? `Log ${dl.id}`}
        secondary={null}
        tertiary={null}
        status="Daily Log"
      />
    ));
  };

  const submittalsContent = (search: string) => {
    const filtered = homeSubmittals
      .filter((s) => s.title?.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8);
    if (filtered.length === 0) return <EmptyTabState label="submittals" />;
    return filtered.map((s) => (
      <InlineDataRow
        key={s.id}
        href={`/${projectId}/submittals/${s.id}`}
        primary={`${s.submittal_number}: ${s.title}`}
        secondary={s.ball_in_court ? `BIC: ${s.ball_in_court}` : null}
        tertiary={formatMonthDay(s.final_due_date ?? s.required_approval_date ?? s.created_at)}
        status={s.status ?? "Open"}
      />
    ));
  };

  /* ── Tab configs ─────────────────────────────────────── */

  const commsTabs: TabConfig[] = [
    { id: "tasks", label: "Tasks", count: openTasks.length, content: tasksContent, viewAllHref: `/${projectId}/tasks` },
    {
      id: "meetings",
      label: "Meetings",
      count: lazyTabStatus.meetings.loaded ? homeMeetings.length : undefined,
      content: meetingsContent,
      viewAllHref: `/${projectId}/meetings`,
      lazyKind: "meetings",
      isLoaded: lazyTabStatus.meetings.loaded,
      isLoading: lazyTabStatus.meetings.loading,
      error: lazyTabStatus.meetings.error,
      onRetry: () => loadLazyTabData("meetings"),
    },
    {
      id: "documents",
      label: "Documents",
      count: lazyTabStatus.documents.loaded ? homeDocuments.length : undefined,
      content: documentsContent,
      viewAllHref: `/${projectId}/documents`,
      lazyKind: "documents",
      isLoaded: lazyTabStatus.documents.loaded,
      isLoading: lazyTabStatus.documents.loading,
      error: lazyTabStatus.documents.error,
      onRetry: () => loadLazyTabData("documents"),
    },
  ];

  const changeTabs: TabConfig[] = [
    { id: "change-events", label: "Change Events", count: changeEvents.length, content: changeEventsContent, viewAllHref: `/${projectId}/change-events` },
    { id: "pcco", label: "PCCO", count: changeOrders.filter((co: ChangeOrder) => !co.change_order_number).length, content: pccosContent, viewAllHref: `/${projectId}/change-orders` },
    { id: "change-orders", label: "Change Orders", count: changeOrders.length, content: changeOrdersContent, viewAllHref: `/${projectId}/change-orders` },
  ];

  const fieldTabs: TabConfig[] = [
    { id: "rfis", label: "RFIs", count: rfis.length, content: rfisContent, viewAllHref: `/${projectId}/rfis` },
    {
      id: "daily-logs",
      label: "Daily Logs",
      count: lazyTabStatus["daily-logs"].loaded ? homeDailyLogs.length : undefined,
      content: dailyLogsContent,
      viewAllHref: `/${projectId}/daily-log`,
      lazyKind: "daily-logs",
      isLoaded: lazyTabStatus["daily-logs"].loaded,
      isLoading: lazyTabStatus["daily-logs"].loading,
      error: lazyTabStatus["daily-logs"].error,
      onRetry: () => loadLazyTabData("daily-logs"),
    },
    {
      id: "submittals",
      label: "Submittals",
      count: lazyTabStatus.submittals.loaded ? homeSubmittals.length : undefined,
      content: submittalsContent,
      viewAllHref: `/${projectId}/submittals`,
      lazyKind: "submittals",
      isLoaded: lazyTabStatus.submittals.loaded,
      isLoading: lazyTabStatus.submittals.loading,
      error: lazyTabStatus.submittals.error,
      onRetry: () => loadLazyTabData("submittals"),
    },
  ];

  const jobNumber = project["job number"] ?? project.project_number;

  return (
    <div className="min-h-0">
      {showRealtimeCursors ? <RealtimeCursors roomName={roomName} username={currentUserName} /> : null}

      <div className="px-4 py-6 sm:px-5 lg:px-6">
        {/* ── Header ────────────────────────────────────── */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {jobNumber && (
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Job #{jobNumber}
              </p>
            )}
            <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              {project.name ?? "Untitled Project"}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {project.current_phase && (
                <span className="text-sm text-muted-foreground">{project.current_phase}</span>
              )}
              {project.current_phase && project.client && (
                <span className="text-sm text-muted-foreground/40">·</span>
              )}
              {project.client && (
                <span className="text-sm text-muted-foreground">{project.client}</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ReadinessIndicator
              completedCount={setupCompleted}
              totalCount={setupTotal}
              onOpen={() => setIsSetupOpen(true)}
            />
            <Button variant="outline" size="sm" onClick={() => setIsEditProjectSidebarOpen(true)}>
              Edit Project
            </Button>
          </div>
        </header>

        {/* ── Two-column layout ─────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_268px]">
          {/* ── Main column ─────────────────────────────── */}
          <div className="min-w-0 space-y-8">

            {/* ── Financial Snapshot ────────────────────── */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Financial Snapshot
              </p>

              {/* 4-column equal KPI grid */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {/* Budget */}
                <MetricCard label="Budget" href={`/${projectId}/budget`}>
                  {budgetLoading ? (
                    <div className="h-10 animate-pulse rounded bg-muted/40" />
                  ) : revisedBudget > 0 ? (
                    <div className="space-y-1.5">
                      <span className="text-2xl font-semibold tabular-nums text-foreground">
                        {fmtCompact(revisedBudget)}
                      </span>
                      <p className={cn(
                        "text-xs font-medium",
                        variance > 0 ? "text-status-success" : variance < 0 ? "text-destructive" : "text-muted-foreground",
                      )}>
                        {variance > 0
                          ? `▲ ${fmtCompact(Math.abs(variance))} under`
                          : variance < 0
                          ? `▼ ${fmtCompact(Math.abs(variance))} over`
                          : "On budget"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Not set up</p>
                      <Link href={`/${projectId}/budget`} prefetch={false} className="text-xs text-primary hover:underline">
                        Create budget →
                      </Link>
                    </div>
                  )}
                </MetricCard>

                {/* Prime Contract */}
                <MetricCard label="Prime Contract" href={`/${projectId}/prime-contracts`}>
                  <div className="space-y-2">
                    <div>
                      <span className="text-2xl font-semibold tabular-nums text-foreground">
                        {fmtCompact(primeContractValue || null)}
                      </span>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {contracts.length > 0
                          ? `${contracts.length} contract${contracts.length !== 1 ? "s" : ""}`
                          : "No contract yet"}
                      </p>
                    </div>
                    {primeContractValue > 0 && (
                      <div className="overflow-hidden rounded-full bg-muted h-1.5">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct(totalBilled, primeContractValue)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </MetricCard>

                {/* Commitments */}
                <MetricCard label="Commitments" href={`/${projectId}/commitments`}>
                  <div className="space-y-1.5">
                    <span className="text-2xl font-semibold tabular-nums text-foreground">
                      {fmtCompact(commitmentTotal || null)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {commitments.length > 0
                        ? `${commitments.length} total`
                        : "No buyout yet"}
                    </p>
                    {commitments.length > 0 && (
                      <div className="flex gap-2 pt-0.5">
                        {commitments.filter((c) => c.type === "subcontract").length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {commitments.filter((c) => c.type === "subcontract").length} sub
                          </span>
                        )}
                        {commitments.filter((c) => c.type === "purchase_order").length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {commitments.filter((c) => c.type === "purchase_order").length} PO
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </MetricCard>

                {/* Work Completed */}
                <MetricCard label="Work Completed" href={`/${projectId}/prime-contracts`}>
                  <div className="flex items-center justify-center py-1">
                    <WorkCompletedGauge
                      pctComplete={billedPct}
                      label="Billed to Date"
                      sub={totalBilled > 0 ? fmtCompact(totalBilled) : ownerInvoices.length === 0 ? "No invoices yet" : "—"}
                    />
                  </div>
                </MetricCard>
              </div>

              {/* Full-width budget chart */}
              {!budgetLoading && revisedBudget > 0 && (
                <div className="rounded-lg bg-card p-5">
                  <p className="mb-3 text-xs font-medium text-muted-foreground">Budget vs. Cost Breakdown</p>
                  <BudgetBarChart budget={revisedBudget} costToDate={costToDate} ecac={ecac} />
                </div>
              )}
            </div>

            {/* ── Needs Attention ──────────────────────── */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Needs Attention
                </p>
                <AlertsBand alerts={alerts} />
              </div>
            )}

            {/* ── Work & Communications ─────────────────── */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Work & Communications
              </p>
              <TabSection tabs={commsTabs} defaultTab="tasks" />
            </div>

            {/* ── Change Management ─────────────────────── */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Change Management
              </p>
              <TabSection tabs={changeTabs} defaultTab="change-events" />
            </div>

            {/* ── Field Operations ──────────────────────── */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Field Operations
              </p>
              <TabSection tabs={fieldTabs} defaultTab="rfis" />
            </div>
          </div>

          {/* ── Right sidebar ─────────────────────────────── */}
          <aside className="xl:sticky xl:top-6 xl:h-fit">
            <ProjectDetailsSidebar
              project={project}
              projectId={projectId}
              team={team}
              onEditProject={() => setIsEditProjectSidebarOpen(true)}
            />
          </aside>
        </div>
      </div>

      {isEditProjectSidebarOpen ? (
        <EditProjectSidebar
          project={project}
          open={isEditProjectSidebarOpen}
          onOpenChange={setIsEditProjectSidebarOpen}
        />
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
