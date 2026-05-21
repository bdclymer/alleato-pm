"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  UserX,
  Package,
  Mail,
  Download,
  Search,
  SlidersHorizontal,
  X,
  ChevronsUpDown,
} from "lucide-react";
import {
  Button,
  Avatar,
  AvatarFallback,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Input,
  Label,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ds";
import { PageShell } from "@/components/layout";
import { DataTable } from "@/components/tables/DataTable";
import { AssignMemberDialog } from "@/components/domain/directory/AssignMemberDialog";
import { CompanyDetailSheet } from "@/components/domain/directory/CompanyDetailSheet";
import { type ColumnDef } from "@tanstack/react-table";
import { useProjectRoles, type ProjectRole } from "@/hooks/use-project-roles";
import { useProjectUsers } from "@/hooks/use-project-users";
import { useProjectVendors } from "@/hooks/use-project-vendors";
import {
  useProjectCompanies,
  useUpdateProjectCompany,
} from "@/hooks/use-project-companies";
import { usePermissionTemplates } from "@/hooks/use-permissions";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, ApiError } from "@/lib/api-client";
import { filterProjectMembers } from "@/lib/directory/project-members";
import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";
import {
  type PermissionModule,
  type PermissionLevel,
  type GranularFlag,
  ALL_MODULES,
  GRANULAR_FLAG_LABELS,
} from "@/lib/permissions-shared";
import { Check, ShieldCheck, UserPlus } from "lucide-react";
import { appToast as toast } from "@/lib/toast/app-toast";
import type { PersonWithDetails } from "@/services/directoryService";

// ─── Types ───────────────────────────────────────────────────────

type RoleRow = { id: string; role: ProjectRole; member: ProjectRole["members"][0] | null };

interface PersonOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  job_title: string | null;
  company_name: string | null;
}


