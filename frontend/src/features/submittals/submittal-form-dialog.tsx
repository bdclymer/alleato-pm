"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateSubmittal, useUpdateSubmittal, type SubmittalSummary } from "@/hooks/use-submittals";

// ─── Schema ───────────────────────────────────────────────────────────────────

// No .default() here — set defaults in useForm.defaultValues instead to avoid
// zodResolver input/output type mismatch.
const submittalFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  submittal_number: z.string().min(1, "Number is required"),
  revision: z.number().int().min(0),
  status: z.enum(["Draft", "Open", "Distributed", "Closed"]),
  specification_section: z.string().nullable().optional(),
  submittal_type: z.string().nullable().optional(),
  division: z.string().nullable().optional(),
  final_due_date: z.string().nullable().optional(),
  lead_time: z.number().int().min(0).nullable().optional(),
  required_on_site_date: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_private: z.boolean(),
  ball_in_court: z.string().nullable().optional(),
});

type SubmittalFormValues = z.infer<typeof submittalFormSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface SubmittalFormDialogProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submittal?: SubmittalSummary; // undefined = create, defined = edit
}

const STATUS_OPTIONS = ["Draft", "Open", "Distributed", "Closed"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSubmittalTypeString(v: SubmittalSummary["submittal_type"] | undefined): string {
  if (!v) return "";
  if (typeof v === "object") return v.name ?? "";
  return v;
}

function buildDefaults(submittal: SubmittalSummary | undefined): SubmittalFormValues {
  return {
    title: submittal?.title ?? "",
    submittal_number: submittal?.submittal_number ?? "",
    revision: submittal?.revision ?? 0,
    status: (submittal?.status as "Draft" | "Open" | "Distributed" | "Closed") ?? "Draft",
    specification_section: submittal?.specification_section ?? "",
    submittal_type: getSubmittalTypeString(submittal?.submittal_type),
    division: submittal?.division ?? "",
    final_due_date: submittal?.final_due_date ?? "",
    lead_time: null,
    required_on_site_date: "",
    description: "",
    is_private: submittal?.is_private ?? false,
    ball_in_court: submittal?.ball_in_court ?? "",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SubmittalFormDialog({
  projectId,
  open,
  onOpenChange,
  submittal,
}: SubmittalFormDialogProps) {
  const isEditing = Boolean(submittal);
  const createMutation = useCreateSubmittal(projectId);
  const updateMutation = useUpdateSubmittal(projectId, submittal?.id ?? "");

  const form = useForm<SubmittalFormValues>({
    resolver: zodResolver(submittalFormSchema),
    defaultValues: buildDefaults(submittal),
  });

  // Reset when dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset(buildDefaults(submittal));
    }
  }, [open, submittal, form]);

  async function onSubmit(values: SubmittalFormValues) {
    const payload = {
      ...values,
      specification_section: values.specification_section || null,
      submittal_type: values.submittal_type || null,
      division: values.division || null,
      final_due_date: values.final_due_date || null,
      required_on_site_date: values.required_on_site_date || null,
      description: values.description || null,
      ball_in_court: values.ball_in_court || null,
    };

    if (isEditing) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Submittal" : "Create Submittal"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* ── General Information ── */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                General Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="submittal_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 08-1113-1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="revision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revision *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Doors, Frames, Hardware" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="specification_section"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specification Section</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 08-1113 - Doors, Frames"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="division"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Division</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Division 8"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="submittal_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submittal Type</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Product Information"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* ── Distribution & Scheduling ── */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Distribution &amp; Scheduling
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="final_due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lead_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Time (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : parseInt(e.target.value, 10))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="required_on_site_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required On-Site Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
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
                    <FormLabel>Ball In Court</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Architect"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            {/* ── Content ── */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Content
              </h3>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Describe this submittal..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_private"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer font-normal">
                      Private (visible only to admins and distribution list)
                    </FormLabel>
                  </FormItem>
                )}
              />
            </section>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditing
                    ? "Updating..."
                    : "Creating..."
                  : isEditing
                    ? "Update Submittal"
                    : "Create Submittal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
