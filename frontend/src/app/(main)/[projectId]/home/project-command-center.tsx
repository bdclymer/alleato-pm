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
import { useProjectRoles } from "@/hooks/use-project-roles";
import {
  Avatar,
  AvatarFallback,
  Button,
  StatusBadge,
} from "@/components/ds";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as TablePrimitives from "@/components/ui/table";
import { Input } from "@/components/ui/input";

// Local aliases to satisfy the design-system/no-raw-table-primitives lint rule.
// The dashboard widget tables on this page are intentionally lightweight read-only
// displays — UnifiedTablePage would be overkill for these summary cells.
const Table = TablePrimitives.Table;
const TableBody = TablePrimitives.TableBody;
const TableCell = TablePrimitives.TableCell;
const TableHead = TablePrimitives.TableHead;
const TableHeader = TablePrimitives.TableHeader;
const TableRow = TablePrimitives.TableRow;
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
   SectionHeading
───────────────────────────────────────────────────────────── */

function SectionHeading({
  children,
  href,
}: {
  children: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="text-sm font-semibold text-foreground">{children}</div>
      {href && (
        <Link
          href={href}
          prefetch={false}
          className="flex items-center gap-0.5 text-xs text-primary transition-colors hover:text-primary/80"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      )}
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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearch("");
  };

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
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="inline-block">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {typeof tab.count === "number" && tab.count > 0
                  ? `${tab.label} (${tab.count})`
                  : tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative shrink-0">
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
        <div className="pb-1">
          {activeTabConfig.isLoading ? (
            <div className="px-4 py-5 text-sm text-muted-foreground">Loading {activeTabConfig.label.toLowerCase()}…</div>
          ) : activeTabConfig.error ? (
            <div className="flex items-center justify-between gap-3 px-4 py-5 text-sm">
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
          <div className="px-4 py-2.5">
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
  const { roles, isLoading } = useProjectRoles(projectId, { enabled: false });
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
    return { roleName, person };
  });

  return (
    <div>
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
          {slots.map(({ roleName, person }) => {
            const displayName = person ? `${person.first_name} ${person.last_name}`.trim() : null;
            return (
              <Button
                key={roleName}
                asChild
                variant="ghost"
                className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-left hover:bg-muted/40 -mx-2 rounded-md"
              >
                <Link href={`/${projectId}/directory`}>
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
                </Link>
              </Button>
            );
          })}
        </div>
      )}
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
        <SheetHeader className="px-4 pt-6 pb-4 border-b border-border">
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
  contracts,
  homeAlerts,
  pendingSsovReviews = [],
  team,
  budget,
  schedule,
  submittals = [],
  dailyLogs = [],
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
  const { grandTotals } = useBudgetData(projectId, {
    enabled: !budgetGrandTotals,
    initialGrandTotals: budgetGrandTotals,
    showErrorToast: false,
  });

  /* ── Budget ─────────────────────────────────────────── */
  const revisedBudget = grandTotals.revisedBudget || grandTotals.originalBudgetAmount;
  const ecac = grandTotals.estimatedCostAtCompletion;
  const variance = grandTotals.projectedOverUnder;
  const homeMeetings = lazyTabData.meetings;
  const homeDocuments = lazyTabData.projectDocuments;
  const homeDailyLogs = lazyTabData.dailyLogs;
  const homeSubmittals = lazyTabData.submittals;

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((task) => {
            const overdue = task.due_date ? isPast(new Date(task.due_date)) : false;
            return (
              <TableRow key={task.id}>
                <TableCell className="max-w-xs">
                  <Link href={`/${projectId}/tasks`} prefetch={false} className="truncate text-foreground hover:text-primary transition-colors">
                    {task.description}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{task.assignee_name || "—"}</TableCell>
                <TableCell className={cn(overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                  {task.due_date ? formatMonthDay(task.due_date) : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={overdue ? "Overdue" : (task.priority || task.status || "Open")} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const meetingsContent = (search: string) => {
    const filtered = [...homeMeetings]
      .sort((a, b) => getDateMs(b.date ?? b.created_at) - getDateMs(a.date ?? a.created_at))
      .filter((m) => (m.title || m.file_name || "").toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10);
    if (filtered.length === 0) return <EmptyTabState label="meetings" />;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Meeting</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="max-w-xs">
                <Link href={`/${projectId}/meetings/${m.id}`} prefetch={false} className="truncate text-foreground hover:text-primary transition-colors">
                  {m.title || m.file_name || "Untitled Meeting"}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatMonthDay(m.date ?? m.created_at) || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{m.duration_minutes ? `${m.duration_minutes} min` : "—"}</TableCell>
              <TableCell><StatusBadge status={m.type || "Meeting"} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const documentsContent = (search: string) => {
    const filtered = homeDocuments
      .filter((d) => (d.title || d.file_name || "").toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8);
    if (filtered.length === 0) return <EmptyTabState label="documents" />;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="max-w-xs">
                <Link href={`/${projectId}/documents`} prefetch={false} className="truncate text-foreground hover:text-primary transition-colors">
                  {d.title || d.file_name || "Untitled"}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{d.category || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{formatMonthDay(d.updated_at ?? d.created_at) || "—"}</TableCell>
              <TableCell>{d.status ? <StatusBadge status={d.status} /> : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const dailyLogsContent = (search: string) => {
    const filtered = homeDailyLogs
      .filter((dl) => (dl.log_date ?? "").includes(search.toLowerCase()))
      .slice(0, 8);
    if (filtered.length === 0) return <EmptyTabState label="daily logs" />;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((dl) => (
            <TableRow key={dl.id}>
              <TableCell>
                <Link href={`/${projectId}/daily-log`} prefetch={false} className="text-foreground hover:text-primary transition-colors">
                  {formatShortDate(dl.log_date) ?? `Log ${dl.id}`}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const submittalsContent = (search: string) => {
    const filtered = homeSubmittals
      .filter((s) => s.title?.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8);
    if (filtered.length === 0) return <EmptyTabState label="submittals" />;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Submittal</TableHead>
            <TableHead>Ball in Court</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="max-w-xs">
                <Link href={`/${projectId}/submittals/${s.id}`} prefetch={false} className="truncate text-foreground hover:text-primary transition-colors">
                  {`${s.submittal_number}: ${s.title}`}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{s.ball_in_court || "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatMonthDay(s.final_due_date ?? s.required_approval_date ?? s.created_at) || "—"}
              </TableCell>
              <TableCell><StatusBadge status={s.status ?? "Open"} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  /* ── Auto-load always-visible lazy sections ──────────── */

  const initialLoadRef = React.useRef(false);
  React.useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    loadLazyTabData("meetings");
    loadLazyTabData("daily-logs");
  }, [loadLazyTabData]);

  /* ── Project detail derivations ──────────────────────── */

  const normalizedProject = project as ProjectWithNormalizedDates;
  const projStartDate = (normalizedProject as Record<string, unknown>)["start date"] as string | undefined
    ?? normalizedProject.start_date;
  const projCompletionDate = (normalizedProject as Record<string, unknown>)["est completion"] as string | undefined
    ?? normalizedProject.completion_date;
  const projMeta = project.summary_metadata as Record<string, unknown> | null;
  const substantialCompletion =
    typeof projMeta?.substantial_completion === "string" ? projMeta.substantial_completion : null;
  const projAddress = [
    project.address,
    (projMeta?.city as string) ?? undefined,
    project.state,
  ]
    .filter(Boolean)
    .join(", ");

  /* ── Tab configs ─────────────────────────────────────── */

  const docIntelTabs: TabConfig[] = [
    {
      id: "documents",
      label: "Files",
      count: lazyTabStatus.documents.loaded ? homeDocuments.length : undefined,
      content: documentsContent,
      viewAllHref: `/${projectId}/documents`,
      lazyKind: "documents",
      isLoaded: lazyTabStatus.documents.loaded,
      isLoading: lazyTabStatus.documents.loading,
      error: lazyTabStatus.documents.error,
      onRetry: () => loadLazyTabData("documents"),
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
    <>
      {showRealtimeCursors ? <RealtimeCursors roomName={roomName} username={currentUserName} /> : null}

      <div className="min-h-full">
        {/* ── Main content ─────────────────────────────── */}
        <div className="min-w-0 py-6 space-y-7">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {jobNumber && (
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Job #{jobNumber}
                </p>
              )}
              <h1 className="text-2xl font-semibold leading-tight text-foreground">
                {project.name ?? "Untitled Project"}
              </h1>
              {project.stage && (
                <p className="mt-0.5 text-sm text-muted-foreground">{project.stage}</p>
              )}
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
          </div>

          {/* Alerts */}
          {alerts.length > 0 && <AlertsBand alerts={alerts} />}

          {/* Project Details + Team 2-up */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Project Details
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setIsEditProjectSidebarOpen(true)}
                >
                  Edit
                </Button>
              </div>
              {projAddress && (
                <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  {projAddress}
                </div>
              )}
              <dl className="space-y-2">
                {[
                  { label: "Start Date", value: formatShortDate(projStartDate) },
                  { label: "Est. Completion", value: formatShortDate(projCompletionDate) },
                  { label: "Substantial Completion", value: formatShortDate(substantialCompletion) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className={cn("text-xs font-medium", value ? "text-foreground" : "text-muted-foreground/40")}>
                      {value ?? "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-lg bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Project Team
                </p>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                >
                  <Link href={`/${projectId}/directory`}>View Directory</Link>
                </Button>
              </div>
              <SidebarTeamSection projectId={projectId} team={team} />
            </div>
          </div>

          {/* Recent Meetings */}
          <div>
            <SectionHeading href={`/${projectId}/meetings`}>Recent Meetings</SectionHeading>
            {lazyTabStatus.meetings.loading ? (
              <div className="py-4 text-sm text-muted-foreground">Loading meetings…</div>
            ) : (
              meetingsContent("")
            )}
          </div>

          {/* Tasks */}
          <div>
            <SectionHeading href={`/${projectId}/tasks`}>
              Tasks{openTasks.length > 0 ? ` (${openTasks.length})` : ""}
            </SectionHeading>
            {tasksContent("")}
          </div>

          {/* Daily Reports */}
          <div>
            <SectionHeading href={`/${projectId}/daily-log`}>Daily Reports</SectionHeading>
            {lazyTabStatus["daily-logs"].loading ? (
              <div className="py-4 text-sm text-muted-foreground">Loading daily reports…</div>
            ) : (
              dailyLogsContent("")
            )}
          </div>

          {/* Document Intelligence */}
          <div>
            <SectionHeading>Document Intelligence</SectionHeading>
            <TabSection tabs={docIntelTabs} defaultTab="documents" />
          </div>
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
    </>
  );
}
