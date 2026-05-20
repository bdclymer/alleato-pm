"use client";

import React from "react";
import { Check, UserPlus, ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ProjectRole } from "@/hooks/use-project-roles";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PersonOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  job_title: string | null;
  company_name: string | null;
}

interface DirectoryPeopleResponse {
  data?: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
    job_title?: string | null;
    company?: { name?: string | null } | null;
  }>;
}

interface CompanyOption {
  id: string;
  name: string;
}

interface CreatedPersonResponse {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  job_title: string | null;
  company?: { id: string; name: string | null } | null;
}

const WRAPPED_VALUE_PATTERN = /^[\s"'\[(]+|[\s"'\])]+$/g;

function cleanPersonText(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return cleanPersonText(parsed.find((item) => typeof item === "string") as string | undefined);
      }
      if (parsed !== null && typeof parsed === "object" && "display" in parsed) {
        return cleanPersonText((parsed as { display?: unknown }).display as string | undefined);
      }
    } catch {
      // Fall through — treat as plain text
    }
  }

  return trimmed.replace(WRAPPED_VALUE_PATTERN, "").trim();
}

function getPersonDisplayName(person: PersonOption): string {
  const firstName = cleanPersonText(person.first_name);
  const lastName = cleanPersonText(person.last_name);
  const email = cleanPersonText(person.email);
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (!name) return email || "Unnamed person";
  if (email && name.toLowerCase() === email.toLowerCase()) return email;
  return name;
}

// Split a typed search like "Andrew Cannon" into a sensible first/last guess
function splitSearchName(search: string): { first: string; last: string } {
  const tokens = search.trim().split(/\s+/);
  if (tokens.length === 0) return { first: "", last: "" };
  if (tokens.length === 1) return { first: tokens[0], last: "" };
  return { first: tokens[0], last: tokens.slice(1).join(" ") };
}

// ── CreateContactForm ──────────────────────────────────────────────────────────

