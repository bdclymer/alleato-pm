"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Building2,
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
import { type ColumnDef } from "@tanstack/react-table";
import { useProjectRoles, type ProjectRole } from "@/hooks/use-project-roles";
import { useProjectUsers } from "@/hooks/use-project-users";
import { useProjectVendors } from "@/hooks/use-project-vendors";
import { useProjectCompanies } from "@/hooks/use-project-companies";
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
import { Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Role</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <Label htmlFor="role-name">Role name</Label>
          <Input
            id="role-name"
            placeholder="e.g. Project Manager"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Creating..." : "Create"}
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
        "id, first_name, last_name, email, job_title, company:companies(name)"
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
      toast.error(
        err instanceof Error ? err.message : "Failed to add member"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Command className="border rounded-md">
            <CommandInput placeholder="Search people..." />
            <CommandList className="max-h-64">
              <CommandEmpty>No people found.</CommandEmpty>
              <CommandGroup>
                {people.map((person) => (
                  <CommandItem
                    key={person.id}
                    value={`${person.first_name} ${person.last_name} ${person.email ?? ""}`}
                    onSelect={() => setSelected(person.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        selected === person.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {person.first_name} {person.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[person.job_title, person.company_name]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selected || saving}>
            {saving ? "Adding..." : "Add Member"}
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Vendor</DialogTitle>
          <DialogDescription>
            Select a vendor from the company directory.
          </DialogDescription>
        </DialogHeader>
        <Command className="border rounded-md">
          <CommandInput placeholder="Search vendors..." />
          <CommandList className="max-h-64">
            <CommandEmpty>No vendors found.</CommandEmpty>
            <CommandGroup>
              {available.map((vendor) => (
                <CommandItem
                  key={vendor.id}
                  value={`${vendor.name} ${vendor.legal_name ?? ""} ${vendor.vendor_class ?? ""}`}
                  onSelect={() => setSelected(vendor.id)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      selected === vendor.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {vendor.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[
                        vendor.vendor_class,
                        vendor.city && vendor.state
                          ? `${vendor.city}, ${vendor.state}`
                          : (vendor.city ?? vendor.state),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selected || saving}>
            {saving ? "Adding..." : "Add Vendor"}
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
      toast.error(err instanceof Error ? err.message : "Failed to assign company");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Company</DialogTitle>
          <DialogDescription>
            Search and select an existing company to add to this project.
          </DialogDescription>
        </DialogHeader>
        <Command className="border rounded-md">
          <CommandInput placeholder="Search companies..." />
          <CommandList className="max-h-64">
            <CommandEmpty>No companies found.</CommandEmpty>
            <CommandGroup>
              {available.map((company) => (
                <CommandItem
                  key={company.id}
                  value={`${company.name} ${company.city ?? ""} ${company.state ?? ""}`}
                  onSelect={() => setSelected(company.id)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      selected === company.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{company.name}</p>
                    {(company.vendor_class || company.city || company.state) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[
                          company.vendor_class,
                          company.city && company.state
                            ? `${company.city}, ${company.state}`
                            : (company.city ?? company.state),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selected || saving}>
            {saving ? "Adding..." : "Add Company"}
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
      toast.error(err instanceof Error ? err.message : "Failed to delete role");
    }
  };

  const teamColumns: ColumnDef<RoleRow>[] = [
    {
      id: "role",
      header: "Role",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.role.role_name}</span>
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
        const { role } = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setAssignDialog({ open: true, role })}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                {row.original.member ? "Edit assignment" : "Assign someone"}
              </DropdownMenuItem>
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
        onSave={async (name) => { await createRole(name); }}
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Effective Permissions
          </DialogTitle>
          <DialogDescription>
            What {person.first_name} {person.last_name} can do on this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template info */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Template:</span>
            <Badge variant={template ? "secondary" : "outline"}>
              {template?.name ?? "No template assigned"}
            </Badge>
          </div>

          {/* Module access matrix */}
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium text-muted-foreground py-2 px-3">Module</th>
                  <th className="text-left font-medium text-muted-foreground py-2 px-3">Access Level</th>
                </tr>
              </thead>
              <tbody>
                {ALL_MODULES.map((mod) => {
                  const levels = rules[mod] ?? [];
                  const highest = getHighestLevel(levels);
                  return (
                    <tr key={mod} className="border-t border-border/50">
                      <td className="py-2 px-3 font-medium text-foreground">{MODULE_LABELS[mod]}</td>
                      <td className="py-2 px-3">
                        <Badge
                          variant={highest === "none" ? "outline" : "secondary"}
                          className={cn(
                            "text-xs",
                            highest === "admin" && "bg-primary/10 text-primary border-primary/20",
                            highest === "write" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                            highest === "read" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                          )}
                        >
                          {LEVEL_LABELS[highest]}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Granular flags */}
          {granularFlags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Additional capabilities
              </p>
              <ul className="space-y-1">
                {granularFlags.map((flag) => (
                  <li key={flag} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={2.5} />
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
      toast.error(err instanceof Error ? err.message : "Failed to assign template");
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
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
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
      toast.error(err instanceof Error ? err.message : "Failed to remove vendor");
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

function CompaniesSection({
  projectId,
  companies,
  isLoading,
  error,
  onAssignClick,
  onRefetch,
}: {
  projectId: string;
  companies: Array<{
    id: string;
    company_id: string;
    company?: { name: string | null } | null;
    user_count?: number | null;
  }>;
  isLoading: boolean;
  error: Error | null;
  onAssignClick: () => void;
  onRefetch: () => void;
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

  const companyRows = React.useMemo(
    () =>
      companies
        .map((projectCompany) => ({
          id: projectCompany.company_id,
          name: projectCompany.company?.name || "Untitled Company",
          memberCount: projectCompany.user_count || 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [companies],
  );

  const filteredRows = React.useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return companyRows;
    return companyRows.filter((c) => c.name.toLowerCase().includes(q));
  }, [companyRows, deferredSearch]);

  const companiesColumns = React.useMemo<ColumnDef<{ id: string; name: string; memberCount: number }>[]>(
    () => [
      {
        id: "name",
        header: "Company",
        cell: ({ row }) => (
          <Link href={`/directory/companies/${row.original.id}`} className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground hover:underline">
              {row.original.name}
            </span>
          </Link>
        ),
      },
      {
        id: "memberCount",
        header: "Members",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.memberCount} {row.original.memberCount === 1 ? "member" : "members"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
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
                  <Link href={`/directory/companies/${company.id}`}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  disabled={removingCompanyId === company.id}
                  onClick={() => void handleRemoveCompany(company.id, company.name)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  {removingCompanyId === company.id ? "Removing..." : "Remove"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [removingCompanyId, projectId],
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
            onRowClick={(row) => { window.location.href = `/directory/companies/${row.id}`; }}
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
  React.useEffect(() => {
    if (!projectId) return;
    const supabase = createClient();
    supabase
      .from("projects")
      .select("client")
      .eq("id", parseInt(projectId, 10))
      .single()
      .then(({ data }) => { if (data?.client) setClientName(data.client); });
  }, [projectId]);

  const { users: members, refetch: refetchMembers } = useProjectUsers(projectId, { type: "all" });
  const [addMemberOpen, setAddMemberOpen] = React.useState(false);
  const [addCompanyOpen, setAddCompanyOpen] = React.useState(false);
  const [addVendorOpen, setAddVendorOpen] = React.useState(false);
  const [manageRolesOpen, setManageRolesOpen] = React.useState(false);
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
        {/* Section 1: Project Team */}
      <section>
        <ProjectTeamSection
          projectId={projectId}
          manageRolesOpen={manageRolesOpen}
          onManageRolesOpenChange={setManageRolesOpen}
        />
      </section>

      {/* Section 2: Companies */}
      <section>
        <CompaniesSection
          projectId={projectId}
          companies={projectCompanies}
          isLoading={companiesLoading}
          error={companiesError}
          onAssignClick={() => setAddCompanyOpen(true)}
          onRefetch={() => { void refetchCompanies(); }}
        />
      </section>

      {/* Section 3: All Project Members */}
      <section>
        <ExternalMembersSection
          projectId={projectId}
          onAddClick={() => setAddMemberOpen(true)}
          onRefetch={refetchMembers}
        />
      </section>

      <AddMemberDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        projectId={projectId}
        onSuccess={refetchMembers}
      />
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
    </PageShell>
  );
}
