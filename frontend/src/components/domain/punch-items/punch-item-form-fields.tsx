"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { RHFDateField } from "@/components/forms/fields/RHFDateField";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";
import {
  flattenProjectTeamAssignees,
  type ProjectTeamRole,
} from "./project-team-assignee-options";

type PunchItemRow = Database["public"]["Tables"]["punch_items"]["Row"];

export const punchItemFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "work_required", "initiated", "closed"]),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  assignee_company: z.string().optional(),
  ball_in_court: z.string().optional(),
  due_date: z.string().optional(),
  location: z.string().optional(),
  trade: z.string().optional(),
  type: z.string().optional(),
  reference: z.string().optional(),
});

export type PunchItemFormValues = z.infer<typeof punchItemFormSchema>;

/** Defaults used by both the create dialog and any other surface (e.g. drawings link modal). */
export function buildPunchItemDefaults(
  defaults?: Partial<PunchItemRow>,
): PunchItemFormValues {
  return {
    title: defaults?.title ?? "",
    description: defaults?.description ?? "",
    status: (defaults?.status as PunchItemFormValues["status"]) ?? "draft",
    priority: (defaults?.priority as PunchItemFormValues["priority"]) ?? undefined,
    assignee_id: defaults?.assignee_id ?? null,
    assignee_company: defaults?.assignee_company ?? "",
    ball_in_court: defaults?.ball_in_court ?? "",
    due_date: defaults?.due_date ?? "",
    location: defaults?.location ?? "",
    trade: defaults?.trade ?? "",
    type: defaults?.type ?? "",
    reference: defaults?.reference ?? "",
  };
}

function useProjectTeamAssignees(projectId: string) {
  return useQuery({
    queryKey: ["project-team-assignees", projectId],
    queryFn: async () => {
      const res = await apiFetch<{ data: ProjectTeamRole[] }>(
        `/api/projects/${projectId}/directory/roles`,
      );
      return flattenProjectTeamAssignees(res.data ?? []);
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

interface PunchItemFormFieldsProps {
  form: UseFormReturn<PunchItemFormValues>;
  projectId?: number;
  /** Wrap the fields in a `<Form>` provider. Set false when the caller already provides one. */
  withFormProvider?: boolean;
}

/**
 * Canonical field set for punch item create / edit forms.
 *
 * Used by:
 *  - `PunchItemFormDialog` (the punch list create / edit dialog)
 *  - `LinkPinModal` (drawing-pin "create new punch item" tab)
 *
 * Any change to the punch item form (new field, validation, dropdown source)
 * belongs here so both surfaces stay in sync.
 *
 * The component renders fields only — submit buttons / dialog footers are
 * owned by the caller because they differ across surfaces.
 */
export function PunchItemFormFields({
  form,
  projectId,
  withFormProvider = true,
}: PunchItemFormFieldsProps) {
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [bicOpen, setBicOpen] = useState(false);

  const {
    data: projectTeamAssignees = [],
    isLoading: isLoadingAssignees,
    error: assigneesError,
  } = useProjectTeamAssignees(
    projectId ? String(projectId) : "",
  );

  const fields = (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title *</FormLabel>
            <FormControl>
              <Input placeholder="Enter punch item title" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="Enter description" rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="work_required">Work Required</SelectItem>
                  <SelectItem value="initiated">Initiated</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="assignee_id"
        render={({ field }) => {
          const selected = projectTeamAssignees.find((p) => p.id === field.value);
          const displayName = selected?.full_name ?? null;
          const displayCompany = selected?.company_name ?? null;
          const emptyText = assigneesError
            ? "Could not load project team contacts."
            : isLoadingAssignees
              ? "Loading project team contacts..."
              : "No project team contacts found.";
          return (
            <FormItem>
              <FormLabel>Assignee</FormLabel>
              <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <span className="flex flex-col items-start min-w-0">
                        <span className={cn(!displayName && "text-muted-foreground")}>
                          {displayName ?? "Select assignee..."}
                        </span>
                        {displayCompany && (
                          <span className="text-xs text-muted-foreground">{displayCompany}</span>
                        )}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                {/* eslint-disable-next-line design-system/no-arbitrary-spacing */}
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search project team contacts..." />
                    <CommandList>
                      <CommandEmpty>{emptyText}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            field.onChange(null);
                            form.setValue("assignee_company", "");
                            setAssigneeOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !field.value ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="text-muted-foreground italic">Unassigned</span>
                        </CommandItem>
                        {projectTeamAssignees.map((person) => {
                          const name = person.full_name;
                          const roleLabel = person.role_names.join(", ");
                          const searchValue = [
                            name,
                            person.email,
                            person.company_name,
                            roleLabel,
                          ]
                            .filter(Boolean)
                            .join(" ");
                          return (
                            <CommandItem
                              key={person.id}
                              value={searchValue}
                              onSelect={() => {
                                field.onChange(person.id);
                                form.setValue("assignee_company", person.company_name ?? "");
                                setAssigneeOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === person.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div>
                                <p className="text-sm">{name}</p>
                                {person.company_name && (
                                  <p className="text-xs text-muted-foreground">{person.company_name}</p>
                                )}
                                {roleLabel && !person.company_name && (
                                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
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
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="ball_in_court"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ball in Court</FormLabel>
              <Popover open={bicOpen} onOpenChange={setBicOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      {field.value || "Select responsible party..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                {/* eslint-disable-next-line design-system/no-arbitrary-spacing */}
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search project team contacts..." />
                    <CommandList>
                      <CommandEmpty>
                        {assigneesError
                          ? "Could not load project team contacts."
                          : isLoadingAssignees
                            ? "Loading project team contacts..."
                            : "No project team contacts found."}
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            field.onChange("");
                            setBicOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !field.value ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="text-muted-foreground italic">None</span>
                        </CommandItem>
                        {projectTeamAssignees.map((person) => {
                          const name = person.full_name;
                          const roleLabel = person.role_names.join(", ");
                          const searchValue = [
                            name,
                            person.email,
                            person.company_name,
                            roleLabel,
                          ]
                            .filter(Boolean)
                            .join(" ");
                          return (
                            <CommandItem
                              key={person.id}
                              value={searchValue}
                              onSelect={() => {
                                field.onChange(name);
                                setBicOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === name ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <RHFDateField
          control={form.control}
          name="due_date"
          label="Due Date"
          nullable
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="Location" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="trade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trade</FormLabel>
              <FormControl>
                <Input placeholder="Trade" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <FormControl>
                <Input placeholder="Type" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference</FormLabel>
              <FormControl>
                <Input placeholder="Reference number or link" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  if (!withFormProvider) return fields;

  return <Form {...form}>{fields}</Form>;
}
