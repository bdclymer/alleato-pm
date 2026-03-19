"use client";

import * as React from "react";
import { format } from "date-fns";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  X,
  Zap,
  Send,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Loader2,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
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
import { EditProjectDialog } from "@/components/portfolio/edit-project-dialog";
import { MeetingsSection } from "./meetings-section";
import { useBudgetData } from "@/hooks/use-budget-data";
import { useProjectRoles } from "@/hooks/use-project-roles";
import { useProjectUsers } from "@/hooks/use-project-users";
import { useScheduleTasks } from "@/hooks/use-schedule-tasks";
import { GanttChart } from "@/components/scheduling/gantt-chart";
import type { ProjectRole } from "@/hooks/use-project-roles";
import type { Database } from "@/types/database.types";
import type { Project as PortfolioProject } from "@/types/portfolio";
import { cn } from "@/lib/utils";
import { buildToolUrl, isActivePath, sidebarNavGroups } from "@/lib/navigation-config";

/* =============================================================================
   Types
   ============================================================================= */

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Meeting = Database["public"]["Tables"]["document_metadata"]["Row"];
type ChangeOrder = Database["public"]["Tables"]["prime_contract_change_orders"]["Row"];
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "TM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getSummaryMetadata(project: Project): Record<string, unknown> {
  const metadata = project.summary_metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as Record<string, unknown>;
}

function toPortfolioProject(project: Project): PortfolioProject {
  const metadata = getSummaryMetadata(project);
  const city = typeof metadata.city === "string" ? metadata.city : "";
  const zip = typeof metadata.postal_code === "string" ? metadata.postal_code : "";
  const phone = typeof metadata.phone === "string" ? metadata.phone : "";
  const country =
    typeof metadata.country === "string" ? metadata.country : "United States";
  const timezone =
    typeof metadata.timezone === "string"
      ? metadata.timezone
      : "America/New_York";
  const region = typeof metadata.region === "string" ? metadata.region : "";
  const office = typeof metadata.office === "string" ? metadata.office : "";
  const squareFootage =
    typeof metadata.square_footage === "number" ? metadata.square_footage : null;
  const projectCode =
    typeof metadata.project_code === "string" ? metadata.project_code : "";
  const erpSync =
    typeof metadata.erp_sync === "boolean" ? metadata.erp_sync : true;
  const testProject =
    typeof metadata.test_project === "boolean" ? metadata.test_project : false;
  const projectLogo =
    typeof metadata.project_logo === "string" ? metadata.project_logo : "";
  const projectPhoto =
    typeof metadata.project_photo === "string" ? metadata.project_photo : "";

  return {
    id: String(project.id),
    name: project.name || "",
    projectNumber: project["job number"] || "",
    jobNumber: project["job number"] || undefined,
    client: project.client || "",
    address: project.address || "",
    city,
    state: project.state || "",
    zip,
    phone,
    status: project.archived ? "Inactive" : "Active",
    currentPhase: project.current_phase || "",
    stage: project.current_phase || "",
    workScope: project.work_scope || "",
    projectSector: project.project_sector || "",
    deliveryMethod: project.delivery_method || "",
    squareFootage,
    totalValue: project["est revenue"],
    projectCode,
    type: project.type || "",
    projectType: project.type || project.category || "",
    phase: project.phase || "",
    category: project.category || "",
    country,
    timezone,
    region,
    office,
    completionDate: project["est completion"] || null,
    erpSync,
    testProject,
    projectLogo,
    projectPhoto,
    active: !project.archived,
    description: project.summary || "",
    summaryMetadata: Object.keys(metadata).length > 0 ? metadata : null,
    startDate: project["start date"] || null,
    estRevenue: project["est revenue"],
    estProfit: project["est profit"],
    notes: project.summary || "",
  };
}

/* =============================================================================
   Section wrapper — provides consistent card + spacing for each section
   ============================================================================= */
function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("", className)}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* =============================================================================
   Directory sub-section with inline "add" row
   ============================================================================= */
