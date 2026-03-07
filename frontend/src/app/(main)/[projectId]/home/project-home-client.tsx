"use client";

import * as React from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  X,
  Zap,
  Send,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Settings,
  Loader2,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ProjectChecklistSidebar } from "@/components/project/project-checklist-sidebar";
import { MeetingsSection } from "./meetings-section";
import { EditProjectDialog } from "@/components/portfolio/edit-project-dialog";
import { useBudgetData } from "@/hooks/use-budget-data";
import type { BudgetLineItem } from "@/types/budget";
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
  company?: string;
  email?: string;
  phone?: string;
  category?: "team" | "contact" | "subcontractor";
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

/** Extract budget variances — cost codes with biggest gap between budget and projected costs */
function getBudgetVariances(items: BudgetLineItem[], limit = 5) {
  return items
    .map((item) => ({
      id: item.id,
      costCode: item.costCode,
      description: item.description,
      revisedBudget: item.revisedBudget,
      projectedCosts: item.projectedCosts,
      variance: item.projectedBudget - item.projectedCosts, // positive = under budget, negative = over
      consumption: item.revisedBudget > 0
        ? (item.projectedCosts / item.revisedBudget) * 100
        : 0,
    }))
    .filter((v) => v.revisedBudget > 0) // only lines with a budget
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)) // largest variance first
    .slice(0, limit);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "TM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Directory sub-section with searchable "add contact" popover */
