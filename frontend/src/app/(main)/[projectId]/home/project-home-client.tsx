"use client";

import * as React from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronRight,
  Pencil,
  X,
  Zap,
  Send,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Settings,
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

/** KPI cell in the financial strip */
function KpiCell({
  label,
  value,
  change,
  sub,
  href,
  signal,
}: {
  label: string;
  value: string;
  change?: { text: string; direction: "up" | "down" | "neutral" };
  sub?: string;
  href?: string;
  signal?: "good" | "warn" | "bad";
}) {
  const inner = (
    <div className="bg-card px-6 py-5 h-full flex flex-col gap-2 min-h-[100px]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <p
        className={cn(
          "text-2xl font-bold tracking-tight tabular-nums leading-none",
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
      {change && (
        <span
          className={cn(
            "inline-flex items-center self-start text-[11px] font-semibold px-1.5 py-0.5 rounded",
            change.direction === "up"
              ? "text-green-700 bg-green-50"
              : change.direction === "down"
              ? "text-red-700 bg-red-50"
              : "text-muted-foreground bg-muted"
          )}
        >
          {change.direction === "up" ? "↑" : change.direction === "down" ? "↓" : ""}
          {" "}{change.text}
        </span>
      )}
      {sub && (
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">{sub}</p>
      )}
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


/** Signal chip */
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
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-opacity hover:opacity-80 cursor-pointer",
    severity === "critical"
      ? "bg-red-50 text-red-700"
      : severity === "warning"
      ? "bg-amber-50 text-amber-700"
      : "bg-blue-50 text-blue-700"
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

/** Activity dot + text */
function ActivityItem({
  text,
  href,
  color = "blue",
}: {
  text: React.ReactNode;
  href?: string;
  color?: "blue" | "green" | "amber" | "red";
}) {
  const dotColor = {
    blue: "bg-primary",
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  }[color];

  const inner = (
    <div className="flex items-start gap-3 py-2.5">
      <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0", dotColor)} />
      <p className="text-sm text-foreground leading-relaxed">{text}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:bg-muted/30 transition-colors -mx-1 px-1 rounded">
        {inner}
      </Link>
    );
  }
  return inner;
}

/* =============================================================================
   Floating AI Assistant Widget
   ============================================================================= */

function AiWidget({ projectId }: { projectId: number }) {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");

  return (
    <>
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

      {open && (
        <div className="fixed inset-y-0 right-0 z-50 flex">
          <div className="flex-1 cursor-default" onClick={() => setOpen(false)} />
          <div className="w-[380px] bg-background border-l border-border flex flex-col shadow-sm">
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
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary">A</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  I have access to this project&apos;s budget, commitments, change orders, RFIs,
                  meetings, and schedule. Ask me anything.
                </p>
              </div>
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
                Full AI chat at{" "}
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
   Main component — Inverted Pyramid Layout
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

  // PortfolioProject mapping (for EditProjectDialog)
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

  // Derived content
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

  // AI signals
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
      list.push({ id: "rfis-high", severity: "warning", label: `${openRfis.length} open RFIs`, href: `/${project.id}/rfis` });
    } else if (openRfis.length > 3) {
      list.push({ id: "rfis-info", severity: "info", label: `${openRfis.length} open RFIs`, href: `/${project.id}/rfis` });
    }

    if (pendingChangeOrders.length > 0) {
      const pendingValue = pendingChangeOrders.reduce((sum, co) => sum + (co.amount || 0), 0);
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
        // ignore
      }
    }

    return list.slice(0, 5);
  }, [hasBudgetData, budgetUtilization, openRfis.length, pendingChangeOrders, openChangeEvents.length, project]);

  // Meta strings
  const projectMeta = [project.type, project.project_sector, project.current_phase]
    .filter(Boolean)
    .join(" · ");

  // Activity items from real data
  const activityItems = React.useMemo(() => {
    const items: Array<{ text: React.ReactNode; href?: string; color: "blue" | "green" | "amber" | "red" }> = [];

    if (pendingChangeOrders.length > 0) {
      const latest = pendingChangeOrders[0];
      items.push({
        text: <><strong>{latest.title || `CO #${latest.co_number}`}</strong> pending approval{latest.amount ? ` · ${formatCompactCurrency(latest.amount)}` : ""}</>,
        href: `/${project.id}/change-orders`,
        color: "amber",
      });
    }

    if (openRfis.length > 0) {
      items.push({
        text: <><strong>{openRfis.length} RFI{openRfis.length !== 1 ? "s" : ""}</strong> awaiting response</>,
        href: `/${project.id}/rfis`,
        color: "blue",
      });
    }

    if (lastDailyLog) {
      items.push({
        text: <><strong>Daily log</strong> filed {format(new Date(lastDailyLog.created_at || Date.now()), "MMM d")}</>,
        href: `/${project.id}/daily-log`,
        color: "green",
      });
    }

    if (commitments.length > 0) {
      const executed = commitments.filter((c) => c.executed).length;
      items.push({
        text: <><strong>{executed}/{commitments.length}</strong> commitments executed</>,
        href: `/${project.id}/commitments`,
        color: executed === commitments.length ? "green" : "blue",
      });
    }

    if (openChangeEvents.length > 0) {
      items.push({
        text: <><strong>{openChangeEvents.length} change event{openChangeEvents.length !== 1 ? "s" : ""}</strong> open</>,
        href: `/${project.id}/change-events`,
        color: "amber",
      });
    }

    return items.slice(0, 5);
  }, [pendingChangeOrders, openRfis, lastDailyLog, commitments, openChangeEvents, project.id]);

  // Budget bar data for the mid-section chart
  const budgetBreakdown = React.useMemo(() => {
    if (!hasBudgetData) return [];
    const items = [
      { label: "Committed", value: committed, pct: (committed / totalBudget) * 100 },
      { label: "Remaining", value: remaining, pct: (remaining / totalBudget) * 100 },
    ];
    const pendingValue = pendingChangeOrders.reduce((sum, co) => sum + (co.amount || 0), 0);
    if (pendingValue > 0) {
      items.push({ label: "Pending COs", value: pendingValue, pct: (pendingValue / totalBudget) * 100 });
    }
    return items;
  }, [hasBudgetData, committed, remaining, totalBudget, pendingChangeOrders]);

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="px-4 sm:px-6 lg:px-10 pt-4 pb-24">

        {/* ═══════════════════════════════════════════
            INVERTED PYRAMID CONTAINER
            Single card, layered sections alternating white/surface-2
            ═══════════════════════════════════════════ */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">

          {/* ── LAYER 1: Header ──
              Single compact row: job number · name · meta | icon actions */}
          <div className="px-6 py-4 sm:px-8 border-b border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              {project["job number"] && (
                <span className="text-sm font-semibold text-muted-foreground tabular-nums flex-shrink-0">
                  {project["job number"]}
                </span>
              )}
              <h1 className="text-sm font-semibold text-foreground truncate">
                {project.name || "Untitled Project"}
              </h1>
              {projectMeta && (
                <span className="hidden sm:inline text-xs text-muted-foreground/60 flex-shrink-0">
                  ·  {projectMeta}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditDialogOpen(true)}
                title="Edit project"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <ProjectChecklistSidebar
                projectId={String(project.id)}
                projectName={project.name || project["job number"] || "Project"}
                buttonVariant="ghost"
                buttonSize="icon"
                iconOnly
                className="h-8 w-8 text-muted-foreground hover:text-foreground shadow-none"
              />
            </div>
          </div>

          {/* ── LAYER 2: KPI Strip ──
              4 metrics with gap-px dividers. White cells on border bg. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border-b border-border">
            <KpiCell
              label="Total Budget"
              value={hasBudgetData ? formatCompactCurrency(totalBudget) : "—"}
              sub={hasBudgetData ? "Original contract value" : "No budget set"}
              href={`/${project.id}/budget`}
            />
            <KpiCell
              label="Committed"
              value={committed > 0 ? formatCompactCurrency(committed) : "—"}
              change={
                hasBudgetData && committed > 0
                  ? { text: `${budgetUtilization.toFixed(0)}% of budget`, direction: budgetUtilization > 90 ? "down" : "up" }
                  : undefined
              }
              sub={committed === 0 ? "No contracts yet" : undefined}
              href={`/${project.id}/commitments`}
              signal={budgetUtilization > 90 ? "bad" : budgetUtilization > 75 ? "warn" : undefined}
            />
            <KpiCell
              label="Remaining"
              value={hasBudgetData ? formatCompactCurrency(remaining) : "—"}
              sub={hasBudgetData ? `${(100 - budgetUtilization).toFixed(0)}% unallocated` : undefined}
              href={`/${project.id}/budget`}
              signal={hasBudgetData ? (budgetUtilization > 90 ? "bad" : budgetUtilization < 75 ? "good" : undefined) : undefined}
            />
            <KpiCell
              label="Open Items"
              value={String(openRfis.length + openChangeEvents.length)}
              sub={`${openRfis.length} RFI${openRfis.length !== 1 ? "s" : ""} · ${openChangeEvents.length} event${openChangeEvents.length !== 1 ? "s" : ""}`}
              href={`/${project.id}/rfis`}
              signal={openRfis.length + openChangeEvents.length > 8 ? "warn" : undefined}
            />
          </div>

          {/* ── LAYER 3: Mid Section ──
              Two columns: Budget breakdown (white) + Activity/Signals (surface-2)
              This is the core "inverted pyramid" alternating depth. */}
          <div className="grid grid-cols-1 lg:grid-cols-5 border-b border-border">

            {/* Left: Budget breakdown chart */}
            <div className="lg:col-span-3 bg-card px-6 py-6 sm:px-8 border-b lg:border-b-0 lg:border-r border-border">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-5">
                Budget Allocation
              </p>
              {budgetBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {budgetBreakdown.map((item) => (
                    <div key={item.label} className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground w-24 flex-shrink-0 text-right">
                        {item.label}
                      </span>
                      <div className="flex-1 h-6 bg-muted/50 rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded-sm transition-all"
                          style={{ width: `${Math.min(item.pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-foreground w-20 text-right">
                        {formatCompactCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60">
                  No budget data yet. Add budget lines to see allocation.
                </p>
              )}
            </div>

            {/* Right: Signals + Activity (surface-2 tint) */}
            <div className="lg:col-span-2 bg-muted/30 px-6 py-6 sm:px-8">
              {/* Signals */}
              {signals.length > 0 && !signalsDismissed && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-muted-foreground/60" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Signals
                      </span>
                    </div>
                    <button
                      onClick={() => setSignalsDismissed(true)}
                      className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                      aria-label="Dismiss signals"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {signals.map((signal) => (
                      <SignalChip
                        key={signal.id}
                        label={signal.label}
                        severity={signal.severity}
                        href={signal.href}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">
                  Recent Activity
                </p>
                {activityItems.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {activityItems.map((item, i) => (
                      <ActivityItem key={i} text={item.text} href={item.href} color={item.color} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/60">No recent activity</p>
                )}
              </div>
            </div>
          </div>

          {/* ── LAYER 4: Data Tables ──
              Left 3/5: Budget by cost code. Right 2/5: Schedule snapshot.
              Real data, not navigation links. */}
          <div className="grid grid-cols-1 lg:grid-cols-5 border-b border-border">

            {/* Budget table (white) */}
            <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-border">
              <div className="flex items-center justify-between px-6 py-3 sm:px-8 border-b border-border">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Budget by Cost Code
                </p>
                <Link
                  href={`/${project.id}/budget`}
                  className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  View all →
                </Link>
              </div>
              {budget.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-6 sm:px-8 py-2.5">
                          Cost Code
                        </th>
                        <th className="text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-4 py-2.5 hidden sm:table-cell">
                          Original
                        </th>
                        <th className="text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-4 py-2.5">
                          Budget
                        </th>
                        <th className="text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-6 sm:px-8 py-2.5">
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {budget
                        .sort((a, b) => (b.original_amount || 0) - (a.original_amount || 0))
                        .slice(0, 8)
                        .map((line) => {
                          const pct = totalBudget > 0 ? ((line.original_amount || 0) / totalBudget) * 100 : 0;
                          return (
                            <tr key={line.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors">
                              <td className="px-6 sm:px-8 py-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs font-mono text-muted-foreground tabular-nums flex-shrink-0">
                                    {line.cost_code_id.length > 8 ? line.cost_code_id.slice(0, 8) : line.cost_code_id}
                                  </span>
                                  <span className="text-sm text-foreground truncate">
                                    {line.description || "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground hidden sm:table-cell">
                                {formatCompactCurrency(line.original_amount || 0)}
                              </td>
                              <td className="text-right px-4 py-2.5 tabular-nums font-medium text-foreground">
                                {formatCompactCurrency(line.original_amount || 0)}
                              </td>
                              <td className="text-right px-6 sm:px-8 py-2.5">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-12 h-1.5 bg-border rounded-full overflow-hidden hidden sm:block">
                                    <div
                                      className="h-full bg-primary/60 rounded-full"
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                                    {pct.toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {budget.length > 8 && (
                    <Link
                      href={`/${project.id}/budget`}
                      className="block text-center py-2.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors border-t border-border/50"
                    >
                      +{budget.length - 8} more cost codes
                    </Link>
                  )}
                </div>
              ) : (
                <div className="px-6 py-10 sm:px-8 text-center">
                  <p className="text-sm text-muted-foreground">No budget lines yet</p>
                  <Link
                    href={`/${project.id}/budget`}
                    className="text-xs text-primary hover:underline mt-1 inline-block"
                  >
                    Set up budget →
                  </Link>
                </div>
              )}
            </div>

            {/* Schedule snapshot (surface-2 tint) */}
            <div className="lg:col-span-2 bg-muted/30">
              <div className="flex items-center justify-between px-6 py-3 sm:px-8 border-b border-border">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Schedule
                </p>
                <Link
                  href={`/${project.id}/schedule`}
                  className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  View all →
                </Link>
              </div>
              {schedule.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {schedule
                    .filter((t: any) => t.status !== "completed" && !t.parent_task_id)
                    .sort((a: any, b: any) => {
                      const aDate = a.start_date || a.finish_date || "";
                      const bDate = b.start_date || b.finish_date || "";
                      return aDate.localeCompare(bDate);
                    })
                    .slice(0, 8)
                    .map((task: any) => {
                      const pct = task.percent_complete ?? 0;
                      const startDate = task.start_date ? new Date(task.start_date) : null;
                      const finishDate = task.finish_date ? new Date(task.finish_date) : null;
                      const isOverdue = finishDate && finishDate < new Date() && pct < 100;
                      return (
                        <div key={task.id} className="px-6 py-3 sm:px-8 hover:bg-muted/40 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className={cn(
                                "text-sm truncate",
                                isOverdue ? "text-red-600 font-medium" : "text-foreground"
                              )}>
                                {task.is_milestone && <span className="text-primary mr-1">◆</span>}
                                {task.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {startDate && (
                                  <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                                    {format(startDate, "MMM d")}
                                    {finishDate && ` – ${format(finishDate, "MMM d")}`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={cn(
                              "text-xs font-semibold tabular-nums flex-shrink-0 mt-0.5",
                              pct >= 100
                                ? "text-green-600"
                                : isOverdue
                                ? "text-red-600"
                                : pct > 0
                                ? "text-foreground"
                                : "text-muted-foreground/60"
                            )}>
                              {pct}%
                            </span>
                          </div>
                          {/* Mini progress bar */}
                          <div className="w-full h-1 bg-border/60 rounded-full mt-2 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                pct >= 100
                                  ? "bg-green-500"
                                  : isOverdue
                                  ? "bg-red-500"
                                  : "bg-primary/60"
                              )}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="px-6 py-10 sm:px-8 text-center">
                  <p className="text-sm text-muted-foreground">No schedule tasks yet</p>
                  <Link
                    href={`/${project.id}/schedule`}
                    className="text-xs text-primary hover:underline mt-1 inline-block"
                  >
                    Import schedule →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* ── LAYER 5: Bottom — Meetings + Team ──
              Table-like bottom section. Surface-2 tint for team area. */}
          {(meetings.length > 0 || teamMembers.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-5">
              {/* Meetings (white) */}
              <div className={cn(
                "px-6 py-6 sm:px-8",
                meetings.length > 0 ? "lg:col-span-3 border-b lg:border-b-0 lg:border-r border-border" : "lg:col-span-5"
              )}>
                {meetings.length > 0 ? (
                  <MeetingsSection meetings={meetings} projectId={project.id} maxItems={4} />
                ) : null}
              </div>

              {/* Team (surface-2 tint) */}
              {teamMembers.length > 0 && (
                <div className={cn(
                  "bg-muted/30 px-6 py-6 sm:px-8",
                  meetings.length > 0 ? "lg:col-span-2" : "lg:col-span-5"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Project Team
                    </span>
                    <Link
                      href={`/${project.id}/directory/users`}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                    >
                      View all <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {teamMembers.slice(0, 6).map((member, i) => (
                      <div key={`tm-${i}`} className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarFallback className="bg-card text-muted-foreground text-[10px] border border-border">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm text-foreground leading-none truncate">{member.name}</p>
                          {member.role && (
                            <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{member.role}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Empty state */}
        {meetings.length === 0 &&
          openRfis.length === 0 &&
          changeOrders.length === 0 &&
          tasks.length === 0 &&
          teamMembers.length === 0 &&
          !hasBudgetData && (
            <div className="py-16 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No project activity yet.</p>
              <p className="text-xs text-muted-foreground/50 mt-1">
                Add budget, meetings, RFIs, and tasks to populate this dashboard.
              </p>
            </div>
          )}
      </div>

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
