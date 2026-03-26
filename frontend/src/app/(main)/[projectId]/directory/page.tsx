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
  Search,
  Mail,
  Phone,
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
  StatusBadge,
  EmptyState,
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

// ─── Skeleton ────────────────────────────────────────────────────

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-border/50"
        >
          <div className="h-8 w-8 rounded-full animate-pulse bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-36 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="hidden md:block h-3 w-40 animate-pulse rounded bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

// ─── Tab header with search + action ─────────────────────────────

function TabToolbar({
  search,
  onSearch,
  searchPlaceholder,
  count,
  action,
}: {
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 pb-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 h-8 text-sm"
        />
      </div>
      {count !== undefined && (
        <span className="text-sm text-muted-foreground tabular-nums">
          {count} {count === 1 ? "result" : "results"}
        </span>
      )}
      <div className="ml-auto">{action}</div>
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

    // Fetch ALL people from the company directory so any person can be assigned
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
      // Auto-add selected people as project members if not already
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

// ─── Members Tab ──────────────────────────────────────────────────

function MembersTab({ projectId }: { projectId: string }) {
  const {
    users: members,
    isLoading,
    error,
    refetch,
  } = useProjectUsers(projectId, { type: "all" });
  const [addOpen, setAddOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = members.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.company?.name ?? "").toLowerCase().includes(q) ||
      (p.job_title ?? "").toLowerCase().includes(q)
    );
  });

  if (isLoading) return <TableSkeleton />;
  if (error)
    return (
      <p className="text-sm text-destructive py-6">Failed to load members.</p>
    );

  return (
    <div>
      <TabToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search members..."
        count={search ? filtered.length : undefined}
        action={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Add Member
          </Button>
        }
      />

      {members.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-5 w-5 text-muted-foreground" />}
          title="No members yet"
          description="Add existing people or create new contacts for this project."
          action={{ label: "Add Member", onClick: () => setAddOpen(true) }}
        />
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No members match &ldquo;{search}&rdquo;
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Company</TableHead>
              <TableHead className="hidden lg:table-cell">Permission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((person) => {
              const isEmployee = person.person_type === "employee";
              const status = memberStatusLabel(person.membership);

              return (
                <TableRow key={person.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
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
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {person.first_name} {person.last_name}
                        </p>
                        {person.job_title && (
                          <p className="text-xs text-muted-foreground truncate">
                            {person.job_title}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {person.email ? (
                      <a
                        href={`mailto:${person.email}`}
                        className="hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                      >
                        <Mail className="h-3 w-3 shrink-0" />
                        {person.email}
                      </a>
                    ) : (
                      "—"
                    )}
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
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────

function RoleCard({
  role,
  onAssign,
  onRemoveMember,
}: {
  role: ProjectRole;
  onAssign: (role: ProjectRole) => void;
  onRemoveMember: (roleId: string, memberIds: string[]) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Role header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{role.role_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {role.members.length === 0
              ? "No one assigned"
              : `${role.members.length} ${role.members.length === 1 ? "person" : "people"}`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2 shrink-0"
          onClick={() => onAssign(role)}
        >
          <Pencil className="h-3 w-3 mr-1" />
          Edit
        </Button>
      </div>

      {/* Members */}
      {role.members.length === 0 ? (
        <button
          onClick={() => onAssign(role)}
          className="w-full rounded-md border border-dashed border-border/70 py-3 text-xs text-muted-foreground hover:border-border hover:text-foreground transition-colors"
        >
          + Assign someone
        </button>
      ) : (
        <div className="space-y-2">
          {role.members.map((member) => {
            const p = member.person;
            return (
              <div
                key={member.id}
                className="flex items-center gap-2.5 group"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    {initials(p?.first_name, p?.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground leading-tight truncate">
                    {p?.full_name ?? "Unknown"}
                  </p>
                  {p?.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {p.email}
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    onRemoveMember(
                      role.id,
                      role.members
                        .filter((m) => m.id !== member.id)
                        .map((m) => m.person_id)
                    )
                  }
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  title="Remove from role"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamTab({ projectId }: { projectId: string }) {
  const { roles, isLoading, error, updateRoleMembers, createRole } =
    useProjectRoles(projectId);
  const [search, setSearch] = React.useState("");
  const [assignDialog, setAssignDialog] = React.useState<{
    open: boolean;
    role: ProjectRole | null;
  }>({ open: false, role: null });
  const [createRoleOpen, setCreateRoleOpen] = React.useState(false);

  const filtered = roles.filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      r.role_name.toLowerCase().includes(q) ||
      r.members.some((m) =>
        `${m.person?.first_name} ${m.person?.last_name}`
          .toLowerCase()
          .includes(q)
      )
    );
  });

  if (isLoading)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-border h-32 animate-pulse bg-muted"
          />
        ))}
      </div>
    );

  if (error)
    return (
      <p className="text-sm text-destructive py-6">Failed to load team roles.</p>
    );

  return (
    <div>
      <TabToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search roles or people..."
        count={search ? filtered.length : undefined}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateRoleOpen(true)}
          >
            + Add Role
          </Button>
        }
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
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No roles match &ldquo;{search}&rdquo;
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onAssign={(r) => setAssignDialog({ open: true, role: r })}
              onRemoveMember={(roleId, memberIds) =>
                updateRoleMembers(roleId, memberIds)
              }
            />
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
    </div>
  );
}

// ─── Vendors Tab ──────────────────────────────────────────────────

function VendorsTab({ projectId }: { projectId: string }) {
  const { vendors, isLoading, error, addVendor, removeVendor } =
    useProjectVendors(projectId);
  const [addOpen, setAddOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const existingVendorIds = vendors
    .map((v) => v.vendor?.id)
    .filter(Boolean) as string[];

  const filtered = vendors.filter((pv) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const v = pv.vendor;
    return (
      (v?.name ?? "").toLowerCase().includes(q) ||
      (v?.vendor_class ?? "").toLowerCase().includes(q) ||
      (v?.contact_name ?? "").toLowerCase().includes(q) ||
      (v?.city ?? "").toLowerCase().includes(q)
    );
  });

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

  if (isLoading) return <TableSkeleton rows={4} />;
  if (error)
    return (
      <p className="text-sm text-destructive py-6">Failed to load vendors.</p>
    );

  return (
    <div>
      <TabToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search vendors..."
        count={search ? filtered.length : undefined}
        action={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Building2 className="mr-1.5 h-3.5 w-3.5" />
            Add Vendor
          </Button>
        }
      />

      {vendors.length === 0 ? (
        <EmptyState
          icon={<Package className="h-5 w-5 text-muted-foreground" />}
          title="No vendors added"
          description="Add vendors from the company directory to this project."
          action={{ label: "Add Vendor", onClick: () => setAddOpen(true) }}
        />
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No vendors match &ldquo;{search}&rdquo;
        </p>
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
            {filtered.map((pv) => {
              const v = pv.vendor;
              const location = [v?.city, v?.state].filter(Boolean).join(", ");

              return (
                <TableRow key={pv.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {v?.name ?? "—"}
                        </p>
                        {v?.legal_name && v.legal_name !== v.name && (
                          <p className="text-xs text-muted-foreground truncate">
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
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
    </div>
  );
}

// ─── Groups Tab ───────────────────────────────────────────────────

function GroupsTab({ projectId }: { projectId: string }) {
  const { groups, isLoading, error } = useDistributionGroups(
    projectId,
    true,
    "active"
  );

  if (isLoading) return <TableSkeleton rows={3} />;
  if (error)
    return (
      <p className="text-sm text-destructive py-6">Failed to load groups.</p>
    );

  return (
    <div>
      <TabToolbar
        search=""
        onSearch={() => {}}
        searchPlaceholder="Search groups..."
        action={
          <Button size="sm" variant="outline" onClick={() => {}}>
            <Users2 className="mr-1.5 h-3.5 w-3.5" />
            Create Group
          </Button>
        }
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
    </div>
  );
}

// ─── Count badge for tabs ─────────────────────────────────────────

function TabCount({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium text-muted-foreground tabular-nums">
      {n}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function ProjectDirectoryPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  // Prefetch counts for tab badges
  const { users: members } = useProjectUsers(projectId, { type: "all" });
  const { vendors } = useProjectVendors(projectId);
  const { roles } = useProjectRoles(projectId);

  return (
    <>
      <ProjectPageHeader
        title="Directory"
        description="Manage the people, roles, and vendors on this project."
        className="px-3 sm:px-5 lg:px-7"
      />
      <PageContainer maxWidth="xl">
        <Tabs defaultValue="members">
          <TabsList className="mb-6">
            <TabsTrigger value="members">
              Members
              <TabCount n={members.length} />
            </TabsTrigger>
            <TabsTrigger value="team">
              Team
              <TabCount n={roles.length} />
            </TabsTrigger>
            <TabsTrigger value="vendors">
              Vendors
              <TabCount n={vendors.length} />
            </TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <MembersTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="team">
            <TeamTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="vendors">
            <VendorsTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="groups">
            <GroupsTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  );
}
