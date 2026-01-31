"use client";

import * as React from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Calendar,
  FileText,
  CheckSquare,
  TrendingUp,
  DollarSign,
  Upload,
  Users,
  Building2,
  ClipboardList,
  ExternalLink,
  Activity,
  AlertTriangle,
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { PageShell } from "@/components/layout/page-shell";
import { SectionCard } from "@/components/ui/section-card";
import { MetricCard, MetricGrid, MetricSummary } from "@/components/ui/metric-card";
import { InlineTeamMemberForm } from "@/components/project-home/inline-team-member-form";
import { DirectorySummary } from "@/components/project-home/directory-summary";
import { ProjectChecklistSidebar } from "@/components/project/project-checklist-sidebar";
import type { Database } from "@/types/database.types";
import { cn } from "@/lib/utils";

/* =============================================================================
   PROJECT HOME - REDESIGNED FOR CLARITY
   =============================================================================
   Redesigned based on design inspiration to prioritize key metrics and
   reduce visual clutter. Features a dashboard-style layout with enhanced
   financial overview and clean secondary actions.
   ============================================================================= */

/* -----------------------------------------------------------------------------
   Type Definitions
   ----------------------------------------------------------------------------- */

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["project_tasks"]["Row"];
type Meeting = Database["public"]["Tables"]["document_metadata"]["Row"];
type ChangeOrder = Database["public"]["Tables"]["change_orders"]["Row"];
type RFI = Database["public"]["Tables"]["rfis"]["Row"];
type DailyLog = Database["public"]["Tables"]["daily_logs"]["Row"];
type Contract = Database["public"]["Tables"]["financial_contracts"]["Row"];
type BudgetItem = Database["public"]["Tables"]["budget_lines"]["Row"];
type ChangeEvent = Database["public"]["Tables"]["change_events"]["Row"];
type SOV = Database["public"]["Tables"]["schedule_of_values"]["Row"];

interface TeamMember {
  name: string;
  role: string;
  personId?: string;
  contactId?: string;
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
  sov?: SOV[];
}

/* -----------------------------------------------------------------------------
   Project Tools Configuration
   ----------------------------------------------------------------------------- */

const toolCategories = [
  {
    title: "Core",
    tools: [
      { name: "Dashboard", href: "/dashboard", icon: Building2 },
      { name: "Directory", href: "/directory", icon: Users },
    ],
  },
  {
    title: "Project Management",
    tools: [
      { name: "Meetings", href: "/meetings", icon: Calendar },
      { name: "Tasks", href: "/tasks", icon: CheckSquare },
      { name: "Schedule", href: "/schedule", icon: Calendar },
      { name: "Daily Logs", href: "/daily-logs", icon: ClipboardList },
    ],
  },
  {
    title: "Financial",
    tools: [
      { name: "Commitments", href: "/commitments", icon: FileText },
      { name: "Invoices", href: "/invoices", icon: DollarSign },
      { name: "Budget", href: "/budget", icon: TrendingUp },
    ],
  },
];

/* -----------------------------------------------------------------------------
   Utility Functions
   ----------------------------------------------------------------------------- */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return formatCurrency(amount);
}

/* -----------------------------------------------------------------------------
   Project Home Client Component
   ----------------------------------------------------------------------------- */

