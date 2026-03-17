"use client";

import * as React from "react";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";
import {
  Send,
  X,
  AlertTriangle,
  Phone,
  Mail,
  Plus,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ProjectChecklistSidebar } from "@/components/project/project-checklist-sidebar";
import { EditProjectSidebar } from "@/components/project/edit-project-sidebar";
import { useBudgetData } from "@/hooks/use-budget-data";
import { useProjectRoles } from "@/hooks/use-project-roles";
import { useProjectUsers } from "@/hooks/use-project-users";
import type { Database } from "@/types/database.types";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   Types (identical to project-home-client2.tsx)
───────────────────────────────────────────────────────────── */

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Meeting = Database["public"]["Tables"]["document_metadata"]["Row"];
type ChangeOrder = Database["public"]["Tables"]["change_orders"]["Row"];
type RFI = Database["public"]["Tables"]["rfis"]["Row"];
type DailyLog = Database["public"]["Tables"]["daily_logs"]["Row"];
type Contract = Database["public"]["Tables"]["prime_contracts"]["Row"];
type BudgetItem = Database["public"]["Tables"]["budget_lines"]["Row"];
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
  approved_change_orders?: number;
  revised_contract_amount?: number;
  billed_to_date?: number;
  balance_to_finish?: number;
}

interface TeamMember {
  name: string;
  role: string;
  company?: string;
  email?: string;
  phone?: string;
  category?: "team" | "contact" | "subcontractor";
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

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function fmtCompact(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return fmt(n);
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
}

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */


/** Decision queue item */
function QueueItem({
  severity,
  title,
  meta,
  href,
}: {
  severity: "critical" | "warning" | "info";
  title: string;
  meta: string;
  href: string;
}) {
  const dot = severity === "critical" ? "#ef4444" : severity === "warning" ? "#f59e0b" : "#94a3b8";
  return (
    <Link
      href={href}
      className="group flex items-start gap-3.5 py-3.5 border-b border-border/40 last:border-0 hover:bg-muted/40 -mx-4 px-4 rounded transition-colors"
    >
      <div className="flex-shrink-0 pt-[5px]">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{meta}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground flex-shrink-0 mt-0.5 transition-colors" />
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   Role-based team section (inline, no card)
───────────────────────────────────────────────────────────── */

function TeamRoles({ projectId }: { projectId: number }) {
  const { roles, isLoading, updateRoleMembers } = useProjectRoles(String(projectId));
  const { users: projectUsers } = useProjectUsers(String(projectId), { type: "user", status: "active", perPage: 100 });
  const [activeRoleId, setActiveRoleId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const available = React.useMemo(() => {
    const assigned = new Set(roles.flatMap((r) => r.members.map((m) => m.person_id)));
    let list = (projectUsers || [])
      .map((u) => ({ id: u.id, first_name: u.first_name || "", last_name: u.last_name || "", email: u.email, job_title: u.job_title, company_name: u.company?.name || null }))
      .filter((p) => !assigned.has(p.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
    }
    return list;
  }, [projectUsers, roles, search]);

  const handleAssign = async (roleId: string, personId: string) => {
    setBusy(true);
    try {
      await updateRoleMembers(roleId, [personId]);
      toast.success("Role assigned");
    } catch {
      toast.error("Failed to assign");
    } finally {
      setBusy(false);
      setActiveRoleId(null);
      setSearch("");
    }
  };

  const handleUnassign = async (roleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    try {
      await updateRoleMembers(roleId, []);
      toast.success("Unassigned");
    } catch {
      toast.error("Failed");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-muted rounded animate-pulse w-24" />
              <div className="h-2.5 bg-muted rounded animate-pulse w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {roles.map((role) => {
        const member = role.members[0]?.person;
        const isActive = activeRoleId === role.id;
        return (
          <Popover
            key={role.id}
            open={isActive}
            onOpenChange={(open) => {
              setActiveRoleId(open ? role.id : null);
              if (!open) setSearch("");
            }}
          >
            <PopoverTrigger asChild>
              <button
                disabled={busy}
                className="w-full group flex items-center gap-2.5 rounded-md py-1.5 px-2 -mx-2 hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                    {member ? initials(`${member.first_name} ${member.last_name}`) : "—"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm leading-tight truncate", member ? "text-foreground" : "text-muted-foreground/50 italic")}>
                    {member ? `${member.first_name} ${member.last_name}`.trim() : role.role_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member ? role.role_name : "Click to assign"}
                  </p>
                </div>
                {member && (
                  <button
                    onClick={(e) => handleUnassign(role.id, e)}
                    className="h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-500 transition-all flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end" sideOffset={4}>
              <Command shouldFilter={false}>
                <CommandInput placeholder={`Assign ${role.role_name}…`} value={search} onValueChange={setSearch} className="h-9" />
                <CommandList>
                  {available.length === 0 ? (
                    <CommandEmpty>
                      <p className="text-xs text-muted-foreground py-3 text-center">No people available</p>
                    </CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {available.slice(0, 20).map((p) => (
                        <CommandItem key={p.id} value={`${p.first_name} ${p.last_name}`} onSelect={() => handleAssign(role.id, p.id)} className="cursor-pointer">
                          <Avatar className="h-5 w-5 mr-2 flex-shrink-0">
                            <AvatarFallback className="text-[9px] bg-muted">{initials(`${p.first_name} ${p.last_name}`)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm truncate">{p.first_name} {p.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.job_title || p.email}</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   AI Panel (floating)
───────────────────────────────────────────────────────────── */

function AiPanel({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const [input, setInput] = React.useState("");
  return (
    <div className="w-[380px] bg-background border-l border-border flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-[11px] font-bold text-primary">A</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Project Assistant</p>
            <p className="text-xs text-muted-foreground">Powered by project data</p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <div className="flex gap-3">
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-primary">A</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            Ask me about budget, change orders, RFIs, schedule, or anything else on this project.
          </p>
        </div>
        <div className="space-y-2 pl-9">
          {[
            "What is the current financial risk?",
            "Which change orders need approval?",
            "Summarize open RFIs",
          ].map((p) => (
            <button
              key={p}
              onClick={() => setInput(p)}
              className="block w-full text-left text-xs text-muted-foreground hover:text-foreground border border-border rounded px-3 py-2 hover:bg-muted/50 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="border-t border-border px-4 py-4">
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 focus-within:ring-1 focus-within:ring-ring bg-background">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this project…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
          <button className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
          Full chat at{" "}
          <Link href={`/${projectId}/assistant`} className="underline hover:text-muted-foreground">
            project assistant
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */

export function ProjectHomeRedesign({
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
}: ProjectHomeClientProps) {
  const [aiOpen, setAiOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const { grandTotals } = useBudgetData(String(project.id));

  /* ── Financial numbers ── */
  const originalBudget = grandTotals.originalBudgetAmount || budget.reduce((s, b) => s + (b.original_amount || 0), 0);
  const revisedBudget = grandTotals.revisedBudget || originalBudget;
  const approvedCOs = grandTotals.approvedCOs || 0;
  const committedCosts = grandTotals.committedCosts || commitments.reduce((s, c) => s + (c.contract_amount || 0), 0);
  const pendingChanges = grandTotals.pendingChanges || 0;
  const projectedOverUnder = grandTotals.projectedOverUnder || 0;

  const committedPct = revisedBudget > 0 ? (committedCosts / revisedBudget) * 100 : 0;
  const hasBudget = revisedBudget > 0;

  /* ── Schedule ── */
  const scheduleStats = React.useMemo(() => {
    if (!schedule.length) return null;
    const done = schedule.filter((t: any) => ["completed", "complete", "done"].includes(t.status)).length;
    const overdue = schedule.filter((t: any) => {
      const d = t.end_date || t.due_date;
      return d && new Date(d) < new Date() && !["completed", "complete", "done"].includes(t.status);
    }).length;
    const pct = (done / schedule.length) * 100;
    const upcoming = schedule
      .filter((t: any) => {
        const d = t.end_date || t.due_date;
        return d && new Date(d) > new Date() && !["completed", "complete", "done"].includes(t.status);
      })
      .sort((a: any, b: any) => new Date(a.end_date || a.due_date).getTime() - new Date(b.end_date || b.due_date).getTime())[0];
    return { pct, done, total: schedule.length, overdue, upcoming };
  }, [schedule]);

  /* ── Derived counts ── */
  const openRfis = rfis.filter((r) => r.status?.toLowerCase() !== "closed");
  const openCEs = changeEvents.filter((e) => e.status === "open");
  const pendingCOs = changeOrders.filter((co) => ["pending", "draft", "open"].includes(co.status?.toLowerCase() || ""));
  const openTasks = tasks.filter((t) => !["done", "completed", "cancelled"].includes(t.status || ""));
  const overdueOpenTasks = openTasks.filter((t) => t.due_date && new Date(t.due_date) < new Date());
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);
  const dueSoonTasks = openTasks.filter((t) => {
    if (!t.due_date) return false;
    const due = new Date(t.due_date);
    return due >= new Date() && due <= weekAhead;
  });
  const unassignedOpenTasks = openTasks.filter((t) => !t.assignee_name);
  const priorityTasks = [...openTasks]
    .sort((a, b) => {
      const score = (task: Task) => {
        const priority = (task.priority || "").toLowerCase();
        if (priority === "critical" || priority === "urgent") return 0;
        if (priority === "high") return 1;
        if (task.due_date && new Date(task.due_date) < new Date()) return 2;
        return 3;
      };
      const scoreDiff = score(a) - score(b);
      if (scoreDiff !== 0) return scoreDiff;
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      return aDue - bDue;
    })
    .slice(0, 6);
  const lastLogDaysAgo = dailyLogs.length > 0
    ? differenceInDays(new Date(), new Date(String(dailyLogs[0].log_date || dailyLogs[0].created_at)))
    : null;

  /* ── Health / health badge ── */
  const criticalCount =
    (pendingCOs.length > 0 && pendingCOs.some((co) => differenceInDays(new Date(), new Date(String(co.created_at))) > 14) ? 1 : 0) +
    (scheduleStats && scheduleStats.overdue > 8 ? 1 : 0) +
    (hasBudget && committedPct > 95 ? 1 : 0);
  const warningCount =
    (pendingCOs.length > 0 ? 1 : 0) +
    (openRfis.length > 5 ? 1 : 0) +
    (hasBudget && committedPct > 80 ? 1 : 0) +
    (scheduleStats && scheduleStats.overdue > 2 ? 1 : 0);

  const health = criticalCount > 0 ? "critical" : warningCount > 1 ? "warning" : "healthy";
  const healthLabel = health === "critical" ? "At Risk" : health === "warning" ? "Needs Attention" : "On Track";
  const healthColor = health === "critical" ? "#ef4444" : health === "warning" ? "#f59e0b" : "#22c55e";

  /* ── Decision queue ── */
  const queue = React.useMemo(() => {
    const items: Array<{ id: string; severity: "critical" | "warning" | "info"; title: string; meta: string; href: string }> = [];

    if (pendingCOs.length > 0) {
      const val = pendingCOs.reduce((s, co) => s + (co.amount || 0), 0);
      const oldest = Math.max(...pendingCOs.map((co) => differenceInDays(new Date(), new Date(String(co.created_at)))));
      items.push({
        id: "cos",
        severity: oldest > 14 ? "critical" : "warning",
        title: `${pendingCOs.length} change order${pendingCOs.length > 1 ? "s" : ""} awaiting approval`,
        meta: `${fmtCompact(val)} total · oldest ${oldest}d`,
        href: `/${project.id}/change-orders`,
      });
    }

    const overdueRfis = openRfis.filter((r) => r.due_date && new Date(r.due_date) < new Date());
    if (openRfis.length > 0) {
      items.push({
        id: "rfis",
        severity: overdueRfis.length > 2 ? "warning" : "info",
        title: `${openRfis.length} open RFI${openRfis.length > 1 ? "s" : ""}`,
        meta: overdueRfis.length > 0 ? `${overdueRfis.length} past due date` : "All within deadline",
        href: `/${project.id}/rfis`,
      });
    }

    if (openCEs.length > 0) {
      items.push({
        id: "ces",
        severity: "info",
        title: `${openCEs.length} open change event${openCEs.length > 1 ? "s" : ""}`,
        meta: "Unpriced or pending scope resolution",
        href: `/${project.id}/change-events`,
      });
    }

    if (lastLogDaysAgo !== null && lastLogDaysAgo >= 2) {
      items.push({
        id: "log",
        severity: lastLogDaysAgo >= 5 ? "warning" : "info",
        title: "Daily log not filed",
        meta: `Last entry ${lastLogDaysAgo} day${lastLogDaysAgo > 1 ? "s" : ""} ago`,
        href: `/${project.id}/daily-log`,
      });
    }

    if (hasBudget && committedPct > 85) {
      items.push({
        id: "budget",
        severity: committedPct > 95 ? "critical" : "warning",
        title: `Budget ${committedPct.toFixed(0)}% committed`,
        meta: `${fmtCompact(revisedBudget - committedCosts)} remaining`,
        href: `/${project.id}/budget`,
      });
    }

    if (scheduleStats && scheduleStats.overdue > 2) {
      items.unshift({
        id: "schedule",
        severity: scheduleStats.overdue > 8 ? "critical" : "warning",
        title: `${scheduleStats.overdue} schedule tasks overdue`,
        meta: "Review and update completion dates",
        href: `/${project.id}/schedule`,
      });
    }

    return items
      .sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] - { critical: 0, warning: 1, info: 2 }[b.severity]))
      .slice(0, 7);
  }, [pendingCOs, openRfis, openCEs, lastLogDaysAgo, hasBudget, committedPct, revisedBudget, committedCosts, scheduleStats, project.id]);

  const scheduleBarColor = scheduleStats
    ? scheduleStats.overdue > 5 ? "#ef4444" : scheduleStats.overdue > 2 ? "#f59e0b" : "#22c55e"
    : "#94a3b8";

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full" style={{ maxWidth: 1600 }}>
        {/* ── Z1: PROJECT HEADER ─────────────────────────────────── */}
        <div className="px-8 sm:px-14 pt-9 pb-3">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              {/* Job # + health badge */}
              <div className="flex items-center gap-3 mb-2.5">
                {project["job number"] && (
                  <span className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
                    {project["job number"]}
                  </span>
                )}
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full"
                  style={{ color: healthColor, backgroundColor: `${healthColor}18` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ backgroundColor: healthColor }} />
                  {healthLabel}
                </span>
              </div>

              {/* Project name */}
              <h1 className="text-[2rem] font-semibold text-foreground tracking-tight leading-none">
                {project.name || "Untitled Project"}
              </h1>

            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0 pt-1">
              <ProjectChecklistSidebar
                projectId={String(project.id)}
                projectName={project.name || project["job number"] || "Project"}
                buttonVariant="ghost"
                buttonSize="sm"
                buttonLabel="Setup"
                className="h-8 px-3 text-muted-foreground"
              />
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                Edit Project
              </Button>
            </div>
          </div>
        </div>

        <div className="px-8 sm:px-14 pt-6 pb-10 border-b border-border/50">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-20 xl:gap-24">
          <div className="space-y-10">

          {/* ── FINANCIALS ── */}
            <section className="space-y-5 pt-1">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Financials</h2>
                <Link href={`/${project.id}/budget`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">View Budget →</Link>
              </div>
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-5">
                  {(() => {
                    const billedToDate = commitments.reduce((s, c) => s + (c.billed_to_date || 0), 0);
                    const paidToDate = billedToDate * 0.87; // estimate
                    const remaining = revisedBudget - committedCosts;
                    const varianceAmount = projectedOverUnder;
                    const variancePct = revisedBudget > 0 ? ((varianceAmount / revisedBudget) * 100).toFixed(1) : "0";
                    const items = [
                      { l: "Contract Value", v: fmt(revisedBudget), c: `Original ${fmt(originalBudget)}`, d: approvedCOs > 0 ? { v: `+${fmtCompact(approvedCOs)} COs`, p: true } : null },
                      { l: "Committed", v: fmt(committedCosts), c: `${committedPct.toFixed(0)}% of contract` },
                      { l: "Billed to Date", v: fmt(billedToDate), c: `${fmt(paidToDate)} collected` },
                      { l: "Remaining", v: fmt(remaining), c: `${revisedBudget > 0 ? ((remaining / revisedBudget) * 100).toFixed(0) : 0}% unallocated` },
                      { l: "Projected Variance", v: fmt(Math.abs(varianceAmount)), c: `${variancePct}% of contract`, d: { v: `${variancePct}%`, p: varianceAmount >= 0 } },
                    ];
                    return items.map((k) => (
                      <div key={k.l} className={cn("py-4 px-5", k.l !== "Projected Variance" && "border-r border-border/50")}>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-1.5">{k.l}</div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-semibold tracking-tight">{k.v}</span>
                          {k.d && (
                            <span className={cn(
                              "inline-flex px-1.5 py-px rounded text-[11px] font-medium",
                              k.d.p ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                            )}>
                              {k.d.p ? "↑" : "↓"} {k.d.v}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground/60 mt-0.5">{k.c}</div>
                      </div>
                    ));
                  })()}
                </div>
                {(() => {
                  const billedToDate = commitments.reduce((s, c) => s + (c.billed_to_date || 0), 0);
                  const paidToDate = billedToDate * 0.87;
                  const paidPct = revisedBudget > 0 ? (paidToDate / revisedBudget) * 100 : 0;
                  const unpaidPct = revisedBudget > 0 ? ((billedToDate - paidToDate) / revisedBudget) * 100 : 0;
                  const billedPct = revisedBudget > 0 ? (billedToDate / revisedBudget) * 100 : 0;
                  return (
                    <div className="px-5 py-3 border-t border-border/50 bg-muted/30">
                      <div className="flex justify-between mb-1.5 text-[11px] text-muted-foreground">
                        <span>Billing Progress</span>
                        <span>{billedPct.toFixed(0)}% billed</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
                        <div className="rounded-l-full bg-green-600" style={{ width: `${paidPct}%` }} />
                        <div className="bg-amber-500" style={{ width: `${unpaidPct}%` }} />
                      </div>
                      <div className="flex gap-4 mt-1.5 text-[10px] text-muted-foreground/60">
                        {[
                          { cls: "bg-green-600", label: "Paid", value: fmt(paidToDate) },
                          { cls: "bg-amber-500", label: "Unpaid", value: fmt(billedToDate - paidToDate) },
                          { cls: "bg-muted", label: "Unbilled", value: fmt(revisedBudget - billedToDate) },
                        ].map((item) => (
                          <span key={item.label} className="flex items-center gap-1">
                            <span className={cn("w-2 h-2 rounded-sm inline-block", item.cls)} />
                            {item.label} ({item.value})
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </section>

          {/* ── MEETINGS ── */}
            <section className="space-y-5 pt-1">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Meetings</h2>
                  <span className="text-xs text-muted-foreground/50">{meetings.length}</span>
                </div>
                <Link href={`/${project.id}/meetings`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</Link>
              </div>
              {meetings.length > 0 ? (
                <div>
                  <div className="grid grid-cols-[88px_minmax(0,1fr)_auto] px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <span>Date</span>
                    <span>Meeting</span>
                    <span className="text-right">Duration</span>
                  </div>
                  {meetings.slice(0, 5).map((m) => {
                    const meetingDate = m.date ? new Date(m.date) : m.created_at ? new Date(m.created_at) : null;
                    const monthStr = meetingDate ? format(meetingDate, "MMM") : "";
                    const dayStr = meetingDate ? format(meetingDate, "d") : "";
                    return (
                      <Link
                        key={m.id}
                        href={`/${project.id}/meetings/${m.id}`}
                        className="group grid grid-cols-[88px_minmax(0,1fr)_auto] gap-4 px-2 py-3 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <div className="text-left">
                          <div className="inline-flex min-w-12 flex-col items-center rounded-md border border-primary/25 bg-primary/10 px-2 py-1">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-primary">{monthStr}</div>
                            <div className="text-sm font-semibold tracking-tight leading-none text-primary">{dayStr}</div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">
                            {m.title || m.file_name || "Meeting"}
                          </h3>
                          {m.summary && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {m.summary}
                            </p>
                          )}
                          {m.participants_array && m.participants_array.length > 0 && (
                            <p className="text-xs text-muted-foreground/80 mt-1">
                              {m.participants_array.length} attendee{m.participants_array.length === 1 ? "" : "s"}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums text-right whitespace-nowrap pt-0.5">
                          {m.duration_minutes ? `${m.duration_minutes}m` : "—"}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="px-2 py-2">
                  <p className="text-sm text-muted-foreground">No meetings recorded yet.</p>
                </div>
              )}
            </section>

          {/* ── TASKS ── */}
            <section className="space-y-5 pt-1">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                  Tasks
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {openTasks.length} open
                </span>
              </div>
              <div className="max-w-2xl text-xs text-muted-foreground">
                <span className="tabular-nums">{overdueOpenTasks.length} overdue</span>
                <span className="mx-2 text-border">•</span>
                <span className="tabular-nums">{dueSoonTasks.length} due 7 days</span>
                <span className="mx-2 text-border">•</span>
                <span className="tabular-nums">{unassignedOpenTasks.length} unassigned</span>
              </div>
              {priorityTasks.length > 0 ? (
                <div className="max-w-2xl">
                  {priorityTasks.map((task) => {
                    const overdue = task.due_date && new Date(task.due_date) < new Date();
                    const priority = (task.priority || "").toLowerCase();
                    const showPriority = priority === "critical" || priority === "urgent" || priority === "high";
                    return (
                      <div key={task.id} className="flex items-start justify-between gap-4 py-2.5 border-b border-border/40 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground leading-snug line-clamp-1">{task.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="text-xs text-muted-foreground">
                              {task.assignee_name || "Unassigned"}
                            </span>
                            {showPriority && (
                              <>
                                <span className="text-border">•</span>
                                <span className={cn(
                                  priority === "critical" || priority === "urgent" ? "text-red-600" : "text-amber-600",
                                )}>
                                  {priority === "urgent" ? "urgent" : priority}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 pt-0.5">
                            {task.due_date && (
                              <span className={cn("text-xs tabular-nums", overdue ? "text-red-500" : "text-muted-foreground")}>
                                {format(new Date(task.due_date), "MMM d")}
                              </span>
                            )}
                        </div>
                      </div>
                    );
                  })}
                  {openTasks.length > priorityTasks.length && (
                    <p className="text-xs text-muted-foreground/50 pt-1">+{openTasks.length - priorityTasks.length} more</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">No open tasks right now.</p>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                Quick Links
              </h2>
              <div className="grid grid-cols-1 gap-2">
                <Link
                  href={`/${project.id}/prime-contracts`}
                  className="text-sm text-foreground hover:text-primary transition-colors"
                >
                  Prime Contracts
                </Link>
                <Link
                  href={`/${project.id}/commitments`}
                  className="text-sm text-foreground hover:text-primary transition-colors"
                >
                  Commitments
                </Link>
                <Link
                  href={`/${project.id}/change-orders`}
                  className="text-sm text-foreground hover:text-primary transition-colors"
                >
                  Change Orders
                </Link>
                <Link
                  href={`/${project.id}/change-events`}
                  className="text-sm text-foreground hover:text-primary transition-colors"
                >
                  Change Events
                </Link>
                <Link
                  href={`/${project.id}/direct-costs`}
                  className="text-sm text-foreground hover:text-primary transition-colors"
                >
                  Direct Costs
                </Link>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                Field Tools
              </h2>
              <div className="space-y-2">
                <Link
                  href={`/${project.id}/drawings`}
                  className="flex items-center justify-between text-sm text-foreground hover:text-primary transition-colors"
                >
                  <span>Drawings</span>
                  <span className="text-xs text-muted-foreground">Open</span>
                </Link>
                <Link
                  href={`/${project.id}/submittals`}
                  className="flex items-center justify-between text-sm text-foreground hover:text-primary transition-colors"
                >
                  <span>Submittals</span>
                  <span className="text-xs text-muted-foreground">Open</span>
                </Link>
                <Link
                  href={`/${project.id}/daily-log`}
                  className="flex items-center justify-between text-sm text-foreground hover:text-primary transition-colors"
                >
                  <span>Daily Log</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {dailyLogs.length > 0 ? `${dailyLogs.length} entries` : "No entries"}
                  </span>
                </Link>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                Project Directory
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Project Team</p>
                  <TeamRoles projectId={project.id} />
                </div>

                <div className="space-y-2 border-t border-border/40 pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Vendors</p>
                  <div className="flex items-center gap-2 text-xs">
                    <Link href={`/${project.id}/directory/companies`} className="text-foreground hover:text-primary transition-colors">
                      Companies
                    </Link>
                    <span className="text-border">•</span>
                    <Link href={`/${project.id}/directory/contacts`} className="text-foreground hover:text-primary transition-colors">
                      Contacts
                    </Link>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border/40 pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Project Members</p>
                  <div className="flex items-center gap-2 text-xs">
                    <Link href={`/${project.id}/directory/users`} className="text-foreground hover:text-primary transition-colors">
                      Users
                    </Link>
                    <span className="text-border">•</span>
                    <Link href={`/${project.id}/directory/groups`} className="text-foreground hover:text-primary transition-colors">
                      Groups
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                Needs Attention
                {queue.length > 0 && (
                  <span
                    className="ml-2 inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: healthColor + "20", color: healthColor }}
                  >
                    {queue.length}
                  </span>
                )}
              </h2>
              {queue.length > 0 ? (
                <div>
                  {queue.map((item) => (
                    <QueueItem
                      key={item.id}
                      severity={item.severity}
                      title={item.title}
                      meta={item.meta}
                      href={item.href}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-4">
                  <p className="text-sm font-medium text-foreground">All clear</p>
                  <p className="text-xs text-muted-foreground mt-1">No action items right now</p>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
      </div>

      {/* ── AI WIDGET ─────────────────────────────────────────── */}
      <button
        onClick={() => setAiOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-foreground text-background rounded-full pl-4 pr-5 py-3 shadow-sm hover:opacity-90 transition-opacity text-sm font-medium"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        Ask AI
      </button>

      {aiOpen && (
        <div className="fixed inset-y-0 right-0 z-50 flex">
          <div className="flex-1 cursor-default" onClick={() => setAiOpen(false)} />
          <AiPanel projectId={project.id} onClose={() => setAiOpen(false)} />
        </div>
      )}

      <EditProjectSidebar project={project} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
