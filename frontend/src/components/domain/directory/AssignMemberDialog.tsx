"use client";

import React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  first_name: string;
  last_name: string;
  email: string | null;
  job_title: string | null;
  company_name: string | null;
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
                      selectedIds.includes(person.id) ? "opacity-100" : "opacity-0"
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

    const supabase = createClient();
    supabase
      .from("people")
      .select("id, first_name, last_name, email, job_title, company:companies(name)")
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
              company_name: (p.company as { name?: string } | null)?.name ?? null,
            }))
          );
        }
      });
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
      toast.error(err instanceof Error ? err.message : "Failed to update role assignment");
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
          <MemberCombobox people={people} selectedIds={selectedIds} onSelect={toggle} />
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
