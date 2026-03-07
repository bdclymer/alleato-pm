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
  Loader2,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Check,
  Building2,
  ChevronsUpDown,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectChecklistSidebar } from "@/components/project/project-checklist-sidebar";
import { CompanyFormDialog } from "@/components/domain/companies/CompanyFormDialog";
import { createCompany } from "@/app/(other)/actions/table-actions";
import type { CompanyFormData } from "@/lib/schemas/financial-schemas";
import { MeetingsSection } from "./meetings-section";
import { useBudgetData } from "@/hooks/use-budget-data";
import { useProjectRoles } from "@/hooks/use-project-roles";
import { useScheduleTasks } from "@/hooks/use-schedule-tasks";
import { GanttChart } from "@/components/scheduling/gantt-chart";
import type { ProjectRole } from "@/hooks/use-project-roles";
import type { Database } from "@/types/database.types";
import { cn } from "@/lib/utils";

/* =============================================================================
   Types
   ============================================================================= */

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "TM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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
  const [activeRoleId, setActiveRoleId] = React.useState<string | null>(null);
  const [searchValue, setSearchValue] = React.useState("");
  const [availablePeople, setAvailablePeople] = React.useState<
    { id: string; first_name: string; last_name: string; email: string | null; job_title: string | null; company_name?: string | null }[]
  >([]);
  const [peopleLoading, setPeopleLoading] = React.useState(false);
  const [assigning, setAssigning] = React.useState(false);

  React.useEffect(() => {
    if (!activeRoleId) return;
    let cancelled = false;
    async function fetchPeople() {
      setPeopleLoading(true);
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase
          .from("people")
          .select("id, first_name, last_name, email, job_title, company:companies(name)")
          .eq("person_type", "employee")
          .order("last_name", { ascending: true })
          .limit(100);
        if (!cancelled) {
          setAvailablePeople(
            (data || []).map((p) => ({
              id: p.id,
              first_name: p.first_name || "",
              last_name: p.last_name || "",
              email: p.email,
              job_title: p.job_title,
              company_name: (p.company as { name?: string } | null)?.name || null,
            })),
          );
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setPeopleLoading(false);
      }
    }
    fetchPeople();
    return () => { cancelled = true; };
  }, [activeRoleId]);

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
      } catch {
        toast.error("Failed to assign role");
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
          <div className="flex-1 cursor-default" onClick={() => setOpen(false)} />
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

/* =============================================================================
   Inline Editing — Project Details
   ============================================================================= */
const CELL_INPUT_CLS =
  "w-full bg-transparent text-sm leading-snug text-foreground outline-none border-0 ring-0 " +
  "px-2 py-1 rounded-sm " +
  "hover:bg-muted/30 focus:bg-primary/5 " +
  "transition-colors duration-100 " +
  "placeholder:text-muted-foreground/30";

function InlineTextCell({ value, placeholder = "—", onSave, type = "text" }: { value: string; placeholder?: string; onSave: (v: string) => void; type?: "text" | "date" }) {
  const [draft, setDraft] = React.useState(value);
  const pristine = React.useRef(value);
  React.useEffect(() => { setDraft(value); pristine.current = value; }, [value]);
  return (
    <input
      type={type} value={draft} placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== pristine.current) { pristine.current = draft; onSave(draft); } }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setDraft(pristine.current); (e.target as HTMLInputElement).blur(); } }}
      className={CELL_INPUT_CLS}
    />
  );
}

