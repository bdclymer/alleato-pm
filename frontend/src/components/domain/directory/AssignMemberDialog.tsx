"use client";

import React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
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

const WRAPPED_VALUE_PATTERN = /^[\s"'\[(]+|[\s"'\])]+$/g;

function cleanPersonText(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return cleanPersonText(parsed.find((item) => typeof item === "string") as string | undefined);
    }
  } catch {
    // Some imported rows store email-only names as "(email)" instead of JSON.
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

// ── MemberCombobox ─────────────────────────────────────────────────────────────

export function MemberCombobox({
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
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {selectedIds.length > 0 ? `${selectedIds.length} selected` : "Select people..."}
          <ChevronsUpDown className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0"
        align="start"
        sideOffset={8}
        style={{
          maxHeight: "min(28rem, var(--radix-popover-content-available-height))",
        }}
      >
        <Command>
          <CommandInput placeholder="Search people..." />
          <CommandList
            className="overscroll-contain"
            style={{
              maxHeight: "min(22rem, calc(var(--radix-popover-content-available-height) - 3rem))",
            }}
          >
            <CommandEmpty>No people found.</CommandEmpty>
            <CommandGroup>
              {people.map((person) => {
                const displayName = getPersonDisplayName(person);
                const companyName = cleanPersonText(person.company_name);
                const jobTitle = cleanPersonText(person.job_title);
                const email = cleanPersonText(person.email);
                const meta = [jobTitle, companyName].filter(Boolean).join(" · ");

                return (
                  <CommandItem
                    key={person.id}
                    value={`${displayName} ${email} ${meta}`}
                    onSelect={() => onSelect(person.id)}
                    className="min-h-11"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedIds.includes(person.id) ? "opacity-100" : "opacity-0"
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
      </PopoverContent>
    </Popover>
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
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !role) return;
    setSelectedIds(role.members.map((m) => m.person_id));

    const loadProjectPeople = async () => {
      try {
        const params = new URLSearchParams({
          type: "all",
          status: "active",
          page: "1",
          per_page: "1000",
          sort: "last_name,first_name",
        });
        const result = await apiFetch<DirectoryPeopleResponse>(
          `/api/projects/${projectId}/directory/people?${params}`,
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
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load project members",
        );
      }
    };

    void loadProjectPeople();
  }, [open, role, projectId]);

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    try {
      await onSave(role.id, selectedIds);
      toast.success("Role assignment updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role assignment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>Assign Members — {role?.role_name}</ModalTitle>
        </ModalHeader>
        <div className="py-2">
          <MemberCombobox people={people} selectedIds={selectedIds} onSelect={toggle} />
          {selectedIds.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedIds.map((id) => {
                const p = people.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <Badge key={id} variant="secondary" className="gap-1">
                    {getPersonDisplayName(p)}
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
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