export function ProjectHomeClient({
  project,
  tasks,
  meetings,
  changeOrders,
  rfis,
  dailyLogs: _dailyLogs,
  commitments,
  contracts,
  budget = [],
  changeEvents: _changeEvents = [],
  schedule: _schedule = [],
  sov: _sov = [],
}: ProjectHomeClientProps) {
  const router = useRouter();

  // Section open states - minimal for cleaner design
  const [isTeamOpen, setIsTeamOpen] = React.useState(true);
  const [isCommitmentsOpen, setIsCommitmentsOpen] = React.useState(true);
  const [isScheduleOpen, setIsScheduleOpen] = React.useState(true);
  const [showAddTeamMemberForm, setShowAddTeamMemberForm] = React.useState(false);

  /* ---------------------------------------------------------------------------
     Team Member Handlers
     ------------------------------------------------------------------------- */

  const parseTeamMembers = (): TeamMember[] => {
    if (!project.team_members || !Array.isArray(project.team_members)) {
      return [];
    }
    return project.team_members.map((member) => {
      const parsedMember = typeof member === "string"
        ? (() => {
            try {
              return JSON.parse(member);
            } catch {
              return { name: member, role: "Role not specified" };
            }
          })()
        : member;

      return {
        name: String(parsedMember?.name || "Team Member"),
        role: String(parsedMember?.role || "Role not specified"),
        personId: parsedMember?.personId || parsedMember?.contactId || undefined,
      };
    });
  };

  const handleSaveTeamMembers = async (members: TeamMember[]) => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_members: members }),
      });
      if (!response.ok) throw new Error("Failed to update team members");
      setShowAddTeamMemberForm(false);
      router.refresh();
    } catch (error) {
      throw error;
    }
  };

  /* ---------------------------------------------------------------------------
     Calculate Metrics
     ------------------------------------------------------------------------- */

  const totalBudget = budget.reduce((sum, item) => sum + (item.original_amount || 0), 0);
  const committed = commitments.reduce((sum, c) => sum + (c.contract_amount || 0), 0);
  const approvedChangeOrders = changeOrders.filter((co) => co.status === "approved").length;
  const remaining = Math.max(totalBudget - committed, 0);
  const commitmentPercentage = totalBudget > 0 ? (committed / totalBudget) * 100 : 0;

  // Active items counts
  const activeTasks = tasks.filter(t => t.status !== "completed").length;
  const activeRFIs = rfis.filter(r => r.status !== "closed").length;
  const pendingMeetings = meetings.length;
  const activeChangeOrders = changeOrders.filter(co => co.status === "pending" || co.status === "approved").length;

  /* ---------------------------------------------------------------------------
     Render
     ------------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="px-6 lg:px-8">
        {/* =====================================================================
            Page Header
            ===================================================================== */}
        <div className="py-6 sm:py-8">
          <PageShell.Header
            eyebrow={project.client || undefined}
            title={project.name || project["job number"] || "Untitled Project"}
            size="hero"
            actions={
              <div className="flex items-center gap-3">
                <ProjectChecklistSidebar
                  projectId={String(project.id)}
                  projectName={project.name || project["job number"] || "Project"}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      Tools
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-[calc(100vw-2rem)] sm:w-[720px] lg:w-[800px] p-0 rounded-sm shadow-lg border-neutral-200"
                  >
                    <div className="p-6 sm:p-8">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
                        {toolCategories.map((category) => (
                          <div key={category.title}>
                            <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-neutral-400 mb-3">
                              {category.title}
                            </h4>
                            <div className="space-y-0.5">
                              {category.tools.map((tool) => (
                                <Link
                                  key={tool.name}
                                  href={`/${project.id}${tool.href}`}
                                  className="flex items-center gap-2.5 px-2.5 py-2 -mx-2.5 rounded-sm text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                                >
                                  <tool.icon className="h-4 w-4 text-neutral-400" />
                                  {tool.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            }
          />
        </div>

        {/* =====================================================================
            Quick Navigation Links
            ===================================================================== */}
        <div className="mb-6">
          <div className="flex items-center gap-6 overflow-x-auto pb-2">
            <Link
              href={`/${project.id}/budget`}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 hover:text-orange-600 hover:bg-orange-50 rounded-sm transition-colors whitespace-nowrap"
            >
              <TrendingUp className="h-4 w-4" />
              Budget
            </Link>
            <Link
              href={`/${project.id}/commitments`}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 hover:text-orange-600 hover:bg-orange-50 rounded-sm transition-colors whitespace-nowrap"
            >
              <ClipboardList className="h-4 w-4" />
              Commitments
            </Link>
            <Link
              href={`/${project.id}/schedule`}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 hover:text-orange-600 hover:bg-orange-50 rounded-sm transition-colors whitespace-nowrap"
            >
              <Calendar className="h-4 w-4" />
              Schedule
            </Link>
          </div>
        </div>

        {/* =====================================================================
            Primary Content Grid
            ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8">

          {/* =================================================================
              LEFT COLUMN - Core Business Content (2/3 width)
              ================================================================= */}
          <div className="lg:col-span-2 space-y-6">

            {/* -------------------------------------------------------------------
                Financial Overview
                ----------------------------------------------------------------- */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Financial Overview</h2>
              <MetricGrid>
                <MetricCard
                  label="Total Budget"
                  value={totalBudget}
                  format="currency"
                />
                <MetricCard
                  label="Committed"
                  value={committed}
                  format="currency"
                  subtitle={`${Math.round(commitmentPercentage)}% of budget`}
                />
                <MetricCard
                  label="Remaining"
                  value={remaining}
                  format="currency"
                />
              </MetricGrid>
            </div>

            {/* -------------------------------------------------------------------
                Commitments
                ----------------------------------------------------------------- */}
            <SectionCard
              title="Commitments"
              addHref={`/${project.id}/commitments/new`}
              viewAllHref={`/${project.id}/commitments`}
              open={isCommitmentsOpen}
              onOpenChange={setIsCommitmentsOpen}
            >
              {commitments.length > 0 ? (
                <div className="space-y-0">
                  {commitments.slice(0, 5).map((commitment) => (
                    <SectionCard.Item
                      key={commitment.id}
                      title={commitment.title || `${commitment.type === "subcontract" ? "Subcontract" : "PO"} #${commitment.number}`}
                      subtitle={commitment.number}
                      badge={
                        <SectionCard.Badge variant={commitment.type === "subcontract" ? "default" : "brand"}>
                          {commitment.type === "subcontract" ? "SC" : "PO"}
                        </SectionCard.Badge>
                      }
                      meta={commitment.contract_amount ? formatCurrency(commitment.contract_amount) : undefined}
                      status={commitment.status}
                      href={`/${project.id}/commitments/${commitment.id}`}
                    />
                  ))}
                </div>
              ) : (
                <SectionCard.Empty
                  message="No commitments"
                  description="Create a subcontract or purchase order"
                  actionLabel="Add commitment"
                  actionHref={`/${project.id}/commitments/new`}
                />
              )}
            </SectionCard>

            {/* -------------------------------------------------------------------
                Schedule
                ----------------------------------------------------------------- */}
            <SectionCard
              title="Schedule"
              addHref={`/${project.id}/schedule/new`}
              viewAllHref={`/${project.id}/schedule`}
              open={isScheduleOpen}
              onOpenChange={setIsScheduleOpen}
            >
              {tasks.length > 0 ? (
                <div className="space-y-0">
                  {tasks.slice(0, 5).map((task) => (
                    <SectionCard.Item
                      key={task.id}
                      title={task.task_description || `Task #${task.id}`}
                      subtitle={task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : undefined}
                      meta={task.assigned_to ? String(task.assigned_to) : undefined}
                      status={task.status || undefined}
                      href={`/${project.id}/tasks/${task.id}`}
                    />
                  ))}
                </div>
              ) : (
                <SectionCard.Empty
                  message="No scheduled tasks"
                  description="Create a task to get started"
                  actionLabel="Add task"
                  actionHref={`/${project.id}/schedule/new`}
                />
              )}
            </SectionCard>
          </div>

          {/* =================================================================
              RIGHT COLUMN - Team & Quick Links (1/3 width)
              ================================================================= */}
          <div className="space-y-6">

            {/* -------------------------------------------------------------------
                Project Team
                ----------------------------------------------------------------- */}
            <SectionCard
              title="Project Team"
              onAdd={() => setShowAddTeamMemberForm(true)}
              viewAllHref={`/${project.id}/directory/users`}
              open={isTeamOpen}
              onOpenChange={setIsTeamOpen}
            >
              {project.team_members && Array.isArray(project.team_members) && project.team_members.length > 0 ? (
                <div className="space-y-0">
                  {project.team_members.map((member, index) => {
                    const parsedMember = typeof member === "string"
                      ? (() => {
                          try {
                            return JSON.parse(member);
                          } catch {
                            return { name: member, role: "Role not specified" };
                          }
                        })()
                      : member;

                    const memberName = parsedMember?.name || "Team Member";
                    const memberRole = parsedMember?.role || "Role not specified";
                    const initials = String(memberName).substring(0, 2).toUpperCase();

                    return (
                      <div
                        key={`team-${project.id}-${index}`}
                        className="flex items-center gap-3 py-3 border-b border-neutral-100/80 last:border-0"
                      >
                        <Avatar className="h-9 w-9 border border-neutral-200/80">
                          <AvatarFallback className="bg-orange-50 text-orange-600 text-xs font-medium">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-neutral-900 truncate">
                            {String(memberName)}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
                            {String(memberRole)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {showAddTeamMemberForm && (
                    <div className="mt-4 pt-4 border-t border-neutral-100">
                      <InlineTeamMemberForm
                        projectId={project.id}
                        existingMembers={parseTeamMembers()}
                        onSave={handleSaveTeamMembers}
                        onCancel={() => setShowAddTeamMemberForm(false)}
                      />
                    </div>
                  )}
                </div>
              ) : showAddTeamMemberForm ? (
                <InlineTeamMemberForm
                  projectId={project.id}
                  existingMembers={parseTeamMembers()}
                  onSave={handleSaveTeamMembers}
                  onCancel={() => setShowAddTeamMemberForm(false)}
                />
              ) : (
                <SectionCard.Empty
                  message="No team members assigned"
                  actionLabel="Add team member"
                  onAction={() => setShowAddTeamMemberForm(true)}
                />
              )}
            </SectionCard>

            {/* -------------------------------------------------------------------
                Directory Summary
                ----------------------------------------------------------------- */}
            <DirectorySummary projectId={String(project.id)} />

            {/* -------------------------------------------------------------------
                Quick Links - Clean, minimal design inspired by design inspiration
                ----------------------------------------------------------------- */}
            <div className="bg-white rounded-lg border border-neutral-200/80 shadow-sm p-4">
              <h3 className="text-[10px] sm:text-[11px] font-semibold tracking-[0.15em] uppercase text-brand mb-4">Quick Links</h3>
              <div className="space-y-1">
                <Link
                  href={`/${project.id}/meetings`}
                  className="flex items-center justify-between py-2 px-3 rounded text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                  <span>Meetings</span>
                  {meetings.length > 0 && (
                    <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                      {meetings.length}
                    </span>
                  )}
                </Link>

                <Link
                  href={`/${project.id}/tasks`}
                  className="flex items-center justify-between py-2 px-3 rounded text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                  <span>Tasks</span>
                  {activeTasks > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">
                      {activeTasks}
                    </span>
                  )}
                </Link>

                <Link
                  href={`/${project.id}/rfis`}
                  className="flex items-center justify-between py-2 px-3 rounded text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                  <span>RFIs</span>
                  {activeRFIs > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded">
                      {activeRFIs}
                    </span>
                  )}
                </Link>

                <Link
                  href={`/${project.id}/change-orders`}
                  className="flex items-center justify-between py-2 px-3 rounded text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                  <span>Change Orders</span>
                  {changeOrders.length > 0 && (
                    <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                      {changeOrders.length}
                    </span>
                  )}
                </Link>

                <Link
                  href={`/${project.id}/change-events`}
                  className="flex items-center justify-between py-2 px-3 rounded text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                  <span>Change Events</span>
                  {_changeEvents.length > 0 && (
                    <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                      {_changeEvents.length}
                    </span>
                  )}
                </Link>

                <div className="border-t border-neutral-100 my-2"></div>

                <Link
                  href={`/${project.id}/submittals`}
                  className="flex items-center justify-between py-2 px-3 rounded text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                  <span>Submittals</span>
                </Link>

                <Link
                  href={`/${project.id}/documents`}
                  className="flex items-center justify-between py-2 px-3 rounded text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                  <span>Documents</span>
                </Link>

                <Link
                  href={`/${project.id}/drawings`}
                  className="flex items-center justify-between py-2 px-3 rounded text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                  <span>Drawings</span>
                </Link>

                <Link
                  href={`/${project.id}/photos`}
                  className="flex items-center justify-between py-2 px-3 rounded text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                  <span>Photos</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}