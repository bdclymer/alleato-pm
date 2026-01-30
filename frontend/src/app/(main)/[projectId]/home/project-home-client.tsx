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
import type { Database } from "@/types/database.types";

/* =============================================================================
   PROJECT HOME - SOURCE OF TRUTH
   =============================================================================
   This is the canonical implementation of a project homepage.
   All design patterns here should be replicated across other pages.

   Key principles:
   - Use PageShell for consistent layout wrapper
   - Use SectionCard for collapsible content sections
   - Use MetricCard/MetricGrid for KPI displays
   - Consistent typography using design system classes
   - Mobile-first responsive design
   - Premium, luxury aesthetic with subtle refinement
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
      { name: "Meetings", href: "/meetings", icon: Calendar },
    ],
  },
  {
    title: "Project Management",
    tools: [
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
   Currency Formatter Utility
   ----------------------------------------------------------------------------- */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
  const [isContractsOpen, setIsContractsOpen] = React.useState(true);
  const [isCommitmentsOpen, setIsCommitmentsOpen] = React.useState(true);
  const [isChangeEventsOpen, setIsChangeEventsOpen] = React.useState(true);
  const [isMeetingsOpen, setIsMeetingsOpen] = React.useState(true);
  const [isTasksOpen, setIsTasksOpen] = React.useState(true);
  const [isRFIsOpen, setIsRFIsOpen] = React.useState(true);
  const [isSubmittalsOpen, setIsSubmittalsOpen] = React.useState(true);
  const [isDocumentsOpen, setIsDocumentsOpen] = React.useState(true);
  const [showAddTeamMemberForm, setShowAddTeamMemberForm] = React.useState(false);

  /* ---------------------------------------------------------------------------
     Team Member Handlers
     ------------------------------------------------------------------------- */

  const parseTeamMembers = (): TeamMember[] => {
    if (!project.team_members || !Array.isArray(project.team_members)) {
      return [];
    }
    return project.team_members.map((member) => {
      // Parse the member if it's a string (JSON)
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

  /* ---------------------------------------------------------------------------
     Render
     ------------------------------------------------------------------------- */

  return (
    <PageShell>
      {/* =====================================================================
          Page Header
          ===================================================================== */}
      <PageShell.Header
        eyebrow={project.client || undefined}
        title={project.name || project["job number"] || "Untitled Project"}
        size="hero"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 sm:h-10 px-4 sm:px-5 bg-brand text-white hover:bg-brand/90 transition-all rounded-sm shadow-sm">
                <span className="text-sm font-medium">Tools</span>
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[calc(100vw-2rem)] sm:w-[540px] p-0 rounded-sm shadow-lg border-neutral-200"
            >
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
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
        }
      />

      {/* =====================================================================
          Main Content Grid
          ===================================================================== */}
      <div className="space-y-6 sm:space-y-8">

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
                // Parse the member if it's a string (JSON)
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
                      <AvatarFallback className="bg-neutral-100 text-neutral-600 text-xs font-medium">
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
            Financial Overview
            ----------------------------------------------------------------- */}
        <PageShell.Section spacing="lg">
          <h2 className="text-lg sm:text-xl font-light tracking-tight text-neutral-800 mb-4 sm:mb-6">
            Financial Overview
          </h2>
          <MetricGrid cols={2}>
            <MetricCard
              label="Total Budget"
              value={totalBudget}
              format="currency"
              href={`/${project.id}/budget`}
              size="sm"
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/${project.id}/budget`);
                  }}
                >
                  {budget.length > 0 ? "View" : "Create"}
                </Button>
              }
            />
            <MetricCard
              label="Committed"
              value={committed}
              format="currency"
              href={`/${project.id}/commitments`}
              size="sm"
            />
          </MetricGrid>
        </PageShell.Section>

        {/* -------------------------------------------------------------------
            Prime Contracts
            ----------------------------------------------------------------- */}
        <SectionCard
          title="Prime Contracts"
          addHref={`/${project.id}/prime-contracts/new`}
          viewAllHref={`/${project.id}/prime-contracts`}
          open={isContractsOpen}
          onOpenChange={setIsContractsOpen}
        >
          {contracts.length > 0 ? (
            <div className="space-y-0">
              {contracts.map((contract) => (
                <SectionCard.Item
                  key={contract.id}
                  title={contract.title || `Contract #${contract.contract_number}`}
                  subtitle={contract.contract_number || undefined}
                  meta={contract.contract_amount ? formatCurrency(contract.contract_amount) : undefined}
                  status={contract.status || undefined}
                  href={`/${project.id}/contracts/${contract.id}`}
                />
              ))}
            </div>
          ) : (
            <SectionCard.Empty
              message="No prime contracts"
              description="Create a contract to get started"
              actionLabel="Add contract"
              actionHref={`/${project.id}/prime-contracts/new`}
            />
          )}
        </SectionCard>

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
            Change Events
            ----------------------------------------------------------------- */}
        <SectionCard
          title="Change Events"
          addHref={`/${project.id}/change-events/new`}
          viewAllHref={`/${project.id}/change-events`}
          open={isChangeEventsOpen}
          onOpenChange={setIsChangeEventsOpen}
        >
          {_changeEvents.length > 0 ? (
            <div className="space-y-0">
              {_changeEvents.slice(0, 5).map((event) => (
                <SectionCard.Item
                  key={event.id}
                  title={event.title || `Change Event #${event.number}`}
                  subtitle={event.number || undefined}
                  badge={
                    event.type && (
                      <SectionCard.Badge variant={event.type === "client_change" ? "brand" : "default"}>
                        {event.type === "client_change" ? "Client" :
                         event.type === "field_change" ? "Field" :
                         event.type === "design_change" ? "Design" :
                         event.type}
                      </SectionCard.Badge>
                    )
                  }
                  meta={undefined}
                  status={event.status || undefined}
                  href={`/${project.id}/change-events/${event.id}`}
                />
              ))}
            </div>
          ) : (
            <SectionCard.Empty
              message="No change events"
              description="Track project changes and their impacts"
              actionLabel="Add change event"
              actionHref={`/${project.id}/change-events/new`}
            />
          )}
        </SectionCard>

        {/* -------------------------------------------------------------------
            Change Orders
            ----------------------------------------------------------------- */}
        <SectionCard
              title="Change Orders"
              viewAllHref={`/${project.id}/change-orders`}
              hideCollapse
            >
              {changeOrders.length > 0 ? (
                <div className="space-y-0">
                  {changeOrders.slice(0, 4).map((co) => (
                    <SectionCard.Item
                      key={co.id}
                      title={`CO #${co.co_number || co.id}`}
                      subtitle={co.title || undefined}
                      href={`/${project.id}/change-orders/${co.id}`}
                    />
                  ))}
                </div>
              ) : (
                <SectionCard.Empty message="No change orders" />
              )}
            </SectionCard>


        {/* -------------------------------------------------------------------
            Project Management - Accordion Style Sections
            ----------------------------------------------------------------- */}
        <PageShell.Section spacing="lg">
          <h2 className="text-lg sm:text-xl font-light tracking-tight text-neutral-800 mb-4 sm:mb-6">
            Project Management
          </h2>
          <div className="space-y-6 sm:space-y-8">
            {/* Meetings */}
            <SectionCard
              title="Meetings"
              addHref={`/${project.id}/meetings/new`}
              viewAllHref={`/${project.id}/meetings`}
              open={isMeetingsOpen}
              onOpenChange={setIsMeetingsOpen}
            >
              {meetings.length > 0 ? (
                <div className="space-y-0">
                  {meetings.slice(0, 5).map((meeting) => (
                    <SectionCard.Item
                      key={meeting.id}
                      title={meeting.title || "Untitled Meeting"}
                      subtitle={meeting.date ? format(new Date(meeting.date), "MMM d, yyyy") : undefined}
                      href={`/${project.id}/meetings/${meeting.id}`}
                    />
                  ))}
                </div>
              ) : (
                <SectionCard.Empty
                  message="No meetings scheduled"
                  description="Schedule project meetings"
                  actionLabel="Add meeting"
                  actionHref={`/${project.id}/meetings/new`}
                />
              )}
            </SectionCard>

            {/* Tasks */}
            <SectionCard
              title="Tasks"
              addHref={`/${project.id}/tasks/new`}
              viewAllHref={`/${project.id}/tasks`}
              open={isTasksOpen}
              onOpenChange={setIsTasksOpen}
            >
              {tasks.length > 0 ? (
                <div className="space-y-0">
                  {tasks.slice(0, 5).map((task) => (
                    <SectionCard.Item
                      key={task.id}
                      title={task.task_description || "Untitled Task"}
                      subtitle={task.due_date ? `Due ${format(new Date(task.due_date), "MMM d")}` : undefined}
                      badge={
                        task.status && (
                          <SectionCard.Badge variant={task.status === "completed" ? "success" : "default"}>
                            {task.status}
                          </SectionCard.Badge>
                        )
                      }
                      href={`/${project.id}/tasks/${task.id}`}
                    />
                  ))}
                </div>
              ) : (
                <SectionCard.Empty
                  message="No active tasks"
                  description="Create and track project tasks"
                  actionLabel="Add task"
                  actionHref={`/${project.id}/tasks/new`}
                />
              )}
            </SectionCard>

            {/* RFIs */}
            <SectionCard
              title="RFIs"
              addHref={`/${project.id}/rfis/new`}
              viewAllHref={`/${project.id}/rfis`}
              open={isRFIsOpen}
              onOpenChange={setIsRFIsOpen}
            >
              {rfis.length > 0 ? (
                <div className="space-y-0">
                  {rfis.slice(0, 5).map((rfi) => (
                    <SectionCard.Item
                      key={rfi.id}
                      title={`RFI #${rfi.number || rfi.id}`}
                      subtitle={rfi.subject || undefined}
                      badge={
                        rfi.status && (
                          <SectionCard.Badge variant={rfi.status === "closed" ? "success" : "warning"}>
                            {rfi.status}
                          </SectionCard.Badge>
                        )
                      }
                      href={`/${project.id}/rfis/${rfi.id}`}
                    />
                  ))}
                </div>
              ) : (
                <SectionCard.Empty
                  message="No active RFIs"
                  description="Submit requests for information"
                  actionLabel="Add RFI"
                  actionHref={`/${project.id}/rfis/new`}
                />
              )}
            </SectionCard>

            {/* Submittals */}
            <SectionCard
              title="Submittals"
              addHref={`/${project.id}/submittals/new`}
              viewAllHref={`/${project.id}/submittals`}
              open={isSubmittalsOpen}
              onOpenChange={setIsSubmittalsOpen}
            >
              <SectionCard.Empty
                message="No submittals"
                description="Track project submittals and approvals"
                actionLabel="Add submittal"
                actionHref={`/${project.id}/submittals/new`}
              />
            </SectionCard>

            {/* Documents */}
            <SectionCard
              title="Documents"
              addHref={`/${project.id}/documents/new`}
              viewAllHref={`/${project.id}/documents`}
              open={isDocumentsOpen}
              onOpenChange={setIsDocumentsOpen}
            >
              <SectionCard.Empty
                message="No recent documents"
                description="Upload and manage project documents"
                actionLabel="Upload document"
                actionHref={`/${project.id}/documents/new`}
              />
            </SectionCard>
          </div>
        </PageShell.Section>

        {/* -------------------------------------------------------------------
            Additional Sections - Drawings, Photos
            ----------------------------------------------------------------- */}
        <PageShell.Section spacing="xl">
          <PageShell.Grid cols={2} gap="lg">
            {/* Drawings */}
            <div>
              <h2 className="text-lg sm:text-xl font-light tracking-tight text-neutral-800 mb-4">
                Drawings
              </h2>
              <div className="bg-white border border-neutral-200/80 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] p-8 sm:p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <FileText className="h-10 w-10 text-neutral-300 mb-3" />
                  <p className="text-sm text-neutral-400">No drawings uploaded</p>
                </div>
              </div>
            </div>

            {/* Photos */}
            <div>
              <h2 className="text-lg sm:text-xl font-light tracking-tight text-neutral-800 mb-4">
                Photos
              </h2>
              <div className="bg-white border border-neutral-200/80 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] p-8 sm:p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <Upload className="h-10 w-10 text-neutral-300 mb-3" />
                  <p className="text-sm text-neutral-400">No photos uploaded</p>
                </div>
              </div>
            </div>
          </PageShell.Grid>
        </PageShell.Section>

      </div>
    </PageShell>
  );
}
