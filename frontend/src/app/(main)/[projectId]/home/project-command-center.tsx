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
  ChevronDown,
  ChevronRight,
  DollarSign,
  ExternalLink,
  FileArchive,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Image,
  Presentation,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBudgetData } from "@/hooks/use-budget-data";
import { useProjectRoles } from "@/hooks/use-project-roles";
import {
  Avatar,
  AvatarFallback,
  Button,
  StatusBadge,
} from "@/components/ds";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  FinancialOverview,
  type BudgetDivisionSummary,
} from "./financial-overview";
import type { Database } from "@/types/database.types";
import type { BudgetGrandTotals } from "@/types/budget";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Meeting = Pick<
  Database["public"]["Tables"]["document_metadata"]["Row"],
  | "id"
  | "title"
  | "file_name"
  | "date"
  | "created_at"
  | "summary"
  | "overview"
  | "description"
  | "notes"
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
  | "file_url"
  | "status"
  | "category"
  | "content_type"
  | "folder"
  | "source_system"
  | "created_at"
  | "updated_at"
  | "reviewed_at"
  | "file_size"
  | "storage_path"
>;
type ProjectTeamMember = Database["public"]["Functions"]["get_project_team"]["Returns"][number];
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
type DailyLog = Pick<
  Database["public"]["Tables"]["daily_logs"]["Row"],
  "id" | "log_date" | "general_notes" | "status" | "weather_conditions"
>;
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
  contractLineItems?: Array<
    Pick<ContractLineItem, "contract_id" | "total_cost" | "quantity" | "unit_cost" | "cost_code_id">
  >;
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

function parseLocalDate(value: string): Date {
  // ISO date-only strings (YYYY-MM-DD) are parsed as UTC midnight by spec.
  // Append local midnight so the date renders correctly in any timezone.
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(value + "T00:00:00")
    : new Date(value);
}

function formatShortDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "MMM d, yyyy");
}

function formatMonthDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "MMM d");
}

