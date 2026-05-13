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
  DollarSign,
  ExternalLink,
  FileText,
  Image,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { useBudgetData } from "@/hooks/use-budget-data";
import { useCurrentUserName } from "@/hooks/use-current-user-name";
import { useProjectRoles, type ProjectRole } from "@/hooks/use-project-roles";
import { AssignMemberDialog } from "@/components/domain/directory/AssignMemberDialog";
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
import { RealtimeCursors } from "@/components/realtime/realtime-cursors";
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
type PrimeContractPayment = Pick<
  Database["public"]["Tables"]["prime_contract_payments"]["Row"],
  "id" | "payment_number" | "reference_number" | "method" | "amount" | "payment_date" | "contract_id" | "created_at" | "updated_at"
>;
type CommitmentPayment = Pick<
  Database["public"]["Tables"]["commitment_payments"]["Row"],
  "id" | "payment_number" | "payment_ref" | "payment_method" | "amount" | "payment_date" | "status" | "vendor_name" | "subcontract_id" | "purchase_order_id" | "created_at" | "updated_at"
>;
type InvoicePayment = Pick<
  Database["public"]["Tables"]["invoice_payments"]["Row"],
  "id" | "payment_number" | "payment_method" | "amount" | "payment_date" | "owner_invoice_id" | "subcontractor_invoice_id" | "created_at" | "updated_at"
>;
type ProjectTeamMember = Database["public"]["Functions"]["get_project_team"]["Returns"][number];
type Submittal = Database["public"]["Tables"]["submittals"]["Row"];
type DailyLog = Database["public"]["Tables"]["daily_logs"]["Row"];

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
  dailyLogs?: DailyLog[];
  budget?: any[];
  sov?: any[];
  ownerInvoices?: OwnerInvoice[];
  subcontractorInvoices?: SubcontractorInvoice[];
  projectDocuments?: ProjectDocument[];
  primeContractPayments?: PrimeContractPayment[];
  commitmentPayments?: CommitmentPayment[];
  invoicePayments?: InvoicePayment[];
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
   BudgetBarChart — recharts horizontal bar
───────────────────────────────────────────────────────────── */

type BudgetTooltipPayload = Array<{
  name?: string;
  value?: number | null;
}>;

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: BudgetTooltipPayload;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-foreground">{payload[0]?.name}</p>
      <p className="text-muted-foreground">{fmtFull(payload[0]?.value)}</p>
    </div>
  );
};

function BudgetBarChart({
  budget,
  costToDate,
  ecac,
}: {
  budget: number;
  costToDate: number;
  ecac: number;
}) {
  const data = [
    { name: "Revised Budget", value: budget, color: "hsl(var(--muted-foreground) / 0.5)" },
    { name: "Cost to Date", value: costToDate, color: "hsl(var(--primary))" },
    { name: "ECAC", value: ecac, color: ecac > budget ? "hsl(var(--destructive))" : "hsl(var(--status-success))" },
  ];

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          type="number"
          tickFormatter={(v) => fmtCompact(v)}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          width={80}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
        <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={18}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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
  count: number;
  content: (search: string) => React.ReactNode;
  viewAllHref: string;
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
    label: tab.count > 0 ? `${tab.label} (${tab.count})` : tab.label,
    href: `#${tab.id}`,
    isActive: activeTab === tab.id,
  }));

  const activeTabConfig = tabs.find((t) => t.id === activeTab);

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
            {activeTabConfig.content(search)}
          </div>
          <div className="py-2.5">
            <Link
              href={activeTabConfig.viewAllHref}
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

