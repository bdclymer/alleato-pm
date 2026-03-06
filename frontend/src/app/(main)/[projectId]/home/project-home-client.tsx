"use client";

import * as React from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  FileText,
  Pencil,
  X,
  Zap,
  Activity,
  Send,
  Sparkles,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProjectChecklistSidebar } from "@/components/project/project-checklist-sidebar";
import { MeetingsSection } from "./meetings-section";
import { EditProjectDialog } from "@/components/portfolio/edit-project-dialog";
import type { Project as PortfolioProject } from "@/types/portfolio";
import type { Database } from "@/types/database.types";
import { cn } from "@/lib/utils";

/* =============================================================================
   Types
   ============================================================================= */

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["project_tasks"]["Row"];
type Meeting = Database["public"]["Tables"]["document_metadata"]["Row"];
type ChangeOrder = Database["public"]["Tables"]["change_orders"]["Row"];
type RFI = Database["public"]["Tables"]["rfis"]["Row"];
type DailyLog = Database["public"]["Tables"]["daily_logs"]["Row"];
type Contract = Database["public"]["Tables"]["prime_contracts"]["Row"];
type BudgetItem = Database["public"]["Tables"]["budget_lines"]["Row"];
type ChangeEvent = Database["public"]["Tables"]["change_events"]["Row"];

interface TeamMember {
  name: string;
  role: string;
}

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
  approved_change_orders?: number;
  revised_contract_amount?: number;
  billed_to_date?: number;
  balance_to_finish?: number;
}

interface ProjectHomeClientProps {
  project: Project;
  tasks: Task[];
  meetings: Meeting[];
  changeOrders: ChangeOrder[];
  rfis: RFI[];
  dailyLogs: DailyLog[];
  commitments: Commitment[];
  contracts: Contract[];
  budget?: BudgetItem[];
  changeEvents?: ChangeEvent[];
  schedule?: any[];
  sov?: any[];
}

/* =============================================================================
   Utilities
   ============================================================================= */

function formatCompactCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "TM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/* =============================================================================
   Sub-components
   ============================================================================= */

/**
 * Single metric in the financial flow strip.
 * Connected horizontally via shared dividers — tells the budget story as a flow.
 */
function FlowMetric({
  label,
  value,
  sub,
  href,
  signal,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  signal?: "good" | "warn" | "bad";
}) {
  const inner = (
    <div className="bg-card px-5 py-5 h-full flex flex-col justify-between min-h-[96px]">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-2">
        <p
          className={cn(
            "text-2xl font-semibold tracking-tight tabular-nums leading-none",
            signal === "warn"
              ? "text-amber-600"
              : signal === "bad"
              ? "text-red-600"
              : signal === "good"
              ? "text-green-600"
              : "text-foreground"
          )}
        >
          {value}
        </p>
        {sub && (
          <p className="text-[11px] text-muted-foreground/60 mt-1.5 leading-relaxed">{sub}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:bg-muted/30 transition-colors">
        {inner}
      </Link>
    );
  }
  return inner;
}

/**
 * A navigation row inside one of the three content columns.
 * Label on left, metric + arrow on right. Entire row is a link.
 */
function ToolRow({
  href,
  label,
  metric,
  sub,
  signal,
}: {
  href: string;
  label: string;
  metric?: string | number;
  sub?: string;
  signal?: "warn" | "good";
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors border-b border-border last:border-b-0"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {metric !== undefined && (
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              signal === "warn"
                ? "text-amber-600"
                : signal === "good"
                ? "text-green-600"
                : "text-foreground"
            )}
          >
            {metric}
          </span>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors" />
      </div>
    </Link>
  );
}

