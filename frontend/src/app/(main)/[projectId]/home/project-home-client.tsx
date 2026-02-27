"use client";

import * as React from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Calendar,
  FileText,
  CheckSquare,
  TrendingUp,
  DollarSign,
  ClipboardList,
  FilePenLine,
  Briefcase,
  Pencil,
} from "lucide-react";

import { MetricCard, MetricGrid } from "@/components/ui/metric-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectChecklistSidebar } from "@/components/project/project-checklist-sidebar";
import { InfoSection } from "./info-section";
import { MeetingsSection } from "./meetings-section";
import { EditProjectDialog } from "@/components/portfolio/edit-project-dialog";
import type { Project as PortfolioProject } from "@/types/portfolio";
import type { Database } from "@/types/database.types";

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
  dailyLogs,
  commitments,
  contracts,
  budget = [],
  changeEvents = [],
  schedule = [],
  sov: _sov = [],
}: ProjectHomeClientProps) {
  const router = useRouter();

  // Edit project dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  // Map database project to portfolio Project type for EditProjectDialog
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
  }, [project.team_members]);

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
  const primeContracts = contracts.filter(
    (contract) => contract.contract_type === "prime",
  );

  /* ---------------------------------------------------------------------------
     Render
     ------------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-4 px-4 sm:px-6 lg:px-12">
        {/* =====================================================================
            Page Header
            ===================================================================== */}
        <div className="py-4 sm:py-5">
          <nav className="mb-2 flex items-center gap-1 text-sm font-medium text-neutral-500">
            <Link href="/" className="hover:text-neutral-700 transition-colors">
              Projects
            </Link>
            <ChevronRight className="h-4 w-4 text-neutral-400" />
            <Link
              href={`/${project.id}/home`}
              className="truncate hover:text-neutral-700 transition-colors"
            >
              {project.name || project["job number"] || "Project"}
            </Link>
            <ChevronRight className="h-4 w-4 text-neutral-400" />
            <span className="text-neutral-700">Home</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
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
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit Project
              </Button>
              <ProjectChecklistSidebar
                projectId={String(project.id)}
                projectName={project.name || project["job number"] || "Project"}
                buttonVariant="default"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="pb-8">
          <div className="space-y-4">
            {/* Financial Overview */}
            <div>

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
            <div className="my-8 space-y-3">
              <h3 className="text-l text-neutral-800">
                Financial Tools
              </h3>
              <Tabs defaultValue="prime-contracts" className="space-y-3">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
                  <TabsTrigger value="prime-contracts">Prime Contracts</TabsTrigger>
                  <TabsTrigger value="commitments">Commitments</TabsTrigger>
                  <TabsTrigger value="direct-costs">Direct Costs</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
                  <TabsTrigger value="change-events">Change Events</TabsTrigger>
                </TabsList>

                <TabsContent value="prime-contracts" className="mt-0">
                  {primeContracts.length > 0 ? (
                    <div className="space-y-0">
                      {primeContracts.slice(0, 5).map((contract) => (
                          <Link
                            key={contract.id}
                            href={`/${project.id}/prime-contracts/${contract.id}`}
                            className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100/60 last:border-0 hover:bg-neutral-50 transition-colors group px-2 -mx-2 rounded-md"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-neutral-900 truncate">
                                {contract.title || contract.contract_number}
                              </p>
                              <p className="text-xs text-neutral-500 truncate">
                                {contract.contract_number}
                              </p>
                            </div>
                            <span className="text-sm font-medium text-neutral-700">
                              {formatCompactCurrency(contract.contract_amount || 0)}
                            </span>
                          </Link>
                        ))}
                    </div>
                  ) : (
                    <div className="pt-4 pb-1 text-center">
                      <p className="text-sm text-neutral-500">
                        No prime contracts yet.
                      </p>
                    </div>
                  )}
                  {primeContracts.length > 0 ? (
                    <div className="mt-3">
                      <Link
                        href={`/${project.id}/prime-contracts`}
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        View all prime contracts
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-1 text-center">
                      <Link
                        href={`/${project.id}/prime-contracts/new`}
                        className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                      >
                        Create a prime contract
                      </Link>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="commitments" className="mt-0">
                  {commitments.length > 0 ? (
                    <div className="space-y-0">
                      {commitments.slice(0, 5).map((commitment) => (
                        <Link
                          key={commitment.id}
                          href={`/${project.id}/commitments/${commitment.id}`}
                          className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100/60 last:border-0 hover:bg-neutral-50 transition-colors group px-2 -mx-2 rounded-md"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-900 truncate">
                              {commitment.title ||
                                `${commitment.type === "subcontract" ? "Subcontract" : "PO"} #${commitment.number}`}
                            </p>
                            <p className="text-xs text-neutral-500 truncate">
                              {commitment.number}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-neutral-700">
                            {formatCompactCurrency(commitment.contract_amount || 0)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-4 pb-1 text-center">
                      <p className="text-sm text-neutral-500">
                        No commitments yet.
                      </p>
                    </div>
                  )}
                  {commitments.length > 0 ? (
                    <div className="mt-3">
                      <Link
                        href={`/${project.id}/commitments`}
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        View all commitments
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-1 text-center">
                      <Link
                        href={`/${project.id}/commitments/new`}
                        className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                      >
                        Create a commitment
                      </Link>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="direct-costs" className="mt-0">
                  <div className="py-8 text-center">
                    <p className="text-sm text-neutral-500">
                      Direct costs summary is available in the Direct Costs tool.
                    </p>
                  </div>
                  <div className="mt-3">
                    <Link
                      href={`/${project.id}/direct-costs`}
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      View direct costs
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="invoices" className="mt-0">
                  <div className="py-8 text-center">
                    <p className="text-sm text-neutral-500">
                      Invoice summary is available in the Invoices tool.
                    </p>
                  </div>
                  <div className="mt-3">
                    <Link
                      href={`/${project.id}/invoices`}
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      View invoices
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="change-orders" className="mt-0">
                  {changeOrders.length > 0 ? (
                    <div className="space-y-0">
                      {changeOrders.slice(0, 5).map((changeOrder) => (
                        <Link
                          key={changeOrder.id}
                          href={`/${project.id}/change-orders/${changeOrder.id}`}
                          className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100/60 last:border-0 hover:bg-neutral-50 transition-colors group px-2 -mx-2 rounded-md"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-900 truncate">
                              {changeOrder.title || `Change Order #${changeOrder.id}`}
                            </p>
                            <p className="text-xs text-neutral-500 truncate">
                              {changeOrder.co_number || `CO-${changeOrder.id}`}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-neutral-700">
                            {formatCompactCurrency(changeOrder.amount || 0)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-4 pb-1 text-center">
                      <p className="text-sm text-neutral-500">
                        No change orders yet.
                      </p>
                    </div>
                  )}
                  <div className="mt-1 text-center">
                    <Link
                      href={`/${project.id}/change-orders`}
                      className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                    >
                      {changeOrders.length > 0 ? "View all change orders" : "Create a change order"}
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="change-events" className="mt-0">
                  {changeEvents.length > 0 ? (
                    <div className="space-y-0">
                      {changeEvents.slice(0, 5).map((changeEvent) => (
                        <Link
                          key={changeEvent.id}
                          href={`/${project.id}/change-events/${changeEvent.id}`}
                          className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100/60 last:border-0 hover:bg-neutral-50 transition-colors group px-2 -mx-2 rounded-md"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-900 truncate">
                              {changeEvent.title || `Change Event #${changeEvent.id}`}
                            </p>
                            <p className="text-xs text-neutral-500 truncate">
                              {changeEvent.status || "Draft"}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-neutral-700">
                            {changeEvent.number}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-4 pb-1 text-center">
                      <p className="text-sm text-neutral-500">
                        No change events yet.
                      </p>
                    </div>
                  )}
                  <div className="mt-1 text-center">
                    <Link
                      href={`/${project.id}/change-events`}
                      className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                    >
                      {changeEvents.length > 0 ? "View all change events" : "Create a change event"}
                    </Link>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="my-8 space-y-3">
              <h3 className="text-xl font-semibold text-neutral-800">
                Project Directory
              </h3>
              <Tabs defaultValue="project-team" className="space-y-3">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="project-team">Project Team</TabsTrigger>
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="subcontractors">Subcontractors</TabsTrigger>
                </TabsList>

                <TabsContent value="project-team" className="mt-0">
                  {teamMembers.length > 0 ? (
                    <div className="space-y-0">
                      {teamMembers.slice(0, 6).map((member, index) => (
                        <div
                          key={`team-${project.id}-${index}`}
                          className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100/60 last:border-0"
                        >
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {member.name}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
                            {member.role}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-4 pb-1 text-center">
                      <p className="text-sm text-neutral-500">
                        No team members yet.
                      </p>
                    </div>
                  )}
                  <div className="mt-1 text-center">
                    <Link
                      href={`/${project.id}/directory/users`}
                      className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                    >
                      {teamMembers.length > 0 ? "View all project team" : "Add Team Member"}
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="users" className="mt-0">
                  <div className="pt-4 pb-1 text-center">
                    <p className="text-sm text-neutral-500">
                      Manage project users in Directory.
                    </p>
                  </div>
                  <div className="mt-1 text-center">
                    <Link
                      href={`/${project.id}/directory/users`}
                      className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                    >
                      View users
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="subcontractors" className="mt-0">
                  <div className="pt-4 pb-1 text-center">
                    <p className="text-sm text-neutral-500">
                      Manage subcontractors in Directory.
                    </p>
                  </div>
                  <div className="mt-1 text-center">
                    <Link
                      href={`/${project.id}/directory/companies`}
                      className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                    >
                      View subcontractors
                    </Link>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="my-8 space-y-3">
              <h3 className="text-xl font-semibold text-neutral-800">
                Project Management
              </h3>
              <Tabs defaultValue="schedule" className="space-y-3">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="rfis">RFI&apos;s</TabsTrigger>
                  <TabsTrigger value="submittals">Submittals</TabsTrigger>
                  <TabsTrigger value="daily-log">Daily Log</TabsTrigger>
                  <TabsTrigger value="punch-list">Punch List</TabsTrigger>
                </TabsList>

                <TabsContent value="schedule" className="mt-0">
                  {tasks.length > 0 ? (
                    <div className="space-y-0">
                      {tasks.slice(0, 5).map((task) => (
                        <Link
                          key={task.id}
                          href={`/${project.id}/schedule`}
                          className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100/60 last:border-0 hover:bg-neutral-50 transition-colors group px-2 -mx-2 rounded-md"
                        >
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {task.task_description || `Task #${task.id}`}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {task.due_date
                              ? format(new Date(task.due_date), "MMM d")
                              : "No due date"}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-4 pb-1 text-center">
                      <p className="text-sm text-neutral-500">
                        No schedule items yet.
                      </p>
                    </div>
                  )}
                  <div className="mt-1 text-center">
                    <Link
                      href={`/${project.id}/schedule`}
                      className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                    >
                      {tasks.length > 0 || schedule.length > 0 ? "View schedule" : "Create schedule"}
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="rfis" className="mt-0">
                  {rfis.length > 0 ? (
                    <div className="space-y-0">
                      {rfis.slice(0, 5).map((rfi) => (
                        <Link
                          key={rfi.id}
                          href={`/${project.id}/rfis/${rfi.id}`}
                          className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100/60 last:border-0 hover:bg-neutral-50 transition-colors group px-2 -mx-2 rounded-md"
                        >
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {rfi.subject || `RFI #${rfi.number}`}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {rfi.status}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-4 pb-1 text-center">
                      <p className="text-sm text-neutral-500">No RFI&apos;s yet.</p>
                    </div>
                  )}
                  <div className="mt-1 text-center">
                    <Link
                      href={`/${project.id}/rfis`}
                      className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                    >
                      {rfis.length > 0 ? "View all RFI's" : "Create an RFI"}
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="submittals" className="mt-0">
                  <div className="pt-4 pb-1 text-center">
                    <p className="text-sm text-neutral-500">
                      No submittals yet.
                    </p>
                  </div>
                  <div className="mt-1 text-center">
                    <Link
                      href={`/${project.id}/submittals`}
                      className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                    >
                      Create a submittal
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="daily-log" className="mt-0">
                  {dailyLogs.length > 0 ? (
                    <div className="space-y-0">
                      {dailyLogs.slice(0, 5).map((log) => (
                        <Link
                          key={log.id}
                          href={`/${project.id}/daily-log`}
                          className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100/60 last:border-0 hover:bg-neutral-50 transition-colors group px-2 -mx-2 rounded-md"
                        >
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            Daily Log
                          </p>
                          <p className="text-xs text-neutral-500">
                            {format(new Date(log.log_date), "MMM d, yyyy")}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-4 pb-1 text-center">
                      <p className="text-sm text-neutral-500">
                        No daily logs yet.
                      </p>
                    </div>
                  )}
                  <div className="mt-1 text-center">
                    <Link
                      href={`/${project.id}/daily-log`}
                      className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                    >
                      {dailyLogs.length > 0 ? "View daily log" : "Create a daily log"}
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="punch-list" className="mt-0">
                  <div className="pt-4 pb-1 text-center">
                    <p className="text-sm text-neutral-500">
                      No punch list items yet.
                    </p>
                  </div>
                  <div className="mt-1 text-center">
                    <Link
                      href={`/${project.id}/punch-list`}
                      className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                    >
                      Create a punch list item
                    </Link>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="my-8 space-y-3">
              <h3 className="text-xl font-semibold text-neutral-800">Files</h3>
              <Tabs defaultValue="drawings" className="space-y-3">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                  <TabsTrigger value="drawings">Drawings</TabsTrigger>
                  <TabsTrigger value="photos">Photos</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="specifications">Specifications</TabsTrigger>
                </TabsList>

                <TabsContent value="drawings" className="mt-0">
                  <div className="pt-4 pb-1 text-center">
                    <p className="text-sm text-neutral-500">
                      No drawings yet.
                    </p>
                  </div>
                  <div className="mt-1 text-center">
                    <Link
                      href={`/${project.id}/drawings`}
                      className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                    >
                      View drawings
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="photos" className="mt-0">
                  <div className="pt-4 pb-1 text-center">
                    <p className="text-sm text-neutral-500">
                      No photos yet.
                    </p>
                  </div>
                  <div className="mt-1 text-center">
                    <Link
                      href={`/${project.id}/photos`}
                      className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                    >
                      View photos
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="mt-0">
                  <div className="pt-4 pb-1 text-center">
                    <p className="text-sm text-neutral-500">
                      No documents yet.
                    </p>
                  </div>
                  <div className="mt-1 text-center">
                    <Link
                      href={`/${project.id}/documents`}
                      className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                    >
                      View documents
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="specifications" className="mt-0">
                  <div className="pt-4 pb-1 text-center">
                    <p className="text-sm text-neutral-500">
                      No specifications yet.
                    </p>
                  </div>
                  <div className="mt-1 text-center">
                    <Link
                      href={`/${project.id}/specifications`}
                      className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                    >
                      View specifications
                    </Link>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <MeetingsSection
              meetings={meetings}
              projectId={project.id}
              maxItems={5}
            />

          </div>
        </div>
      </div>

      {/* Edit Project Dialog */}
      <EditProjectDialog
        project={portfolioProject}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