function SidebarTeamSection({ projectId }: { projectId: string }) {
  const { roles, isLoading, updateRoleMembers, createRole } = useProjectRoles(projectId);
  const [assignDialog, setAssignDialog] = React.useState<{ open: boolean; role: ProjectRole | null }>({
    open: false,
    role: null,
  });
  const [creating, setCreating] = React.useState<string | null>(null);

  const slots = SIDEBAR_ROLES.map((roleName) => {
    const dbRole = roles.find((r) => r.role_name.toLowerCase() === roleName.toLowerCase());
    const firstMember = dbRole?.members[0] ?? null;
    const person = firstMember?.person ?? null;
    return { roleName, dbRole: dbRole ?? null, person };
  });

  const openDialog = async (dbRole: ProjectRole | null, roleName: string) => {
    if (dbRole) {
      setAssignDialog({ open: true, role: dbRole });
      return;
    }
    setCreating(roleName);
    try {
      const newRole = await createRole(roleName);
      setAssignDialog({ open: true, role: newRole });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to create ${roleName} role`);
    } finally {
      setCreating(null);
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
            const isCreating = creating === roleName;
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
      <AssignMemberDialog
        open={assignDialog.open}
        onOpenChange={(open) => setAssignDialog((prev) => ({ ...prev, open }))}
        role={assignDialog.role}
        onSave={updateRoleMembers}
        projectId={projectId}
      />
    </div>
  );
}

function ProjectDetailsSidebar({
  project,
  projectId,
  onEditProject,
}: {
  project: Project;
  projectId: string;
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
      <SidebarTeamSection projectId={projectId} />

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
  dailyLogs = [],
  ownerInvoices = [],
  subcontractorInvoices = [],
  projectDocuments = [],
  primeContractPayments = [],
  commitmentPayments = [],
  invoicePayments = [],
}: ProjectCommandCenterProps) {
  const projectId = String(project.id);
  const [isEditProjectSidebarOpen, setIsEditProjectSidebarOpen] = React.useState(false);
  const [isSetupOpen, setIsSetupOpen] = React.useState(false);
  const roomName = `project-home:${projectId}`;
  const currentUserName = useCurrentUserName();
  const { grandTotals, loading: budgetLoading } = useBudgetData(projectId);

  /* ── Budget ─────────────────────────────────────────── */
  const revisedBudget = grandTotals.revisedBudget || grandTotals.originalBudgetAmount;
  const costToDate = grandTotals.jobToDateCostDetail;
  const ecac = grandTotals.estimatedCostAtCompletion;
  const variance = grandTotals.projectedOverUnder;
  const primeContractValue = contractLineItems.reduce((sum, li) => sum + (li.total_cost ?? 0), 0);

  /* ── Work Completed ──────────────────────────────────── */
  const totalBilled = ownerInvoices.reduce((sum, inv) => sum + (inv.gross_amount ?? 0), 0);
  const contractBase = primeContractValue || revisedBudget;
  const billedPct = contractBase > 0 ? pct(totalBilled, contractBase) : pct(costToDate, revisedBudget);

  /* ── Open items ──────────────────────────────────────── */
  const rfisOpen = rfis.filter((r) => r.status.toLowerCase() !== "closed");
  const rfisOverdue = rfisOpen.filter((r) => r.due_date && isPast(new Date(r.due_date)));
  const openSubmittals = submittals.filter((s) => !isClosedStatus(s.status));
  const openTasks = tasks.filter((t) => !isClosedStatus(t.status));
  const openChangeEvents = changeEvents.filter(
    (ce) => !["closed", "rejected", "approved"].includes((ce.status ?? "").toLowerCase()),
  );
  const pendingChangeOrders = changeOrders.filter(
    (co: ChangeOrder) => !["approved", "rejected", "closed"].includes((co.status ?? "").toLowerCase()),
  );
  const pendingSubInvoices = subcontractorInvoices.filter(
    (inv) => !["approved", "paid", "void"].includes((inv.status ?? "").toLowerCase()),
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
    const filtered = [...meetings]
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
    const filtered = projectDocuments
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
    const filtered = (dailyLogs ?? [])
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
    const filtered = submittals
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
    { id: "meetings", label: "Meetings", count: meetings.length, content: meetingsContent, viewAllHref: `/${projectId}/meetings` },
    { id: "documents", label: "Documents", count: projectDocuments.length, content: documentsContent, viewAllHref: `/${projectId}/documents` },
  ];

  const changeTabs: TabConfig[] = [
    { id: "change-events", label: "Change Events", count: changeEvents.length, content: changeEventsContent, viewAllHref: `/${projectId}/change-events` },
    { id: "pcco", label: "PCCO", count: changeOrders.filter((co: ChangeOrder) => !co.change_order_number).length, content: pccosContent, viewAllHref: `/${projectId}/change-orders` },
    { id: "change-orders", label: "Change Orders", count: changeOrders.length, content: changeOrdersContent, viewAllHref: `/${projectId}/change-orders` },
  ];

  const fieldTabs: TabConfig[] = [
    { id: "rfis", label: "RFIs", count: rfis.length, content: rfisContent, viewAllHref: `/${projectId}/rfis` },
    { id: "daily-logs", label: "Daily Logs", count: (dailyLogs ?? []).length, content: dailyLogsContent, viewAllHref: `/${projectId}/daily-log` },
    { id: "submittals", label: "Submittals", count: submittals.length, content: submittalsContent, viewAllHref: `/${projectId}/submittals` },
  ];

  const jobNumber = project["job number"] ?? project.project_number;

  return (
    <div className="min-h-0">
      <RealtimeCursors roomName={roomName} username={currentUserName} />

      <div className="px-4 py-6 sm:px-5 lg:px-6">
        {/* ── Header ────────────────────────────────────── */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {jobNumber && (
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Job #{jobNumber}
              </p>
            )}
            <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              {project.name ?? "Untitled Project"}
            </h1>
            {project.current_phase && (
              <p className="mt-1.5 text-sm text-muted-foreground">{project.current_phase}</p>
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
        </header>

        {/* ── Two-column layout ─────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_268px]">
          {/* ── Main column ─────────────────────────────── */}
          <div className="min-w-0 space-y-6">

            {/* ── KPI Cards ─────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Budget Performance chart */}
              <MetricCard
                label="Budget vs Costs"
                href={`/${projectId}/budget`}
                className="sm:col-span-2"
              >
                {budgetLoading ? (
                  <div className="flex h-28 items-center justify-center">
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  </div>
                ) : revisedBudget > 0 ? (
                  <div>
                    <div className="mb-3 flex items-baseline gap-4">
                      <span className="text-2xl font-semibold tabular-nums text-foreground">
                        {fmtCompact(revisedBudget)}
                      </span>
                      <span className={cn(
                        "text-xs font-medium",
                        variance > 0 ? "text-status-success" : variance < 0 ? "text-destructive" : "text-muted-foreground",
                      )}>
                        {variance > 0 ? "▲" : variance < 0 ? "▼" : ""}{" "}
                        {variance !== 0 ? `${fmtCompact(Math.abs(variance))} ${variance > 0 ? "under" : "over"}` : "On budget"}
                      </span>
                    </div>
                    <BudgetBarChart budget={revisedBudget} costToDate={costToDate} ecac={ecac} />
                  </div>
                ) : (
                  <div className="flex h-36 flex-col items-center justify-center gap-2 text-center">
                    <p className="text-sm text-muted-foreground">Budget not created yet</p>
                    <Link href={`/${projectId}/budget`} className="text-xs text-primary hover:underline">
                      Create budget →
                    </Link>
                  </div>
                )}
              </MetricCard>

              {/* Work Completed gauge */}
              <MetricCard label="Work Completed" href={`/${projectId}/prime-contracts`}>
                <div className="flex flex-col items-center justify-center flex-1 py-2">
                  <WorkCompletedGauge
                    pctComplete={billedPct}
                    label="Billed to Date"
                    sub={totalBilled > 0 ? fmtCompact(totalBilled) : ownerInvoices.length === 0 ? "No invoices yet" : "—"}
                  />
                </div>
              </MetricCard>

              {/* Commitments card */}
              <MetricCard label="Commitments" href={`/${projectId}/commitments`} className="sm:col-span-1">
                <div className="space-y-3">
                  <div>
                    <span className="text-2xl font-semibold tabular-nums text-foreground">
                      {fmtCompact(commitmentTotal || null)}
                    </span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {commitments.length > 0
                        ? `${commitments.length} commitment${commitments.length !== 1 ? "s" : ""}`
                        : "No buyout yet"}
                    </p>
                  </div>
                  {commitments.length > 0 && (
                    <div className="space-y-1.5">
                      {[
                        {
                          label: "Subcontracts",
                          count: commitments.filter((c) => c.type === "subcontract").length,
                          value: commitments
                            .filter((c) => c.type === "subcontract")
                            .reduce((s, c) => s + (c.revised_contract_amount ?? c.contract_amount ?? c.original_amount ?? 0), 0),
                        },
                        {
                          label: "Purchase Orders",
                          count: commitments.filter((c) => c.type === "purchase_order").length,
                          value: commitments
                            .filter((c) => c.type === "purchase_order")
                            .reduce((s, c) => s + (c.revised_contract_amount ?? c.contract_amount ?? c.original_amount ?? 0), 0),
                        },
                      ].map(({ label, count, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{label} ({count})</span>
                          <span className="text-xs font-medium tabular-nums text-foreground">{fmtCompact(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </MetricCard>

              {/* Prime Contract card */}
              <MetricCard label="Prime Contract" href={`/${projectId}/prime-contracts`} className="sm:col-span-2">
                <div className="flex items-start gap-6">
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
                  {contracts.length > 0 && primeContractValue > 0 && (
                    <div className="flex-1 space-y-1.5 pt-0.5">
                      {[
                        { label: "Billed", value: totalBilled },
                        { label: "Remaining", value: Math.max(0, primeContractValue - totalBilled) },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{label}</span>
                          <span className="text-xs font-medium tabular-nums text-foreground">{fmtCompact(value)}</span>
                        </div>
                      ))}
                      <div className="mt-2 overflow-hidden rounded-full bg-muted h-1.5">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct(totalBilled, primeContractValue)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </MetricCard>
            </div>

            {/* ── Alerts ──────────────────────────────────── */}
            {alerts.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Notifications
                </p>
                <AlertsBand alerts={alerts} />
              </div>
            )}

            {/* ── Tab section 1: Communications ────────── */}
            <TabSection tabs={commsTabs} defaultTab="tasks" />

            {/* ── Tab section 2: Change Management ─────── */}
            <TabSection tabs={changeTabs} defaultTab="change-events" />

            {/* ── Tab section 3: Field ─────────────────── */}
            <TabSection tabs={fieldTabs} defaultTab="rfis" />
          </div>

          {/* ── Right sidebar ─────────────────────────────── */}
          <aside className="xl:sticky xl:top-6 xl:h-fit">
            <ProjectDetailsSidebar
              project={project}
              projectId={projectId}
              onEditProject={() => setIsEditProjectSidebarOpen(true)}
            />
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