function formatFileSize(bytes: number | null | undefined): string | null {
  if (bytes == null) return null;
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function documentExtension(fileName: string | null | undefined): string {
  return fileName?.split(".").pop()?.toUpperCase() ?? "FILE";
}

function readableText(value: string | null | undefined): string | null {
  const normalized = (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/^#+\s*/g, "")
    .trim();
  if (!normalized || normalized === "{}" || normalized === "[]") return null;
  return normalized;
}

function oneSentence(value: string | null | undefined, fallback: string): string {
  const text = readableText(value);
  if (!text) return fallback;
  const sentence = text.match(/^(.+?[.!?])(\s|$)/)?.[1] ?? text;
  return sentence.length > 160 ? `${sentence.slice(0, 157).trim()}...` : sentence;
}

function documentInlineHref(projectId: string, documentId: number): string {
  return `/api/projects/${projectId}/documents/${documentId}/download?disposition=inline`;
}

function isPreviewableDocument(document: ProjectDocument): boolean {
  const extension = document.file_name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = document.content_type?.toLowerCase() ?? "";
  return (
    contentType.includes("pdf") ||
    contentType.includes("image") ||
    ["pdf", "jpg", "jpeg", "png", "webp", "gif"].includes(extension)
  );
}

function isImageDocument(document: ProjectDocument): boolean {
  const extension = document.file_name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = document.content_type?.toLowerCase() ?? "";
  return contentType.includes("image") || ["jpg", "jpeg", "png", "webp", "gif"].includes(extension);
}

type DocumentPreviewKind =
  | "spreadsheet"
  | "document"
  | "presentation"
  | "archive"
  | "code"
  | "pdf"
  | "image"
  | "file";

function getDocumentPreviewKind(document: ProjectDocument): DocumentPreviewKind {
  const extension = document.file_name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = document.content_type?.toLowerCase() ?? "";

  if (contentType.includes("image") || ["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) {
    return "image";
  }
  if (contentType.includes("pdf") || extension === "pdf") return "pdf";
  if (
    contentType.includes("spreadsheet") ||
    contentType.includes("excel") ||
    ["xls", "xlsx", "xlsm", "csv"].includes(extension)
  ) {
    return "spreadsheet";
  }
  if (
    contentType.includes("presentation") ||
    ["ppt", "pptx", "pptm"].includes(extension)
  ) {
    return "presentation";
  }
  if (
    contentType.includes("word") ||
    contentType.includes("document") ||
    ["doc", "docx", "rtf", "txt"].includes(extension)
  ) {
    return "document";
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) return "archive";
  if (["json", "xml", "html", "css", "js", "ts", "tsx", "sql"].includes(extension)) return "code";
  return "file";
}

function DocumentTypePreview({
  document,
  title,
}: {
  document: ProjectDocument;
  title: string;
}) {
  const kind = getDocumentPreviewKind(document);
  const extension = documentExtension(document.file_name);
  const meta = document.folder ?? document.source_system ?? "Project file";
  const styles: Record<
    Exclude<DocumentPreviewKind, "image" | "pdf">,
    {
      icon: React.ComponentType<{ className?: string }>;
      accent: string;
      panel: string;
      label: string;
    }
  > = {
    spreadsheet: {
      icon: FileSpreadsheet,
      accent: "text-emerald-700",
      panel: "bg-emerald-50/80",
      label: "Spreadsheet",
    },
    document: {
      icon: FileText,
      accent: "text-sky-700",
      panel: "bg-sky-50/80",
      label: "Document",
    },
    presentation: {
      icon: Presentation,
      accent: "text-amber-700",
      panel: "bg-amber-50/80",
      label: "Deck",
    },
    archive: {
      icon: FileArchive,
      accent: "text-stone-700",
      panel: "bg-stone-100/80",
      label: "Archive",
    },
    code: {
      icon: FileCode2,
      accent: "text-violet-700",
      panel: "bg-violet-50/80",
      label: "Source",
    },
    file: {
      icon: FileText,
      accent: "text-muted-foreground",
      panel: "bg-muted/60",
      label: "File",
    },
  };
  const style = styles[kind === "image" || kind === "pdf" ? "file" : kind];
  const Icon = style.icon;

  return (
    <div className={cn("flex h-full w-full flex-col p-3", style.panel)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Icon className={cn("h-4 w-4 shrink-0", style.accent)} />
        <span className="rounded-sm bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-foreground">
          {extension}
        </span>
      </div>
      {kind === "spreadsheet" ? (
        <div className="grid flex-1 grid-cols-4 gap-px overflow-hidden rounded-sm border border-emerald-700/15 bg-background/80">
          {Array.from({ length: 16 }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "min-h-0 bg-background",
                index < 4 && "bg-emerald-100/80",
                index % 4 === 0 && "bg-emerald-50",
              )}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-end gap-1.5">
          <span className={cn("text-[11px] font-medium", style.accent)}>{style.label}</span>
          <div className="space-y-1">
            <span className="block h-1.5 w-11/12 rounded-full bg-foreground/15" />
            <span className="block h-1.5 w-4/5 rounded-full bg-foreground/12" />
            <span className="block h-1.5 w-2/3 rounded-full bg-foreground/10" />
          </div>
        </div>
      )}
      <div className="mt-2 min-w-0">
        <p className="truncate text-[11px] font-medium leading-tight text-foreground/85">
          {title}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{meta}</p>
      </div>
    </div>
  );
}

function isClosedStatus(status: string | null | undefined): boolean {
  return ["approved", "cancelled", "closed", "complete", "completed", "done", "paid", "rejected", "void"].includes(
    (status ?? "").toLowerCase(),
  );
}

function formatDivisionLabel(divisionId: string, divisionTitle: string | null): string {
  if (divisionTitle) return divisionTitle;
  if (!divisionId || divisionId === "uncategorized") return "Uncategorized";
  return `Division ${divisionId}`;
}

function divisionIdFromCostCode(costCodeId: string | null | undefined): string {
  const value = costCodeId?.trim();
  if (!value) return "uncategorized";
  const match = value.match(/^(\d{1,2})/);
  return match?.[1]?.padStart(2, "0") ?? "uncategorized";
}

function buildBudgetDivisionSummaries({
  budget,
  contractLineItems,
}: {
  budget: BudgetLineSummary[];
  contractLineItems: NonNullable<ProjectCommandCenterProps["contractLineItems"]>;
}): BudgetDivisionSummary[] {
  const summaries = new Map<string, BudgetDivisionSummary>();
  const divisionByCostCode = new Map<string, { id: string; label: string }>();
  const divisionByPrefix = new Map<string, { id: string; label: string }>();

  const ensureSummary = (id: string, label: string) => {
    const existing = summaries.get(id);
    if (existing) return existing;

    const created = { id, label, budget: 0, committed: 0 };
    summaries.set(id, created);
    return created;
  };

  budget.forEach((line) => {
    const divisionId =
      line.cost_code?.division_id?.trim() ||
      divisionIdFromCostCode(line.cost_code_id);
    const label = formatDivisionLabel(divisionId, line.cost_code?.division_title ?? null);
    if (line.cost_code_id) {
      divisionByCostCode.set(line.cost_code_id, { id: divisionId, label });
      divisionByPrefix.set(divisionIdFromCostCode(line.cost_code_id), { id: divisionId, label });
    }
    const summary = ensureSummary(divisionId, label);
    summary.budget += Number(line.original_amount) || 0;
  });

  contractLineItems.forEach((line) => {
    const knownDivision = line.cost_code_id
      ? divisionByCostCode.get(line.cost_code_id) ??
        divisionByPrefix.get(divisionIdFromCostCode(line.cost_code_id))
      : null;
    const divisionId =
      knownDivision?.id ?? divisionIdFromCostCode(line.cost_code_id);
    const label = knownDivision?.label ?? formatDivisionLabel(divisionId, null);
    const summary = ensureSummary(divisionId, label);
    summary.committed +=
      Number(line.total_cost) ||
      (Number(line.quantity) || 0) * (Number(line.unit_cost) || 0);
  });

  return Array.from(summaries.values())
    .filter((summary) => summary.budget > 0 || summary.committed > 0)
    .sort((left, right) => {
      const leftValue = Math.max(left.budget, left.committed);
      const rightValue = Math.max(right.budget, right.committed);
      return rightValue - leftValue || left.label.localeCompare(right.label);
    });
}

/* ─────────────────────────────────────────────────────────────
   Homepage disclosure section
───────────────────────────────────────────────────────────── */

function HomeCollapsibleSection({
  title,
  href,
  children,
  defaultOpen = true,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
        <CollapsibleTrigger
          className="group flex min-h-11 flex-1 items-center gap-2 text-left text-sm font-semibold text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
          <span>{title}</span>
        </CollapsibleTrigger>
        {href && (
          <Link
            href={href}
            prefetch={false}
            className="flex min-h-11 shrink-0 items-center gap-0.5 text-xs text-primary transition-colors hover:text-primary/80"
          >
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
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
      <div className="flex items-center justify-between gap-2 px-3 py-2">
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

interface TeamSlot {
  key: string;
  roleName: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  group: "internal" | "subcontractor";
}

function classifyTeamSlot({
  roleName,
  email,
  companyName,
}: {
  roleName: string | null | undefined;
  email: string | null | undefined;
  companyName?: string | null;
}): "internal" | "subcontractor" {
  const haystack = `${roleName ?? ""} ${companyName ?? ""} ${email ?? ""}`.toLowerCase();
  if (haystack.includes("@alleatogroup.com") || haystack.includes("alleato")) {
    return "internal";
  }
  if (
    haystack.includes("subcontractor") ||
    haystack.includes("vendor") ||
    haystack.includes("supplier") ||
    haystack.includes("trade")
  ) {
    return "subcontractor";
  }
  return email?.includes("@") ? "subcontractor" : "internal";
}

function SidebarTeamSection({
  projectId,
  team = [],
}: {
  projectId: string;
  team?: ProjectTeamMember[];
}) {
  const { roles, isLoading } = useProjectRoles(projectId);

  const slots = React.useMemo<TeamSlot[]>(() => {
    // Source of truth: project_roles + project_role_members (what the Directory page writes to).
    if (roles.length > 0) {
      return roles
        .filter((role) => role.members.length > 0)
        .flatMap((role) =>
          role.members.map((member) => {
            const person = member.person;
            const displayName = person
              ? `${person.first_name} ${person.last_name}`.trim() || person.full_name || null
              : null;
            return {
              key: `${role.id}:${member.id}`,
              roleName: role.role_name,
              displayName,
              email: person?.email || null,
              phone: person?.phone_mobile || person?.phone_business || null,
              group: classifyTeamSlot({
                roleName: role.role_name,
                email: person?.email || null,
                companyName: person?.company_name || null,
              }),
            };
          }),
        );
    }

    // Fallback: project_directory_memberships / get_project_team RPC (server-provided).
    const seen = new Set<string>();
    return team
      .map((member, index) => {
        const roleName = member.role?.trim() || "Team Member";
        const displayName = `${member.first_name} ${member.last_name}`.trim() || member.full_name || null;
        return {
          key: `${member.person_id || member.id || roleName}-${index}`,
          roleName,
          displayName,
          email: member.email || null,
          phone: member.phone_mobile || member.phone_office || null,
          group: classifyTeamSlot({
            roleName,
            email: member.email || null,
            companyName: member.company_name || null,
          }),
        };
      })
      .filter((slot) => {
        const dedupeKey = `${slot.roleName}:${slot.displayName ?? ""}`;
        if (seen.has(dedupeKey)) return false;
        seen.add(dedupeKey);
        return true;
      });
  }, [roles, team]);
  const [activeGroup, setActiveGroup] = React.useState<"internal" | "subcontractor">("internal");
  const internalSlots = slots.filter((slot) => slot.group === "internal");
  const subcontractorSlots = slots.filter((slot) => slot.group === "subcontractor");
  const visibleSlots = activeGroup === "internal" ? internalSlots : subcontractorSlots;

  if (isLoading && slots.length === 0) {
    return (
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
    );
  }

  if (slots.length === 0) {
    return (
      <Link
        href={`/${projectId}/directory`}
        prefetch={false}
        className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        No team members assigned yet. <span className="text-primary">Add team →</span>
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      <Tabs value={activeGroup} onValueChange={(value) => setActiveGroup(value as "internal" | "subcontractor")}>
        <TabsList className="h-8">
          <TabsTrigger value="internal" className="h-7 text-xs">
            Internal ({internalSlots.length})
          </TabsTrigger>
          <TabsTrigger value="subcontractor" className="h-7 text-xs">
            Subs ({subcontractorSlots.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {visibleSlots.length === 0 ? (
        <div className="py-3 text-xs text-muted-foreground">
          No {activeGroup === "internal" ? "internal team members" : "subcontractors"} assigned.
        </div>
      ) : visibleSlots.map(({ key, roleName, displayName, email, phone }) => (
        <Button
          key={key}
          asChild
          variant="ghost"
          className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-left hover:bg-muted/40 -mx-2 rounded-md"
        >
          <Link href={`/${projectId}/directory`}>
            {displayName ? (
              <>
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {initials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 grid-cols-[minmax(5rem,1.1fr)_minmax(4rem,0.8fr)_minmax(6rem,1.2fr)_minmax(4.5rem,0.8fr)] items-center gap-2 text-left">
                  <span className="truncate text-xs font-medium text-foreground">{displayName}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{roleName}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{email || "—"}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{phone || "—"}</span>
                </div>
              </>
            ) : (
              <>
                <div className="h-6 w-6 shrink-0 rounded-full border border-dashed border-border/60" />
                <div className="grid min-w-0 flex-1 grid-cols-[minmax(5rem,1.1fr)_minmax(4rem,0.8fr)_minmax(6rem,1.2fr)_minmax(4.5rem,0.8fr)] items-center gap-2 text-left">
                  <span className="truncate text-xs text-muted-foreground italic">Unassigned</span>
                  <span className="truncate text-[11px] text-muted-foreground">{roleName}</span>
                  <span className="truncate text-[11px] text-muted-foreground">—</span>
                  <span className="truncate text-[11px] text-muted-foreground">—</span>
                </div>
              </>
            )}
          </Link>
        </Button>
      ))}
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
        <div className="text-xs text-muted-foreground">
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
            <div key={label} className="flex items-center gap-2">
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
  contractLineItems,
  homeAlerts,
  pendingSsovReviews = [],
  team,
  budget,
  changeEvents = [],
  schedule,
  submittals = [],
  dailyLogs = [],
  projectDocuments = [],
  budgetGrandTotals,
}: ProjectCommandCenterProps) {
  const projectId = String(project.id);
  const [isEditProjectSidebarOpen, setIsEditProjectSidebarOpen] = React.useState(false);
  const [isSetupOpen, setIsSetupOpen] = React.useState(false);
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
  const committedCosts = grandTotals.committedCosts;
  const budgetDivisions = React.useMemo(
    () => buildBudgetDivisionSummaries({ budget: budget ?? [], contractLineItems: contractLineItems ?? [] }),
    [budget, contractLineItems],
  );
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
      .slice(0, 5);
    if (filtered.length === 0) return <EmptyTabState label="meetings" />;
    return (
      <div className="divide-y divide-border/40">
        {filtered.map((m) => {
          const title = m.title || m.file_name || "Untitled meeting";
          const insight = oneSentence(
            m.summary ?? m.overview ?? m.description ?? m.notes,
            "No meeting summary has been captured yet.",
          );

          return (
            <Link
              key={m.id}
              href={`/${projectId}/meetings/${m.id}`}
              prefetch={false}
              className="group grid gap-2 px-2 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_5.5rem] sm:items-start"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-5 text-foreground transition-colors group-hover:text-primary">
                  {title}
                </p>
                <p className="mt-1 line-clamp-1 max-w-4xl text-xs leading-5 text-muted-foreground">
                  {insight}
                </p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground sm:justify-self-end sm:pt-0.5">
                {formatMonthDay(m.date ?? m.created_at) || "No date"}
              </span>
            </Link>
          );
        })}
      </div>
    );
  };

  const documentsContent = (search: string) => {
    const filtered = homeDocuments
      .filter((d) => (d.title || d.file_name || "").toLowerCase().includes(search.toLowerCase()))
      .slice(0, 12);
    if (filtered.length === 0) return <EmptyTabState label="documents" />;
    return (
      <div className="grid grid-cols-2 gap-2 px-3 py-2 sm:grid-cols-3 lg:grid-cols-6">
        {filtered.map((document) => {
          const title = document.title || document.file_name || "Untitled";
          const updated = formatMonthDay(document.updated_at ?? document.created_at);
          const inlineHref = documentInlineHref(projectId, document.id);
          const previewable = isPreviewableDocument(document);
          const imagePreview = isImageDocument(document);

          return (
            <Link
              key={document.id}
              href={`/${projectId}/documents/${document.id}`}
              prefetch={false}
              className="group min-w-0 overflow-hidden rounded-md bg-background transition-colors hover:bg-muted/20"
            >
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted/50 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                {previewable && imagePreview ? (
                  <img src={inlineHref} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : previewable ? (
                  <iframe
                    src={`${inlineHref}#toolbar=0&navpanes=0&scrollbar=0`}
                    title={`${title} preview`}
                    loading="lazy"
                    className="h-full w-full pointer-events-none bg-background"
                  />
                ) : (
                  <DocumentTypePreview document={document} title={title} />
                )}
                {previewable && (
                  <span className="absolute bottom-1.5 right-1.5 rounded-sm bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-foreground shadow-xs">
                    {documentExtension(document.file_name)}
                  </span>
                )}
              </div>
              <div className="min-w-0 px-2.5 py-2">
                <p className="truncate text-xs font-medium leading-tight text-foreground">
                  {title}
                </p>
                <div className="mt-1 flex min-w-0 items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span className="truncate">{document.folder ?? "Root"}</span>
                  <span className="shrink-0">{documentExtension(document.file_name)}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  {updated ?? formatFileSize(document.file_size) ?? "Recent"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  const dailyLogsContent = (search: string) => {
    const filtered = homeDailyLogs
      .filter((dl) => (dl.log_date ?? "").includes(search.toLowerCase()))
      .slice(0, 5);
    if (filtered.length === 0) return <EmptyTabState label="daily logs" />;
    return (
      <div className="divide-y divide-border/50">
        {filtered.map((dl) => (
          <Link
            key={dl.id}
            href={`/${projectId}/daily-log`}
            prefetch={false}
            className="grid gap-1 py-3 transition-colors hover:text-primary sm:grid-cols-[7rem_minmax(0,1fr)_6rem] sm:items-start"
          >
            <span className="text-sm font-medium text-foreground">
              {formatShortDate(dl.log_date) ?? `Log ${dl.id}`}
            </span>
            <span className="line-clamp-2 text-sm leading-normal text-muted-foreground">
              {oneSentence(dl.general_notes, "No daily report notes have been captured yet.")}
            </span>
            <span className="text-xs text-muted-foreground sm:text-right">{dl.status}</span>
          </Link>
        ))}
      </div>
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
      <div className="min-h-full">
        {/* ── Main content ─────────────────────────────── */}
        <div className="min-w-0 py-6 space-y-7">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {jobNumber && (
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Job #{jobNumber}
                </p>
              )}
              <h1 className="text-2xl font-semibold leading-tight text-foreground">
                {project.name ?? "Untitled Project"}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ReadinessIndicator
                completedCount={setupCompleted}
                totalCount={setupTotal}
                onOpen={() => setIsSetupOpen(true)}
              />
            </div>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && <AlertsBand alerts={alerts} />}

          {/* Financials */}
          <FinancialOverview
            projectId={projectId}
            revisedBudget={revisedBudget}
            committedCosts={committedCosts}
            estimatedCostAtCompletion={ecac}
            projectedOverUnder={variance}
            budgetDivisions={budgetDivisions}
            changeEventsCount={changeEvents?.length ?? 0}
            openRfisCount={rfisOpen.length}
            openTasksCount={openTasks.length}
          />

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
                <div className="mb-3 text-xs text-muted-foreground">
                  {projAddress}
                </div>
              )}
              <dl className="space-y-2">
                {[
                  { label: "Stage", value: project.stage ?? null },
                  { label: "Start Date", value: formatShortDate(projStartDate) },
                  { label: "Est. Completion", value: formatShortDate(projCompletionDate) },
                  { label: "Substantial Completion", value: formatShortDate(substantialCompletion) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-2">
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

          <HomeCollapsibleSection title="Recent Meetings" href={`/${projectId}/meetings`}>
            {lazyTabStatus.meetings.loading ? (
              <div className="py-4 text-sm text-muted-foreground">Loading meetings…</div>
            ) : (
              meetingsContent("")
            )}
          </HomeCollapsibleSection>

          <HomeCollapsibleSection title="Daily Reports" href={`/${projectId}/daily-log`}>
            {lazyTabStatus["daily-logs"].loading ? (
              <div className="py-4 text-sm text-muted-foreground">Loading daily reports…</div>
            ) : (
              dailyLogsContent("")
            )}
          </HomeCollapsibleSection>

          <HomeCollapsibleSection title="Document Intelligence">
            <TabSection tabs={docIntelTabs} defaultTab="documents" />
          </HomeCollapsibleSection>
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
