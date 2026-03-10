"use client";

import * as React from "react";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";
import {
  ArrowRight,
  Send,
  X,
  CheckCircle2,
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

/** Single vital sign — label / big value / sub / optional mini bar */
function Vital({
  label,
  value,
  sub,
  pct,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  pct?: number;
  tone: "green" | "amber" | "red" | "neutral";
}) {
  const bar = { green: "#22c55e", amber: "#f59e0b", red: "#ef4444", neutral: "#94a3b8" }[tone];
  return (
    <div className="flex flex-col gap-1 py-5 px-6 border-r border-border/50 last:border-r-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground tabular-nums leading-none">{value}</p>
      <p className="text-xs text-muted-foreground leading-snug">{sub}</p>
      {pct !== undefined && (
        <div className="h-0.5 rounded-full bg-muted/80 mt-1 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: bar }} />
        </div>
      )}
    </div>
  );
}

/** Financial ledger row */
function LedgerRow({
  label,
  value,
  sub,
  tone,
  divider,
  indent,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "red" | "green" | "neutral";
  divider?: boolean;
  indent?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", divider && "pt-3 mt-1 border-t border-border/50")}>
      <span className={cn("text-sm leading-snug", indent ? "text-muted-foreground pl-3" : "text-foreground")}>
        {label}
        {sub && <span className="text-xs text-muted-foreground ml-2">{sub}</span>}
      </span>
      <span
        className={cn(
          "text-sm tabular-nums font-medium flex-shrink-0",
          tone === "red" && "text-red-600",
          tone === "green" && "text-green-600",
          !tone && "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

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
  const { grandTotals } = useBudgetData(String(project.id));

  /* ── Financial numbers ── */
  const originalBudget = grandTotals.originalBudgetAmount || budget.reduce((s, b) => s + (b.original_amount || 0), 0);
  const revisedBudget = grandTotals.revisedBudget || originalBudget;
  const approvedCOs = grandTotals.approvedCOs || 0;
  const committedCosts = grandTotals.committedCosts || commitments.reduce((s, c) => s + (c.contract_amount || 0), 0);
  const directCosts = grandTotals.directCosts || 0;
  const pendingChanges = grandTotals.pendingChanges || 0;
  const projectedOverUnder = grandTotals.projectedOverUnder || 0;
  const estimatedAtCompletion = grandTotals.estimatedCostAtCompletion || committedCosts;

  const committedPct = revisedBudget > 0 ? (committedCosts / revisedBudget) * 100 : 0;
  const pendingPct = revisedBudget > 0 ? (pendingChanges / revisedBudget) * 100 : 0;
  const remainingPct = Math.max(0, 100 - committedPct - pendingPct);
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

  /* ── Meta ── */
  const meta = [project.type, project.project_sector, project.current_phase].filter(Boolean).join(" · ");
  const scheduleBarColor = scheduleStats
    ? scheduleStats.overdue > 5 ? "#ef4444" : scheduleStats.overdue > 2 ? "#f59e0b" : "#22c55e"
    : "#94a3b8";

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-background">

      {/* ── Z1: PROJECT HEADER ─────────────────────────────────── */}
      <div className="px-8 sm:px-14 pt-9 pb-6 border-b border-border/50">
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

            {/* Meta line */}
            {(meta || project.client) && (
              <p className="text-sm text-muted-foreground mt-2">
                {[meta, project.client].filter(Boolean).join(" · ")}
              </p>
            )}
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
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${project.id}/setup`}>Edit Project</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Z2: VITAL SIGNS STRIP ─────────────────────────────── */}
      <div className="px-8 sm:px-14 grid grid-cols-2 sm:grid-cols-4 border-b border-border/50">
        <Vital
          label="Budget Committed"
          value={hasBudget ? `${committedPct.toFixed(0)}%` : "—"}
          sub={hasBudget ? `${fmtCompact(committedCosts)} of ${fmtCompact(revisedBudget)}` : "No budget set"}
          pct={committedPct}
          tone={committedPct > 90 ? "red" : committedPct > 75 ? "amber" : hasBudget ? "green" : "neutral"}
        />
        <Vital
          label="Schedule Complete"
          value={scheduleStats ? `${scheduleStats.pct.toFixed(0)}%` : "—"}
          sub={scheduleStats
            ? scheduleStats.overdue > 0
              ? `${scheduleStats.overdue} tasks overdue`
              : `${scheduleStats.done}/${scheduleStats.total} tasks done`
            : "No schedule data"}
          pct={scheduleStats?.pct}
          tone={!scheduleStats ? "neutral" : scheduleStats.overdue > 5 ? "red" : scheduleStats.overdue > 2 ? "amber" : "green"}
        />
        <Vital
          label="Open Items"
          value={String(openRfis.length + openCEs.length + pendingCOs.length)}
          sub={`${openRfis.length} RFIs · ${openCEs.length} CEs · ${pendingCOs.length} COs`}
          tone={openRfis.length + pendingCOs.length > 10 ? "amber" : "neutral"}
        />
        <Vital
          label="Last Activity"
          value={lastLogDaysAgo === null ? "—" : lastLogDaysAgo === 0 ? "Today" : `${lastLogDaysAgo}d ago`}
          sub={dailyLogs.length > 0
            ? `Daily log · ${format(new Date(String(dailyLogs[0].log_date || dailyLogs[0].created_at)), "MMM d")}`
            : "No logs filed"}
          tone={lastLogDaysAgo !== null && lastLogDaysAgo > 5 ? "amber" : "neutral"}
        />
      </div>

      {/* ── Z3: FINANCIAL STORY + DECISION QUEUE ──────────────── */}
      <div className="px-8 sm:px-14 py-10 border-b border-border/50 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12">

        {/* Left: Financial narrative */}
        <div>
          <div className="flex items-baseline gap-4 mb-6">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Financial Picture
            </h2>
            {project["est revenue"] != null && (
              <span className="text-xs text-muted-foreground">
                Est. Revenue: {fmtCompact(project["est revenue"])}
              </span>
            )}
          </div>

          {hasBudget ? (
            <div className="space-y-6 max-w-xl">
              {/* Ledger */}
              <div className="space-y-2">
                <LedgerRow label="Original Budget" value={fmt(originalBudget)} />
                {approvedCOs !== 0 && (
                  <LedgerRow
                    label={approvedCOs > 0 ? "Approved Changes" : "Deductions"}
                    value={`${approvedCOs > 0 ? "+" : ""}${fmtCompact(approvedCOs)}`}
                    indent
                  />
                )}
                {approvedCOs !== 0 && (
                  <LedgerRow label="Revised Budget" value={fmt(revisedBudget)} divider />
                )}
                <LedgerRow label="Committed Costs" value={fmt(committedCosts)} />
                {directCosts > 0 && <LedgerRow label="Direct Costs" value={fmt(directCosts)} indent />}
                {pendingChanges > 0 && (
                  <LedgerRow label="Pending Approvals" value={`+${fmtCompact(pendingChanges)}`} indent />
                )}
                <LedgerRow
                  label="Est. Cost at Completion"
                  value={fmtCompact(estimatedAtCompletion)}
                  divider
                />
                <LedgerRow
                  label="Budget Variance"
                  value={projectedOverUnder === 0 ? "—" : (projectedOverUnder > 0 ? "+" : "") + fmtCompact(projectedOverUnder)}
                  tone={projectedOverUnder < 0 ? "red" : projectedOverUnder > 0 ? "green" : "neutral"}
                  divider
                />
              </div>

              {/* Visual stacked bar */}
              <div>
                <div className="flex h-2.5 rounded-full overflow-hidden gap-px bg-muted">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.min(committedPct, 100)}%`,
                      backgroundColor: committedPct > 90 ? "#ef4444" : committedPct > 75 ? "#f59e0b" : "#3b82f6",
                      borderRadius: pendingPct > 0 ? "9999px 0 0 9999px" : "9999px",
                    }}
                  />
                  {pendingPct > 0 && (
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.min(pendingPct, 100 - committedPct)}%`,
                        backgroundColor: "#fbbf2440",
                        borderLeft: "1px solid #f59e0b60",
                      }}
                    />
                  )}
                  {remainingPct > 0 && (
                    <div
                      className="h-full flex-1 rounded-r-full"
                      style={{ backgroundColor: "transparent" }}
                    />
                  )}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5">
                  {[
                    { color: committedPct > 90 ? "#ef4444" : committedPct > 75 ? "#f59e0b" : "#3b82f6", label: `Committed ${committedPct.toFixed(0)}%` },
                    ...(pendingPct > 0 ? [{ color: "#f59e0b60", label: `Pending ${pendingPct.toFixed(0)}%` }] : []),
                    { color: "#e5e7eb", label: `Remaining ${remainingPct.toFixed(0)}%` },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full border border-border/50" style={{ backgroundColor: color }} />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div className="flex items-center gap-5 pt-1">
                <Link href={`/${project.id}/budget`} className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1">
                  Full budget <ArrowRight className="h-3 w-3" />
                </Link>
                <Link href={`/${project.id}/commitments`} className="text-xs text-muted-foreground hover:text-foreground">
                  {commitments.length} commitment{commitments.length !== 1 ? "s" : ""}
                </Link>
                {contracts.length > 0 && (
                  <Link href={`/${project.id}/prime-contracts`} className="text-xs text-muted-foreground hover:text-foreground">
                    {contracts.length} contract{contracts.length !== 1 ? "s" : ""}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6">
              <p className="text-sm text-muted-foreground">No budget configured yet.</p>
              <Link href={`/${project.id}/budget`} className="text-xs text-primary mt-2 inline-flex items-center gap-1 hover:text-primary/80">
                Set up budget <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Right: Decision queue */}
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
            Needs Attention
            {queue.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-bold" style={{ backgroundColor: healthColor + "20", color: healthColor }}>
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
            <div className="py-10 text-center">
              <div className="h-9 w-9 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />
              </div>
              <p className="text-sm font-medium text-foreground">All clear</p>
              <p className="text-xs text-muted-foreground mt-1">No action items right now</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Z4: CONTEXT ROW ────────────────────────────────────── */}
      <div className="px-8 sm:px-14 py-10 border-b border-border/50 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/50">

        {/* Schedule */}
        <div className="md:pr-10 pb-8 md:pb-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Schedule</h2>
            <Link href={`/${project.id}/schedule`} className="text-xs text-muted-foreground hover:text-foreground">View →</Link>
          </div>

          {scheduleStats ? (
            <div className="space-y-4">
              {/* Big number */}
              <div className="flex items-end gap-1.5">
                <span className="text-[3.5rem] font-semibold text-foreground tabular-nums leading-none">
                  {scheduleStats.pct.toFixed(0)}
                </span>
                <div className="mb-1.5 space-y-0.5">
                  <span className="text-xl text-muted-foreground">%</span>
                  <p className="text-xs text-muted-foreground">complete</p>
                </div>
              </div>

              {/* Bar */}
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${scheduleStats.pct}%`, backgroundColor: scheduleBarColor }} />
              </div>

              {/* Stats */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{scheduleStats.done} of {scheduleStats.total} tasks complete</p>
                {scheduleStats.overdue > 0 && (
                  <p className="text-xs font-medium" style={{ color: scheduleBarColor }}>
                    {scheduleStats.overdue} overdue
                  </p>
                )}
              </div>

              {/* Next milestone */}
              {scheduleStats.upcoming && (
                <div className="pt-1 border-t border-border/40">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">Next milestone</p>
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {(scheduleStats.upcoming as any).title || (scheduleStats.upcoming as any).name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date((scheduleStats.upcoming as any).end_date || (scheduleStats.upcoming as any).due_date), "MMM d, yyyy")}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No schedule.{" "}
              <Link href={`/${project.id}/schedule`} className="text-primary hover:text-primary/80">Set up →</Link>
            </p>
          )}
        </div>

        {/* Meetings */}
        <div className="md:px-10 pt-8 md:pt-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Recent Meetings</h2>
            <Link href={`/${project.id}/meetings`} className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
          </div>

          {meetings.length > 0 ? (
            <div className="space-y-5">
              {meetings.slice(0, 4).map((m) => {
                const d = m.date ? new Date(m.date) : m.created_at ? new Date(m.created_at) : null;
                return (
                  <div key={m.id}>
                    {d && (
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-0.5">
                        {format(d, "MMM d")}
                      </p>
                    )}
                    <Link
                      href={`/${project.id}/meetings`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                    >
                      {m.title || m.file_name || "Meeting"}
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No meetings yet.</p>
          )}
        </div>

        {/* Team */}
        <div className="md:pl-10 pt-8 md:pt-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Project Team</h2>
            <Link href={`/${project.id}/directory/users`} className="text-xs text-muted-foreground hover:text-foreground">Directory →</Link>
          </div>
          <TeamRoles projectId={project.id} />
        </div>
      </div>

      {/* ── Z5: OPEN TASKS (if any) ────────────────────────────── */}
      {openTasks.length > 0 && (
        <div className="px-8 sm:px-14 py-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Open Tasks
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {tasks.filter((t) => ["done", "completed"].includes(t.status || "")).length}/{tasks.length} done
            </span>
          </div>
          <div className="max-w-2xl space-y-0.5">
            {openTasks.slice(0, 7).map((task) => {
              const overdue = task.due_date && new Date(task.due_date) < new Date();
              return (
                <div key={task.id} className="flex items-start gap-3 py-2 group">
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border-2 flex-shrink-0 mt-0.5",
                      task.priority === "urgent" || task.priority === "critical"
                        ? "border-red-400"
                        : task.priority === "high"
                        ? "border-amber-400"
                        : "border-border",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground leading-snug line-clamp-1">{task.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.assignee_name && (
                        <span className="text-xs text-muted-foreground">{task.assignee_name}</span>
                      )}
                      {task.due_date && (
                        <span className={cn("text-xs tabular-nums", overdue ? "text-red-500" : "text-muted-foreground")}>
                          {format(new Date(task.due_date), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {openTasks.length > 7 && (
              <p className="text-xs text-muted-foreground/50 pt-1">+{openTasks.length - 7} more</p>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
}