function CreateContactForm({
  initialName,
  companies,
  onCancel,
  onCreated,
}: {
  initialName: string;
  companies: CompanyOption[];
  onCancel: () => void;
  onCreated: (person: PersonOption) => void;
}) {
  const seed = splitSearchName(initialName);
  const [firstName, setFirstName] = React.useState(seed.first);
  const [lastName, setLastName] = React.useState(seed.last);
  const [email, setEmail] = React.useState("");
  const [jobTitle, setJobTitle] = React.useState("");
  const [companyId, setCompanyId] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  const handleCreate = async () => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst || !trimmedLast) {
      toast.error("First and last name are required");
      return;
    }
    setSaving(true);
    try {
      const created = await apiFetch<CreatedPersonResponse>("/api/people", {
        method: "POST",
        body: JSON.stringify({
          first_name: trimmedFirst,
          last_name: trimmedLast,
          email: email.trim() || undefined,
          job_title: jobTitle.trim() || undefined,
          company_id: companyId || undefined,
          person_type: "contact",
        }),
      });

      onCreated({
        id: created.id,
        first_name: created.first_name,
        last_name: created.last_name,
        email: created.email,
        job_title: created.job_title,
        company_name: created.company?.name ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create contact";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 -ml-1.5"
          onClick={onCancel}
          aria-label="Back to people search"
          disabled={saving}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">New contact</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="assign-create-first">First name *</Label>
          <Input
            id="assign-create-first"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoFocus
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assign-create-last">Last name *</Label>
          <Input
            id="assign-create-last"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="assign-create-email">Email</Label>
        <Input
          id="assign-create-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          disabled={saving}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="assign-create-title">Job title</Label>
          <Input
            id="assign-create-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assign-create-company">Company</Label>
          <Select
            value={companyId}
            onValueChange={setCompanyId}
            disabled={saving}
          >
            <SelectTrigger id="assign-create-company">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" onClick={handleCreate} disabled={saving}>
          {saving ? "Creating..." : "Create & Assign"}
        </Button>
      </div>
    </div>
  );
}

// ── AssignMemberDialog ─────────────────────────────────────────────────────────

export function AssignMemberDialog({
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
  const [companies, setCompanies] = React.useState<CompanyOption[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [mode, setMode] = React.useState<"search" | "create">("search");

  React.useEffect(() => {
    if (!open || !role) return;
    setSelectedIds(role.members.map((m) => m.person_id));
    setSearch("");
    setMode("search");

    const loadAllPeople = async () => {
      try {
        const params = new URLSearchParams({
          type: "all",
          status: "active",
          page: "1",
          per_page: "1000",
        });
        const result = await apiFetch<DirectoryPeopleResponse>(
          `/api/people?${params}`,
        );

        setPeople(
          (result.data || []).map((p) => ({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email ?? null,
            job_title: p.job_title ?? null,
            company_name: p.company?.name ?? null,
          })),
        );
      } catch (error) {
        setPeople([]);
        toast.error("Failed to load people");
      }
    };

    const loadCompanies = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("companies")
          .select("id, name")
          .order("name");
        setCompanies((data ?? []).filter((c) => c.name) as CompanyOption[]);
      } catch {
        setCompanies([]);
      }
    };

    void loadAllPeople();
    void loadCompanies();
  }, [open, role, projectId]);

  const handleSelect = async (personId: string) => {
    if (!role || saving) return;
    const next = selectedIds.includes(personId)
      ? selectedIds.filter((x) => x !== personId)
      : [...selectedIds, personId];
    setSelectedIds(next);
    setSaving(true);
    try {
      await onSave(role.id, next);
      toast.success("Role assignment updated");
    } catch (err) {
      toast.error("Failed to update role assignment");
      // Roll back optimistic state
      setSelectedIds(selectedIds);
    } finally {
      setSaving(false);
    }
  };

  const handleCreated = async (newPerson: PersonOption) => {
    if (!role) return;
    // Add to local people list so the badge can render the name
    setPeople((prev) => [newPerson, ...prev]);
    const next = [...selectedIds, newPerson.id];
    setSelectedIds(next);
    setSaving(true);
    try {
      await onSave(role.id, next);
      toast.success(`${getPersonDisplayName(newPerson)} added to ${role.role_name}`);
      setMode("search");
      setSearch("");
    } catch (err) {
      toast.error("Contact created, but failed to assign role");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSelected = async (personId: string) => {
    if (!role || saving) return;
    const next = selectedIds.filter((x) => x !== personId);
    setSelectedIds(next);
    setSaving(true);
    try {
      await onSave(role.id, next);
      toast.success("Removed from role");
    } catch {
      toast.error("Failed to remove from role");
      setSelectedIds(selectedIds);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="lg"
        className="flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }}
      >
        <ModalHeader>
          <ModalTitle>Assign Members{role ? ` — ${role.role_name}` : ""}</ModalTitle>
        </ModalHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {mode === "create" ? (
            <CreateContactForm
              initialName={search}
              companies={companies}
              onCancel={() => setMode("search")}
              onCreated={handleCreated}
            />
          ) : (
            <div className="space-y-3">
              <Command className="border rounded-md" shouldFilter={true}>
                <CommandInput
                  placeholder="Search people..."
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList className="max-h-96 overscroll-contain">
                  <CommandEmpty>
                    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        {search ? `No people match "${search}".` : "No people found."}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setMode("create")}
                      >
                        <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                        Create new contact{search ? ` "${search}"` : ""}
                      </Button>
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {people.map((person) => {
                      const displayName = getPersonDisplayName(person);
                      const companyName = cleanPersonText(person.company_name);
                      const jobTitle = cleanPersonText(person.job_title);
                      const meta = [jobTitle, companyName].filter(Boolean).join(" · ");

                      return (
                        <CommandItem
                          key={person.id}
                          value={`${displayName} ${meta}`}
                          onSelect={() => void handleSelect(person.id)}
                          className="min-h-11 cursor-pointer"
                          disabled={saving}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              selectedIds.includes(person.id) ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="min-w-0 flex flex-col">
                            <span className="truncate text-sm">{displayName}</span>
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

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                  Can&apos;t find them?
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => setMode("create")}
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  New contact
                </Button>
              </div>

              {selectedIds.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Assigned ({selectedIds.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedIds.map((id) => {
                      const p = people.find((x) => x.id === id);
                      if (!p) return null;
                      return (
                        <Badge key={id} variant="secondary" className="gap-1 pr-1">
                          <span>{getPersonDisplayName(p)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 rounded-sm opacity-60 hover:opacity-100"
                            onClick={() => void handleRemoveSelected(id)}
                            disabled={saving}
                            aria-label={`Remove ${getPersonDisplayName(p)}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
