"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const punchItemFormSchema = z.object({
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

interface PunchItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PunchItemFormValues) => void;
  defaultValues?: Partial<PunchItemRow>;
  isLoading?: boolean;
  mode?: "create" | "edit";
  projectId?: number;
}

export function PunchItemFormDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading = false,
  mode = "create",
  projectId,
}: PunchItemFormDialogProps) {
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [bicOpen, setBicOpen] = useState(false);

  const { users: projectMembers } = useAuthUsers(
    projectId ? String(projectId) : "",
  );

  const form = useForm<PunchItemFormValues>({
    resolver: zodResolver(punchItemFormSchema),
    reValidateMode: "onBlur",
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      status: (defaultValues?.status as PunchItemFormValues["status"]) ?? "draft",
      priority: (defaultValues?.priority as PunchItemFormValues["priority"]) ?? undefined,
      assignee_id: defaultValues?.assignee_id ?? null,
      assignee_company: defaultValues?.assignee_company ?? "",
      ball_in_court: defaultValues?.ball_in_court ?? "",
      due_date: defaultValues?.due_date ?? "",
      location: defaultValues?.location ?? "",
      trade: defaultValues?.trade ?? "",
      type: defaultValues?.type ?? "",
      reference: defaultValues?.reference ?? "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        title: defaultValues?.title ?? "",
        description: defaultValues?.description ?? "",
        status: (defaultValues?.status as PunchItemFormValues["status"]) ?? "draft",
        priority: (defaultValues?.priority as PunchItemFormValues["priority"]) ?? undefined,
        assignee_id: defaultValues?.assignee_id ?? null,
        assignee_company: defaultValues?.assignee_company ?? "",
        ball_in_court: defaultValues?.ball_in_court ?? "",
        due_date: defaultValues?.due_date ?? "",
        location: defaultValues?.location ?? "",
        trade: defaultValues?.trade ?? "",
        type: defaultValues?.type ?? "",
        reference: defaultValues?.reference ?? "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (data: PunchItemFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* eslint-disable-next-line design-system/no-arbitrary-spacing */}
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Punch Item" : "Edit Punch Item"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Title */}
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

            {/* Description */}
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

            {/* Status / Priority */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Assignee user picker */}
            <FormField
              control={form.control}
              name="assignee_id"
              render={({ field }) => {
                const selected = projectMembers.find((u) => u.id === field.value);
                const displayName = selected
                  ? [selected.first_name, selected.last_name].filter(Boolean).join(" ") || selected.email
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
                                      // Auto-fill company if available
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

            {/* Assignee Company / Ball in Court */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Due Date / Location */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Trade / Type */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Reference */}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? mode === "create" ? "Creating..." : "Saving..."
                  : mode === "create" ? "Create Punch Item" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
