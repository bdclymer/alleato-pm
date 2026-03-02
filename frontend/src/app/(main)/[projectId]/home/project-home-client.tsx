"use client";

import * as React from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronRight, Pencil, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProjectChecklistSidebar } from "@/components/project/project-checklist-sidebar";
import { MeetingsSection } from "./meetings-section";
import { EditProjectDialog } from "@/components/portfolio/edit-project-dialog";
import type { Project as PortfolioProject } from "@/types/portfolio";
import type { Database } from "@/types/database.types";

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
   Utility helpers
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
 * KPI cell — used inside the full-width metric row.
 * Hairline gap between cells is handled by the parent grid (gap-px bg-border).
 * Value is large (text-3xl) because numbers here are the primary content.
 * ref: premium-patterns.md → KPI / Metric Components
 */
function KpiCell({
  label,
  value,
  sub,
  href,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  highlight?: "warn" | "good";
}) {
  const inner = (
    <div className="bg-background p-5 lg:p-6 h-full flex flex-col justify-between">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-3">
        {label}
      </p>
      <div>
        <p
          className={`text-3xl font-semibold tabular-nums leading-none ${
            highlight === "warn"
              ? "text-amber-600"
              : highlight === "good"
              ? "text-green-600"
              : "text-neutral-900"
          }`}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-neutral-400 mt-2 leading-relaxed">{sub}</p>}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block group hover:bg-neutral-50 transition-colors">
        {inner}
      </Link>
    );
  }
  return inner;
}

/**
 * Section anchor label — very muted, tiny, tracking-widest.
 * Content is the hero; label is just wayfinding.
 * ref: premium-patterns.md → Typography Hierarchy
 */
function SectionHeader({
  label,
  count,
  href,
}: {
  label: string;
  count?: number;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] text-neutral-300 tabular-nums">{count}</span>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="text-[11px] text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          View all
        </Link>
      )}
    </div>
  );
}

/** Sidebar navigation link — name on left, optional count on right */
function NavLink({
  href,
  label,
  count,
}: {
  href: string;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between py-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
    >
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-neutral-400 tabular-nums">{count}</span>
      )}
    </Link>
  );
}

