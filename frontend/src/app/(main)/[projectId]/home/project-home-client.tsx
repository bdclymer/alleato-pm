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
  Users,
  Building2,
  ClipboardList,
  Activity,
  AlertTriangle,
  BarChart3,
  FilePenLine,
  ArrowUpRight,
  Clock,
  Briefcase,
  Target,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { PageShell } from "@/components/layout/page-shell";
import { SectionCard } from "@/components/ui/section-card";
import { MetricCard, MetricGrid } from "@/components/ui/metric-card";
import { InlineTeamMemberForm } from "@/components/project-home/inline-team-member-form";
import { DirectorySummary } from "@/components/project-home/directory-summary";
import { ProjectChecklistSidebar } from "@/components/project/project-checklist-sidebar";
import { InfoSection } from "./info-section";
import type { Database } from "@/types/database.types";
import { cn } from "@/lib/utils";

/* =============================================================================
   PROJECT HOME
   =============================================================================
   Main dashboard showing project overview, financial metrics, commitments,
   tasks, and team information.
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

  // Section open states
  const [isTeamOpen, setIsTeamOpen] = React.useState(true);
  const [isCommitmentsOpen, setIsCommitmentsOpen] = React.useState(true);
  const [isScheduleOpen, setIsScheduleOpen] = React.useState(true);
  const [showAddTeamMemberForm, setShowAddTeamMemberForm] =
    React.useState(false);

  /* ---------------------------------------------------------------------------
     Team Member Handlers
     ------------------------------------------------------------------------- */

  const parseTeamMembers = (): TeamMember[] => {
    if (!project.team_members || !Array.isArray(project.team_members)) {
      return [];
    }
    return project.team_members.map((member) => {
      const parsedMember =
        typeof member === "string"
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
        personId:
          parsedMember?.personId || parsedMember?.contactId || undefined,
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
     Calculate Metrics & Insights
     ------------------------------------------------------------------------- */

  const totalBudget = budget.reduce(
    (sum, item) => sum + (item.original_amount || 0),
    0,
  );
  const committed = commitments.reduce(
    (sum, c) => sum + (c.contract_amount || 0),
    0,
  );
  const remaining = Math.max(totalBudget - committed, 0);
  const commitmentPercentage =
    totalBudget > 0 ? (committed / totalBudget) * 100 : 0;

  // Activity insights
  const activeTasks = tasks.filter((t) => t.status !== "completed").length;
  const overdueTasks = tasks.filter(
    (t) =>
      t.status !== "completed" &&
      t.due_date &&
      new Date(t.due_date) < new Date(),
  ).length;
  const activeRFIs = rfis.filter((r) => r.status !== "closed").length;
  const pendingChangeOrders = changeOrders.filter(
    (co) => co.status === "pending",
  ).length;
  const approvedChangeOrders = changeOrders.filter(
    (co) => co.status === "approved",
  ).length;

  /* ---------------------------------------------------------------------------
     Render
     ------------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 sm:px-6 lg:px-12">
        {/* =====================================================================
            Page Header
            ===================================================================== */}
        <div className="py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Project Identity */}
            <div className="flex-1">
              {project["job number"] && (
                <p className="text-sm text-neutral-500 mb-2">
                  {project["job number"]}
                </p>
              )}
              <h1 className="text-3xl font-semibold text-neutral-800">
                {project.name || project["job number"] || "Untitled Project"}
              </h1>

              {/* Quick Navigation Links */}
              <div className="flex items-center gap-6 mt-12">
                <Link
                  href={`/${project.id}/budget`}
                  className="flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-orange-600 transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  Budget
                </Link>
                <Link
                  href={`/${project.id}/prime-contracts`}
                  className="flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-orange-600 transition-colors"
                >
                  <FilePenLine className="h-4 w-4" />
                  Prime Contracts
                </Link>
                <Link
                  href={`/${project.id}/commitments`}
                  className="flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-orange-600 transition-colors"
                >
                  <ClipboardList className="h-4 w-4" />
                  Commitments
                </Link>
                <Link
                  href={`/${project.id}/schedule`}
                  className="flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-orange-600 transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Schedule
                </Link>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <ProjectChecklistSidebar
                projectId={String(project.id)}
                projectName={project.name || project["job number"] || "Project"}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="lg" className="gap-2">
                    <Zap className="h-4 w-4" />
                    Quick Actions
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[calc(100vw-2rem)] sm:w-[720px] lg:w-[800px] p-0 rounded-lg shadow-xl border-neutral-200"
                >
                  <div className="p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
                      {toolCategories.map((category) => (
                        <div key={category.title}>
                          <h4 className="text-xs font-semibold tracking-wide uppercase text-neutral-400 mb-4">
                            {category.title}
                          </h4>
                          <div className="space-y-1">
                            {category.tools.map((tool) => (
                              <Link
                                key={tool.name}
                                href={`/${project.id}${tool.href}`}
                                className="flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-lg text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors group"
                              >
                                <tool.icon className="h-4 w-4 text-neutral-400 group-hover:text-brand transition-colors" />
                                <span className="font-medium">{tool.name}</span>
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
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 pb-12">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Financial Overview */}
            <div>
              <h3 className="text-lg font-semibold mb-6">Financial Overview</h3>

              <MetricGrid cols={3} gap="lg">
                <MetricCard
                  label="Total Budget"
                  value={totalBudget}
                  format="currency"
                  href={`/${project.id}/budget`}
                />
                <MetricCard
                  label="Committed"
                  value={committed}
                  format="currency"
                  change={
                    commitmentPercentage > 90
                      ? {
                          value: commitmentPercentage - 90,
                          type: "negative" as const,
                        }
                      : commitmentPercentage > 70
                      ? {
                          value: commitmentPercentage - 70,
                          type: "neutral" as const,
                        }
                      : {
                          value: commitmentPercentage,
                          type: "positive" as const,
                        }
                  }
                  href={`/${project.id}/commitments`}
                />
                <MetricCard
                  label="Remaining"
                  value={remaining}
                  format="currency"
                />
              </MetricGrid>
            </div>
            <InfoSection
              title="Commitments"
              icon={ClipboardList}
              items={commitments.slice(0, 6).map((commitment) => ({
                id: commitment.id,
                title:
                  commitment.title ||
                  `${
                    commitment.type === "subcontract"
                      ? "Subcontract"
                      : "Purchase Order"
                  } #${commitment.number}`,
                subtitle: commitment.contract_amount
                  ? formatCompactCurrency(commitment.contract_amount)
                  : commitment.number,
                href: `/${project.id}/commitments/${commitment.id}`,
              }))}
              viewAllHref={`/${project.id}/commitments`}
              emptyMessage="No commitments yet"
              maxItems={6}
            />

            <InfoSection
              title="Schedule & Tasks"
              icon={CheckSquare}
              items={tasks.slice(0, 5).map((task) => ({
                id: task.id,
                title: task.task_description || `Task #${task.id}`,
                subtitle: task.due_date
                  ? `Due ${format(new Date(task.due_date), "MMM d, yyyy")}`
                  : undefined,
                href: `/${project.id}/tasks/${task.id}`,
              }))}
              viewAllHref={`/${project.id}/schedule`}
              emptyMessage="No tasks scheduled"
              maxItems={5}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Activity Summary */}
            <div>
              <h3 className="text-sm font-medium text-brand mb-5">Activity</h3>
              <div className="space-y-4">
                <Link
                  href={`/${project.id}/rfis`}
                  className="flex items-center justify-between py-2 px-3 -mx-3 rounded-lg hover:bg-neutral-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-neutral-400 group-hover:text-brand transition-colors" />
                    <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900">
                      RFIs
                    </span>
                  </div>
                  {activeRFIs > 0 && (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                      {activeRFIs}
                    </span>
                  )}
                </Link>

                <Link
                  href={`/${project.id}/meetings`}
                  className="flex items-center justify-between py-2 px-3 -mx-3 rounded-lg hover:bg-neutral-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-neutral-400 group-hover:text-brand transition-colors" />
                    <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900">
                      Meetings
                    </span>
                  </div>
                  {meetings.length > 0 && (
                    <span className="text-xs text-neutral-500 font-medium">
                      {meetings.length}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Files Summary */}
            <SectionCard
              title="Files"
              open={true}
              viewAllHref={`/${project.id}/documents`}
            >
              <div className="space-y-0">
                <Link
                  href={`/${project.id}/specifications`}
                  className="flex items-center gap-3 py-2 border-b border-neutral-100/60 hover:bg-neutral-50 transition-colors group"
                >
                  <FileText className="h-4 w-4 text-neutral-400 group-hover:text-brand transition-colors" />
                  <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900">
                    Specifications
                  </span>
                </Link>

                <Link
                  href={`/${project.id}/drawings`}
                  className="flex items-center gap-3 py-2 border-b border-neutral-100/60 hover:bg-neutral-50 transition-colors group"
                >
                  <BarChart3 className="h-4 w-4 text-neutral-400 group-hover:text-brand transition-colors" />
                  <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900">
                    Drawings
                  </span>
                </Link>

                <Link
                  href={`/${project.id}/photos`}
                  className="flex items-center gap-3 py-2 hover:bg-neutral-50 transition-colors group"
                >
                  <Target className="h-4 w-4 text-neutral-400 group-hover:text-brand transition-colors" />
                  <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900">
                    Photos
                  </span>
                </Link>
              </div>
            </SectionCard>

            <SectionCard
              title="Project Team"
              open={isTeamOpen}
              onOpenChange={setIsTeamOpen}
              viewAllHref={`/${project.id}/directory/users`}
              onAdd={() => setShowAddTeamMemberForm(true)}
              addLabel="Add Member"
            >
              {showAddTeamMemberForm && (
                <div className="mb-4 pb-4 border-b border-neutral-100">
                  <InlineTeamMemberForm
                    projectId={String(project.id)}
                    existingMembers={parseTeamMembers()}
                    onSave={handleSaveTeamMembers}
                    onCancel={() => setShowAddTeamMemberForm(false)}
                  />
                </div>
              )}

              {project.team_members &&
              Array.isArray(project.team_members) &&
              project.team_members.length > 0 ? (
                <div className="space-y-0">
                  {project.team_members.slice(0, 6).map((member, index) => {
                    const parsedMember =
                      typeof member === "string"
                        ? (() => {
                            try {
                              return JSON.parse(member);
                            } catch {
                              return {
                                name: member,
                                role: "Role not specified",
                              };
                            }
                          })()
                        : member;

                    const memberName = parsedMember?.name || "Team Member";
                    const memberRole =
                      parsedMember?.role || "Role not specified";
                    const initials = String(memberName)
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase();

                    return (
                      <div
                        key={`team-${project.id}-${index}`}
                        className="flex items-center gap-3 py-2 border-b border-neutral-100/60 last:border-0"
                      >
                        <Avatar className="h-7 w-7 border border-neutral-200/80">
                          <AvatarFallback className="bg-neutral-100 text-neutral-600 text-xs font-medium">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {String(memberName)}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
                            {String(memberRole)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <SectionCard.Empty
                  message="No team members yet"
                  description="Add team members to get started"
                  actionLabel="Add Team Member"
                  onAction={() => setShowAddTeamMemberForm(true)}
                />
              )}
            </SectionCard>

            <DirectorySummary projectId={String(project.id)} />
          </div>
        </div>
      </div>
    </div>
  );
}
