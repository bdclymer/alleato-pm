"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  UserPlus,
  Users,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserX,
  Package,
  Search,
  Mail,
  Download,
  ChevronRight,
  SlidersHorizontal,
  Phone,
} from "lucide-react";
import {
  PageShell,
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
  StatusBadge,
  SectionHeader,
  Stack,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ds";
import { useProjectRoles, type ProjectRole } from "@/hooks/use-project-roles";
import { useProjectUsers } from "@/hooks/use-project-users";
import { useProjectVendors } from "@/hooks/use-project-vendors";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import type { PersonWithDetails } from "@/services/directoryService";

// ─── Types ───────────────────────────────────────────────────────

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
  is_active: boolean;
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

function TeamCardSkeleton() {
  return (
    <div className="rounded-lg bg-card p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-muted" />
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
      </div>
      <div className="h-3 w-40 rounded bg-muted" />
    </div>
  );
}

// ─── Dialogs ─────────────────────────────────────────────────────

function MemberCombobox({
  people,
  selectedIds,
  onSelect,
}: {
  people: PersonOption[];
  selectedIds: string[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between"
        >
          {selectedIds.length > 0
            ? `${selectedIds.length} selected`
            : "Select people..."}
          <ChevronsUpDown className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search people..." />
          <CommandList>
            <CommandEmpty>No people found.</CommandEmpty>
            <CommandGroup>
              {people.map((person) => (
                <CommandItem
                  key={person.id}
                  value={`${person.first_name} ${person.last_name} ${person.email ?? ""}`}
                  onSelect={() => onSelect(person.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedIds.includes(person.id)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm">
                      {person.first_name} {person.last_name}
                    </span>
                    {(person.job_title || person.company_name) && (
                      <span className="text-xs text-muted-foreground">
                        {[person.job_title, person.company_name].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AssignMemberDialog({
  open,
  onOpenChange,
  role,
  onSave,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: ProjectRole | null;
  onSave: (roleId: string, personIds: string[]) => Promise<void>;
  projectId: string;
}) {
  const [people, setPeople] = React.useState<PersonOption[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !role) return;
    setSelectedIds(role.members.map((m) => m.person_id));

    const supabase = createClient();
    const loadAllPeople = async () => {
      const { data } = await supabase
        .from("people")
        .select(
          "id, first_name, last_name, email, job_title, company:companies(name)"
        )
        .order("first_name");

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
    };

    loadAllPeople();
  }, [open, role, projectId]);

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const projectIdNum = parseInt(projectId, 10);
      for (const personId of selectedIds) {
        const { data: existing } = await supabase
          .from("project_directory_memberships")
          .select("id")
          .eq("project_id", projectIdNum)
          .eq("person_id", personId)
          .eq("status", "active")
          .maybeSingle();

        if (!existing) {
          await supabase.from("project_directory_memberships").upsert(
            { project_id: projectIdNum, person_id: personId, status: "active" },
            { onConflict: "project_id,person_id" }
          );
        }
      }

      await onSave(role.id, selectedIds);
      toast.success("Role assignment updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update role assignment"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw]">
        <DialogHeader>
          <DialogTitle>Assign Members — {role?.role_name}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <MemberCombobox
            people={people}
            selectedIds={selectedIds}
            onSelect={toggle}
          />
          {selectedIds.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedIds.map((id) => {
                const p = people.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <Badge key={id} variant="secondary" className="gap-1">
                    {p.first_name} {p.last_name}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggle(id)}
                      className="ml-0.5 rounded-sm hover:bg-muted h-auto p-0 px-0.5"
                    >
                      ×
                    </Button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
      const res = await fetch(
        `/api/projects/${projectId}/directory/people`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ person_id: selected }),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to add member");
      }
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
      <DialogContent className="sm:max-w-lg w-[95vw]">
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
      .from("vendors")
      .select(
        "id, name, legal_name, vendor_class, contact_name, city, state, is_active"
      )
      .eq("is_active", true)
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

// ─── Project Team Section ────────────────────────────────────────
// Shows key roles as prominent cards (like the screenshot)

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
  const [assignDialog, setAssignDialog] = React.useState<{
    open: boolean;
    role: ProjectRole | null;
  }>({ open: false, role: null });
  const createRoleOpen = manageRolesOpen ?? false;
  const setCreateRoleOpen = (open: boolean) => {
    onManageRolesOpenChange?.(open);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TeamCardSkeleton />
        <TeamCardSkeleton />
        <TeamCardSkeleton />
      </div>
    );
  }

  // Show roles that have members assigned as prominent team cards
  const assignedRoles = roles.filter((r) => r.members.length > 0);
  const emptyRoles = roles.filter((r) => r.members.length === 0);

  const handleDeleteRole = async (role: ProjectRole) => {
    const confirmed = window.confirm(
      `Delete role "${role.role_name}"? This will remove all assignments for this role.`,
    );
    if (!confirmed) return;

    try {
      await deleteRole(role.id);
      toast.success("Role deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete role");
    }
  };

  if (roles.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No roles defined yet.{" "}
        <button type="button" onClick={() => setCreateRoleOpen(true)} className="text-primary hover:underline">
          Add a role
        </button>
      </p>
    );
  }

  return (
    <>
      {/* Team members table */}
      {assignedRoles.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Role</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedRoles.flatMap((role) =>
                role.members.map((member) => {
                  const p = member.person;
                  const phone = p?.phone_mobile || p?.phone_business;
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="w-12 pr-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {initials(p?.first_name, p?.last_name)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">
                          {p?.full_name ?? "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {role.role_name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {p?.email ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {phone ?? "—"}
                      </TableCell>
                      <TableCell>
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
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Edit assignment
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteRole(role)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete role
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty roles as dashed placeholders */}
      {emptyRoles.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          {emptyRoles.map((role) => (
            <div
              key={role.id}
              className="relative rounded-lg border border-dashed border-border/70 p-5 hover:border-border hover:bg-accent/50 transition-colors"
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-8 w-8"
                    aria-label={`Role actions for ${role.role_name}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setAssignDialog({ open: true, role })}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit assignment
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDeleteRole(role)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete role
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                onClick={() => setAssignDialog({ open: true, role })}
                className="h-auto w-full justify-start px-0 py-0 pr-10 text-left hover:bg-transparent"
              >
                <span className="flex flex-col items-start gap-1">
                <p className="text-sm font-medium text-foreground">
                  {role.role_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  + Assign someone
                </p>
                </span>
              </Button>
            </div>
          ))}
        </div>
      )}

      <AssignMemberDialog
        open={assignDialog.open}
        onOpenChange={(open) =>
          setAssignDialog((prev) => ({ ...prev, open }))
        }
        role={assignDialog.role}
        onSave={updateRoleMembers}
        projectId={projectId}
      />
      <CreateRoleDialog
        open={createRoleOpen}
        onOpenChange={setCreateRoleOpen}
        onSave={async (name) => {
          await createRole(name);
        }}
      />
    </>
  );
}

// ─── External Members Section ────────────────────────────────────
// Full table with search + filter (matches screenshot structure)

function ExternalMembersSection({ projectId }: { projectId: string }) {
  const {
    users: members,
    isLoading,
    error,
    refetch,
  } = useProjectUsers(projectId, { type: "all" });
  const [addOpen, setAddOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [companyFilter, setCompanyFilter] = React.useState("all");
  const [removingPersonId, setRemovingPersonId] = React.useState<string | null>(
    null,
  );

  const handleRemoveMember = async (personId: string) => {
    if (removingPersonId) return;

    const confirmed = window.confirm(
      "Remove this member from the project directory?",
    );
    if (!confirmed) return;

    try {
      setRemovingPersonId(personId);
      const response = await fetch(
        `/api/projects/${projectId}/directory/people/${personId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        let errorMessage = "Failed to remove member";
        try {
          const data = await response.json();
          if (typeof data?.error === "string" && data.error.trim().length > 0) {
            errorMessage = data.error;
          }
        } catch {
          // Preserve fallback for non-JSON error responses.
        }
        throw new Error(errorMessage);
      }

      await refetch();
      toast.success("Member removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingPersonId(null);
    }
  };

  // Get unique companies for filter
  const companies = React.useMemo(() => {
    const names = new Set<string>();
    members.forEach((p) => {
      if (p.company?.name) names.add(p.company.name);
    });
    return Array.from(names).sort();
  }, [members]);

  const filtered = members.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.company?.name ?? "").toLowerCase().includes(q) ||
      (p.job_title ?? "").toLowerCase().includes(q);

    const matchesCompany =
      companyFilter === "all" || p.company?.name === companyFilter;

    return matchesSearch && matchesCompany;
  });

  if (isLoading) return <SectionSkeleton rows={5} />;
  if (error) {
    return (
      <p className="text-sm text-destructive py-6">Failed to load members.</p>
    );
  }

  if (members.length === 0) {
    return (
      <>
        <p className="py-6 text-center text-sm text-muted-foreground">
          No members yet.{" "}
          <button type="button" onClick={() => setAddOpen(true)} className="text-primary hover:underline">
            Add one
          </button>
        </p>
        <AddMemberDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          projectId={projectId}
          onSuccess={refetch}
        />
      </>
    );
  }

  return (
    <>
      {/* Toolbar: search + company filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members by name, role or company..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Members table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Role / Job Title</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Phone</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                  No members match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((person) => {
                const isEmployee = person.person_type === "employee";
                const phone = person.phone_mobile || person.phone_business;

                return (
                  <TableRow key={person.id}>
                    <TableCell className="w-12 pr-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback
                          className={cn(
                            "text-xs font-medium",
                            isEmployee
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {initials(person.first_name, person.last_name)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground">
                        {person.first_name} {person.last_name}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {person.job_title ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {person.email ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        onSuccess={refetch}
      />
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
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const handleRemove = async (pv: (typeof vendors)[0]) => {
    const name = pv.vendor?.name ?? "this vendor";
    const confirmed = window.confirm(`Remove "${name}" from this project?`);
    if (!confirmed) return;

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
        <button type="button" onClick={onAddVendorClick} className="text-primary hover:underline">
          Add one
        </button>
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
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
            const v = pv.vendor;
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
  );
}

// ─── Companies Section ──────────────────────────────────────────

function CompaniesSection({ members }: { members: PersonWithDetails[] }) {
  const companies = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; memberCount: number }>();
    for (const m of members) {
      if (m.company?.id && m.company?.name) {
        const existing = map.get(m.company.id);
        if (existing) {
          existing.memberCount++;
        } else {
          map.set(m.company.id, {
            id: m.company.id,
            name: m.company.name,
            memberCount: 1,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  if (companies.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No companies found.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead className="hidden md:table-cell">Members</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {c.name}
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {c.memberCount} {c.memberCount === 1 ? "member" : "members"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function ProjectDirectoryPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { users: members, refetch: refetchMembers } = useProjectUsers(projectId, { type: "all" });
  const [addMemberOpen, setAddMemberOpen] = React.useState(false);
  const [addVendorOpen, setAddVendorOpen] = React.useState(false);
  const [manageRolesOpen, setManageRolesOpen] = React.useState(false);
  const { vendors, isLoading: vendorsLoading, error: vendorsError, addVendor, removeVendor } =
    useProjectVendors(projectId);

  const existingVendorIds = vendors
    .map((v) => v.vendor?.id)
    .filter(Boolean) as string[];

  return (
    <PageShell
      variant="dashboard"
      title="Project Directory"
      actions={
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" onClick={() => setAddMemberOpen(true)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Add Members
          </Button>
        </div>
      }
    >
      <Stack gap="xl">
        {/* Section 1: Project Team */}
        <section>
          <SectionHeader
            title="Project Team"
            action={{ label: "Manage Roles", onClick: () => setManageRolesOpen(true) }}
          />
          <div className="mt-4">
            <ProjectTeamSection
              projectId={projectId}
              manageRolesOpen={manageRolesOpen}
              onManageRolesOpenChange={setManageRolesOpen}
            />
          </div>
        </section>

        {/* Section 2: Companies (left) + Vendors (right) — two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <SectionHeader title="Companies" />
            <div className="mt-4">
              <CompaniesSection members={members} />
            </div>
          </section>

          <section>
            <SectionHeader
              title="Vendors"
              action={{ label: "+ Add", onClick: () => setAddVendorOpen(true) }}
            />
            <div className="mt-4">
              <VendorsSection
                vendors={vendors}
                isLoading={vendorsLoading}
                error={vendorsError}
                onAddVendorClick={() => setAddVendorOpen(true)}
                onRemoveVendor={removeVendor}
              />
            </div>
          </section>
        </div>

        {/* Section 3: All Project Members */}
        <section>
          <SectionHeader
            title="All Project Members"
            count={members.length}
            action={{ label: "+ Add", onClick: () => setAddMemberOpen(true) }}
          />
          <div className="mt-4">
            <ExternalMembersSection projectId={projectId} />
          </div>
        </section>
      </Stack>

      <AddMemberDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        projectId={projectId}
        onSuccess={refetchMembers}
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