function DirectorySubSection({
  title,
  members,
  allMembers,
  projectId,
  sectionKey,
  personTypeFilter,
}: {
  title: string;
  members: TeamMember[];
  allMembers: TeamMember[];
  projectId: number;
  sectionKey: string;
  personTypeFilter?: string;
}) {
  const [addOpen, setAddOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [availablePeople, setAvailablePeople] = React.useState<
    { id: string; first_name: string; last_name: string; email: string | null; job_title: string | null }[]
  >([]);
  const [peopleLoading, setPeopleLoading] = React.useState(false);

  // Fetch real contacts when the popover opens
  React.useEffect(() => {
    if (!addOpen) return;
    let cancelled = false;

    async function fetchPeople() {
      setPeopleLoading(true);
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        let query = supabase
          .from("people")
          .select("id, first_name, last_name, email, job_title")
          .order("last_name", { ascending: true })
          .limit(50);

        if (personTypeFilter) {
          query = query.ilike("person_type", personTypeFilter);
        }

        const { data } = await query;
        if (!cancelled) {
          setAvailablePeople(data || []);
        }
      } catch {
        // silently fail — user still has fallback link
      } finally {
        if (!cancelled) setPeopleLoading(false);
      }
    }

    fetchPeople();
    return () => { cancelled = true; };
  }, [addOpen, personTypeFilter]);

  // Filter out people already displayed as members, and filter by search
  const filteredPeople = React.useMemo(() => {
    const existingNames = new Set(allMembers.map((m) => m.name.toLowerCase()));
    let result = availablePeople.filter((p) => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
      return !existingNames.has(fullName);
    });
    if (searchValue.trim()) {
      const q = searchValue.toLowerCase();
      result = result.filter((p) => {
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
        return (
          fullName.includes(q) ||
          (p.email && p.email.toLowerCase().includes(q)) ||
          (p.job_title && p.job_title.toLowerCase().includes(q))
        );
      });
    }
    return result;
  }, [availablePeople, allMembers, searchValue]);

  return (
    <div>
      {/* Section header with + button */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
            {title}
          </span>
          {members.length > 0 && (
            <span className="text-[10px] text-muted-foreground/40 ml-0.5">
              {members.length}
            </span>
          )}
        </div>
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <button
              className="h-5 w-5 flex items-center justify-center rounded text-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors"
              title={`Add to ${title}`}
            >
              <Plus className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end" sideOffset={4}>
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={`Search ${title.toLowerCase()}...`}
                value={searchValue}
                onValueChange={setSearchValue}
                className="h-9"
              />
              <CommandList>
                {peopleLoading ? (
                  <div className="py-6 text-center">
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                ) : filteredPeople.length === 0 ? (
                  <CommandEmpty>
                    <div className="py-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        {searchValue ? "No matching people found" : "No people available"}
                      </p>
                      <Link
                        href={`/${projectId}/directory/users`}
                        className="text-xs text-primary hover:text-primary/80 mt-1 inline-block"
                        onClick={() => setAddOpen(false)}
                      >
                        Go to full directory →
                      </Link>
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup heading={title}>
                    {filteredPeople.map((person) => {
                      const fullName = `${person.first_name} ${person.last_name}`;
                      return (
                        <CommandItem
                          key={person.id}
                          value={fullName}
                          onSelect={() => {
                            setAddOpen(false);
                            setSearchValue("");
                            // Navigate to directory to manage membership
                            window.location.href = `/${projectId}/directory/users`;
                          }}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarFallback className="bg-card text-muted-foreground text-[9px] border border-border">
                              {getInitials(fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate">{fullName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {person.job_title || person.email || "Employee"}
                            </p>
                          </div>
                        </CommandItem>
                      );
                    })}
                    {/* Link to full directory */}
                    <CommandItem
                      onSelect={() => {
                        setAddOpen(false);
                        window.location.href = `/${projectId}/directory/users`;
                      }}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Plus className="h-3 w-3 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-primary">View full directory</p>
                      </div>
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Members list */}
      {members.length > 0 ? (
        <div className="space-y-0.5">
          {members.slice(0, 3).map((member, i) => (
            <div
              key={`${sectionKey}-${i}`}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback className="bg-card text-muted-foreground text-[9px] border border-border">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-foreground leading-none truncate">
                  {member.name}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">
                  {[member.role, member.company].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              {/* Quick contact icons — visible on hover */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {member.phone && (
                  <a
                    href={`tel:${member.phone}`}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title={`Call ${member.phone}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="h-3 w-3" />
                  </a>
                )}
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title={`Email ${member.email}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Mail className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
          {members.length > 3 && (
            <Link
              href={`/${projectId}/directory/users`}
              className="block px-2 py-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              +{members.length - 3} more
            </Link>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground/40 px-2 py-1">
          None added yet
        </p>
      )}
    </div>
  );
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
      <Link href={href} className="block hover:bg-[hsl(var(--surface-alt))] transition-colors">
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
      <Link href={href} className="block hover:bg-[hsl(var(--surface-alt))] transition-colors -mx-1 px-1 rounded">
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

  // Fetch full budget data from API (all computed columns)
  const {
    budgetData: fullBudgetData,
    grandTotals,
    loading: budgetLoading,
  } = useBudgetData(String(project.id));

  // Budget insight derivations
  const budgetVariances = React.useMemo(
    () => getBudgetVariances(fullBudgetData, 6),
    [fullBudgetData]
  );

  const projectedOverUnder = grandTotals.projectedOverUnder;
  const commitmentPct = grandTotals.revisedBudget > 0
    ? (grandTotals.committedCosts / grandTotals.revisedBudget) * 100
    : 0;
  const totalPending = grandTotals.pendingChanges + grandTotals.pendingCostChanges;
  const forecastGap = grandTotals.estimatedCostAtCompletion - grandTotals.revisedBudget;

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

  // Team members — categorized into project team, key contacts, subcontractors
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

      // Auto-categorize based on role/type
      const role = String(parsed?.role || "").toLowerCase();
      const type = String(parsed?.type || parsed?.person_type || "").toLowerCase();
      let category: "team" | "contact" | "subcontractor" = "team";
      if (type === "subcontractor" || role.includes("subcontractor") || role.includes("sub ")) {
        category = "subcontractor";
      } else if (type === "contact" || role.includes("client") || role.includes("owner") || role.includes("architect") || role.includes("engineer") || role.includes("inspector")) {
        category = "contact";
      }
      // Explicit category from data takes precedence
      if (parsed?.category === "contact" || parsed?.category === "subcontractor" || parsed?.category === "team") {
        category = parsed.category;
      }

      return {
        name: String(parsed?.name || "Team Member"),
        role: String(parsed?.role || ""),
        company: parsed?.company ? String(parsed.company) : undefined,
        email: parsed?.email ? String(parsed.email) : undefined,
        phone: parsed?.phone || parsed?.mobile || parsed?.office
          ? String(parsed.phone || parsed.mobile || parsed.office)
          : undefined,
        category,
      };
    });
  }, [project.team_members]);

  // Group team members by category
  const directoryGroups = React.useMemo(() => {
    const groups = {
      team: teamMembers.filter((m) => m.category === "team"),
      contact: teamMembers.filter((m) => m.category === "contact"),
      subcontractor: teamMembers.filter((m) => m.category === "subcontractor"),
    };
    return groups;
  }, [teamMembers]);

  // Financial calculations (must be declared before useMemos that reference them)
  const totalBudget = budget.reduce((sum, item) => sum + (item.original_amount || 0), 0);
  const committed = commitments.reduce((sum, c) => sum + (c.contract_amount || 0), 0);
  const remaining = Math.max(totalBudget - committed, 0);
  const budgetUtilization = totalBudget > 0 ? (committed / totalBudget) * 100 : 0;
  const hasBudgetData = totalBudget > 0;

  // Derived content (must be declared before useMemos that reference them)
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

  // Project health score — computed from budget + schedule + open items
  const projectHealth = React.useMemo(() => {
    let score = 0;
    let factors = 0;

    // Budget health (0-100)
    if (hasBudgetData) {
      factors++;
      if (budgetUtilization <= 75) score += 100;
      else if (budgetUtilization <= 90) score += 60;
      else score += 20;
    }

    // Open items health
    const totalOpenItems = openRfis.length + openChangeEvents.length;
    factors++;
    if (totalOpenItems <= 3) score += 100;
    else if (totalOpenItems <= 8) score += 60;
    else score += 20;

    // Forecast health
    if (hasBudgetData && fullBudgetData.length > 0) {
      factors++;
      if (projectedOverUnder >= 0) score += 100;
      else if (projectedOverUnder > -50000) score += 60;
      else score += 20;
    }

    // Schedule health
    if (schedule.length > 0) {
      factors++;
      const overdueTasks = schedule.filter((t: any) => {
        if (!t.end_date) return false;
        const endDate = new Date(t.end_date);
        return endDate < new Date() && t.status !== "completed" && t.status !== "complete";
      });
      const overdueRatio = overdueTasks.length / schedule.length;
      if (overdueRatio <= 0.05) score += 100;
      else if (overdueRatio <= 0.15) score += 60;
      else score += 20;
    }

    const avg = factors > 0 ? score / factors : 50;
    if (avg >= 75) return "good" as const;
    if (avg >= 45) return "warn" as const;
    return "bad" as const;
  }, [hasBudgetData, budgetUtilization, openRfis.length, openChangeEvents.length, projectedOverUnder, fullBudgetData, schedule]);

  // Schedule metrics
  const scheduleMetrics = React.useMemo(() => {
    const allTasks = schedule.length > 0 ? schedule : tasks;
    if (allTasks.length === 0) return null;

    const completedTasks = allTasks.filter(
      (t: any) => t.status === "completed" || t.status === "complete"
    ).length;
    const totalTasks = allTasks.length;
    const pctComplete = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const overdueTasks = allTasks.filter((t: any) => {
      const endDate = t.end_date || t.due_date;
      if (!endDate) return false;
      return new Date(endDate) < new Date() && t.status !== "completed" && t.status !== "complete";
    });

    return {
      completedTasks,
      totalTasks,
      pctComplete,
      overdueTasks: overdueTasks.length,
    };
  }, [schedule, tasks]);

  // Completion countdown
  const completionInfo = React.useMemo(() => {
    if (!project["est completion"]) return null;
    try {
      const completion = new Date(project["est completion"]);
      const now = new Date();
      const daysRemaining = Math.floor(
        (completion.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const monthsRemaining = Math.round(daysRemaining / 30);
      return {
        date: format(completion, "MMM yyyy"),
        daysRemaining,
        monthsRemaining,
        label: daysRemaining > 60
          ? `${monthsRemaining} mo`
          : daysRemaining > 0
          ? `${daysRemaining}d`
          : "Overdue",
        isPast: daysRemaining <= 0,
      };
    } catch {
      return null;
    }
  }, [project]);

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

    // Open items signal (moved from KPI strip for better context)
    const totalOpenItems = openRfis.length + openChangeEvents.length;
    if (totalOpenItems > 0) {
      list.push({
        id: "open-items",
        severity: totalOpenItems > 8 ? "warning" : "info",
        label: `${totalOpenItems} open item${totalOpenItems !== 1 ? "s" : ""} need action`,
        href: `/${project.id}/rfis`,
      });
    }

    // Schedule signals
    if (schedule.length > 0) {
      const overdueTasks = schedule.filter((t) => {
        const endDate = t.end_date;
        if (!endDate) return false;
        return new Date(endDate) < new Date() && t.status !== "completed" && t.status !== "complete";
      });
      if (overdueTasks.length > 0) {
        list.push({
          id: "schedule-overdue",
          severity: overdueTasks.length > 5 ? "critical" : "warning",
          label: `${overdueTasks.length} schedule task${overdueTasks.length !== 1 ? "s" : ""} overdue`,
          href: `/${project.id}/schedule`,
        });
      }
    }

    // Daily log freshness signal
    if (dailyLogs.length > 0) {
      const lastLog = dailyLogs[0];
      const daysSinceLog = Math.floor(
        (Date.now() - new Date(lastLog.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLog >= 3) {
        list.push({
          id: "daily-log-stale",
          severity: daysSinceLog >= 7 ? "warning" : "info",
          label: `No daily log in ${daysSinceLog} days`,
          href: `/${project.id}/daily-log`,
        });
      }
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

    return list.slice(0, 6);
  }, [hasBudgetData, budgetUtilization, openRfis.length, pendingChangeOrders, openChangeEvents.length, project, schedule, dailyLogs]);

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
    <div className="min-h-screen bg-background">
      <div className="px-4 sm:px-6 lg:px-10 pt-4 pb-24">

        {/* ═══════════════════════════════════════════
            INVERTED PYRAMID CONTAINER
            Single card, layered sections alternating white/surface-2
            ═══════════════════════════════════════════ */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">

          {/* ── LAYER 1: Header ──
              Health dot · job number · name · meta · completion | icon actions */}
          <div className="px-6 py-4 sm:px-8 border-b border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              {/* Health indicator dot */}
              <span
                className={cn(
                  "h-2 w-2 rounded-full flex-shrink-0",
                  projectHealth === "good" && "bg-green-500",
                  projectHealth === "warn" && "bg-amber-500",
                  projectHealth === "bad" && "bg-red-500"
                )}
                title={
                  projectHealth === "good" ? "Project on track"
                    : projectHealth === "warn" ? "Needs attention"
                    : "At risk"
                }
              />
              {project["job number"] && (
                <span className="text-sm font-semibold text-muted-foreground tabular-nums flex-shrink-0">
                  {project["job number"]}
                </span>
              )}
              <h1 className="text-sm font-semibold text-foreground truncate">
                {project.name || "Untitled Project"}
              </h1>
              {/* Meta: type · sector · phase · client */}
              {(projectMeta || project.client) && (
                <span className="hidden sm:inline text-xs text-muted-foreground/60 flex-shrink-0">
                  · {[projectMeta, project.client].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Completion countdown */}
              {completionInfo && (
                <span
                  className={cn(
                    "hidden sm:flex items-center gap-1 text-xs tabular-nums",
                    completionInfo.isPast ? "text-red-600" : "text-muted-foreground"
                  )}
                  title={`Est. completion: ${completionInfo.date}`}
                >
                  <Calendar className="h-3 w-3" />
                  <span>{completionInfo.date}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className={cn(
                    "font-medium",
                    completionInfo.isPast ? "text-red-600" : completionInfo.daysRemaining < 60 ? "text-amber-600" : "text-muted-foreground"
                  )}>
                    {completionInfo.label}
                  </span>
                </span>
              )}
              <div className="flex items-center gap-1">
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
              label="Projected Over/Under"
              value={hasBudgetData && fullBudgetData.length > 0
                ? `${projectedOverUnder >= 0 ? "+" : ""}${formatCompactCurrency(projectedOverUnder)}`
                : "—"}
              sub={hasBudgetData && fullBudgetData.length > 0
                ? projectedOverUnder >= 0 ? "Under budget" : "Over budget"
                : undefined}
              href={`/${project.id}/budget`}
              signal={hasBudgetData && fullBudgetData.length > 0
                ? (projectedOverUnder >= 0 ? "good" : projectedOverUnder < -50000 ? "bad" : "warn")
                : undefined}
            />
            <KpiCell
              label="Schedule"
              value={scheduleMetrics
                ? `${scheduleMetrics.pctComplete.toFixed(0)}%`
                : "—"}
              sub={scheduleMetrics
                ? scheduleMetrics.overdueTasks > 0
                  ? `${scheduleMetrics.overdueTasks} task${scheduleMetrics.overdueTasks !== 1 ? "s" : ""} overdue`
                  : `${scheduleMetrics.completedTasks}/${scheduleMetrics.totalTasks} tasks done`
                : "No schedule set"}
              href={`/${project.id}/schedule`}
              signal={scheduleMetrics
                ? scheduleMetrics.overdueTasks > 3 ? "bad"
                  : scheduleMetrics.overdueTasks > 0 ? "warn"
                  : "good"
                : undefined}
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
            <div className="lg:col-span-2 bg-[hsl(var(--surface-alt))] px-6 py-6 sm:px-8">
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

          {/* ── LAYER 3.5: Schedule Snapshot ──
              Only renders if schedule data exists. Shows % complete, overdue count, upcoming milestones. */}
          {scheduleMetrics && scheduleMetrics.totalTasks > 0 && (
            <div className="border-b border-border px-6 py-5 sm:px-8 bg-card">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Schedule Progress
                </span>
                <Link
                  href={`/${project.id}/schedule`}
                  className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  View schedule →
                </Link>
              </div>
              <div className="flex items-center gap-6">
                {/* Progress bar */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-foreground">
                      {scheduleMetrics.completedTasks} of {scheduleMetrics.totalTasks} tasks complete
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {scheduleMetrics.pctComplete.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        scheduleMetrics.overdueTasks > 3
                          ? "bg-red-400"
                          : scheduleMetrics.overdueTasks > 0
                          ? "bg-amber-400"
                          : "bg-primary/70"
                      )}
                      style={{ width: `${Math.min(scheduleMetrics.pctComplete, 100)}%` }}
                    />
                  </div>
                </div>
                {/* Overdue indicator */}
                {scheduleMetrics.overdueTasks > 0 && (
                  <div className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-500/10">
                    <Clock className="h-3 w-3 text-red-600" />
                    <span className="text-xs font-medium text-red-600 tabular-nums">
                      {scheduleMetrics.overdueTasks} overdue
                    </span>
                  </div>
                )}
                {scheduleMetrics.overdueTasks === 0 && scheduleMetrics.pctComplete > 0 && (
                  <div className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-500/10">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span className="text-xs font-medium text-green-600">On track</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── LAYER 4: Budget Insights ──
              Left 3/5: Budget Variances — cost codes with biggest divergence
              Right 2/5: Financial Exposure — committed %, pending, forecast gap */}
          <div className="grid grid-cols-1 lg:grid-cols-5 border-b border-border">

            {/* Left: Budget Variances */}
            <div className="lg:col-span-3 bg-card px-6 py-6 sm:px-8 border-b lg:border-b-0 lg:border-r border-border">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Budget Variances
                </p>
                <Link
                  href={`/${project.id}/budget`}
                  className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  View budget →
                </Link>
              </div>

              {budgetLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : budgetVariances.length > 0 ? (
                <div className="space-y-3">
                  {budgetVariances.map((v) => {
                    const isOver = v.variance < 0;
                    const barPct = Math.min(v.consumption, 150); // cap at 150% for visual
                    return (
                      <div key={v.id} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[11px] text-muted-foreground tabular-nums flex-shrink-0">
                              {v.costCode}
                            </span>
                            <span className="text-sm text-foreground truncate">{v.description}</span>
                          </div>
                          <span
                            className={cn(
                              "text-sm font-semibold tabular-nums flex-shrink-0 ml-3",
                              isOver ? "text-red-600" : "text-green-600"
                            )}
                          >
                            {isOver ? "-" : "+"}{formatCompactCurrency(Math.abs(v.variance))}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                v.consumption > 100
                                  ? "bg-red-400"
                                  : v.consumption > 85
                                  ? "bg-amber-400"
                                  : "bg-primary/60"
                              )}
                              style={{ width: `${Math.min(barPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground/60 tabular-nums w-10 text-right">
                            {v.consumption.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60">
                  No budget lines yet.{" "}
                  <Link href={`/${project.id}/budget`} className="text-primary hover:underline">
                    Set up budget →
                  </Link>
                </p>
              )}
            </div>

            {/* Right: Financial Exposure */}
            <div className="lg:col-span-2 bg-[hsl(var(--surface-alt))] px-6 py-6 sm:px-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-5">
                Financial Exposure
              </p>

              {budgetLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : fullBudgetData.length > 0 ? (
                <div className="space-y-6">

                  {/* Committed % */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-foreground">Committed</span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {commitmentPct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-card rounded-full overflow-hidden border border-border/50">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          commitmentPct > 95
                            ? "bg-red-400"
                            : commitmentPct > 80
                            ? "bg-amber-400"
                            : "bg-primary/70"
                        )}
                        style={{ width: `${Math.min(commitmentPct, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatCompactCurrency(grandTotals.committedCosts)} of {formatCompactCurrency(grandTotals.revisedBudget)} locked in contracts
                    </p>
                  </div>

                  {/* Pending Decisions */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Pending Decisions</span>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          totalPending > 0 ? "text-amber-600" : "text-muted-foreground"
                        )}
                      >
                        {formatCompactCurrency(totalPending)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {grandTotals.pendingChanges > 0 && (
                        <>{formatCompactCurrency(grandTotals.pendingChanges)} budget pending</>
                      )}
                      {grandTotals.pendingChanges > 0 && grandTotals.pendingCostChanges > 0 && " · "}
                      {grandTotals.pendingCostChanges > 0 && (
                        <>{formatCompactCurrency(grandTotals.pendingCostChanges)} cost pending</>
                      )}
                      {totalPending === 0 && "No unresolved items"}
                    </p>
                  </div>

                  {/* Forecast Gap */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Forecast Gap</span>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          forecastGap > 0 ? "text-red-600" : forecastGap < 0 ? "text-green-600" : "text-muted-foreground"
                        )}
                      >
                        {forecastGap >= 0 ? "+" : ""}{formatCompactCurrency(forecastGap)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {forecastGap > 0
                        ? "Estimated cost exceeds revised budget"
                        : forecastGap < 0
                        ? "Estimated cost under revised budget"
                        : "Estimated cost matches budget"}
                    </p>
                  </div>

                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60">
                  Budget data needed to calculate exposure.
                </p>
              )}
            </div>
          </div>

          {/* ── LAYER 5: Bottom — Meetings + Project Directory ──
              Table-like bottom section. Surface-2 tint for directory area. */}
          <div className="grid grid-cols-1 lg:grid-cols-5">
              {/* Meetings (white) */}
              {meetings.length > 0 && (
                <div className="px-6 py-6 sm:px-8 lg:col-span-3 border-b lg:border-b-0 lg:border-r border-border">
                  <MeetingsSection meetings={meetings} projectId={project.id} maxItems={4} />
                </div>
              )}

              {/* Project Directory (surface-2 tint) — grouped contacts with add */}
              <div className={cn(
                "bg-[hsl(var(--surface-alt))] px-6 py-6 sm:px-8",
                meetings.length > 0 ? "lg:col-span-2" : "lg:col-span-5"
              )}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Project Directory
                  </span>
                  <Link
                    href={`/${project.id}/directory/users`}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                  >
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="space-y-6">
                  {/* Project Team */}
                  <DirectorySubSection
                    title="Project Team"
                    members={directoryGroups.team}
                    allMembers={teamMembers}
                    projectId={project.id}
                    sectionKey="team"
                    personTypeFilter="employee"
                  />

                  {/* Key Contacts */}
                  <DirectorySubSection
                    title="Key Contacts"
                    members={directoryGroups.contact}
                    allMembers={teamMembers}
                    projectId={project.id}
                    sectionKey="contact"
                  />

                  {/* Subcontractors */}
                  <DirectorySubSection
                    title="Subcontractors"
                    members={directoryGroups.subcontractor}
                    allMembers={teamMembers}
                    projectId={project.id}
                    sectionKey="subcontractor"
                  />
                </div>
              </div>
            </div>
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
