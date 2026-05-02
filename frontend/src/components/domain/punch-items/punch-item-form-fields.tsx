"use client";

import { useState } from "react";
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
import { useAuthUsers } from "@/hooks/use-auth-users";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

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

  const { users: projectMembers } = useAuthUsers(
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
          const selected = projectMembers.find((u) => u.id === field.value);
          const displayName = selected
            ? [selected.first_name, selected.last_name].filter(Boolean).join(" ") ||
              selected.email
            : null;
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
                      {displayName ?? "Select assignee..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                {/* eslint-disable-next-line design-system/no-arbitrary-spacing */}
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search members..." />
                    <CommandList>
                      <CommandEmpty>No members found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            field.onChange(null);
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
                        {projectMembers.map((user) => {
                          const name =
                            [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                            user.email;
                          return (
                            <CommandItem
                              key={user.id}
                              value={name}
                              onSelect={() => {
                                field.onChange(user.id);
                                if (user.company_name) {
                                  form.setValue("assignee_company", user.company_name);
                                }
                                setAssigneeOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === user.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div>
                                <p className="text-sm">{name}</p>
                                {user.job_title && (
                                  <p className="text-xs text-muted-foreground">{user.job_title}</p>
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
          name="assignee_company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignee Company</FormLabel>
              <FormControl>
                <Input placeholder="Company name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                    <CommandInput placeholder="Search members..." />
                    <CommandList>
                      <CommandEmpty>No members found.</CommandEmpty>
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
                        {projectMembers.map((user) => {
                          const name =
                            [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                            user.email;
                          return (
                            <CommandItem
                              key={user.id}
                              value={name}
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="due_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>

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
  );

  if (!withFormProvider) return fields;

  return <Form {...form}>{fields}</Form>;
}