function InlineSelectCell({ value, options, placeholder = "Select…", onSave }: { value: string; options: string[]; placeholder?: string; onSave: (v: string) => void }) {
  return (
    <Select value={value || undefined} onValueChange={onSave}>
      <SelectTrigger variant="inline" className={cn("w-full h-auto bg-transparent text-sm leading-snug text-foreground px-2 py-1 rounded-sm border-0 shadow-none hover:bg-muted/30 focus:bg-primary/5 transition-colors duration-100", !value && "text-muted-foreground/30")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function InlineCompanyCombobox({ value, placeholder = "Select client…", onSave }: { value: string; placeholder?: string; onSave: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [companies, setCompanies] = React.useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ per_page: "50" });
    if (search) params.set("search", search);
    fetch(`/api/directory/companies?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((res) => { setCompanies((res.data || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))); })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [open, search]);

  const handleCreateCompany = async (data: CompanyFormData) => {
    const result = await createCompany(data);
    if (result.error) return result;
    onSave(data.name);
    setShowCreateDialog(false);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" role="combobox" aria-expanded={open} className={cn("w-full flex items-center justify-between text-left text-sm leading-snug px-2 py-1 rounded-sm border-0 bg-transparent hover:bg-muted/30 focus:bg-primary/5 transition-colors duration-100 outline-none", value ? "text-foreground" : "text-muted-foreground/30")}>
            <span className="truncate">{value || placeholder}</span>
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-30" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search companies…" value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>{loading ? <span className="text-muted-foreground text-xs">Searching…</span> : <span className="text-muted-foreground text-xs">No companies found</span>}</CommandEmpty>
              <CommandGroup>
                {companies.map((company) => (
                  <CommandItem key={company.id} value={company.name} onSelect={() => { onSave(company.name); setOpen(false); setSearch(""); }}>
                    <Building2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{company.name}</span>
                    {value === company.name && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem onSelect={() => { setShowCreateDialog(true); setOpen(false); setSearch(""); }} className="text-primary">
                  <Plus className="mr-2 h-3.5 w-3.5" />Create new company
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <CompanyFormDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onCreate={handleCreateCompany} />
    </>
  );
}

function InlineTextareaCell({ value, placeholder = "—", onSave }: { value: string; placeholder?: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = React.useState(value);
  const pristine = React.useRef(value);
  React.useEffect(() => { setDraft(value); pristine.current = value; }, [value]);
  return (
    <textarea
      value={draft} placeholder={placeholder} rows={2}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== pristine.current) { pristine.current = draft; onSave(draft); } }}
      onKeyDown={(e) => { if (e.key === "Escape") { setDraft(pristine.current); (e.target as HTMLTextAreaElement).blur(); } }}
      className={cn(CELL_INPUT_CLS, "resize-none")}
    />
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1.5 hover:bg-muted/20 transition-colors duration-75 rounded-sm">
      <span className="w-28 shrink-0 text-xs text-muted-foreground select-none">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

const DETAIL_STAGE_OPTS = ["Bidding", "Course of Construction", "Post-Construction", "Pre-Construction", "Speculative", "Warranty"];
const DETAIL_PHASE_OPTS = ["Planning", "Estimating", "Current", "Complete", "Loss", "Archive"];
const DETAIL_TYPE_OPTS = ["New Build", "Addition", "Fit-Out", "Maintenance", "Restoration"];
const DETAIL_SECTOR_OPTS = ["Commercial", "Industrial", "Infrastructure", "Healthcare", "Institutional", "Residential"];
const DETAIL_SCOPE_OPTS = ["Ground-Up Construction", "Renovation", "Tenant Improvement", "Interior Build-Out", "Maintenance"];
const DETAIL_DELIVERY_OPTS = ["Design-Bid-Build", "Design-Build", "Construction Management at Risk", "Integrated Project Delivery"];

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
  const router = useRouter();
  const [signalsDismissed, setSignalsDismissed] = React.useState(false);
  const [localProject, setLocalProject] = React.useState(project);


  const saveProjectField = React.useCallback(
    async (payload: Record<string, unknown>) => {
      try {
        const res = await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to save");
        setLocalProject((prev) => ({ ...prev, ...(payload as Partial<Project>) }));
      } catch {
        toast.error("Failed to save");
      }
    },
    [project.id]
  );

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

  // Completion countdown
  const completionInfo = React.useMemo(() => {
    if (!localProject["est completion"]) return null;
    try {
      const completion = new Date(localProject["est completion"]!);
      const now = new Date();
      const daysRemaining = Math.floor((completion.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const monthsRemaining = Math.round(daysRemaining / 30);
      return {
        date: format(completion, "MMM yyyy"),
        daysRemaining,
        monthsRemaining,
        label: daysRemaining > 60 ? `${monthsRemaining} mo` : daysRemaining > 0 ? `${daysRemaining}d` : "Overdue",
        isPast: daysRemaining <= 0,
      };
    } catch { return null; }
  }, [localProject]);

  // Signals
  const signals = React.useMemo(() => {
    const list: Array<{ id: string; severity: "critical" | "warning" | "info"; label: string; href?: string }> = [];
    if (hasBudgetData && budgetUtilization > 90) list.push({ id: "budget-critical", severity: "critical", label: `Budget ${budgetUtilization.toFixed(0)}% committed`, href: `/${project.id}/budget` });
    else if (hasBudgetData && budgetUtilization > 75) list.push({ id: "budget-warn", severity: "warning", label: `Budget ${budgetUtilization.toFixed(0)}% committed`, href: `/${project.id}/budget` });
    if (openRfis.length > 3) list.push({ id: "rfis", severity: openRfis.length > 8 ? "warning" : "info", label: `${openRfis.length} open RFIs`, href: `/${project.id}/rfis` });
    if (pendingChangeOrders.length > 0) { const val = pendingChangeOrders.reduce((s, co) => s + (co.amount || 0), 0); list.push({ id: "cos", severity: pendingChangeOrders.length > 5 ? "warning" : "info", label: `${pendingChangeOrders.length} change orders · ${formatCompactCurrency(val)}`, href: `/${project.id}/change-orders` }); }
    if (openChangeEvents.length > 0) list.push({ id: "ce", severity: "info", label: `${openChangeEvents.length} open change events`, href: `/${project.id}/change-events` });
    if (schedule.length > 0) { const overdue = schedule.filter((t) => t.end_date && new Date(t.end_date) < new Date() && t.status !== "completed" && t.status !== "complete" && t.status !== "done"); if (overdue.length > 0) list.push({ id: "schedule-overdue", severity: overdue.length > 5 ? "critical" : "warning", label: `${overdue.length} schedule tasks overdue`, href: `/${project.id}/schedule` }); }
    if (project["est completion"]) { try { const d = Math.floor((new Date(project["est completion"]).getTime() - Date.now()) / (1000 * 60 * 60 * 24)); if (d > 0 && d < 60) list.push({ id: "completion", severity: d < 30 ? "critical" : "warning", label: `${d} days to completion` }); } catch {} }
    return list.slice(0, 5);
  }, [hasBudgetData, budgetUtilization, openRfis.length, pendingChangeOrders, openChangeEvents.length, project, schedule]);

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
      <div className="px-8 sm:px-12 pb-24 space-y-6">

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
              {completionInfo && (
                <div className={cn("hidden sm:flex items-center gap-1.5 text-sm", completionInfo.isPast ? "text-red-600" : "text-muted-foreground")}>
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{completionInfo.date}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className={cn("font-medium", completionInfo.isPast ? "text-red-600" : completionInfo.daysRemaining < 60 ? "text-amber-600" : "text-muted-foreground")}>
                    {completionInfo.label}
                  </span>
                </div>
              )}
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

        {/* ── PROJECT DETAILS — inline fields below heading ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-0">
          <div>
            <FieldRow label="Name"><InlineTextCell value={localProject.name || ""} placeholder="Project name" onSave={(v) => saveProjectField({ name: v })} /></FieldRow>
            <FieldRow label="Job Number"><InlineTextCell value={localProject["job number"] || ""} placeholder="e.g. PRJ-001" onSave={(v) => saveProjectField({ "job number": v })} /></FieldRow>
            <FieldRow label="Client"><InlineCompanyCombobox value={localProject.client || ""} placeholder="Select client…" onSave={(v) => saveProjectField({ client: v })} /></FieldRow>
            <FieldRow label="Stage"><InlineSelectCell value={localProject.current_phase || ""} options={DETAIL_STAGE_OPTS} placeholder="Select stage" onSave={(v) => saveProjectField({ current_phase: v })} /></FieldRow>
            <FieldRow label="Phase"><InlineSelectCell value={localProject.phase || ""} options={DETAIL_PHASE_OPTS} placeholder="Select phase" onSave={(v) => saveProjectField({ phase: v })} /></FieldRow>
            <FieldRow label="Start Date"><InlineTextCell value={localProject["start date"] || ""} type="date" onSave={(v) => saveProjectField({ "start date": v })} /></FieldRow>
          </div>
          <div>
            <FieldRow label="Type"><InlineSelectCell value={localProject.type || ""} options={DETAIL_TYPE_OPTS} placeholder="Select type" onSave={(v) => saveProjectField({ type: v, category: v })} /></FieldRow>
            <FieldRow label="Sector"><InlineSelectCell value={localProject.project_sector || ""} options={DETAIL_SECTOR_OPTS} placeholder="Select sector" onSave={(v) => saveProjectField({ project_sector: v })} /></FieldRow>
            <FieldRow label="Work Scope"><InlineSelectCell value={localProject.work_scope || ""} options={DETAIL_SCOPE_OPTS} placeholder="Select scope" onSave={(v) => saveProjectField({ work_scope: v })} /></FieldRow>
            <FieldRow label="Delivery"><InlineSelectCell value={localProject.delivery_method || ""} options={DETAIL_DELIVERY_OPTS} placeholder="Select method" onSave={(v) => saveProjectField({ delivery_method: v })} /></FieldRow>
            <FieldRow label="Est. Completion"><InlineTextCell value={localProject["est completion"] || ""} type="date" onSave={(v) => saveProjectField({ "est completion": v })} /></FieldRow>
            <FieldRow label="Address"><InlineTextCell value={localProject.address || ""} placeholder="Street address" onSave={(v) => saveProjectField({ address: v })} /></FieldRow>
          </div>
        </div>
        <div>
          <FieldRow label="Description">
            <InlineTextareaCell value={localProject.summary || ""} placeholder="Add project description…" onSave={(v) => saveProjectField({ summary: v })} />
          </FieldRow>
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

        {/* ── KPI CARDS — 4 metrics ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total Budget",
              value: hasBudgetData ? formatCompactCurrency(totalBudget) : "$0",
              sub: hasBudgetData ? "Original contract value" : "No budget set",
              href: `/${project.id}/budget`,
            },
            {
              label: "Committed",
              value: committed > 0 ? formatCompactCurrency(committed) : "$0",
              sub: hasBudgetData && committed > 0 ? `${budgetUtilization.toFixed(0)}% of budget` : "No contracts yet",
              href: `/${project.id}/commitments`,
              signal: budgetUtilization > 90 ? "bad" as const : budgetUtilization > 75 ? "warn" as const : undefined,
            },
            {
              label: "Projected Over/Under",
              value: hasBudgetData && fullBudgetData.length > 0 ? `${projectedOverUnder >= 0 ? "+" : ""}${formatCompactCurrency(projectedOverUnder)}` : "$0",
              sub: hasBudgetData && fullBudgetData.length > 0 ? (projectedOverUnder >= 0 ? "Under budget" : "Over budget") : "No budget data",
              href: `/${project.id}/budget`,
              signal: hasBudgetData && fullBudgetData.length > 0 ? (projectedOverUnder >= 0 ? "good" as const : projectedOverUnder < -50000 ? "bad" as const : "warn" as const) : undefined,
            },
            {
              label: "Schedule",
              value: scheduleMetrics ? `${scheduleMetrics.pctComplete.toFixed(0)}%` : "0%",
              sub: scheduleMetrics ? (scheduleMetrics.overdueTasks > 0 ? `${scheduleMetrics.overdueTasks} task${scheduleMetrics.overdueTasks !== 1 ? "s" : ""} overdue` : `${scheduleMetrics.completedTasks}/${scheduleMetrics.totalTasks} tasks done`) : "0/0 tasks done",
              href: `/${project.id}/schedule`,
              signal: scheduleMetrics ? (scheduleMetrics.overdueTasks > 3 ? "bad" as const : scheduleMetrics.overdueTasks > 0 ? "warn" as const : "good" as const) : undefined,
            },
          ].map((kpi) => (
            <Link key={kpi.label} href={kpi.href} className="block">
              <div className="rounded-lg p-5 bg-muted hover:bg-muted transition-colors h-full">
                <p className="text-xs font-medium text-muted-foreground mb-3">{kpi.label}</p>
                <p className={cn(
                  "text-2xl font-bold tracking-tight tabular-nums",
                  kpi.signal === "bad" ? "text-red-600" : kpi.signal === "warn" ? "text-amber-600" : kpi.signal === "good" ? "text-green-600" : "text-foreground"
                )}>
                  {kpi.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
              </div>
            </Link>
          ))}
        </div>


        {/* ── SCHEDULE — progress + Gantt ── */}
        <Section
          title="Schedule"
          action={
            <div className="flex items-center gap-2">
              <Link href={`/${project.id}/schedule`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">View full schedule →</Link>
              <Link href={`/${project.id}/schedule`}>
                <Button size="sm" variant="outline" className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" />Add Task</Button>
              </Link>
            </div>
          }
        >
          {/* Progress bar */}
          {scheduleMetrics && scheduleMetrics.totalTasks > 0 && (
            <div className="px-6 py-4">
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-foreground">{scheduleMetrics.completedTasks} of {scheduleMetrics.totalTasks} tasks complete</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">{scheduleMetrics.pctComplete.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", scheduleMetrics.overdueTasks > 3 ? "bg-red-400" : scheduleMetrics.overdueTasks > 0 ? "bg-amber-400" : "bg-primary/70")} style={{ width: `${Math.min(scheduleMetrics.pctComplete, 100)}%` }} />
                  </div>
                </div>
                {scheduleMetrics.overdueTasks > 0 && (
                  <div className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-500/10">
                    <Clock className="h-3 w-3 text-red-600" />
                    <span className="text-xs font-medium text-red-600 tabular-nums">{scheduleMetrics.overdueTasks} overdue</span>
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

          {/* Gantt chart */}
          {scheduleData?.ganttData && scheduleData.ganttData.length > 0 ? (
            <div className="h-[400px] overflow-auto">
              <GanttChart data={scheduleData.ganttData} />
            </div>
          ) : schedule.length > 0 ? (
            <div className="h-[400px] overflow-auto">
              <GanttChart
                data={schedule.map((t: any) => {
                  const finishDate = t.finish_date || t.end_date || new Date().toISOString().split("T")[0];
                  const isOverdue = finishDate ? new Date(finishDate) < new Date() && t.status !== "completed" && t.status !== "complete" : false;
                  return {
                    id: String(t.id), name: String(t.name || "Untitled"),
                    start_date: String(t.start_date || new Date().toISOString().split("T")[0]),
                    finish_date: String(finishDate), duration_days: Number(t.duration_days) || 1,
                    percent_complete: Number(t.percent_complete) || 0,
                    status: (t.status === "completed" || t.status === "complete" ? "complete" : t.status === "in_progress" ? "in_progress" : "not_started") as "complete" | "in_progress" | "not_started",
                    is_milestone: Boolean(t.is_milestone), parent_task_id: (t.parent_task_id as string | null) || null,
                    level: Number(t.level) || 0, dependencies: [] as Array<{ predecessor_id: string; type: "finish_to_start"; lag_days: number }>,
                    is_overdue: isOverdue,
                  };
                })}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <p className="text-sm text-muted-foreground mb-2">No schedule set up yet</p>
              <Link href={`/${project.id}/schedule`} className="text-sm font-medium text-primary hover:underline">Create schedule →</Link>
            </div>
          )}
        </Section>

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

        {/* ── BOTTOM ROW: Meetings + Directory ── */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
          {/* Meetings */}
          {meetings.length > 0 && (
            <Section className="sm:col-span-3">
              <div className="px-6 py-5">
                <MeetingsSection meetings={meetings} projectId={project.id} maxItems={5} />
              </div>
            </Section>
          )}

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
        </div>

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

      <AiWidget projectId={project.id} />
    </div>
  );
}