interface VendorOption {
  id: string;
  name: string;
  legal_name: string | null;
  vendor_class: string | null;
  contact_name: string | null;
  city: string | null;
  state: string | null;
  status: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────

function memberStatusLabel(
  membership: PersonWithDetails["membership"]
): string {
  const status = membership?.status || "inactive";
  const invite = membership?.invite_status;
  if (status === "inactive") return "Inactive";
  if (invite === "not_invited") return "Not Invited";
  if (invite === "invited") return "Invite Sent";
  return "Active";
}

function accessLevelLabel(
  permission?: { name: string } | null
): string {
  return permission?.name ?? "Standard";
}

function initials(first?: string | null, last?: string | null): string {
  return (
    `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?"
  );
}

// ─── Skeleton ────────────────────────────────────────────────────

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3"
        >
          <div className="h-8 w-8 rounded-full animate-pulse bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-36 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}


// ─── Local: Expandable search ─────────────────────────────────────

function ExpandableSearch({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  React.useEffect(() => {
    if (value) setExpanded(true);
  }, [value]);

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Search"
        onClick={() => setExpanded(true)}
        className="h-8 w-8 text-muted-foreground"
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="relative flex items-center">
      <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => { if (!value) setExpanded(false); }}
        placeholder={placeholder}
        className="h-8 w-44 pl-8 pr-7 text-sm"
        aria-label="Search"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => { onChange(""); inputRef.current?.focus(); }}
          className="absolute right-0 h-7 w-7 text-muted-foreground"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// ─── Local: Section heading row ───────────────────────────────────

function SectionRow({
  title,
  action,
  count,
  search,
  onSearch,
  searchPlaceholder,
  filterContent,
}: {
  title: string;
  action: React.ReactNode;
  count?: number;
  search?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
  filterContent?: React.ReactNode;
}) {
  const [filterOpen, setFilterOpen] = React.useState(false);

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Left: title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* eslint-disable-next-line design-system/no-raw-heading */}
        <h2 className="text-lg font-semibold text-foreground shrink-0">{title}</h2>
      </div>

      {/* Right: search + filter + count + action */}
      <div className="flex items-center gap-2 shrink-0">
        {onSearch !== undefined && (
          <ExpandableSearch
            value={search ?? ""}
            onChange={onSearch}
            placeholder={searchPlaceholder ?? `Search ${title.toLowerCase()}...`}
          />
        )}

        {filterContent && (
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Filters"
                className="h-8 w-8 text-muted-foreground"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
              <div className="border-b px-3 py-2.5">
                <p className="text-sm font-medium text-foreground">Filters</p>
              </div>
              <div className="p-3">{filterContent}</div>
            </PopoverContent>
          </Popover>
        )}

        {count !== undefined && (
          <>
            <div className="mx-1 h-4 w-px bg-border/60" />
            <span className="inline-flex h-6 items-center rounded-md bg-muted/60 px-2 text-[11px] font-medium text-muted-foreground">
              {count} {count === 1 ? "item" : "items"}
            </span>
          </>
        )}

        {action && <div className="ml-2">{action}</div>}
      </div>
    </div>
  );
}

// ─── Dialogs ─────────────────────────────────────────────────────

function CreateRoleDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim());
      setName("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-sm border-border/60 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-1">
          <DialogTitle className="text-lg tracking-tight">Create role</DialogTitle>
          <DialogDescription>
            Give the role a clear name. You&apos;ll assign members after.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-4 space-y-1.5">
          <Label htmlFor="role-name" className="text-xs font-medium text-muted-foreground">
            Role name
          </Label>
          <Input
            id="role-name"
            placeholder="e.g. Project Manager"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
            className="h-9"
          />
        </div>
        <DialogFooter className="px-6 pb-6 pt-2 gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Creating..." : "Create role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}) {
  const [people, setPeople] = React.useState<PersonOption[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setSelected(null);

    const supabase = createClient();
    supabase
      .from("people")
      .select(
        "id, first_name, last_name, email, job_title, company:companies!people_company_id_fkey(name)"
      )
      .order("first_name")
      .then(({ data }) => {
        if (data) {
          setPeople(
            data.map((p) => ({
              id: p.id,
              first_name: p.first_name,
              last_name: p.last_name,
              email: p.email,
              job_title: p.job_title,
              company_name:
                (p.company as { name?: string } | null)?.name ?? null,
            }))
          );
        }
      });
  }, [open]);

  const handleAdd = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiFetch(`/api/projects/${projectId}/directory/people`, {
        method: "POST",
        body: JSON.stringify({ person_id: selected }),
      });
      toast.success("Member added to project");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to add member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 w-full sm:max-w-lg border-border/60 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-1">
          <DialogTitle className="text-lg tracking-tight">Add member</DialogTitle>
          <DialogDescription>
            Add an existing person from your directory to this project.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-2">
          <Command className="overflow-visible" shouldFilter={true}>
            <CommandInput placeholder="Search people…" />
            <CommandList className="mt-2 max-h-72 -mx-1">
              <CommandEmpty>
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No people found.
                </div>
              </CommandEmpty>
              <CommandGroup className="p-0">
                {people.map((person) => {
                  const meta = [person.job_title, person.company_name]
                    .filter(Boolean)
                    .join(" · ");
                  const isSelected = selected === person.id;
                  return (
                    <CommandItem
                      key={person.id}
                      value={`${person.first_name} ${person.last_name} ${person.email ?? ""}`}
                      onSelect={() => setSelected(person.id)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
                        "data-[selected=true]:bg-accent/60",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/25 bg-transparent",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </div>
                      <div className="min-w-0 flex-1 flex items-baseline gap-2">
                        <span className="truncate text-sm text-foreground">
                          {person.first_name} {person.last_name}
                        </span>
                        {meta && (
                          <span className="truncate text-xs text-muted-foreground">
                            {meta}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
        <DialogFooter className="px-6 pb-6 pt-2 gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleAdd} disabled={!selected || saving}>
            {saving ? "Adding..." : "Add member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddVendorDialog({
  open,
  onOpenChange,
  existingVendorIds,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingVendorIds: string[];
  onAdd: (vendorId: string) => Promise<void>;
}) {
  const [allVendors, setAllVendors] = React.useState<VendorOption[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setSelected(null);
    const supabase = createClient();
    supabase
      .from("companies")
      .select(
        "id, name, legal_name, vendor_class, contact_name, city, state, status"
      )
      .eq("is_vendor", true)
      .order("name")
      .then(({ data }) => {
        if (data) setAllVendors(data as VendorOption[]);
      });
  }, [open]);

  const available = allVendors.filter(
    (v) => !existingVendorIds.includes(v.id)
  );

  const handleAdd = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await onAdd(selected);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md border-border/60 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-1">
          <DialogTitle className="text-lg tracking-tight">Add vendor</DialogTitle>
          <DialogDescription>
            Select a vendor from the company directory.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-2">
          <Command className="overflow-visible" shouldFilter={true}>
            <CommandInput placeholder="Search vendors…" />
            <CommandList className="mt-2 max-h-72 -mx-1">
              <CommandEmpty>
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No vendors found.
                </div>
              </CommandEmpty>
              <CommandGroup className="p-0">
                {available.map((vendor) => {
                  const meta = [
                    vendor.vendor_class,
                    vendor.city && vendor.state
                      ? `${vendor.city}, ${vendor.state}`
                      : (vendor.city ?? vendor.state),
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const isSelected = selected === vendor.id;
                  return (
                    <CommandItem
                      key={vendor.id}
                      value={`${vendor.name} ${vendor.legal_name ?? ""} ${vendor.vendor_class ?? ""}`}
                      onSelect={() => setSelected(vendor.id)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
                        "data-[selected=true]:bg-accent/60",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/25 bg-transparent",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </div>
                      <div className="min-w-0 flex-1 flex items-baseline gap-2">
                        <span className="truncate text-sm text-foreground">
                          {vendor.name}
                        </span>
                        {meta && (
                          <span className="truncate text-xs text-muted-foreground">
                            {meta}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
        <DialogFooter className="px-6 pb-6 pt-2 gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleAdd} disabled={!selected || saving}>
            {saving ? "Adding..." : "Add vendor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign Existing Company Dialog ──────────────────────────────

interface CompanyOption {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  vendor_class: string | null;
}

function AssignExistingCompanyDialog({
  open,
  onOpenChange,
  existingCompanyIds,
  projectId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCompanyIds: string[];
  projectId: string;
  onSuccess: () => void;
}) {
  const [allCompanies, setAllCompanies] = React.useState<CompanyOption[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setSelected(null);
    const supabase = createClient();
    supabase
      .from("companies")
      .select("id, name, city, state, vendor_class")
      .order("name")
      .then(({ data }) => {
        if (data) setAllCompanies(data as CompanyOption[]);
      });
  }, [open]);

  const available = allCompanies.filter((c) => !existingCompanyIds.includes(c.id));

  const handleAssign = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiFetch(`/api/projects/${projectId}/directory/companies`, {
        method: "POST",
        body: JSON.stringify({ company_id: selected }),
      });
      toast.success("Company assigned to project");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to assign company");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] gap-0 overflow-hidden border-border/60 p-0 sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-1">
          <DialogTitle className="text-lg tracking-tight">Add company</DialogTitle>
          <DialogDescription>
            Search and select an existing company to add to this project.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-2">
          <Command className="overflow-visible bg-transparent" shouldFilter={true}>
            <CommandInput className="bg-muted" placeholder="Search companies…" />
            <CommandList className="mt-3 max-h-72 -mx-1">
              <CommandEmpty>
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No companies found.
                </div>
              </CommandEmpty>
              <CommandGroup className="p-0">
                {available.map((company) => {
                  const meta = [
                    company.vendor_class,
                    company.city && company.state
                      ? `${company.city}, ${company.state}`
                      : (company.city ?? company.state),
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const isSelected = selected === company.id;
                  return (
                    <CommandItem
                      key={company.id}
                      value={`${company.name} ${company.city ?? ""} ${company.state ?? ""}`}
                      onSelect={() => setSelected(company.id)}
                      className={cn(
                        "flex min-w-0 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
                        "data-[selected=true]:bg-accent/60",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/25 bg-transparent",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="min-w-0 truncate text-sm text-foreground">
                          {company.name}
                        </span>
                        {meta && (
                          <span className="min-w-0 truncate text-xs text-muted-foreground">
                            {meta}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
        <DialogFooter className="px-6 pb-6 pt-2 gap-2">
          <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="w-full sm:w-auto" onClick={handleAssign} disabled={!selected || saving}>
            {saving ? "Adding..." : "Add company"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Project Team Section ────────────────────────────────────────

function ProjectTeamSection({
  projectId,
  manageRolesOpen,
  onManageRolesOpenChange,
}: {
  projectId: string;
  manageRolesOpen?: boolean;
  onManageRolesOpenChange?: (open: boolean) => void;
}) {
  const { roles, isLoading, updateRoleMembers, createRole, deleteRole } =
    useProjectRoles(projectId);
  const { confirm: confirmTeam, ConfirmDialog: TeamConfirmDialog } = useConfirm();
  const [search, setSearch] = React.useState("");
  const [assignDialog, setAssignDialog] = React.useState<{
    open: boolean;
    role: ProjectRole | null;
  }>({ open: false, role: null });
  const createRoleOpen = manageRolesOpen ?? false;
  const setCreateRoleOpen = (open: boolean) => {
    onManageRolesOpenChange?.(open);
  };

  const rows: RoleRow[] = roles.flatMap((role): RoleRow[] =>
    role.members.length > 0
      ? role.members.map((member) => ({ id: member.id, role, member }))
      : [{ id: role.id, role, member: null }]
  );

  const filteredRows = search
    ? rows.filter(
        (r) =>
          r.role.role_name.toLowerCase().includes(search.toLowerCase()) ||
          (r.member?.person?.full_name ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : rows;

  const handleDeleteRole = async (role: ProjectRole) => {
    const ok = await confirmTeam({
      description: `Delete role "${role.role_name}"? This will remove all assignments for this role.`,
      variant: "destructive",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await deleteRole(role.id);
      toast.success("Role deleted");
    } catch (err) {
      toast.error("Failed to delete role");
    }
  };

  const teamColumns: ColumnDef<RoleRow>[] = [
    {
      id: "role",
      header: "Role",
      size: 240,
      cell: ({ row }) => (
        <span className="block truncate text-sm text-muted-foreground">{row.original.role.role_name}</span>
      ),
    },
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => {
        const { member, role } = row.original;
        if (!member) {
          return (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-sm text-primary"
              onClick={() => setAssignDialog({ open: true, role })}
            >
              Assign
            </Button>
          );
        }
        const p = member.person;
        return (
          <div className="flex items-center gap-2.5">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials(p?.first_name, p?.last_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{p?.full_name ?? "Unknown"}</span>
          </div>
        );
      },
    },
    {
      id: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.member?.person?.email ?? "—"}</span>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      cell: ({ row }) => {
        const p = row.original.member?.person;
        return (
          <span className="text-sm text-muted-foreground">{p?.phone_mobile || p?.phone_business || "—"}</span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const { role, member } = row.original;
        const handleRemoveOne = async () => {
          if (!member) return;
          try {
            await updateRoleMembers(
              role.id,
              role.members
                .filter((m) => m.person_id !== member.person_id)
                .map((m) => m.person_id),
            );
            toast.success("Removed from role");
          } catch {
            toast.error("Failed to remove from role");
          }
        };
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setAssignDialog({ open: true, role })}>
                <UserPlus className="mr-2 h-3.5 w-3.5" />
                {member ? "Add another person" : "Assign someone"}
              </DropdownMenuItem>
              {member && (
                <DropdownMenuItem onClick={() => void handleRemoveOne()}>
                  <UserX className="mr-2 h-3.5 w-3.5" />
                  Remove this person
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteRole(role)}>
                <Trash2 className="mr-2 h-3.5 w-3.5" />Delete role
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <SectionRow
        title="Project Team"
        action={
          <Button
            size="xs"
            onClick={() => setCreateRoleOpen(true)}
          >
            Manage Roles
          </Button>
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search roles or members..."
      />

      <div className="mt-4">
        {isLoading ? (
          <SectionSkeleton rows={3} />
        ) : roles.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No roles defined yet.{" "}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-primary"
              onClick={() => setCreateRoleOpen(true)}
            >
              Add a role
            </Button>
          </p>
        ) : (
          <DataTable columns={teamColumns} data={filteredRows} showToolbar={false} showPagination={false} />
        )}
      </div>

      <AssignMemberDialog
        open={assignDialog.open}
        onOpenChange={(open) => setAssignDialog((prev) => ({ ...prev, open }))}
        role={assignDialog.role}
        onSave={updateRoleMembers}
        projectId={projectId}
      />
      <CreateRoleDialog
        open={createRoleOpen}
        onOpenChange={setCreateRoleOpen}
        onSave={async (name) => {
          const newRole = await createRole(name);
          setAssignDialog({ open: true, role: newRole });
        }}
      />
      {TeamConfirmDialog}
    </>
  );
}

// ─── Effective Permissions Dialog ────────────────────────────────

const MODULE_LABELS: Record<PermissionModule, string> = {
  directory:     "Directory",
  budget:        "Budget",
  contracts:     "Contracts",
  documents:     "Documents",
  schedule:      "Schedule",
  submittals:    "Submittals",
  rfis:          "RFIs",
  change_orders: "Change Orders",
};

const LEVEL_LABELS: Record<PermissionLevel, string> = {
  none:  "None",
  read:  "Read",
  write: "Write",
  admin: "Admin",
};

function EffectivePermissionsDialog({
  open,
  onOpenChange,
  person,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: PersonWithDetails | null;
}) {
  if (!person) return null;

  const template = person.permission_template;
  const rules = (template?.rules_json ?? {}) as Record<PermissionModule, PermissionLevel[]>;
  const granularFlags = ((template?.granular_flags ?? []) as GranularFlag[]);

  const getHighestLevel = (levels: PermissionLevel[]): PermissionLevel => {
    if (levels.includes("admin")) return "admin";
    if (levels.includes("write")) return "write";
    if (levels.includes("read")) return "read";
    return "none";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg border-border/60 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-1">
          <DialogTitle className="text-lg tracking-tight">
            Effective permissions
          </DialogTitle>
          <DialogDescription>
            What {person.first_name} {person.last_name} can do on this project.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Template
            </span>
            <Badge variant={template ? "secondary" : "outline"} className="rounded-full">
              {template?.name ?? "No template assigned"}
            </Badge>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Module access
            </p>
            <div className="divide-y divide-border/40 rounded-lg bg-muted/30">
              {ALL_MODULES.map((mod) => {
                const levels = rules[mod] ?? [];
                const highest = getHighestLevel(levels);
                return (
                  <div
                    key={mod}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {MODULE_LABELS[mod]}
                    </span>
                    <Badge
                      variant={highest === "none" ? "outline" : "secondary"}
                      className={cn(
                        "rounded-full px-2.5 text-[11px] font-medium",
                        highest === "admin" && "bg-primary/10 text-primary border-primary/20",
                        highest === "write" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                        highest === "read" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                        highest === "none" && "text-muted-foreground",
                      )}
                    >
                      {LEVEL_LABELS[highest]}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {granularFlags.length > 0 && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Additional capabilities
              </p>
              <ul className="space-y-1.5">
                {granularFlags.map((flag) => (
                  <li
                    key={flag}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-2.5 w-2.5 text-primary" strokeWidth={3} />
                    </span>
                    {GRANULAR_FLAG_LABELS[flag] ?? flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inline Template Selector ───────────────────────────────────

function TemplateSelector({
  currentTemplateId,
  personId,
  projectId,
  onAssigned,
}: {
  currentTemplateId: string | null;
  personId: string;
  projectId: string;
  onAssigned: () => void;
}) {
  const { templates, assignTemplate } = usePermissionTemplates();
  const [assigning, setAssigning] = React.useState(false);

  const handleChange = async (templateId: string) => {
    if (templateId === (currentTemplateId ?? "")) return;
    setAssigning(true);
    try {
      await assignTemplate(projectId, personId, templateId);
      toast.success("Permission template updated");
      onAssigned();
    } catch (err) {
      toast.error("Failed to assign template");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Select
      value={currentTemplateId ?? ""}
      onValueChange={handleChange}
      disabled={assigning}
    >
      <SelectTrigger className="h-7 w-40 text-xs">
        <SelectValue placeholder="No template" />
      </SelectTrigger>
      <SelectContent>
        {templates.map((t) => (
          <SelectItem key={t.id} value={t.id} className="text-xs">
            {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Members DataTable (stable component — avoids hook-in-render) ──

function MembersDataTable({
  filtered,
  removingPersonId,
  handleRemoveMember,
  projectId,
  onRefetch,
}: {
  filtered: PersonWithDetails[];
  removingPersonId: string | null;
  handleRemoveMember: (id: string) => Promise<void>;
  projectId: string;
  onRefetch: () => void;
}) {
  const [permDialog, setPermDialog] = React.useState<{
    open: boolean;
    person: PersonWithDetails | null;
  }>({ open: false, person: null });

  const columns = React.useMemo<ColumnDef<PersonWithDetails>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => {
          const person = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {initials(person.first_name, person.last_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">
                {person.first_name} {person.last_name}
              </span>
            </div>
          );
        },
      },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground capitalize">
            {row.original.person_type ?? "—"}
          </span>
        ),
      },
      {
        id: "role",
        header: "Job Title",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.job_title ?? "—"}</span>
        ),
      },
      {
        id: "company",
        header: "Company",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.company?.name ?? "—"}
          </span>
        ),
      },
      {
        id: "permission_template",
        header: "Permission Template",
        cell: ({ row }) => {
          const person = row.original;
          const templateId = person.membership?.permission_template_id ?? null;
          return (
            <TemplateSelector
              currentTemplateId={templateId}
              personId={person.id}
              projectId={projectId}
              onAssigned={onRefetch}
            />
          );
        },
      },
      {
        id: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.email ?? "—"}</span>
        ),
      },
      {
        id: "phone",
        header: "Phone",
        cell: ({ row }) => {
          const phone = row.original.phone_mobile || row.original.phone_business;
          return <span className="text-sm text-muted-foreground">{phone ?? "—"}</span>;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const person = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setPermDialog({ open: true, person })}>
                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />View Permissions
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="mr-2 h-3.5 w-3.5" />Send Email
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  disabled={removingPersonId === person.id}
                  onClick={() => void handleRemoveMember(person.id)}
                >
                  <UserX className="mr-2 h-3.5 w-3.5" />
                  {removingPersonId === person.id ? "Removing..." : "Remove"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [removingPersonId, handleRemoveMember, projectId, onRefetch],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={filtered}
        showToolbar={false}
        showPagination={filtered.length > 15}
      />
      <EffectivePermissionsDialog
        open={permDialog.open}
        onOpenChange={(open) => setPermDialog((prev) => ({ ...prev, open }))}
        person={permDialog.person}
      />
    </>
  );
}

// ─── External Members Section ────────────────────────────────────

function ExternalMembersSection({
  projectId,
  onAddClick,
  onRefetch: externalRefetch,
}: {
  projectId: string;
  onAddClick: () => void;
  onRefetch?: () => void;
}) {
  const {
    users: members,
    isLoading,
    error,
    refetch,
  } = useProjectUsers(projectId, { type: "all" });
  const { confirm: confirmMember, ConfirmDialog: MemberConfirmDialog } = useConfirm();
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [activeFilters, setActiveFilters] = React.useState<Record<string, string | undefined>>({});
  const [removingPersonId, setRemovingPersonId] = React.useState<string | null>(null);

  const allMembers = React.useMemo(() => {
    return filterProjectMembers(members);
  }, [members]);

  const handleRemoveMember = async (personId: string) => {
    if (removingPersonId) return;
    const ok = await confirmMember({
      description: "Remove this member from the project directory?",
      variant: "destructive",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      setRemovingPersonId(personId);
      await apiFetch(
        `/api/projects/${projectId}/directory/people/${personId}`,
        { method: "DELETE" },
      );
      await refetch();
      toast.success("Member removed");
    } catch (err) {
      toast.error("Failed to remove member");
    } finally {
      setRemovingPersonId(null);
    }
  };

  const companies = React.useMemo(() => {
    const names = new Set<string>();
    allMembers.forEach((p) => { if (p.company?.name) names.add(p.company.name); });
    return Array.from(names).sort();
  }, [allMembers]);

  const companyFilter = activeFilters.company;

  const filtered = React.useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return allMembers.filter((p) => {
      const matchesSearch =
        !q ||
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.company?.name ?? "").toLowerCase().includes(q) ||
        (p.job_title ?? "").toLowerCase().includes(q);
      const matchesCompany = !companyFilter || p.company?.name === companyFilter;
      return matchesSearch && matchesCompany;
    });
  }, [allMembers, companyFilter, deferredSearch]);

  const filterContent = companies.length > 0 ? (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">Company</span>
        <Select
          value={companyFilter ?? "all"}
          onValueChange={(v) =>
            setActiveFilters((prev) => ({ ...prev, company: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  ) : undefined;

  if (isLoading) return <SectionSkeleton rows={5} />;
  if (error) return <p className="text-sm text-destructive py-6">Failed to load members.</p>;

  return (
    <>
      <SectionRow
        title="All Project Members"
        action={
          <Button
            size="xs"
            onClick={onAddClick}
          >
            Add Members
          </Button>
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by name, role or company..."
        filterContent={filterContent}
      />

      <div className="mt-4">
        {allMembers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No members yet.{" "}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-primary"
              onClick={onAddClick}
            >
              Add one
            </Button>
          </p>
        ) : (
          <MembersDataTable
            filtered={filtered}
            removingPersonId={removingPersonId}
            handleRemoveMember={handleRemoveMember}
            projectId={projectId}
            onRefetch={() => { refetch(); externalRefetch?.(); }}
          />
        )}
      </div>
      {MemberConfirmDialog}
    </>
  );
}

// ─── Vendors Section ─────────────────────────────────────────────

function VendorsSection({
  vendors,
  isLoading,
  error,
  onAddVendorClick,
  onRemoveVendor,
}: {
  vendors: ReturnType<typeof useProjectVendors>["vendors"];
  isLoading: boolean;
  error: Error | null;
  onAddVendorClick: () => void;
  onRemoveVendor: (id: string) => Promise<void>;
}) {
  const { confirm: confirmVendor, ConfirmDialog: VendorConfirmDialog } = useConfirm();
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const handleRemove = async (pv: (typeof vendors)[0]) => {
    const name = pv.companies?.name ?? "this vendor";
    const ok = await confirmVendor({
      description: `Remove "${name}" from this project?`,
      variant: "destructive",
      confirmLabel: "Remove",
    });
    if (!ok) return;

    try {
      setRemovingId(pv.id);
      await onRemoveVendor(pv.id);
      toast.success(`${name} removed`);
    } catch (err) {
      toast.error("Failed to remove vendor");
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) return <SectionSkeleton rows={3} />;
  if (error) {
    return (
      <p className="text-sm text-destructive py-4">Failed to load vendors.</p>
    );
  }

  if (vendors.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No vendors yet.{" "}
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 align-baseline"
          onClick={onAddVendorClick}
        >
          Add one
        </Button>
      </p>
    );
  }

  return (
    <>
    <div className="rounded-md border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Class</TableHead>
            <TableHead className="hidden lg:table-cell">Location</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((pv) => {
            const v = pv.companies;
            const location = v?.city && v?.state ? `${v.city}, ${v.state}` : (v?.city ?? v?.state ?? "—");
            return (
              <TableRow key={pv.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">
                      {v?.name ?? "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {v?.vendor_class ?? "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {location}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        disabled={removingId === pv.id}
                        onClick={() => void handleRemove(pv)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        {removingId === pv.id ? "Removing..." : "Remove"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    {VendorConfirmDialog}
    </>
  );
}

// ─── Companies Section ──────────────────────────────────────────

type SubcontractorContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_business: string | null;
  phone_mobile: string | null;
};

function contactDisplayName(c: SubcontractorContact | null): string {
  if (!c) return "";
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return name || c.email || "";
}

function ContactPickerCell({
  projectId,
  companyId,
  projectCompanyId,
  companyName,
  currentContactId,
  currentContactName,
  onChanged,
}: {
  projectId: string;
  companyId: string;
  projectCompanyId: string;
  companyName: string;
  currentContactId: string | null;
  currentContactName: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [people, setPeople] = React.useState<SubcontractorContact[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const updateMutation = useUpdateProjectCompany(projectId);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("people")
      .select("id, first_name, last_name, email, phone_business, phone_mobile")
      .eq("company_id", companyId)
      .order("first_name", { ascending: true })
      .then(({ data }) => {
        setPeople((data ?? []) as SubcontractorContact[]);
        setLoading(false);
      });
  }, [open, companyId]);

  const handleSelect = async (personId: string) => {
    setOpen(false);
    try {
      await updateMutation.mutateAsync({
        companyId: projectCompanyId,
        data: { primary_contact_id: personId },
      });
      toast.success("Contact updated");
      onChanged();
    } catch {
      toast.error("Failed to update contact");
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="group flex h-8 -ml-2 items-center gap-1.5 px-2 text-sm font-normal text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {currentContactName ? (
              <span>{currentContactName}</span>
            ) : (
              <span className="text-primary underline-offset-2 group-hover:underline">
                Set contact
              </span>
            )}
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start" onClick={(e) => e.stopPropagation()}>
          <Command>
            <CommandInput placeholder="Search contacts..." />
            <CommandList className="max-h-64">
              <CommandEmpty>
                {loading ? "Loading..." : "No contacts at this company."}
              </CommandEmpty>
              {people.length > 0 && (
                <CommandGroup heading="Assigned to this company">
                  {people.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`${p.first_name ?? ""} ${p.last_name ?? ""} ${p.email ?? ""}`}
                      onSelect={() => void handleSelect(p.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          currentContactId === p.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="min-w-0 flex flex-col">
                        <span className="truncate text-sm">
                          {contactDisplayName(p) || "Unnamed"}
                        </span>
                        {p.email && (
                          <span className="truncate text-xs text-muted-foreground">
                            {p.email}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup>
                <CommandItem
                  value="__manage_company_contacts__"
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/directory/companies/${companyId}`);
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4 shrink-0" />
                  Manage contacts for {companyName}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}

function CompaniesSection({
  projectId,
  companies,
  isLoading,
  error,
  ownerCompanyId,
  onAssignClick,
  onRefetch,
  onCompanyClick,
}: {
  projectId: string;
  companies: Array<{
    id: string;
    company_id: string;
    company?:
      | { name: string | null; vendor_class?: string | null }
      | null;
    user_count?: number | null;
    primary_contact_id?: string | null;
    primary_contact?: SubcontractorContact | null;
  }>;
  isLoading: boolean;
  error: Error | null;
  ownerCompanyId: string | null;
  onAssignClick: () => void;
  onRefetch: () => void;
  onCompanyClick: (companyId: string) => void;
}) {
  const { confirm: confirmCompany, ConfirmDialog: CompanyConfirmDialog } = useConfirm();
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [removingCompanyId, setRemovingCompanyId] = React.useState<string | null>(null);

  const handleRemoveCompany = async (companyId: string, companyName: string) => {
    if (removingCompanyId) return;
    const ok = await confirmCompany({
      description: `Remove ${companyName} from this project directory?`,
      variant: "destructive",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      setRemovingCompanyId(companyId);
      await apiFetch(
        `/api/projects/${projectId}/directory/companies/${companyId}`,
        { method: "DELETE" },
      );
      onRefetch();
      toast.success("Company removed");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to remove company";
      toast.error(message);
    } finally {
      setRemovingCompanyId(null);
    }
  };

  type SubcontractorRow = {
    id: string;
    projectCompanyId: string;
    name: string;
    contact: SubcontractorContact | null;
    typeLabel: string;
  };

  const companyRows = React.useMemo<SubcontractorRow[]>(
    () =>
      companies
        .map((projectCompany) => {
          const vendorClass = projectCompany.company?.vendor_class ?? null;
          const isOwner =
            ownerCompanyId !== null && projectCompany.company_id === ownerCompanyId;
          const typeLabel = isOwner
            ? "Owner"
            : vendorClass === "SUB"
              ? "Subcontractor"
              : vendorClass || "—";
          return {
            id: projectCompany.company_id,
            projectCompanyId: projectCompany.id,
            name: projectCompany.company?.name || "Untitled Company",
            contact: (projectCompany.primary_contact ?? null) as SubcontractorContact | null,
            typeLabel,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [companies, ownerCompanyId],
  );

  const filteredRows = React.useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return companyRows;
    return companyRows.filter((c) => {
      const contactStr = contactDisplayName(c.contact).toLowerCase();
      const email = (c.contact?.email ?? "").toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        contactStr.includes(q) ||
        email.includes(q)
      );
    });
  }, [companyRows, deferredSearch]);

  const companiesColumns = React.useMemo<ColumnDef<SubcontractorRow>[]>(
    () => [
      {
        id: "name",
        header: "Company Name",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onCompanyClick(row.original.id);
            }}
            className="h-auto -ml-2 px-2 py-1 text-left font-medium text-foreground hover:bg-transparent hover:underline"
          >
            {row.original.name}
          </Button>
        ),
      },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.typeLabel}
          </span>
        ),
      },
      {
        id: "contact",
        header: "Contact Name",
        cell: ({ row }) => (
          <ContactPickerCell
            projectId={projectId}
            companyId={row.original.id}
            projectCompanyId={row.original.projectCompanyId}
            companyName={row.original.name}
            currentContactId={row.original.contact?.id ?? null}
            currentContactName={contactDisplayName(row.original.contact)}
            onChanged={onRefetch}
          />
        ),
      },
      {
        id: "email",
        header: "Email",
        cell: ({ row }) => {
          const email = row.original.contact?.email;
          return email ? (
            <a
              href={`mailto:${email}`}
              className="text-sm text-muted-foreground hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {email}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "phone",
        header: "Phone",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.contact?.phone_business || "—"}
          </span>
        ),
      },
      {
        id: "phone_mobile",
        header: "Cell Phone",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.contact?.phone_mobile || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const company = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem asChild>
                  <Link href={`/directory/companies/${company.id}?edit=1`}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  disabled={removingCompanyId === company.projectCompanyId}
                  onClick={() => void handleRemoveCompany(company.projectCompanyId, company.name)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  {removingCompanyId === company.projectCompanyId ? "Removing..." : "Remove"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [removingCompanyId, projectId, onRefetch],
  );

  return (
    <>
      <SectionRow
        title="Companies"
        action={
          <Button
            size="xs"
            onClick={onAssignClick}
          >
            Add Company
          </Button>
        }
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search companies..."
      />

      <div className="mt-4">
        {isLoading ? (
          <SectionSkeleton rows={3} />
        ) : error ? (
          <p className="text-sm text-destructive py-4">Failed to load companies.</p>
        ) : filteredRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {search ? "No companies match your search." : "No companies found."}
          </p>
        ) : (
          <DataTable
            columns={companiesColumns}
            data={filteredRows}
            showToolbar={false}
            showPagination={filteredRows.length > 10}
          />
        )}
      </div>
      {CompanyConfirmDialog}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function ProjectDirectoryPage() {
  const params = useParams()! ?? {};
  const projectId = params.projectId as string;

  const [clientName, setClientName] = React.useState<string | null>(null);
  const [ownerCompanyId, setOwnerCompanyId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!projectId) return;
    const supabase = createClient();
    supabase
      .from("projects")
      .select("company_id, companies(name)")
      .eq("id", parseInt(projectId, 10))
      .single()
      .then(({ data }) => {
        const companyName = (data as { companies?: { name?: string } | null } | null)?.companies?.name;
        if (companyName) setClientName(companyName);
      });
  }, [projectId]);

  React.useEffect(() => {
    if (!projectId) return;
    const supabase = createClient();
    supabase
      .from("prime_contracts")
      .select("contract_company_id")
      .eq("project_id", parseInt(projectId, 10))
      .not("contract_company_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setOwnerCompanyId(
          (data as { contract_company_id?: string | null } | null)?.contract_company_id ?? null,
        );
      });
  }, [projectId]);

  const [addCompanyOpen, setAddCompanyOpen] = React.useState(false);
  const [addVendorOpen, setAddVendorOpen] = React.useState(false);
  const [manageRolesOpen, setManageRolesOpen] = React.useState(false);
  const [companySheet, setCompanySheet] = React.useState<{
    open: boolean;
    companyId: string | null;
  }>({ open: false, companyId: null });
  const {
    companies: projectCompanies,
    isLoading: companiesLoading,
    error: companiesError,
    refetch: refetchCompanies,
  } = useProjectCompanies(projectId, {
    status: "all",
    sort: "name",
    per_page: 150,
  });
  const { vendors, isLoading: vendorsLoading, error: vendorsError, addVendor, removeVendor } =
    useProjectVendors(projectId);

  const existingVendorIds = vendors
    .map((v) => v.companies?.id)
    .filter(Boolean) as string[];

  React.useEffect(() => {
    if (!projectId) return;
    apiFetch<{ added: number }>(
      `/api/projects/${projectId}/directory/companies/sync`,
      { method: "POST" },
    )
      .then((result: { added: number } | null) => {
        if (result && result.added > 0) refetchCompanies();
      })
      .catch((error: unknown) => {
        reportNonCriticalFailure({
          area: "project-directory",
          operation: "sync-companies-from-contracts",
          error,
          userVisibleFallback:
            "Project companies may be stale until contract company sync succeeds.",
          metadata: { projectId },
        });
      });
   
  }, [projectId]);

  return (
    <PageShell
      variant="dashboard"
      title="Project Directory"
      statusBadge={clientName ? <span className="text-sm text-muted-foreground">{clientName}</span> : undefined}
      contentClassName="space-y-12"
      actions={
        <Button variant="outline" size="sm">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export
        </Button>
      }
    >
      {/* Section 1: Companies */}
      <section>
        <CompaniesSection
          projectId={projectId}
          companies={projectCompanies}
          isLoading={companiesLoading}
          error={companiesError}
          ownerCompanyId={ownerCompanyId}
          onAssignClick={() => setAddCompanyOpen(true)}
          onRefetch={() => { void refetchCompanies(); }}
          onCompanyClick={(companyId) =>
            setCompanySheet({ open: true, companyId })
          }
        />
      </section>

      {/* Section 2: Project Team */}
      <section>
        <ProjectTeamSection
          projectId={projectId}
          manageRolesOpen={manageRolesOpen}
          onManageRolesOpenChange={setManageRolesOpen}
        />
      </section>

      <AssignExistingCompanyDialog
        open={addCompanyOpen}
        onOpenChange={setAddCompanyOpen}
        existingCompanyIds={projectCompanies.map((c) => c.company_id)}
        projectId={projectId}
        onSuccess={() => { void refetchCompanies(); }}
      />
      <AddVendorDialog
        open={addVendorOpen}
        onOpenChange={setAddVendorOpen}
        existingVendorIds={existingVendorIds}
        onAdd={async (vendorId) => {
          await addVendor(vendorId);
          toast.success("Vendor added to project");
        }}
      />
      <CompanyDetailSheet
        companyId={companySheet.companyId}
        open={companySheet.open}
        onOpenChange={(open) =>
          setCompanySheet((prev) => ({ ...prev, open }))
        }
      />
    </PageShell>
  );
}
