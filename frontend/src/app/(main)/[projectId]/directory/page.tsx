"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  UserX,
  Package,
  Mail,
  Search,
  SlidersHorizontal,
  X,
  Plus,
} from "lucide-react";
import {
  Button,
  Avatar,
  AvatarFallback,
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
import {
  UnifiedTablePage,
  type FilterConfig,
  type FilterValue,
  type TableColumn,
  type ViewMode,
} from "@/components/tables/unified";
import { AssignMemberDialog } from "@/components/domain/directory/AssignMemberDialog";
import { CompanyDetailSheet } from "@/components/domain/directory/CompanyDetailSheet";
import { ProjectTeamDialog } from "@/components/domain/directory/ProjectTeamDialog";
import { ContactFormSheet } from "@/components/domain/contacts/ContactFormSheet";
import { useProjectRoles, type ProjectRole } from "@/hooks/use-project-roles";
import { useProjectUsers } from "@/hooks/use-project-users";
import { useProjectVendors } from "@/hooks/use-project-vendors";
import {
  useProjectCompanies,
  useUpdateProjectCompany,
} from "@/hooks/use-project-companies";
import { usePermissionTemplates } from "@/hooks/use-permissions";
import { createClient } from "@/lib/supabase/client";
import { updateContact } from "@/app/(main)/actions/table-actions";
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

type RoleRow = {
  id: string;
  role: ProjectRole;
  member: ProjectRole["members"][0] | null;
};

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
  membership: PersonWithDetails["membership"],
): string {
  const status = membership?.status || "inactive";
  const invite = membership?.invite_status;
  if (status === "inactive") return "Inactive";
  if (invite === "not_invited") return "Not Invited";
  if (invite === "invited") return "Invite Sent";
  return "Active";
}

function accessLevelLabel(permission?: { name: string } | null): string {
  return permission?.name ?? "Standard";
}

function initials(first?: string | null, last?: string | null): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

// ─── Skeleton ────────────────────────────────────────────────────

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
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