function DirectorySubSection({
  title,
  addLabel,
  members,
  allMembers,
  projectId,
  sectionKey,
  personTypeFilter,
  userType,
}: {
  title: string;
  addLabel: string;
  members: TeamMember[];
  allMembers: TeamMember[];
  projectId: number;
  sectionKey: string;
  personTypeFilter?: string;
  userType: string;
}) {
  const [addOpen, setAddOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [availablePeople, setAvailablePeople] = React.useState<
    { id: string; first_name: string; last_name: string; email: string | null; job_title: string | null }[]
  >([]);
  const [peopleLoading, setPeopleLoading] = React.useState(false);
  const [addedPeople, setAddedPeople] = React.useState<
    { id: string; name: string; role: string }[]
  >([]);

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
        if (!cancelled) setAvailablePeople(data || []);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setPeopleLoading(false);
      }
    }
    fetchPeople();
    return () => { cancelled = true; };
  }, [addOpen, personTypeFilter]);

  const filteredPeople = React.useMemo(() => {
    const existingNames = new Set(allMembers.map((m) => m.name.toLowerCase()));
    const addedIds = new Set(addedPeople.map((p) => p.id));
    let result = availablePeople.filter((p) => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
      return !existingNames.has(fullName) && !addedIds.has(p.id);
    });
    const seen = new Set<string>();
    result = result.filter((p) => {
      const key = `${p.first_name} ${p.last_name}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
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
  }, [availablePeople, allMembers, addedPeople, searchValue]);

  const handleAddPerson = React.useCallback(
    async (person: { id: string; first_name: string; last_name: string; job_title: string | null }) => {
      setAdding(true);
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error } = await supabase
          .from("project_directory_memberships")
          .insert({
            project_id: projectId,
            person_id: person.id,
            user_type: userType,
          });
        if (error) throw error;
        setAddedPeople((prev) => [
          ...prev,
          { id: person.id, name: `${person.first_name} ${person.last_name}`, role: person.job_title || "" },
        ]);
        toast.success(`Added ${person.first_name} ${person.last_name}`);
      } catch {
        toast.error("Failed to add person");
      } finally {
        setAdding(false);
        setAddOpen(false);
        setSearchValue("");
      }
    },
    [projectId, userType],
  );

  const allDisplayed = React.useMemo(() => {
    return [
      ...members.map((m) => ({ name: m.name, role: m.role, company: m.company, email: m.email, phone: m.phone })),
      ...addedPeople.map((p) => ({ name: p.name, role: p.role, company: undefined, email: undefined, phone: undefined })),
    ];
  }, [members, addedPeople]);

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
      <div className="space-y-0.5">
        {allDisplayed.map((member, i) => (
          <div
            key={`${sectionKey}-${i}`}
            className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground leading-tight truncate">{member.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {[member.role, member.company].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              {member.phone && (
                <a href={`tel:${member.phone}`} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent" title={`Call ${member.phone}`} onClick={(e) => e.stopPropagation()}>
                  <Phone className="h-3.5 w-3.5" />
                </a>
              )}
              {member.email && (
                <a href={`mailto:${member.email}`} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent" title={`Email ${member.email}`} onClick={(e) => e.stopPropagation()}>
                  <Mail className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        ))}

        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <button className="w-full group flex items-center gap-2.5 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors text-left" disabled={adding}>
              <div className="h-7 w-7 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center flex-shrink-0 group-hover:border-primary/50 group-hover:bg-primary/5 transition-colors">
                <Plus className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
              </div>
              <p className="text-sm text-muted-foreground/50 group-hover:text-foreground/70 transition-colors">{addLabel}</p>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end" sideOffset={4}>
            <Command shouldFilter={false}>
              <CommandInput placeholder="Search people..." value={searchValue} onValueChange={setSearchValue} className="h-9" />
              <CommandList>
                {peopleLoading ? (
                  <div className="py-6 text-center"><p className="text-xs text-muted-foreground">Loading...</p></div>
                ) : filteredPeople.length === 0 ? (
                  <CommandEmpty>
                    <div className="py-3 text-center">
                      <p className="text-xs text-muted-foreground">{searchValue ? "No matching people found" : "No people available"}</p>
                      <Link href={`/${projectId}/directory/users`} className="text-xs text-primary hover:text-primary/80 mt-1 inline-block" onClick={() => setAddOpen(false)}>Go to full directory →</Link>
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup heading={title}>
                    {filteredPeople.map((person) => {
                      const fullName = `${person.first_name} ${person.last_name}`;
                      return (
                        <CommandItem key={person.id} value={fullName} onSelect={() => handleAddPerson(person)} className="flex items-center gap-2 cursor-pointer">
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarFallback className="bg-muted text-muted-foreground text-[9px]">{getInitials(fullName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate">{fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">{person.job_title || person.email || "—"}</p>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {allDisplayed.length > 3 && (
          <Link href={`/${projectId}/directory/users`} className="block px-2 py-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            View all →
          </Link>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   Role-based project team section
   ============================================================================= */
function RoleBasedTeamSection({ projectId }: { projectId: number }) {
  const { roles, isLoading, updateRoleMembers } = useProjectRoles(String(projectId));
  const { users: projectUsers, isLoading: peopleLoading } = useProjectUsers(String(projectId), {
    type: "user",
    status: "active",
    perPage: 200,
  });
  const [activeRoleId, setActiveRoleId] = React.useState<string | null>(null);
  const [searchValue, setSearchValue] = React.useState("");
  const [assigning, setAssigning] = React.useState(false);

  const availablePeople = React.useMemo(
    () =>
      (projectUsers || []).map((user) => ({
        id: user.id,
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email,
        job_title: user.job_title,
        company_name: user.company?.name || null,
      })),
    [projectUsers],
  );

  const filteredPeople = React.useMemo(() => {
    const assignedPersonIds = new Set(roles.flatMap((r) => r.members.map((m) => m.person_id)));
    let result = availablePeople.filter((p) => !assignedPersonIds.has(p.id));
    const seen = new Set<string>();
    result = result.filter((p) => {
      const key = `${p.first_name} ${p.last_name}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (searchValue.trim()) {
      const q = searchValue.toLowerCase();
      result = result.filter((p) => {
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
        return fullName.includes(q) || (p.email && p.email.toLowerCase().includes(q)) || (p.job_title && p.job_title.toLowerCase().includes(q)) || (p.company_name && p.company_name.toLowerCase().includes(q));
      });
    }
    return result;
  }, [availablePeople, roles, searchValue]);

  const handleAssign = React.useCallback(
    async (roleId: string, personId: string) => {
      setAssigning(true);
      try {
        await updateRoleMembers(roleId, [personId]);
        toast.success("Role assigned");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to assign role");
      } finally {
        setAssigning(false);
        setActiveRoleId(null);
        setSearchValue("");
      }
    },
    [updateRoleMembers],
  );

  const handleUnassign = React.useCallback(
    async (roleId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setAssigning(true);
      try {
        await updateRoleMembers(roleId, []);
        toast.success("Role unassigned");
      } catch {
        toast.error("Failed to unassign role");
      } finally {
        setAssigning(false);
      }
    },
    [updateRoleMembers],
  );

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">Project Team</p>
      {isLoading ? (
        <div className="space-y-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 -mx-2">
              <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-muted rounded animate-pulse w-24" />
                <div className="h-2 bg-muted rounded animate-pulse w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : roles.length === 0 ? (
        <p className="text-xs text-muted-foreground/40 px-2 py-1">No roles configured</p>
      ) : (
        <div className="space-y-0.5">
          {roles.map((role) => {
            const member = role.members[0]?.person;
            const isActive = activeRoleId === role.id;
            return (
              <Popover key={role.id} open={isActive} onOpenChange={(open) => { setActiveRoleId(open ? role.id : null); if (!open) setSearchValue(""); }}>
                <PopoverTrigger asChild>
                  <button className="w-full group flex items-center gap-2.5 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors text-left" disabled={assigning}>
                    {member ? (
                      <>
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                            {getInitials(`${member.first_name} ${member.last_name}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground leading-tight truncate">{member.full_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {role.role_name}{member.company_name ? ` · ${member.company_name}` : ""}
                          </p>
                        </div>
                        <button
                          className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                          title={`Remove ${member.full_name} from ${role.role_name}`}
                          onClick={(e) => handleUnassign(role.id, e)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="h-7 w-7 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center flex-shrink-0 group-hover:border-primary/50 group-hover:bg-primary/5 transition-colors">
                          <Plus className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-muted-foreground/50 leading-tight truncate group-hover:text-foreground/70 transition-colors">{role.role_name}</p>
                          <p className="text-xs text-muted-foreground/30 mt-0.5">Click to assign</p>
                        </div>
                      </>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end" sideOffset={4}>
                  <Command shouldFilter={false}>
                    <CommandInput placeholder={`Assign ${role.role_name.toLowerCase()}...`} value={searchValue} onValueChange={setSearchValue} className="h-9" />
                    <CommandList>
                      {peopleLoading ? (
                        <div className="py-6 text-center"><p className="text-xs text-muted-foreground">Loading...</p></div>
                      ) : filteredPeople.length === 0 ? (
                        <CommandEmpty>
                          <div className="py-3 text-center">
                            <p className="text-xs text-muted-foreground">{searchValue ? "No matching people found" : "No people available"}</p>
                            <Link href={`/${projectId}/directory/users`} className="text-xs text-primary hover:text-primary/80 mt-1 inline-block" onClick={() => setActiveRoleId(null)}>Go to full directory →</Link>
                          </div>
                        </CommandEmpty>
                      ) : (
                        <CommandGroup heading={`Select ${role.role_name}`}>
                          {filteredPeople.slice(0, 20).map((person) => {
                            const fullName = `${person.first_name} ${person.last_name}`;
                            return (
                              <CommandItem key={person.id} value={fullName} onSelect={() => handleAssign(role.id, person.id)} className="flex items-center gap-2 cursor-pointer">
                                <Avatar className="h-6 w-6 flex-shrink-0">
                                  <AvatarFallback className="bg-muted text-muted-foreground text-[9px]">{getInitials(fullName)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm truncate">{fullName}</p>
                                  <p className="text-xs text-muted-foreground truncate">{person.job_title || person.company_name || person.email || "Employee"}</p>
                                </div>
                              </CommandItem>
                            );
                          })}
                          {filteredPeople.length > 20 && (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">+{filteredPeople.length - 20} more — type to narrow</div>
                          )}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   Signal chip
   ============================================================================= */
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
    return <Link href={href} className={classes}>{icon}{label}</Link>;
  }
  return <span className={classes}>{icon}{label}</span>;
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
          <div role="presentation" className="flex-1 cursor-default" onClick={() => setOpen(false)} />
          <div className="w-[380px] bg-background border-l border-border flex flex-col shadow-sm">
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
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary">A</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  I have access to this project&apos;s budget, commitments, change orders, RFIs, meetings, and schedule. Ask me anything.
                </p>
              </div>
              <div className="space-y-2 pl-9">
                {["Summarize the financial health of this project", "Which change orders are most at risk?", "What are the top priorities this week?"].map((prompt) => (
                  <button key={prompt} onClick={() => setInput(prompt)} className="block w-full text-left text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-border px-4 py-4">
              <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 bg-background focus-within:ring-1 focus-within:ring-ring">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about this project..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none" />
                <button className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" aria-label="Send message">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
                Full AI chat at{" "}
                <Link href={`/${projectId}/assistant`} className="underline hover:text-muted-foreground">project assistant</Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProjectToolsSidebar({ projectId }: { projectId: number }) {
  const pathname = usePathname();

  const groupedTools = React.useMemo(
    () =>
      sidebarNavGroups.filter((group) =>
        ["financial", "operations", "company"].includes(group.id),
      ),
    [],
  );

  return (
    <aside className="xl:sticky xl:top-6 xl:self-start">
      <div className="space-y-4 border-l border-border/70 pl-4">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tools
          </h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground/80">
            Jump to project modules
          </p>
        </div>

        {groupedTools.map((group) => (
          <section key={group.id} className="space-y-1.5">
            <h3 className="text-[11px] font-semibold text-foreground">{group.label}</h3>
            <div className="space-y-0.5">
              {group.tools.map((tool) => {
                const href = tool.path.startsWith("/")
                  ? tool.path
                  : buildToolUrl(tool.path, projectId, tool.requiresProject);
                const active = tool.path.startsWith("/")
                  ? pathname === tool.path || pathname.startsWith(`${tool.path}/`)
                  : isActivePath(pathname, tool.path);
                return (
                  <Link
                    key={`${group.id}-${tool.name}`}
                    href={href}
                    className={cn(
                      "block rounded px-1.5 py-1 text-xs leading-tight transition-colors",
                      active
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {tool.name}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

/* =============================================================================
   Main component — Clean sectioned layout
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
  const [signalsDismissed, setSignalsDismissed] = React.useState(false);
  const [localProject, setLocalProject] = React.useState(project);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = React.useState(false);

  const refreshProject = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}`);
      if (!res.ok) throw new Error("Failed to refresh project");
      const latest = (await res.json()) as Project;
      setLocalProject(latest);
    } catch {
      toast.error("Failed to refresh project details");
    }
  }, [project.id]);

  // Budget data
  const { budgetData: fullBudgetData, grandTotals } = useBudgetData(String(project.id));
  const { data: scheduleData } = useScheduleTasks({ projectId: String(project.id), enabled: true });

  const projectedOverUnder = grandTotals.projectedOverUnder;
  const commitmentPct = grandTotals.revisedBudget > 0 ? (grandTotals.committedCosts / grandTotals.revisedBudget) * 100 : 0;
  const totalPending = grandTotals.pendingChanges + grandTotals.pendingCostChanges;

  // Team members
  const teamMembers = React.useMemo((): TeamMember[] => {
    if (!project.team_members || !Array.isArray(project.team_members)) return [];
    return project.team_members.map((member) => {
      const parsed = typeof member === "string" ? (() => { try { return JSON.parse(member); } catch { return { name: member, role: "" }; } })() : member;
      const role = String(parsed?.role || "").toLowerCase();
      const type = String(parsed?.type || parsed?.person_type || "").toLowerCase();
      let category: "team" | "contact" | "subcontractor" = "team";
      if (type === "subcontractor" || role.includes("subcontractor") || role.includes("sub ")) category = "subcontractor";
      else if (type === "contact" || role.includes("client") || role.includes("owner") || role.includes("architect") || role.includes("engineer") || role.includes("inspector")) category = "contact";
      if (parsed?.category === "contact" || parsed?.category === "subcontractor" || parsed?.category === "team") category = parsed.category;
      return {
        name: String(parsed?.name || "Team Member"),
        role: String(parsed?.role || ""),
        company: parsed?.company ? String(parsed.company) : undefined,
        email: parsed?.email ? String(parsed.email) : undefined,
        phone: parsed?.phone || parsed?.mobile || parsed?.office ? String(parsed.phone || parsed.mobile || parsed.office) : undefined,
        category,
      };
    });
  }, [project.team_members]);

  const directoryGroups = React.useMemo(() => ({
    team: teamMembers.filter((m) => m.category === "team"),
    contact: teamMembers.filter((m) => m.category === "contact"),
    subcontractor: teamMembers.filter((m) => m.category === "subcontractor"),
  }), [teamMembers]);

  // Financial calculations
  const totalBudget = budget.reduce((sum, item) => sum + (item.original_amount || 0), 0);
  const committed = commitments.reduce((sum, c) => sum + (c.contract_amount || 0), 0);
  const remaining = Math.max(totalBudget - committed, 0);
  const budgetUtilization = totalBudget > 0 ? (committed / totalBudget) * 100 : 0;
  const hasBudgetData = totalBudget > 0;

  // Derived
  const openRfis = rfis.filter((r) => r.status?.toLowerCase() !== "closed");
  const openChangeEvents = changeEvents.filter((e) => e.status === "open");
  const pendingChangeOrders = changeOrders.filter((co) => co.status?.toLowerCase() === "pending" || co.status?.toLowerCase() === "draft" || co.status?.toLowerCase() === "open");
  const lastDailyLog = dailyLogs.length > 0 ? dailyLogs[0] : null;

  // Project health
  const projectHealth = React.useMemo(() => {
    let score = 0;
    let factors = 0;
    if (hasBudgetData) { factors++; score += budgetUtilization <= 75 ? 100 : budgetUtilization <= 90 ? 60 : 20; }
    const totalOpenItems = openRfis.length + openChangeEvents.length;
    factors++;
    score += totalOpenItems <= 3 ? 100 : totalOpenItems <= 8 ? 60 : 20;
    if (hasBudgetData && fullBudgetData.length > 0) { factors++; score += projectedOverUnder >= 0 ? 100 : projectedOverUnder > -50000 ? 60 : 20; }
    if (schedule.length > 0) {
      factors++;
      const overdueTasks = schedule.filter((t: any) => t.end_date && new Date(t.end_date) < new Date() && t.status !== "completed" && t.status !== "complete" && t.status !== "done");
      const overdueRatio = overdueTasks.length / schedule.length;
      score += overdueRatio <= 0.05 ? 100 : overdueRatio <= 0.15 ? 60 : 20;
    }
    const avg = factors > 0 ? score / factors : 50;
    return avg >= 75 ? "good" as const : avg >= 45 ? "warn" as const : "bad" as const;
  }, [hasBudgetData, budgetUtilization, openRfis.length, openChangeEvents.length, projectedOverUnder, fullBudgetData, schedule]);

  // Schedule metrics
  const scheduleMetrics = React.useMemo(() => {
    const allTasks = schedule.length > 0 ? schedule : tasks;
    if (allTasks.length === 0) return null;
    const completedTasks = allTasks.filter((t: any) => t.status === "completed" || t.status === "complete" || t.status === "done").length;
    const totalTasks = allTasks.length;
    const pctComplete = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const overdueTasks = allTasks.filter((t: any) => { const endDate = t.end_date || t.due_date; if (!endDate) return false; return new Date(endDate) < new Date() && t.status !== "completed" && t.status !== "complete" && t.status !== "done"; });
    return { completedTasks, totalTasks, pctComplete, overdueTasks: overdueTasks.length };
  }, [schedule, tasks]);

  // Signals
  const signals = React.useMemo(() => {
    const list: Array<{ id: string; severity: "critical" | "warning" | "info"; label: string; href?: string }> = [];
    if (hasBudgetData && budgetUtilization > 90) list.push({ id: "budget-critical", severity: "critical", label: `Budget ${budgetUtilization.toFixed(0)}% committed`, href: `/${project.id}/budget` });
    else if (hasBudgetData && budgetUtilization > 75) list.push({ id: "budget-warn", severity: "warning", label: `Budget ${budgetUtilization.toFixed(0)}% committed`, href: `/${project.id}/budget` });
    if (openRfis.length > 3) list.push({ id: "rfis", severity: openRfis.length > 8 ? "warning" : "info", label: `${openRfis.length} open RFIs`, href: `/${project.id}/rfis` });
    if (pendingChangeOrders.length > 0) { const val = pendingChangeOrders.reduce((s, co) => s + (co.amount || 0), 0); list.push({ id: "cos", severity: pendingChangeOrders.length > 5 ? "warning" : "info", label: `${pendingChangeOrders.length} change orders · ${formatCompactCurrency(val)}`, href: `/${project.id}/change-orders` }); }
    if (openChangeEvents.length > 0) list.push({ id: "ce", severity: "info", label: `${openChangeEvents.length} open change events`, href: `/${project.id}/change-events` });
    if (schedule.length > 0) { const overdue = schedule.filter((t) => t.end_date && new Date(t.end_date) < new Date() && t.status !== "completed" && t.status !== "complete" && t.status !== "done"); if (overdue.length > 0) list.push({ id: "schedule-overdue", severity: overdue.length > 5 ? "critical" : "warning", label: `${overdue.length} schedule tasks overdue`, href: `/${project.id}/schedule` }); }
    return list.slice(0, 5);
  }, [hasBudgetData, budgetUtilization, openRfis.length, pendingChangeOrders, openChangeEvents.length, schedule, project.id]);

  // Activity items
  const activityItems = React.useMemo(() => {
    const items: Array<{ text: React.ReactNode; href?: string; color: "blue" | "green" | "amber" | "red" }> = [];
    if (pendingChangeOrders.length > 0) { const latest = pendingChangeOrders[0]; items.push({ text: <><strong>{latest.title || `CO #${latest.co_number}`}</strong> pending approval{latest.amount ? ` · ${formatCompactCurrency(latest.amount)}` : ""}</>, href: `/${project.id}/change-orders`, color: "amber" }); }
    if (openRfis.length > 0) items.push({ text: <><strong>{openRfis.length} RFI{openRfis.length !== 1 ? "s" : ""}</strong> awaiting response</>, href: `/${project.id}/rfis`, color: "blue" });
    if (lastDailyLog) items.push({ text: <><strong>Daily log</strong> filed {format(new Date(lastDailyLog.created_at || Date.now()), "MMM d")}</>, href: `/${project.id}/daily-log`, color: "green" });
    if (commitments.length > 0) { const executed = commitments.filter((c) => c.executed).length; items.push({ text: <><strong>{executed}/{commitments.length}</strong> commitments executed</>, href: `/${project.id}/commitments`, color: executed === commitments.length ? "green" : "blue" }); }
    return items.slice(0, 5);
  }, [pendingChangeOrders, openRfis, lastDailyLog, commitments, project.id]);

  // Meta
  const projectMeta = [localProject.type, localProject.project_sector, localProject.current_phase].filter(Boolean).join(" · ");

  // Budget breakdown
  const budgetBreakdown = React.useMemo(() => {
    if (!hasBudgetData) return [];
    const items = [
      { label: "Committed", value: committed, pct: (committed / totalBudget) * 100 },
      { label: "Remaining", value: remaining, pct: (remaining / totalBudget) * 100 },
    ];
    const pendingValue = pendingChangeOrders.reduce((sum, co) => sum + (co.amount || 0), 0);
    if (pendingValue > 0) items.push({ label: "Pending COs", value: pendingValue, pct: (pendingValue / totalBudget) * 100 });
    return items;
  }, [hasBudgetData, committed, remaining, totalBudget, pendingChangeOrders]);

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER — Clean sectioned layout with generous whitespace
     ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-background">
      <EditProjectDialog
        project={toPortfolioProject(localProject)}
        open={isEditProjectDialogOpen}
        onOpenChange={setIsEditProjectDialogOpen}
        onSuccess={refreshProject}
      />
      <div className="px-8 sm:px-12 pb-24">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_18rem] gap-8">
          <div className="space-y-6">

        {/* ── HERO: Project header ── */}
        <div className="pt-6 pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                {localProject["job number"] && (
                  <span className="text-sm font-medium text-muted-foreground tabular-nums">
                    {localProject["job number"]}
                  </span>
                )}
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full flex-shrink-0",
                    projectHealth === "good" && "bg-green-500",
                    projectHealth === "warn" && "bg-amber-500",
                    projectHealth === "bad" && "bg-red-500"
                  )}
                  title={projectHealth === "good" ? "On track" : projectHealth === "warn" ? "Needs attention" : "At risk"}
                />
              </div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                {localProject.name || "Untitled Project"}
              </h1>
              {(projectMeta || localProject.client) && (
                <p className="text-sm text-muted-foreground mt-1">
                  {[projectMeta, localProject.client].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditProjectDialogOpen(true)}
              >
                Edit Project
              </Button>
              <ProjectChecklistSidebar
                projectId={String(project.id)}
                projectName={project.name || project["job number"] || "Project"}
                buttonVariant="ghost"
                buttonSize="sm"
                buttonLabel="Project Setup"
                className="h-8 px-2 text-muted-foreground hover:text-foreground shadow-none"
              />
            </div>
          </div>
        </div>

        {/* ── SIGNALS — alert chips ── */}
        {signals.length > 0 && !signalsDismissed && (
          <div className="flex items-center gap-2 flex-wrap">
            {signals.map((signal) => (
              <SignalChip key={signal.id} label={signal.label} severity={signal.severity} href={signal.href} />
            ))}
            <button onClick={() => setSignalsDismissed(true)} className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors ml-1" aria-label="Dismiss signals">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── TASKS ── */}
        <Section
          title="Tasks"
          action={
            tasks.length > 0 ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                {tasks.filter((t) => t.status === "done" || t.status === "completed").length}/{tasks.length} done
              </span>
            ) : undefined
          }
        >
          <div className="px-6 py-5">
            {tasks.length > 0 ? (
              <div className="space-y-1">
                {tasks
                  .filter((t) => t.status !== "done" && t.status !== "completed" && t.status !== "cancelled")
                  .slice(0, 8)
                  .map((task) => {
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                    return (
                      <div key={task.id} className="flex items-start gap-2.5 py-1.5">
                        <div className={cn("h-4 w-4 rounded-full border-2 flex-shrink-0 mt-0.5", task.priority === "urgent" || task.priority === "critical" ? "border-red-400" : task.priority === "high" ? "border-amber-400" : "border-border")} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground leading-snug line-clamp-2">{task.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {task.assignee_name && <span className="text-xs text-muted-foreground truncate">{task.assignee_name}</span>}
                            {task.due_date && <span className={cn("text-xs tabular-nums", isOverdue ? "text-red-500" : "text-muted-foreground")}>{format(new Date(task.due_date), "MMM d")}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {tasks.filter((t) => t.status !== "done" && t.status !== "completed" && t.status !== "cancelled").length > 8 && (
                  <p className="text-xs text-muted-foreground/40 pt-1">+{tasks.filter((t) => t.status !== "done" && t.status !== "completed" && t.status !== "cancelled").length - 8} more</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tasks yet. Tasks are captured from meetings and AI assistant.</p>
            )}
          </div>
        </Section>

        {/* ── Meetings ── */}
          {/* Meetings */}
          {meetings.length > 0 && (
            <Section className="sm:col-span-3">
                <MeetingsSection meetings={meetings} projectId={project.id} maxItems={5} />
            </Section>
          )}


        {/* ── Directory ── */}

          {/* Directory */}
          <Section
            title="Project Directory"
            action={
              <Link href={`/${project.id}/directory/users`} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            }
            className={meetings.length > 0 ? "sm:col-span-2" : "sm:col-span-5"}
          >
            <div className="px-6 py-5 space-y-6">
              <RoleBasedTeamSection projectId={project.id} />
              <DirectorySubSection title="Project Members" addLabel="Add project member" members={directoryGroups.contact} allMembers={teamMembers} projectId={project.id} sectionKey="contact" userType="member" />
              <DirectorySubSection title="Subcontractors" addLabel="Add subcontractor" members={directoryGroups.subcontractor} allMembers={teamMembers} projectId={project.id} sectionKey="subcontractor" userType="subcontractor" />
            </div>
          </Section>


        {/* ── RECENT ACTIVITY ── */}
        <Section title="Recent Activity">
          <div className="px-6 py-5">
            {activityItems.length > 0 ? (
              <div className="space-y-3">
                {activityItems.map((item, i) => {
                  const dotColor = { blue: "bg-primary", green: "bg-green-500", amber: "bg-amber-500", red: "bg-red-500" }[item.color];
                  const inner = (
                    <div className="flex items-start gap-3">
                      <div className={cn("h-1.5 w-1.5 rounded-full mt-2 flex-shrink-0", dotColor)} />
                      <p className="text-sm text-foreground leading-relaxed">{item.text}</p>
                    </div>
                  );
                  return item.href ? (
                    <Link key={i} href={item.href} className="block hover:bg-muted/30 -mx-2 px-2 py-1 rounded transition-colors">{inner}</Link>
                  ) : (
                    <div key={i} className="py-1">{inner}</div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </div>
        </Section>

        {/* ── EMPTY STATE ── */}
        {meetings.length === 0 && openRfis.length === 0 && changeOrders.length === 0 && tasks.length === 0 && teamMembers.length === 0 && !hasBudgetData && (
          <div className="py-16 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No project activity yet.</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Add budget, meetings, RFIs, and tasks to populate this dashboard.</p>
          </div>
        )}
          </div>
          <ProjectToolsSidebar projectId={project.id} />
        </div>
      </div>

      <AiWidget projectId={project.id} />
    </div>
  );
}