/** Eyebrow label inside a content column */
function ColumnLabel({ label }: { label: string }) {
  return (
    <div className="px-5 py-3.5 border-b border-border bg-muted/30">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

/** AI-derived signal chip — clickable, severity-colored */
function SignalChip({
  label,
  severity,
  href,
}: {
  label: string;
  severity: "critical" | "warning" | "info";
  href?: string;
}) {
  const classes = cn(
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-opacity hover:opacity-80 cursor-pointer",
    severity === "critical"
      ? "bg-red-50 text-red-700 border-red-200"
      : severity === "warning"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-blue-50 text-blue-700 border-blue-200"
  );

  const icon =
    severity === "critical" || severity === "warning" ? (
      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
    ) : (
      <Zap className="h-3 w-3 flex-shrink-0" />
    );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {icon}
        {label}
      </Link>
    );
  }
  return (
    <span className={classes}>
      {icon}
      {label}
    </span>
  );
}

/* =============================================================================
   Floating AI Assistant Widget
   ============================================================================= */

function AiWidget({ projectId }: { projectId: number }) {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-foreground text-background rounded-full pl-4 pr-5 py-3 shadow-sm hover:opacity-90 transition-opacity text-sm font-medium"
        aria-label="Open AI assistant"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        Ask AI
      </button>

      {/* Side panel */}
      {open && (
        <div className="fixed inset-y-0 right-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 cursor-default"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div className="w-[380px] bg-background border-l border-border flex flex-col shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-primary">A</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Project Assistant</p>
                  <p className="text-[11px] text-muted-foreground">Powered by project data</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Assistant intro */}
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary">A</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  I have access to this project&apos;s budget, commitments, change orders, RFIs,
                  meetings, and schedule. Ask me anything about the project&apos;s financial health,
                  upcoming deadlines, or risks.
                </p>
              </div>

              {/* Example prompts */}
              <div className="space-y-2 pl-9">
                {[
                  "Summarize the financial health of this project",
                  "Which change orders are most at risk?",
                  "What are the top priorities this week?",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="block w-full text-left text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Input area */}
            <div className="border-t border-border px-4 py-4">
              <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 bg-background focus-within:ring-1 focus-within:ring-ring">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about this project..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
                />
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  aria-label="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
                Full AI chat available at{" "}
                <Link
                  href={`/${projectId}/assistant`}
                  className="underline hover:text-muted-foreground"
                >
                  project assistant
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =============================================================================
   Main component
   ============================================================================= */

export function ProjectHomeClient({
  project,
  tasks,
  meetings,
  changeOrders,
  rfis,
  dailyLogs,
  commitments,
  contracts,
  budget = [],
  changeEvents = [],
  schedule = [],
  sov: _sov = [],
}: ProjectHomeClientProps) {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [signalsDismissed, setSignalsDismissed] = React.useState(false);

  // PortfolioProject mapping (unchanged — required for EditProjectDialog)
  const projectSummaryMetadata =
    typeof project.summary_metadata === "object" && project.summary_metadata !== null
      ? (project.summary_metadata as Record<string, unknown>)
      : null;

  const portfolioProject: PortfolioProject = {
    id: String(project.id),
    name: project.name || "",
    projectNumber: project["job number"] || "",
    jobNumber: project["job number"] || "",
    projectTemplate:
      projectSummaryMetadata && "project_template" in projectSummaryMetadata
        ? String(projectSummaryMetadata.project_template || "")
        : "",
    client: project.client || "",
    address: project.address || "",
    city:
      projectSummaryMetadata && "city" in projectSummaryMetadata
        ? String(projectSummaryMetadata.city || "")
        : "",
    state: project.state || "",
    zip:
      projectSummaryMetadata && "postal_code" in projectSummaryMetadata
        ? String(projectSummaryMetadata.postal_code || "")
        : "",
    phone:
      projectSummaryMetadata && "phone" in projectSummaryMetadata
        ? String(projectSummaryMetadata.phone || "")
        : "",
    status: project.archived ? "Inactive" : "Active",
    currentPhase: project.current_phase || "",
    stage: project.current_phase || "",
    workScope: project.work_scope || "",
    projectSector: project.project_sector || "",
    deliveryMethod: project.delivery_method || "",
    squareFootage:
      projectSummaryMetadata && "square_footage" in projectSummaryMetadata
        ? Number(projectSummaryMetadata.square_footage ?? 0) || null
        : null,
    totalValue: project["est revenue"] || null,
    projectCode:
      projectSummaryMetadata && "project_code" in projectSummaryMetadata
        ? String(projectSummaryMetadata.project_code || "")
        : "",
    type: project.type || "",
    projectType: project.type || "",
    phase: project.phase || "",
    category: project.category || "",
    country:
      projectSummaryMetadata && "country" in projectSummaryMetadata
        ? String(projectSummaryMetadata.country || "")
        : "United States",
    timezone:
      projectSummaryMetadata && "timezone" in projectSummaryMetadata
        ? String(projectSummaryMetadata.timezone || "")
        : "America/New_York",
    region:
      projectSummaryMetadata && "region" in projectSummaryMetadata
        ? String(projectSummaryMetadata.region || "")
        : "",
    office:
      projectSummaryMetadata && "office" in projectSummaryMetadata
        ? String(projectSummaryMetadata.office || "")
        : "",
    completionDate: project["est completion"] || null,
    erpSync:
      projectSummaryMetadata && "erp_sync" in projectSummaryMetadata
        ? Boolean(projectSummaryMetadata.erp_sync)
        : true,
    testProject:
      projectSummaryMetadata && "test_project" in projectSummaryMetadata
        ? Boolean(projectSummaryMetadata.test_project)
        : false,
    projectLogo:
      projectSummaryMetadata && "project_logo" in projectSummaryMetadata
        ? String(projectSummaryMetadata.project_logo || "")
        : "",
    projectPhoto:
      projectSummaryMetadata && "project_photo" in projectSummaryMetadata
        ? String(projectSummaryMetadata.project_photo || "")
        : "",
    active: !project.archived,
    description: project.summary || "",
    summaryMetadata: projectSummaryMetadata,
    startDate: project["start date"] || null,
    estRevenue: project["est revenue"] || null,
    estProfit: project["est profit"] || null,
    notes: project.summary || "",
  };

  // Team members
  const teamMembers = React.useMemo((): TeamMember[] => {
    if (!project.team_members || !Array.isArray(project.team_members)) return [];
    return project.team_members.map((member) => {
      const parsed =
        typeof member === "string"
          ? (() => {
              try {
                return JSON.parse(member);
              } catch {
                return { name: member, role: "" };
              }
            })()
          : member;
      return {
        name: String(parsed?.name || "Team Member"),
        role: String(parsed?.role || ""),
      };
    });
  }, [project.team_members]);

  // Financial calculations
  const totalBudget = budget.reduce((sum, item) => sum + (item.original_amount || 0), 0);
  const committed = commitments.reduce((sum, c) => sum + (c.contract_amount || 0), 0);
  const remaining = Math.max(totalBudget - committed, 0);
  const budgetUtilization = totalBudget > 0 ? (committed / totalBudget) * 100 : 0;
  const hasBudgetData = totalBudget > 0;

  // Derived content lists
  const openRfis = rfis.filter((r) => r.status?.toLowerCase() !== "closed");
  const openChangeEvents = changeEvents.filter((e) => e.status === "open");
  const pendingChangeOrders = changeOrders.filter(
    (co) =>
      co.status?.toLowerCase() === "pending" ||
      co.status?.toLowerCase() === "draft" ||
      co.status?.toLowerCase() === "open"
  );
  const scheduleCount = schedule.length || tasks.length;
  const lastDailyLog = dailyLogs.length > 0 ? dailyLogs[0] : null;

  // AI-derived project signals — generated from real data, not hardcoded
  const signals = React.useMemo(() => {
    const list: Array<{
      id: string;
      severity: "critical" | "warning" | "info";
      label: string;
      href?: string;
    }> = [];

    if (hasBudgetData && budgetUtilization > 90) {
      list.push({
        id: "budget-critical",
        severity: "critical",
        label: `Budget ${budgetUtilization.toFixed(0)}% committed`,
        href: `/${project.id}/budget`,
      });
    } else if (hasBudgetData && budgetUtilization > 75) {
      list.push({
        id: "budget-warn",
        severity: "warning",
        label: `Budget ${budgetUtilization.toFixed(0)}% committed`,
        href: `/${project.id}/budget`,
      });
    }

    if (openRfis.length > 8) {
      list.push({
        id: "rfis-high",
        severity: "warning",
        label: `${openRfis.length} open RFIs`,
        href: `/${project.id}/rfis`,
      });
    } else if (openRfis.length > 3) {
      list.push({
        id: "rfis-info",
        severity: "info",
        label: `${openRfis.length} open RFIs`,
        href: `/${project.id}/rfis`,
      });
    }

    if (pendingChangeOrders.length > 0) {
      const pendingValue = pendingChangeOrders.reduce(
        (sum, co) => sum + (co.amount || 0),
        0
      );
      list.push({
        id: "cos-pending",
        severity: pendingChangeOrders.length > 5 ? "warning" : "info",
        label: `${pendingChangeOrders.length} change orders · ${formatCompactCurrency(pendingValue)}`,
        href: `/${project.id}/change-orders`,
      });
    }

    if (openChangeEvents.length > 0) {
      list.push({
        id: "change-events",
        severity: "info",
        label: `${openChangeEvents.length} open change events`,
        href: `/${project.id}/change-events`,
      });
    }

    if (project["est completion"]) {
      try {
        const completion = new Date(project["est completion"]);
        const daysRemaining = Math.floor(
          (completion.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysRemaining > 0 && daysRemaining < 60) {
          list.push({
            id: "completion-near",
            severity: daysRemaining < 30 ? "critical" : "warning",
            label: `${daysRemaining} days to completion`,
          });
        }
      } catch {
        // ignore invalid date
      }
    }

    return list.slice(0, 5);
  }, [
    hasBudgetData,
    budgetUtilization,
    openRfis.length,
    pendingChangeOrders,
    openChangeEvents.length,
    project,
  ]);

  // Project meta string (type · sector · phase)
  const projectMeta = [
    project.type,
    project.project_sector,
    project.current_phase,
  ]
    .filter(Boolean)
    .join(" · ");

  // Date range string
  const startDate = project["start date"]
    ? format(new Date(project["start date"]), "MMM yyyy")
    : null;
  const endDate = project["est completion"]
    ? format(new Date(project["est completion"]), "MMM yyyy")
    : null;
  const dateRange = [startDate, endDate].filter(Boolean).join(" – ");

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 sm:px-6 lg:px-10 pt-4 pb-24">

        {/* ── Breadcrumb ── */}
        <nav className="mb-5 flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Projects
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-foreground truncate">
            {project.name || project["job number"] || "Project"}
          </span>
        </nav>

        {/* ── Project Header ──
            Job number as eyebrow, project name as headline, meta row, action buttons.
            Deliberate whitespace below before the financial strip. */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="space-y-1">
            {project["job number"] && (
              <p className="text-xs font-medium text-muted-foreground tabular-nums uppercase tracking-wide">
                {project["job number"]}
              </p>
            )}
            <h1 className="text-[22px] font-semibold text-foreground tracking-tight leading-snug">
              {project.name || project["job number"] || "Untitled Project"}
            </h1>
            {(projectMeta || dateRange) && (
              <p className="text-sm text-muted-foreground">
                {[projectMeta, dateRange].filter(Boolean).join("  ·  ")}
              </p>
            )}
            {project.address && (
              <p className="text-xs text-muted-foreground/60">
                {[project.address, project.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <ProjectChecklistSidebar
              projectId={String(project.id)}
              projectName={project.name || project["job number"] || "Project"}
              buttonVariant="default"
            />
          </div>
        </div>

        {/* ── Financial Flow Strip ──
            Four connected metrics tell the budget story as a continuous narrative.
            Shared border with gap-px dividers — hairline separators, no individual borders.
            Each cell links directly to its detail page. */}
        <div className="overflow-hidden rounded-lg border border-border bg-border grid grid-cols-2 lg:grid-cols-4 gap-px mb-5">
          <FlowMetric
            label="Total Budget"
            value={hasBudgetData ? formatCompactCurrency(totalBudget) : "—"}
            sub={hasBudgetData ? "Original contract value" : "No budget set"}
            href={`/${project.id}/budget`}
          />
          <FlowMetric
            label="Committed"
            value={committed > 0 ? formatCompactCurrency(committed) : "—"}
            sub={
              hasBudgetData && committed > 0
                ? `${budgetUtilization.toFixed(0)}% of total budget`
                : "No contracts yet"
            }
            href={`/${project.id}/commitments`}
            signal={budgetUtilization > 90 ? "bad" : budgetUtilization > 75 ? "warn" : undefined}
          />
          <FlowMetric
            label="Remaining"
            value={hasBudgetData ? formatCompactCurrency(remaining) : "—"}
            sub={
              hasBudgetData
                ? `${(100 - budgetUtilization).toFixed(0)}% unallocated`
                : undefined
            }
            href={`/${project.id}/budget`}
            signal={
              hasBudgetData
                ? budgetUtilization > 90
                  ? "bad"
                  : budgetUtilization < 75
                  ? "good"
                  : undefined
                : undefined
            }
          />
          <FlowMetric
            label="Open Items"
            value={openRfis.length + openChangeEvents.length > 0
              ? String(openRfis.length + openChangeEvents.length)
              : "0"}
            sub={
              openRfis.length > 0 || openChangeEvents.length > 0
                ? `${openRfis.length} RFI${openRfis.length !== 1 ? "s" : ""} · ${openChangeEvents.length} change event${openChangeEvents.length !== 1 ? "s" : ""}`
                : "Nothing pending"
            }
            href={`/${project.id}/rfis`}
            signal={openRfis.length + openChangeEvents.length > 8 ? "warn" : undefined}
          />
        </div>

        {/* ── Project Signals (AI-derived) ──
            Horizontal scrollable strip of chips, each derived from live data.
            Dismissible. Critical = red, warning = amber, info = blue.
            These replace a static activity feed with actionable signals. */}
        {signals.length > 0 && !signalsDismissed && (
          <div className="flex items-center gap-3 mb-8 bg-muted/30 rounded-lg border border-border px-4 py-3">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Signals
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-none">
              {signals.map((signal) => (
                <SignalChip
                  key={signal.id}
                  label={signal.label}
                  severity={signal.severity}
                  href={signal.href}
                />
              ))}
            </div>
            <button
              onClick={() => setSignalsDismissed(true)}
              className="flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors ml-1"
              aria-label="Dismiss signals"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── Three-column content grid ──
            Financial / Operations / Documentation.
            Each column is a stack of tool rows — label, metric, arrow.
            Columns separated by vertical dividers within a shared border container.
            This lets the owner navigate any tool in 2 clicks from the dashboard. */}
        <div className="border border-border rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border mb-10">

          {/* Financial column */}
          <div>
            <ColumnLabel label="Financial" />
            <ToolRow
              href={`/${project.id}/budget`}
              label="Budget"
              metric={hasBudgetData ? formatCompactCurrency(totalBudget) : "—"}
              sub="Original contract value"
            />
            <ToolRow
              href={`/${project.id}/prime-contracts`}
              label="Prime Contract"
              metric={contracts.length > 0 ? contracts.length : undefined}
              sub={contracts.length > 0 ? `${contracts.length} contract${contracts.length !== 1 ? "s" : ""}` : "None on file"}
            />
            <ToolRow
              href={`/${project.id}/commitments`}
              label="Commitments"
              metric={committed > 0 ? formatCompactCurrency(committed) : commitments.length > 0 ? commitments.length : undefined}
              sub={commitments.length > 0 ? `${commitments.length} subcontract${commitments.length !== 1 ? "s" : ""}` : "None yet"}
              signal={budgetUtilization > 90 ? "warn" : undefined}
            />
            <ToolRow
              href={`/${project.id}/change-orders`}
              label="Change Orders"
              metric={changeOrders.length > 0 ? changeOrders.length : undefined}
              sub={
                pendingChangeOrders.length > 0
                  ? `${pendingChangeOrders.length} pending approval`
                  : changeOrders.length > 0
                  ? "All resolved"
                  : "None yet"
              }
              signal={pendingChangeOrders.length > 3 ? "warn" : undefined}
            />
            <ToolRow
              href={`/${project.id}/change-events`}
              label="Change Events"
              metric={changeEvents.length > 0 ? changeEvents.length : undefined}
              sub={openChangeEvents.length > 0 ? `${openChangeEvents.length} open` : changeEvents.length > 0 ? "All closed" : "None yet"}
              signal={openChangeEvents.length > 3 ? "warn" : undefined}
            />
            <ToolRow
              href={`/${project.id}/direct-costs`}
              label="Direct Costs"
            />
            <ToolRow
              href={`/${project.id}/invoices`}
              label="Invoices"
            />
          </div>

          {/* Operations column */}
          <div>
            <ColumnLabel label="Operations" />
            <ToolRow
              href={`/${project.id}/schedule`}
              label="Schedule"
              metric={scheduleCount > 0 ? scheduleCount : undefined}
              sub={tasks.length > 0 ? `${tasks.length} task${tasks.length !== 1 ? "s" : ""}` : "No tasks yet"}
            />
            <ToolRow
              href={`/${project.id}/rfis`}
              label="RFIs"
              metric={rfis.length > 0 ? rfis.length : undefined}
              sub={openRfis.length > 0 ? `${openRfis.length} open` : rfis.length > 0 ? "All closed" : "None yet"}
              signal={openRfis.length > 5 ? "warn" : undefined}
            />
            <ToolRow
              href={`/${project.id}/submittals`}
              label="Submittals"
            />
            <ToolRow
              href={`/${project.id}/meetings`}
              label="Meetings"
              metric={meetings.length > 0 ? meetings.length : undefined}
              sub={meetings.length > 0 ? `${meetings.length} recorded` : "None yet"}
            />
            <ToolRow
              href={`/${project.id}/punch-list`}
              label="Punch List"
            />
            <ToolRow
              href={`/${project.id}/daily-log`}
              label="Daily Log"
              sub={
                lastDailyLog
                  ? `Last entry ${format(new Date(lastDailyLog.created_at || Date.now()), "MMM d")}`
                  : "No entries yet"
              }
            />
          </div>

          {/* Documentation column */}
          <div>
            <ColumnLabel label="Documentation" />
            <ToolRow
              href={`/${project.id}/drawings`}
              label="Drawings"
            />
            <ToolRow
              href={`/${project.id}/documents`}
              label="Documents"
            />
            <ToolRow
              href={`/${project.id}/specifications`}
              label="Specifications"
            />
            {/* Placeholder rows to visually balance the column */}
            <ToolRow
              href={`/${project.id}/sov`}
              label="Schedule of Values"
            />
          </div>
        </div>

        {/* ── Meetings ──
            Secondary content section — rich detail for the meeting-heavy construction workflow.
            Placed below the navigation grid: accessible but not competing with financial data. */}
        {meetings.length > 0 && (
          <div className="mb-10">
            <MeetingsSection meetings={meetings} projectId={project.id} maxItems={5} />
          </div>
        )}

        {/* ── Project Team ──
            Compact list at the bottom — contextual, not primary. */}
        {teamMembers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Project Team
              </span>
              <Link
                href={`/${project.id}/directory/users`}
                className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                View directory
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              {teamMembers.slice(0, 8).map((member, i) => (
                <div key={`tm-${i}`} className="flex items-center gap-2.5">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-foreground leading-none">{member.name}</p>
                    {member.role && (
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">{member.role}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {meetings.length === 0 &&
          openRfis.length === 0 &&
          changeOrders.length === 0 &&
          tasks.length === 0 &&
          teamMembers.length === 0 && (
            <div className="py-16 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No project activity yet.</p>
              <p className="text-xs text-muted-foreground/50 mt-1">
                Add budget, meetings, RFIs, and tasks to populate this dashboard.
              </p>
            </div>
          )}
      </div>

      {/* ── Floating AI Widget ──
          Persistent across all project pages. Pulsing green indicator = always available.
          Opens an inline side panel — no page navigation required. */}
      <AiWidget projectId={project.id} />

      <EditProjectDialog
        project={portfolioProject}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