function DirectoryUnifiedTable<T>({
  title,
  action,
  items,
  columns,
  getRowId,
  search,
  onSearch,
  searchPlaceholder,
  totalItems,
  filters,
  activeFilters,
  onFilterChange,
  onClearFilters,
  rowActions,
  onRowClick,
  emptyTitle,
  emptyDescription,
  filteredDescription,
  isFiltered,
  enablePagination = false,
}: {
  title: string;
  action?: React.ReactNode;
  items: T[];
  columns: TableColumn<T>[];
  getRowId: (item: T) => string;
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  totalItems?: number;
  filters?: FilterConfig[];
  activeFilters?: Record<string, FilterValue>;
  onFilterChange?: (filters: Record<string, FilterValue>) => void;
  onClearFilters?: () => void;
  rowActions?: (item: T) => React.ReactNode;
  onRowClick?: (item: T) => void;
  emptyTitle: string;
  emptyDescription: string;
  filteredDescription: string;
  isFiltered: boolean;
  enablePagination?: boolean;
}) {
  const [currentView, setCurrentView] = React.useState<ViewMode>("table");

  return (
    <UnifiedTablePage<T>
      header={{
        title,
        actions: action,
        mobileActionsInline: false,
      }}
      toolbar={{
        totalItems: totalItems ?? items.length,
        filteredItems: items.length,
        searchValue: search ?? "",
        onSearchChange: onSearch ?? (() => {}),
        searchPlaceholder:
          searchPlaceholder ?? `Search ${title.toLowerCase()}...`,
        currentView,
        onViewChange: (view) => {
          if (view === "table") setCurrentView(view);
        },
        filters,
        activeFilters,
        onFilterChange,
        onClearFilters,
      }}
      data={{
        items,
        isLoading: false,
        error: null,
      }}
      table={{
        columns,
        getRowId,
        rowActions,
        onRowClick,
        density: "compact",
      }}
      features={{
        enableSearch: Boolean(onSearch),
        enableFilters: Boolean(filters?.length),
        enableViews: false,
        enableColumnToggle: true,
        enableExport: true,
        enablePagination,
        enableBulkDelete: false,
        enableRowSelection: false,
      }}
      layout={{
        containerPadding: false,
        containerClassName: "pb-0",
        toolbarInlineWithHeader: true,
        minWidth: 880,
      }}
      emptyState={{
        title: emptyTitle,
        description: emptyDescription,
        filteredDescription,
        isFiltered,
      }}
    />
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
        onBlur={() => {
          if (!value) setExpanded(false);
        }}
        placeholder={placeholder}
        className="h-8 w-44 pl-8 pr-7 text-sm"
        aria-label="Search"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
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
        <h2 className="text-lg font-semibold text-foreground shrink-0">
          {title}
        </h2>
      </div>

      {/* Right: search + filter + count + action */}
      <div className="flex items-center gap-2 shrink-0">
        {onSearch !== undefined && (
          <ExpandableSearch
            value={search ?? ""}
            onChange={onSearch}
            placeholder={
              searchPlaceholder ?? `Search ${title.toLowerCase()}...`
            }
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
        "id, first_name, last_name, email, job_title, company:companies!people_company_id_fkey(name)",
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
            })),
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
          <DialogTitle className="text-lg tracking-tight">
            Add member
          </DialogTitle>
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
                        {isSelected && (
                          <Check className="h-3 w-3" strokeWidth={3} />
                        )}
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
        "id, name, legal_name, vendor_class, contact_name, city, state, status",
      )
      .eq("is_vendor", true)
      .order("name")
      .then(({ data }) => {
        if (data) setAllVendors(data as VendorOption[]);
      });
  }, [open]);

  const available = allVendors.filter((v) => !existingVendorIds.includes(v.id));

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
          <DialogTitle className="text-lg tracking-tight">
            Add vendor
          </DialogTitle>
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
                        {isSelected && (
                          <Check className="h-3 w-3" strokeWidth={3} />
                        )}
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

  const available = allCompanies.filter(
    (c) => !existingCompanyIds.includes(c.id),
  );

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
          <DialogTitle className="text-lg tracking-tight">
            Add company
          </DialogTitle>
          <DialogDescription>
            Search and select an existing company to add to this project.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-2">
          <Command
            className="overflow-visible bg-transparent"
            shouldFilter={true}
          >
            <CommandInput
              className="bg-muted"
              placeholder="Search companies…"
            />
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
                        {isSelected && (
                          <Check className="h-3 w-3" strokeWidth={3} />
                        )}
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
          <Button
            variant="ghost"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleAssign}
            disabled={!selected || saving}
          >
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
  const { confirm: confirmTeam, ConfirmDialog: TeamConfirmDialog } =
    useConfirm();
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
      : [{ id: role.id, role, member: null }],
  );

  const filteredRows = search
    ? rows.filter(
        (r) =>
          r.role.role_name.toLowerCase().includes(search.toLowerCase()) ||
          (r.member?.person?.full_name ?? "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (r.member?.person?.company_name ?? "")
            .toLowerCase()
            .includes(search.toLowerCase()),
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

  const teamColumns: TableColumn<RoleRow>[] = [
    {
      id: "role",
      label: "Role",
      width: 240,
      render: (item) => (
        <span className="block truncate text-sm text-muted-foreground">
          {item.role.role_name}
        </span>
      ),
      sortValue: (item) => item.role.role_name,
      csvValue: (item) => item.role.role_name,
    },
    {
      id: "name",
      label: "Name",
      render: (item) => {
        const { member, role } = item;
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
            {p ? (
              <Link
                href={`/directory/contacts/${p.id}`}
                className="text-sm font-medium text-foreground hover:underline"
              >
                {p.full_name}
              </Link>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">
                Unknown
              </span>
            )}
          </div>
        );
      },
      sortValue: (item) => item.member?.person?.full_name ?? "",
      csvValue: (item) => item.member?.person?.full_name ?? "",
    },
    {
      id: "company",
      label: "Company",
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.member?.person?.company_name ?? "—"}
        </span>
      ),
      sortValue: (item) => item.member?.person?.company_name ?? "",
      csvValue: (item) => item.member?.person?.company_name ?? "",
    },
    {
      id: "email",
      label: "Email",
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.member?.person?.email ?? "—"}
        </span>
      ),
      sortValue: (item) => item.member?.person?.email ?? "",
      csvValue: (item) => item.member?.person?.email ?? "",
    },
    {
      id: "phone",
      label: "Phone",
      render: (item) => {
        const p = item.member?.person;
        return (
          <span className="text-sm text-muted-foreground">
            {p?.phone_mobile || p?.phone_business || "—"}
          </span>
        );
      },
      sortValue: (item) => {
        const p = item.member?.person;
        return p?.phone_mobile || p?.phone_business || "";
      },
      csvValue: (item) => {
        const p = item.member?.person;
        return p?.phone_mobile || p?.phone_business || "";
      },
    },
    {
      id: "actions",
      label: "",
      render: (item) => {
        const { role, member } = item;
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
            toast.error("Could not remove person from role", {
              description: `${member.person?.full_name ?? "This person"} could not be removed from ${role.role_name}.`,
            });
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
              <DropdownMenuItem
                onClick={() => setAssignDialog({ open: true, role })}
              >
                <UserPlus className="mr-2 h-3.5 w-3.5" />
                {member ? "Add another person" : "Assign someone"}
              </DropdownMenuItem>
              {member && (
                <DropdownMenuItem onClick={() => void handleRemoveOne()}>
                  <UserX className="mr-2 h-3.5 w-3.5" />
                  Remove this person
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDeleteRole(role)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete role
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      {isLoading ? (
        <>
          <SectionRow
            title="Project Team"
            action={
              <Button
                size="xs"
                data-keep-text
                onClick={() => setCreateRoleOpen(true)}
              >
                Manage Roles
              </Button>
            }
          />
          <div className="mt-4">
            <SectionSkeleton rows={3} />
          </div>
        </>
      ) : roles.length === 0 ? (
        <>
          <SectionRow
            title="Project Team"
            action={
              <Button
                size="xs"
                data-keep-text
                onClick={() => setCreateRoleOpen(true)}
              >
                Manage Roles
              </Button>
            }
          />
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
        </>
      ) : (
        <DirectoryUnifiedTable
          title="Project Team"
          action={
            <Button
              size="xs"
              data-keep-text
              onClick={() => setCreateRoleOpen(true)}
            >
              Manage Roles
            </Button>
          }
          items={filteredRows}
          columns={teamColumns}
          getRowId={(item) => item.id}
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search roles or members..."
          totalItems={rows.length}
          emptyTitle="No project team matches"
          emptyDescription="Assign project roles to keep responsibilities clear."
          filteredDescription="No roles or members match the current search."
          isFiltered={Boolean(search)}
        />
      )}

      <AssignMemberDialog
        open={assignDialog.open}
        onOpenChange={(open) => setAssignDialog((prev) => ({ ...prev, open }))}
        role={assignDialog.role}
        onSave={updateRoleMembers}
        projectId={projectId}
      />
      <ProjectTeamDialog
        open={createRoleOpen}
        onOpenChange={setCreateRoleOpen}
        projectId={projectId}
        roles={roles}
        createRole={createRole}
        updateRoleMembers={updateRoleMembers}
        deleteRole={deleteRole}
      />
      {TeamConfirmDialog}
    </>
  );
}

// ─── Effective Permissions Dialog ────────────────────────────────

const MODULE_LABELS: Record<PermissionModule, string> = {
  directory: "Directory",
  budget: "Budget",
  contracts: "Contracts",
  commitments: "Commitments",
  estimates: "Estimates",
  documents: "Documents",
  schedule: "Schedule",
  submittals: "Submittals",
  rfis: "RFIs",
  change_orders: "Change Orders",
  change_events: "Change Events",
  emails: "Emails",
};

const LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: "None",
  read: "Read",
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
  const rules = (template?.rules_json ?? {}) as Record<
    PermissionModule,
    PermissionLevel[]
  >;
  const granularFlags = (template?.granular_flags ?? []) as GranularFlag[];

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
            <Badge
              variant={template ? "secondary" : "outline"}
              className="rounded-full"
            >
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
                        highest === "admin" &&
                          "bg-primary/10 text-primary border-primary/20",
                        highest === "write" &&
                          "bg-blue-500/10 text-blue-600 border-blue-500/20",
                        highest === "read" &&
                          "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
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
                      <Check
                        className="h-2.5 w-2.5 text-primary"
                        strokeWidth={3}
                      />
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

// ─── Members Unified Table (stable component — avoids hook-in-render) ──

function MembersUnifiedTable({
  filtered,
  totalItems,
  action,
  search,
  onSearch,
  filters,
  activeFilters,
  onFilterChange,
  onClearFilters,
  isFiltered,
  removingPersonId,
  handleRemoveMember,
  projectId,
  onRefetch,
}: {
  filtered: PersonWithDetails[];
  totalItems: number;
  action: React.ReactNode;
  search: string;
  onSearch: (value: string) => void;
  filters?: FilterConfig[];
  activeFilters: Record<string, FilterValue>;
  onFilterChange: (filters: Record<string, FilterValue>) => void;
  onClearFilters: () => void;
  isFiltered: boolean;
  removingPersonId: string | null;
  handleRemoveMember: (id: string) => Promise<void>;
  projectId: string;
  onRefetch: () => void;
}) {
  const [permDialog, setPermDialog] = React.useState<{
    open: boolean;
    person: PersonWithDetails | null;
  }>({ open: false, person: null });

  const columns = React.useMemo<TableColumn<PersonWithDetails>[]>(
    () => [
      {
        id: "name",
        label: "Name",
        render: (person) => {
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
        sortValue: (person) => `${person.first_name} ${person.last_name}`,
        csvValue: (person) => `${person.first_name} ${person.last_name}`,
      },
      {
        id: "type",
        label: "Type",
        render: (person) => (
          <span className="text-sm text-muted-foreground capitalize">
            {person.person_type ?? "—"}
          </span>
        ),
        sortValue: (person) => person.person_type ?? "",
        csvValue: (person) => person.person_type ?? "",
      },
      {
        id: "role",
        label: "Job Title",
        render: (person) => (
          <span className="text-sm text-muted-foreground">
            {person.job_title ?? "—"}
          </span>
        ),
        sortValue: (person) => person.job_title ?? "",
        csvValue: (person) => person.job_title ?? "",
      },
      {
        id: "company",
        label: "Company",
        render: (person) => (
          <span className="text-sm text-muted-foreground">
            {person.company?.name ?? "—"}
          </span>
        ),
        sortValue: (person) => person.company?.name ?? "",
        csvValue: (person) => person.company?.name ?? "",
      },
      {
        id: "permission_template",
        label: "Permission Template",
        render: (person) => {
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
        sortValue: (person) => person.membership?.permission_template_id ?? "",
        csvValue: (person) => accessLevelLabel(person.permission_template),
      },
      {
        id: "email",
        label: "Email",
        render: (person) => (
          <span className="text-sm text-muted-foreground">
            {person.email ?? "—"}
          </span>
        ),
        sortValue: (person) => person.email ?? "",
        csvValue: (person) => person.email ?? "",
      },
      {
        id: "phone",
        label: "Phone",
        render: (person) => {
          const phone = person.phone_mobile || person.phone_business;
          return (
            <span className="text-sm text-muted-foreground">
              {phone ?? "—"}
            </span>
          );
        },
        sortValue: (person) =>
          person.phone_mobile || person.phone_business || "",
        csvValue: (person) =>
          person.phone_mobile || person.phone_business || "",
      },
      {
        id: "actions",
        label: "Actions",
        render: (person) => {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setPermDialog({ open: true, person })}
                >
                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                  View Permissions
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="mr-2 h-3.5 w-3.5" />
                  Send Email
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
      <DirectoryUnifiedTable
        title="All Project Members"
        action={action}
        columns={columns}
        items={filtered}
        getRowId={(person) => person.id}
        search={search}
        onSearch={onSearch}
        searchPlaceholder="Search by name, role or company..."
        totalItems={totalItems}
        filters={filters}
        activeFilters={activeFilters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        emptyTitle="No members"
        emptyDescription="Add project members to manage access and assignments."
        filteredDescription="No project members match the current filters."
        isFiltered={isFiltered}
        enablePagination={filtered.length > 15}
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
  const { confirm: confirmMember, ConfirmDialog: MemberConfirmDialog } =
    useConfirm();
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [activeFilters, setActiveFilters] = React.useState<
    Record<string, string | undefined>
  >({});
  const [removingPersonId, setRemovingPersonId] = React.useState<string | null>(
    null,
  );

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
      toast.error("Could not remove member", {
        description:
          err instanceof Error
            ? err.message
            : "The project directory did not confirm the removal.",
      });
    } finally {
      setRemovingPersonId(null);
    }
  };

  const companies = React.useMemo(() => {
    const names = new Set<string>();
    allMembers.forEach((p) => {
      if (p.company?.name) names.add(p.company.name);
    });
    return Array.from(names).sort();
  }, [allMembers]);

  const companyFilter = activeFilters.company;

  const memberFilters = React.useMemo<FilterConfig[] | undefined>(
    () =>
      companies.length > 0
        ? [
            {
              id: "company",
              label: "Company",
              type: "select",
              options: companies.map((company) => ({
                value: company,
                label: company,
              })),
            },
          ]
        : undefined,
    [companies],
  );

  const handleMemberFilterChange = React.useCallback(
    (nextFilters: Record<string, FilterValue>) => {
      const nextCompany = nextFilters.company;
      setActiveFilters({
        company: typeof nextCompany === "string" ? nextCompany : undefined,
      });
    },
    [],
  );

  const handleClearMemberFilters = React.useCallback(() => {
    setActiveFilters({});
  }, []);

  const filtered = React.useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return allMembers.filter((p) => {
      const matchesSearch =
        !q ||
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.company?.name ?? "").toLowerCase().includes(q) ||
        (p.job_title ?? "").toLowerCase().includes(q);
      const matchesCompany =
        !companyFilter || p.company?.name === companyFilter;
      return matchesSearch && matchesCompany;
    });
  }, [allMembers, companyFilter, deferredSearch]);

  if (isLoading) return <SectionSkeleton rows={5} />;
  if (error)
    return (
      <p className="text-sm text-destructive py-6">Failed to load members.</p>
    );

  return (
    <>
      <MembersUnifiedTable
        filtered={filtered}
        totalItems={allMembers.length}
        action={
          <Button size="xs" data-keep-text onClick={onAddClick}>
            Add Members
          </Button>
        }
        search={search}
        onSearch={setSearch}
        filters={memberFilters}
        activeFilters={activeFilters}
        onFilterChange={handleMemberFilterChange}
        onClearFilters={handleClearMemberFilters}
        isFiltered={Boolean(search || companyFilter)}
        removingPersonId={removingPersonId}
        handleRemoveMember={handleRemoveMember}
        projectId={projectId}
        onRefetch={() => {
          refetch();
          externalRefetch?.();
        }}
      />
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
  const { confirm: confirmVendor, ConfirmDialog: VendorConfirmDialog } =
    useConfirm();
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const handleRemove = React.useCallback(
    async (pv: (typeof vendors)[0]) => {
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
        toast.error("Could not remove vendor", {
          description:
            err instanceof Error
              ? err.message
              : `${name} could not be removed from this project.`,
        });
      } finally {
        setRemovingId(null);
      }
    },
    [confirmVendor, onRemoveVendor],
  );

  const vendorColumns = React.useMemo<TableColumn<(typeof vendors)[0]>[]>(
    () => [
      {
        id: "name",
        label: "Name",
        render: (projectVendor) => {
          const vendor = projectVendor.companies;
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="truncate text-sm font-medium text-foreground">
                {vendor?.name ?? "—"}
              </span>
            </div>
          );
        },
        sortValue: (projectVendor) => projectVendor.companies?.name ?? "",
        csvValue: (projectVendor) => projectVendor.companies?.name ?? "",
      },
      {
        id: "class",
        label: "Class",
        render: (projectVendor) => (
          <span className="text-sm text-muted-foreground">
            {projectVendor.companies?.vendor_class ?? "—"}
          </span>
        ),
        sortValue: (projectVendor) =>
          projectVendor.companies?.vendor_class ?? "",
        csvValue: (projectVendor) =>
          projectVendor.companies?.vendor_class ?? "",
      },
      {
        id: "location",
        label: "Location",
        render: (projectVendor) => {
          const vendor = projectVendor.companies;
          const location =
            vendor?.city && vendor?.state
              ? `${vendor.city}, ${vendor.state}`
              : (vendor?.city ?? vendor?.state ?? "—");
          return (
            <span className="text-sm text-muted-foreground">{location}</span>
          );
        },
        sortValue: (projectVendor) => {
          const vendor = projectVendor.companies;
          return vendor?.city && vendor?.state
            ? `${vendor.city}, ${vendor.state}`
            : (vendor?.city ?? vendor?.state ?? "");
        },
        csvValue: (projectVendor) => {
          const vendor = projectVendor.companies;
          return vendor?.city && vendor?.state
            ? `${vendor.city}, ${vendor.state}`
            : (vendor?.city ?? vendor?.state ?? "");
        },
      },
      {
        id: "actions",
        label: "",
        render: (projectVendor) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                disabled={removingId === projectVendor.id}
                onClick={() => void handleRemove(projectVendor)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                {removingId === projectVendor.id ? "Removing..." : "Remove"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [handleRemove, removingId],
  );

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
      <DirectoryUnifiedTable
        title="Vendors"
        action={
          <Button
            type="button"
            size="xs"
            data-keep-text
            onClick={onAddVendorClick}
          >
            Add Vendor
          </Button>
        }
        items={vendors}
        columns={vendorColumns}
        getRowId={(projectVendor) => projectVendor.id}
        emptyTitle="No vendors"
        emptyDescription="Add vendors to keep project purchasing contacts available."
        filteredDescription="No vendors match the current filters."
        isFiltered={false}
        enablePagination={vendors.length > 10}
      />
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

type CompanyContact = SubcontractorContact & {
  job_title: string | null;
};

type ExistingPerson = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company_name: string | null;
};

function contactName(person: {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}): string {
  const name = [person.first_name, person.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || person.email || "Unnamed";
}

function CompanyContactCard({
  projectId,
  companyId,
  projectCompanyId,
  companyName,
  typeLabel,
  primaryContactId,
  contacts,
  removing,
  onCompanyClick,
  onRemoveCompany,
  onRefetch,
}: {
  projectId: string;
  companyId: string;
  projectCompanyId: string;
  companyName: string;
  typeLabel: string;
  primaryContactId: string | null;
  contacts: CompanyContact[];
  removing: boolean;
  onCompanyClick: (companyId: string) => void;
  onRemoveCompany: (projectCompanyId: string, companyName: string) => void;
  onRefetch: () => void;
}) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [addPopoverOpen, setAddPopoverOpen] = React.useState(false);
  const [existingPeople, setExistingPeople] = React.useState<ExistingPerson[]>(
    [],
  );
  const [loadingPeople, setLoadingPeople] = React.useState(false);
  const [busyContactId, setBusyContactId] = React.useState<string | null>(null);
  const updateMutation = useUpdateProjectCompany(projectId);
  const { confirm: confirmContact, ConfirmDialog: ContactConfirmDialog } =
    useConfirm();
  const effectivePrimaryId = primaryContactId ?? contacts[0]?.id ?? null;

  React.useEffect(() => {
    if (!addPopoverOpen) return;
    setLoadingPeople(true);
    const supabase = createClient();
    supabase
      .from("people")
      .select(
        "id, first_name, last_name, email, company:companies!people_company_id_fkey(name)",
      )
      .or(`company_id.is.null,company_id.neq.${companyId}`)
      .order("first_name", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        setExistingPeople(
          ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
            id: row.id as string,
            first_name: (row.first_name as string | null) ?? null,
            last_name: (row.last_name as string | null) ?? null,
            email: (row.email as string | null) ?? null,
            company_name:
              (row.company as { name?: string } | null)?.name ?? null,
          })),
        );
        setLoadingPeople(false);
      });
  }, [addPopoverOpen, companyId]);

  const handleSetPrimary = async (personId: string) => {
    setBusyContactId(personId);
    try {
      await updateMutation.mutateAsync({
        companyId: projectCompanyId,
        data: { primary_contact_id: personId },
      });
      toast.success("Primary contact updated");
      onRefetch();
    } catch {
      toast.error("Failed to update primary contact");
    } finally {
      setBusyContactId(null);
    }
  };

  const handleAddExisting = async (person: ExistingPerson) => {
    setAddPopoverOpen(false);
    try {
      await updateContact(person.id, { company_id: companyId });
      toast.success(`${contactName(person)} added to ${companyName}`);
      onRefetch();
    } catch {
      toast.error("Failed to add contact");
    }
  };

  const handleRemoveContact = async (contact: CompanyContact) => {
    const name = contactDisplayName(contact) || "this contact";
    const ok = await confirmContact({
      description: `Remove ${name} from ${companyName}? They stay in the directory but are no longer linked to this company.`,
      variant: "destructive",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    setBusyContactId(contact.id);
    try {
      await updateContact(contact.id, { company_id: null });
      toast.success(`${name} removed from ${companyName}`);
      onRefetch();
    } catch {
      toast.error("Failed to remove contact");
    } finally {
      setBusyContactId(null);
    }
  };

  return (
    <>
      <tbody>
        {/* Company section row — spans all columns */}
        <tr>
          <td colSpan={5} className="pt-4 pb-0">
            <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-1.5">
              <div className="flex min-w-0 items-baseline gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onCompanyClick(companyId)}
                  className="h-auto -ml-2 truncate px-2 py-0.5 text-sm font-semibold text-primary hover:bg-transparent hover:underline"
                >
                  {companyName}
                </Button>
                {typeLabel && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {typeLabel}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      aria-label={`Add contact to ${companyName}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search existing contacts..." />
                      <CommandList className="max-h-56">
                        <CommandEmpty>
                          {loadingPeople ? "Loading..." : "No existing contacts found."}
                        </CommandEmpty>
                        {existingPeople.length > 0 && (
                          <CommandGroup heading="Add existing contact">
                            {existingPeople.map((person) => (
                              <CommandItem
                                key={person.id}
                                value={`${person.first_name ?? ""} ${person.last_name ?? ""} ${person.email ?? ""}`}
                                onSelect={() => void handleAddExisting(person)}
                              >
                                <div className="flex min-w-0 flex-col">
                                  <span className="truncate text-sm">
                                    {contactName(person)}
                                  </span>
                                  {(person.email || person.company_name) && (
                                    <span className="truncate text-xs text-muted-foreground">
                                      {[person.email, person.company_name]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                    <div className="border-t border-border/60 p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-sm"
                        onClick={() => {
                          setAddPopoverOpen(false);
                          setCreateOpen(true);
                        }}
                      >
                        <UserPlus className="mr-2 h-4 w-4 shrink-0" />
                        Create new contact
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      aria-label="Company actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/directory/companies/${companyId}?edit=1`}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      disabled={removing}
                      onClick={() =>
                        onRemoveCompany(projectCompanyId, companyName)
                      }
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      {removing ? "Removing..." : "Remove"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </td>
        </tr>

        {/* Contact rows */}
        {contacts.length === 0 ? (
          <tr>
            <td
              colSpan={5}
              className="py-2.5 pb-3 text-sm text-muted-foreground"
            >
              No contacts yet.
            </td>
          </tr>
        ) : (
          contacts.map((contact) => {
            const isPrimary = contact.id === effectivePrimaryId;
            const phone = contact.phone_business || contact.phone_mobile;
            return (
              <tr key={contact.id} className="group border-t border-border/40">
                <td className="py-2.5 pr-4">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <Link
                      href={`/directory/contacts/${contact.id}`}
                      className="truncate text-sm text-foreground hover:underline"
                    >
                      {contactDisplayName(contact) || "Unnamed"}
                    </Link>
                    {isPrimary && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        Primary
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 pr-4">
                  <span className="truncate text-sm text-muted-foreground">
                    {contact.job_title}
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      className="truncate text-sm text-muted-foreground hover:underline"
                    >
                      {contact.email}
                    </a>
                  ) : null}
                </td>
                <td className="py-2.5">
                  <span className="truncate text-sm text-muted-foreground">
                    {phone}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busyContactId === contact.id}
                        className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                        aria-label={`Actions for ${contactDisplayName(contact) || "contact"}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!isPrimary && (
                        <DropdownMenuItem
                          onClick={() => void handleSetPrimary(contact.id)}
                        >
                          <Check className="mr-2 h-3.5 w-3.5" />
                          Set as primary
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href={`/directory/contacts/${contact.id}`}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => void handleRemoveContact(contact)}
                      >
                        <UserX className="mr-2 h-3.5 w-3.5" />
                        Remove from company
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })
        )}
      </tbody>

      <ContactFormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultCompanyId={companyId}
        onSuccess={() => onRefetch()}
      />
      {ContactConfirmDialog}
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
    company?: { name: string | null; vendor_class?: string | null } | null;
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
  const { confirm: confirmCompany, ConfirmDialog: CompanyConfirmDialog } =
    useConfirm();
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [removingCompanyId, setRemovingCompanyId] = React.useState<
    string | null
  >(null);

  const handleRemoveCompany = async (
    companyId: string,
    companyName: string,
  ) => {
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

  const companyIds = React.useMemo(
    () => companies.map((c) => c.company_id),
    [companies],
  );

  const [contactsByCompany, setContactsByCompany] = React.useState<
    Map<string, CompanyContact[]>
  >(new Map());

  const reloadContacts = React.useCallback(() => {
    if (companyIds.length === 0) {
      setContactsByCompany(new Map());
      return;
    }
    const supabase = createClient();
    supabase
      .from("people")
      .select(
        "id, first_name, last_name, email, phone_business, phone_mobile, job_title, company_id",
      )
      .in("company_id", companyIds)
      .order("first_name", { ascending: true })
      .then(({ data }) => {
        const map = new Map<string, CompanyContact[]>();
        (
          (data ?? []) as Array<CompanyContact & { company_id: string }>
        ).forEach((person) => {
          const list = map.get(person.company_id) ?? [];
          list.push(person);
          map.set(person.company_id, list);
        });
        setContactsByCompany(map);
      });
  }, [companyIds]);

  React.useEffect(() => {
    reloadContacts();
  }, [reloadContacts]);

  const companyCards = React.useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return companies
      .map((projectCompany) => {
        const vendorClass = projectCompany.company?.vendor_class ?? null;
        const isOwner =
          ownerCompanyId !== null &&
          projectCompany.company_id === ownerCompanyId;
        const typeLabel = isOwner
          ? "Owner"
          : vendorClass === "SUB"
            ? "Subcontractor"
            : vendorClass || "";
        return {
          companyId: projectCompany.company_id,
          projectCompanyId: projectCompany.id,
          name: projectCompany.company?.name || "Untitled Company",
          typeLabel,
          primaryContactId:
            projectCompany.primary_contact_id ??
            projectCompany.primary_contact?.id ??
            null,
          contacts: contactsByCompany.get(projectCompany.company_id) ?? [],
        };
      })
      .filter((card) => {
        if (!q) return true;
        if (card.name.toLowerCase().includes(q)) return true;
        return card.contacts.some(
          (contact) =>
            contactDisplayName(contact).toLowerCase().includes(q) ||
            (contact.email ?? "").toLowerCase().includes(q) ||
            (contact.job_title ?? "").toLowerCase().includes(q),
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [companies, ownerCompanyId, contactsByCompany, deferredSearch]);

  const addCompanyAction = (
    <Button size="xs" data-keep-text onClick={onAssignClick}>
      Add Company
    </Button>
  );

  return (
    <>
      <SectionRow
        title="Subcontractors"
        action={addCompanyAction}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search companies or contacts..."
      />
      <div className="mt-4">
        {isLoading ? (
          <SectionSkeleton rows={3} />
        ) : error ? (
          <p className="py-4 text-sm text-destructive">
            Failed to load companies.
          </p>
        ) : companyCards.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {search
              ? "No companies or contacts match your search."
              : "No subcontractors yet."}
          </p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border/60">
                <th className="pb-2 pt-1 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground pr-4">
                  Name
                </th>
                <th className="pb-2 pt-1 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground pr-4 w-40">
                  Title
                </th>
                <th className="pb-2 pt-1 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground pr-4">
                  Email
                </th>
                <th className="pb-2 pt-1 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground w-36">
                  Phone
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            {companyCards.map((card) => (
              <CompanyContactCard
                key={card.projectCompanyId}
                projectId={projectId}
                companyId={card.companyId}
                projectCompanyId={card.projectCompanyId}
                companyName={card.name}
                typeLabel={card.typeLabel}
                primaryContactId={card.primaryContactId}
                contacts={card.contacts}
                removing={removingCompanyId === card.projectCompanyId}
                onCompanyClick={onCompanyClick}
                onRemoveCompany={handleRemoveCompany}
                onRefetch={() => {
                  onRefetch();
                  reloadContacts();
                }}
              />
            ))}
          </table>
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
  const [ownerCompanyId, setOwnerCompanyId] = React.useState<string | null>(
    null,
  );
  React.useEffect(() => {
    if (!projectId) return;
    const supabase = createClient();
    supabase
      .from("projects")
      .select("company_id, companies(name)")
      .eq("id", parseInt(projectId, 10))
      .single()
      .then(({ data }) => {
        const companyName = (
          data as { companies?: { name?: string } | null } | null
        )?.companies?.name;
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
          (data as { contract_company_id?: string | null } | null)
            ?.contract_company_id ?? null,
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
  const {
    vendors,
    isLoading: vendorsLoading,
    error: vendorsError,
    addVendor,
    removeVendor,
  } = useProjectVendors(projectId);

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
      statusBadge={
        clientName ? (
          <span className="text-sm text-muted-foreground">{clientName}</span>
        ) : undefined
      }
      contentClassName="space-y-12"
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
          onRefetch={() => {
            void refetchCompanies();
          }}
          onCompanyClick={(companyId) =>
            setCompanySheet({ open: true, companyId })
          }
        />
      </section>

      {/* Section 2: Project Team */}
      <section id="project-team" className="scroll-mt-24">
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
        onSuccess={() => {
          void refetchCompanies();
        }}
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
        onOpenChange={(open) => setCompanySheet((prev) => ({ ...prev, open }))}
        projectId={projectId}
      />
    </PageShell>
  );
}
