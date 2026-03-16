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
  Users2,
} from "lucide-react";
import {
  ProjectPageHeader,
  PageContainer,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
  SectionHeader,
  StatusBadge,
  EmptyState,
  Eyebrow,
} from "@/components/ds";
import { useProjectRoles, type ProjectRole } from "@/hooks/use-project-roles";
import { useProjectUsers } from "@/hooks/use-project-users";
import { useProjectVendors } from "@/hooks/use-project-vendors";
import { useDistributionGroups } from "@/hooks/use-distribution-groups";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveDistributionGroupsTable } from "@/components/directory/responsive/ResponsiveDistributionGroupsTable";
import { DistributionGroupListSkeleton } from "@/components/directory/skeletons/DistributionGroupListSkeleton";
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

interface NewContactForm {
  first_name: string;
  last_name: string;
  email: string;
  phone_mobile: string;
  job_title: string;
  company_id: string;
}

const EMPTY_FORM: NewContactForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone_mobile: "",
  job_title: "",
  company_id: "",
};

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

// ─── Loading skeleton ────────────────────────────────────────────

function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
      <div className="h-48 w-full animate-pulse rounded-md bg-muted" />
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
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                  <span className="text-sm">
                    {person.first_name} {person.last_name}
                  </span>
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: ProjectRole | null;
  onSave: (roleId: string, personIds: string[]) => Promise<void>;
}) {
  const [people, setPeople] = React.useState<PersonOption[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !role) return;
    setSelectedIds(role.members.map((m) => m.person_id));

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
  }, [open, role]);

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    try {
      await onSave(role.id, selectedIds);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
                    <button
                      onClick={() => toggle(id)}
                      className="ml-0.5 rounded-sm hover:bg-muted"
                    >
                      ×
                    </button>
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
  const [tab, setTab] = React.useState<"existing" | "new">("existing");
  const [people, setPeople] = React.useState<PersonOption[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<NewContactForm>(EMPTY_FORM);
  const [companies, setCompanies] = React.useState<
    { id: string; name: string }[]
  >([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setSelected(null);
    setForm(EMPTY_FORM);

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

    supabase
      .from("companies")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setCompanies(data);
      });
  }, [open]);

  const handleAddExisting = async () => {
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

  const handleCreateNew = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: newPerson, error: insertError } = await supabase
        .from("people")
        .insert({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim() || null,
          phone_mobile: form.phone_mobile.trim() || null,
          job_title: form.job_title.trim() || null,
          company_id: form.company_id || null,
          person_type: "contact",
        })
        .select("id")
        .single();

      if (insertError) throw new Error(insertError.message);

      const res = await fetch(
        `/api/projects/${projectId}/directory/people`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ person_id: newPerson.id }),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to add member to project");
      }

      toast.success("Contact created and added to project");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create contact"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Add an existing person or create a new contact.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "existing" | "new")}
        >
          <TabsList className="w-full">
            <TabsTrigger value="existing" className="flex-1">
              Select Existing
            </TabsTrigger>
            <TabsTrigger value="new" className="flex-1">
              New Contact
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="mt-4">
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
          </TabsContent>

          <TabsContent value="new" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first-name">First name *</Label>
                <Input
                  id="first-name"
                  value={form.first_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, first_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last-name">Last name *</Label>
                <Input
                  id="last-name"
                  value={form.last_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, last_name: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone_mobile}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone_mobile: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-title">Job title</Label>
              <Input
                id="job-title"
                value={form.job_title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, job_title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <select
                id="company"
                title="Company"
                value={form.company_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, company_id: e.target.value }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Select company —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {tab === "existing" ? (
            <Button
              onClick={handleAddExisting}
              disabled={!selected || saving}
            >
              {saving ? "Adding..." : "Add Member"}
            </Button>
          ) : (
            <Button
              onClick={handleCreateNew}
              disabled={
                !form.first_name.trim() || !form.last_name.trim() || saving
              }
            >
              {saving ? "Creating..." : "Create & Add"}
            </Button>
          )}
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

function initials(first?: string | null, last?: string | null): string {
  return (
    `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?"
  );
}

// ─── Team Section ────────────────────────────────────────────────

function TeamSection({ projectId }: { projectId: string }) {
  const { roles, isLoading, error, updateRoleMembers, createRole } =
    useProjectRoles(projectId);

  const [assignDialog, setAssignDialog] = React.useState<{
    open: boolean;
    role: ProjectRole | null;
  }>({ open: false, role: null });
  const [createRoleOpen, setCreateRoleOpen] = React.useState(false);

  const totalAssigned = roles.reduce((acc, r) => acc + r.members.length, 0);

  if (isLoading) return <SectionSkeleton />;
  if (error)
    return (
      <p className="text-sm text-destructive">Failed to load team roles.</p>
    );

  return (
    <section>
      <SectionHeader
        title="Team"
        count={totalAssigned}
        action={{
          label: "+ Add Role",
          onClick: () => setCreateRoleOpen(true),
        }}
      />

      {roles.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          title="No roles defined"
          description="Create roles like Project Manager, Superintendent, or Architect to organize your team."
          action={{
            label: "Add Role",
            onClick: () => setCreateRoleOpen(true),
          }}
        />
      ) : (
        <div className="space-y-6">
          {roles.map((role) => (
            <div key={role.id}>
              <div className="flex items-center justify-between mb-2">
                <Eyebrow>
                  {role.role_name} ({role.members.length})
                </Eyebrow>
                <button
                  onClick={() => setAssignDialog({ open: true, role })}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  + Assign
                </button>
              </div>

              {role.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No one assigned.{" "}
                  <button
                    onClick={() => setAssignDialog({ open: true, role })}
                    className="text-primary hover:underline"
                  >
                    Assign someone
                  </button>
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Email
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Company
                      </TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {role.members.map((member) => {
                      const p = member.person;
                      return (
                        <TableRow
                          key={member.id}
                          className="transition-colors hover:bg-muted"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {initials(p?.first_name, p?.last_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-foreground">
                                {p?.full_name ?? "Unknown"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {p?.email ?? "—"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {p?.company_name ?? "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    setAssignDialog({ open: true, role })
                                  }
                                >
                                  <Pencil className="mr-2 h-3.5 w-3.5" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() =>
                                    updateRoleMembers(
                                      role.id,
                                      role.members
                                        .filter((m) => m.id !== member.id)
                                        .map((m) => m.person_id)
                                    )
                                  }
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
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
      />
      <CreateRoleDialog
        open={createRoleOpen}
        onOpenChange={setCreateRoleOpen}
        onSave={async (name) => {
          await createRole(name);
        }}
      />
    </section>
  );
}

// ─── Members Section ─────────────────────────────────────────────

function MembersSection({ projectId }: { projectId: string }) {
  const {
    users: members,
    isLoading,
    error,
    refetch,
  } = useProjectUsers(projectId, { type: "all" });
  const [addOpen, setAddOpen] = React.useState(false);

  if (isLoading) return <SectionSkeleton />;
  if (error)
    return (
      <p className="text-sm text-destructive">Failed to load members.</p>
    );

  return (
    <section>
      <SectionHeader
        title="Members"
        count={members.length}
        action={{ label: "+ Add", onClick: () => setAddOpen(true) }}
      />

      {members.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-5 w-5 text-muted-foreground" />}
          title="No members yet"
          description="Add existing people or create new contacts for this project."
          action={{ label: "Add Member", onClick: () => setAddOpen(true) }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Company</TableHead>
              <TableHead className="hidden lg:table-cell">
                Permission
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((person) => {
              const isEmployee = person.person_type === "employee";
              const status = memberStatusLabel(person.membership);

              return (
                <TableRow
                  key={person.id}
                  className="transition-colors hover:bg-muted"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={cn(
                            "text-xs",
                            isEmployee
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {initials(person.first_name, person.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {person.first_name} {person.last_name}
                        </p>
                        {person.job_title && (
                          <p className="text-xs text-muted-foreground">
                            {person.job_title}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {person.email ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {person.company?.name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {person.permission_template?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive">
                          <UserX className="mr-2 h-3.5 w-3.5" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        onSuccess={refetch}
      />
    </section>
  );
}

// ─── Vendors Section ─────────────────────────────────────────────

function VendorsSection({ projectId }: { projectId: string }) {
  const { vendors, isLoading, error, addVendor, removeVendor } =
    useProjectVendors(projectId);
  const [addOpen, setAddOpen] = React.useState(false);

  const existingVendorIds = vendors
    .map((v) => v.vendor?.id)
    .filter(Boolean) as string[];

  const handleAdd = async (vendorId: string) => {
    try {
      await addVendor(vendorId);
      toast.success("Vendor added to project");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add vendor"
      );
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeVendor(id);
      toast.success("Vendor removed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove vendor"
      );
    }
  };

  if (isLoading) return <SectionSkeleton />;
  if (error)
    return (
      <p className="text-sm text-destructive">Failed to load vendors.</p>
    );

  return (
    <section>
      <SectionHeader
        title="Vendors"
        count={vendors.length}
        action={{ label: "+ Add", onClick: () => setAddOpen(true) }}
      />

      {vendors.length === 0 ? (
        <EmptyState
          icon={<Package className="h-5 w-5 text-muted-foreground" />}
          title="No vendors added"
          description="Add vendors from the company directory to this project."
          action={{ label: "Add Vendor", onClick: () => setAddOpen(true) }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead className="hidden md:table-cell">Class</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="hidden lg:table-cell">Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((pv) => {
              const v = pv.vendor;
              const location = [v?.city, v?.state]
                .filter(Boolean)
                .join(", ");

              return (
                <TableRow
                  key={pv.id}
                  className="transition-colors hover:bg-muted"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {v?.name ?? "—"}
                        </p>
                        {v?.legal_name && v.legal_name !== v.name && (
                          <p className="text-xs text-muted-foreground">
                            {v.legal_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {v?.vendor_class ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {v?.contact_name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {location || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={v?.is_active ? "Active" : "Inactive"}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleRemove(pv.id)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <AddVendorDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existingVendorIds={existingVendorIds}
        onAdd={handleAdd}
      />
    </section>
  );
}

// ─── Distribution Groups Section ─────────────────────────────────

function GroupsSection({ projectId }: { projectId: string }) {
  const { groups, isLoading, error } = useDistributionGroups(
    projectId,
    true,
    "active"
  );

  if (isLoading) return <SectionSkeleton />;
  if (error)
    return (
      <p className="text-sm text-destructive">Failed to load groups.</p>
    );

  return (
    <section>
      <SectionHeader
        title="Distribution Groups"
        count={groups.length}
        action={{ label: "+ Create", onClick: () => {} }}
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={<Users2 className="h-5 w-5 text-muted-foreground" />}
          title="No distribution groups"
          description="Create groups to quickly email sets of project members."
          action={{ label: "Create Group", onClick: () => {} }}
        />
      ) : (
        <ResponsiveDistributionGroupsTable
          groups={groups}
          onEdit={() => {}}
          onDelete={async () => {}}
          onManageMembers={() => {}}
        />
      )}
    </section>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function ProjectDirectoryPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <>
      <ProjectPageHeader title="Directory" />
      <PageContainer maxWidth="xl">
        <div className="space-y-10">
          <TeamSection projectId={projectId} />
          <MembersSection projectId={projectId} />
          <VendorsSection projectId={projectId} />
          <GroupsSection projectId={projectId} />
        </div>
      </PageContainer>
    </>
  );
}