/** Sub-group label inside a sidebar box — barely visible anchor */
function NavGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-300 mb-1">
      {children}
    </p>
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

  const portfolioProject: PortfolioProject = {
    id: String(project.id),
    name: project.name || "",
    projectNumber: project["job number"] || "",
    jobNumber: project["job number"] || "",
    client: (project as any).client || "",
    address: (project as any).street_address || "",
    city: (project as any).city || "",
    state: (project as any).state || "",
    zip: (project as any).postal_code || "",
    phone: (project as any).phone || "",
    status: project.archived ? "Inactive" : "Active",
    stage: (project as any).stage || "",
    type: (project as any).project_type || "",
    phase: project.phase || "",
    category: (project as any).category || "",
    startDate: (project as any)["start date"] || null,
    estRevenue: (project as any)["est revenue"] || null,
    estProfit: (project as any)["est profit"] || null,
    notes: (project as any).description || "",
  };

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

  // Content lists
  const openRfis = rfis.filter((r) => r.status?.toLowerCase() !== "closed");
  const recentChangeOrders = changeOrders.slice(0, 4);
  const upcomingTasks = tasks.slice(0, 4);
  const scheduleCount = schedule.length || tasks.length;

  // "Attention needed" count — open items requiring action
  const attentionCount = openRfis.length + changeEvents.filter((e) => e.status === "open").length;

  const hasBudgetData = totalBudget > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 sm:px-6 lg:px-12 pt-4 pb-10">

        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1 text-sm text-neutral-500">
          <Link href="/" className="hover:text-neutral-700 transition-colors font-medium">
            Projects
          </Link>
          <ChevronRight className="h-4 w-4 text-neutral-400" />
          <span className="text-neutral-700 truncate">
            {project.name || project["job number"] || "Project"}
          </span>
        </nav>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            {project["job number"] && (
              <p className="text-sm text-neutral-400 mb-0.5 tabular-nums">
                {project["job number"]}
              </p>
            )}
            <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
              {project.name || project["job number"] || "Untitled Project"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Project
            </Button>
            <ProjectChecklistSidebar
              projectId={String(project.id)}
              projectName={project.name || project["job number"] || "Project"}
              buttonVariant="default"
            />
          </div>
        </div>

        {/* ── KPI Row (Inverted Pyramid: most important data first, full width) ──
            ref: premium-patterns.md → Layout Patterns → Inverted Pyramid
            Technique: gap-px on bg-border container = hairline separators, no individual card borders.
            Numbers at text-3xl because they ARE the content on this row. */}
        {(hasBudgetData || openRfis.length > 0 || changeOrders.length > 0) && (
          <div className="grid grid-cols-2 lg:grid-cols-4 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-200 gap-px mb-12">
            <KpiCell
              label="Total Budget"
              value={hasBudgetData ? formatCompactCurrency(totalBudget) : "—"}
              sub={hasBudgetData ? "Original contract value" : "No budget set"}
              href={`/${project.id}/budget`}
            />
            <KpiCell
              label="Committed"
              value={committed > 0 ? formatCompactCurrency(committed) : "—"}
              sub={
                hasBudgetData && committed > 0
                  ? `${budgetUtilization.toFixed(0)}% of total budget`
                  : "No contracts yet"
              }
              href={`/${project.id}/commitments`}
              highlight={budgetUtilization > 90 ? "warn" : undefined}
            />
            <KpiCell
              label="Remaining"
              value={hasBudgetData ? formatCompactCurrency(remaining) : "—"}
              sub={
                hasBudgetData
                  ? `${(100 - budgetUtilization).toFixed(0)}% unallocated`
                  : undefined
              }
              highlight={remaining > 0 && budgetUtilization < 90 ? "good" : undefined}
            />
            <KpiCell
              label="Open Items"
              value={attentionCount > 0 ? attentionCount : "—"}
              sub={
                attentionCount > 0
                  ? `${openRfis.length} RFI${openRfis.length !== 1 ? "s" : ""} · ${changeEvents.filter((e) => e.status === "open").length} change events`
                  : "Nothing pending"
              }
              href={`/${project.id}/rfis`}
              highlight={attentionCount > 5 ? "warn" : undefined}
            />
          </div>
        )}

        {/* ── Two-column layout ──
            Left: content feed (rich items, open/spacious)
            Right: navigation sidebar (dense, structured)
            ref: premium-patterns.md → Density Spectrum */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_256px] gap-16 items-start">

          {/* ── Left column: content feed ──
              Space between sections (space-y-12 = 48px) does the grouping.
              No borders, no cards — whitespace is the separator.
              ref: premium-patterns.md → Whitespace as Dividers */}
          <div className="space-y-12">

            {/* Meetings — highest content density, gets the most visual weight */}
            <MeetingsSection meetings={meetings} projectId={project.id} maxItems={5} />

            {/* Open RFIs */}
            {openRfis.length > 0 && (
              <div>
                <SectionHeader
                  label="Open RFIs"
                  href={`/${project.id}/rfis`}
                  count={openRfis.length}
                />
                <div className="space-y-0.5">
                  {openRfis.slice(0, 5).map((rfi) => (
                    <Link
                      key={rfi.id}
                      href={`/${project.id}/rfis/${rfi.id}`}
                      className="group flex items-center justify-between gap-4 py-2.5 px-2 -mx-2 rounded hover:bg-neutral-50 transition-colors"
                    >
                      <p className="text-sm text-neutral-800 truncate group-hover:text-neutral-900">
                        {rfi.subject || `RFI #${rfi.number}`}
                      </p>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                          {rfi.status || "Open"}
                        </span>
                        <span className="text-xs text-neutral-400">#{rfi.number}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Change Orders — amount is the key data, right-aligned */}
            {recentChangeOrders.length > 0 && (
              <div>
                <SectionHeader
                  label="Change Orders"
                  href={`/${project.id}/change-orders`}
                  count={changeOrders.length}
                />
                <div className="space-y-0.5">
                  {recentChangeOrders.map((co) => (
                    <Link
                      key={co.id}
                      href={`/${project.id}/change-orders/${co.id}`}
                      className="group flex items-center justify-between gap-4 py-2.5 px-2 -mx-2 rounded hover:bg-neutral-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-neutral-800 truncate group-hover:text-neutral-900">
                          {co.title || `Change Order #${co.co_number || co.id}`}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {co.co_number || `CO-${co.id}`}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-sm font-medium text-neutral-700 tabular-nums">
                        {formatCompactCurrency(co.amount || 0)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Tasks — date is the key data */}
            {upcomingTasks.length > 0 && (
              <div>
                <SectionHeader
                  label="Upcoming Tasks"
                  href={`/${project.id}/schedule`}
                  count={upcomingTasks.length}
                />
                <div className="space-y-0.5">
                  {upcomingTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/${project.id}/schedule`}
                      className="group flex items-center justify-between gap-4 py-2.5 px-2 -mx-2 rounded hover:bg-neutral-50 transition-colors"
                    >
                      <p className="text-sm text-neutral-800 truncate group-hover:text-neutral-900">
                        {task.task_description || `Task #${task.id}`}
                      </p>
                      <span className="flex-shrink-0 text-xs text-neutral-400 tabular-nums">
                        {task.due_date ? format(new Date(task.due_date), "MMM d") : "—"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Project Team */}
            {teamMembers.length > 0 && (
              <div>
                <SectionHeader
                  label="Project Team"
                  href={`/${project.id}/directory/users`}
                  count={teamMembers.length}
                />
                <div className="space-y-0.5">
                  {teamMembers.slice(0, 6).map((member, i) => (
                    <div
                      key={`tm-${i}`}
                      className="flex items-center gap-3 py-2 px-2 -mx-2 rounded"
                    >
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarFallback className="bg-neutral-100 text-neutral-500 text-[10px]">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm text-neutral-800 truncate">
                        {member.name}
                        {member.role && (
                          <span className="text-neutral-400 ml-2">· {member.role}</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state — no activity yet */}
            {meetings.length === 0 &&
              openRfis.length === 0 &&
              recentChangeOrders.length === 0 &&
              upcomingTasks.length === 0 && (
                <div className="py-12 text-center">
                  <TrendingUp className="h-8 w-8 text-neutral-200 mx-auto mb-3" />
                  <p className="text-sm text-neutral-400">No activity yet.</p>
                  <p className="text-xs text-neutral-300 mt-1">
                    Add meetings, RFIs, and tasks to see them here.
                  </p>
                </div>
              )}
          </div>

          {/* ── Right sidebar: 2 boxes ──
              Dense navigation — links are the content here.
              ref: premium-patterns.md → Density Spectrum → Sidebar: dense, 13px, tight */}
          <div className="space-y-4">

            {/* Box 1: Financial — nav links only (numbers are in the KPI row above) */}
            <div className="rounded-lg border border-neutral-200 bg-background p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-3">
                Financial
              </p>
              <div className="space-y-0.5">
                <NavLink href={`/${project.id}/budget`} label="Budget" />
                <NavLink
                  href={`/${project.id}/prime-contracts`}
                  label="Prime Contracts"
                  count={contracts.length || undefined}
                />
                <NavLink
                  href={`/${project.id}/commitments`}
                  label="Commitments"
                  count={commitments.length || undefined}
                />
                <NavLink href={`/${project.id}/direct-costs`} label="Direct Costs" />
                <NavLink href={`/${project.id}/invoices`} label="Invoices" />
                <NavLink
                  href={`/${project.id}/change-orders`}
                  label="Change Orders"
                  count={changeOrders.length || undefined}
                />
                <NavLink
                  href={`/${project.id}/change-events`}
                  label="Change Events"
                  count={changeEvents.length || undefined}
                />
              </div>
            </div>

            {/* Box 2: Project — tools + files + directory with sub-labels */}
            <div className="rounded-lg border border-neutral-200 bg-background p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-3">
                Project
              </p>
              <div className="space-y-0.5">
                <NavLink
                  href={`/${project.id}/schedule`}
                  label="Schedule"
                  count={scheduleCount || undefined}
                />
                <NavLink
                  href={`/${project.id}/rfis`}
                  label="RFIs"
                  count={rfis.length || undefined}
                />
                <NavLink href={`/${project.id}/submittals`} label="Submittals" />
                <NavLink
                  href={`/${project.id}/daily-log`}
                  label="Daily Log"
                  count={dailyLogs.length || undefined}
                />
                <NavLink href={`/${project.id}/punch-list`} label="Punch List" />
                <NavLink
                  href={`/${project.id}/meetings`}
                  label="Meetings"
                  count={meetings.length || undefined}
                />
              </div>

              <div className="border-t border-neutral-100 mt-4 pt-4 space-y-0.5">
                <NavGroupLabel>Files</NavGroupLabel>
                <NavLink href={`/${project.id}/drawings`} label="Drawings" />
                <NavLink href={`/${project.id}/documents`} label="Documents" />
                <NavLink href={`/${project.id}/photos`} label="Photos" />
                <NavLink href={`/${project.id}/specifications`} label="Specifications" />
              </div>

              <div className="border-t border-neutral-100 mt-4 pt-4 space-y-0.5">
                <NavGroupLabel>Directory</NavGroupLabel>
                <NavLink href={`/${project.id}/directory/users`} label="Users" />
                <NavLink href={`/${project.id}/directory/companies`} label="Companies" />
                <NavLink href={`/${project.id}/directory/contacts`} label="Contacts" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditProjectDialog
        project={portfolioProject}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
