"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

const CHANGE_REASONS = [
  "Client Request",
  "Design Development",
  "Allowance",
  "Existing Condition",
  "Backcharge",
  "Scope Change",
  "Unforeseen Condition",
  "Value Engineering",
  "Other",
] as const;

const schema = z.object({
  contract_id: z.string().min(1, "Commitment is required"),
  title: z.string().trim().min(1, "Title is required").max(255),
  change_order_number: z.string().min(1, "CO number is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "pending", "approved", "out_for_signature", "executed", "void"]),
  amount: z.number(),
  change_reason: z.string().optional(),
  due_date: z.string().optional(),
  invoiced_date: z.string().optional(),
  designated_reviewer: z.string().optional(),
  schedule_impact: z.number().int().optional(),
  location: z.string().optional(),
  reference: z.string().optional(),
  is_private: z.boolean(),
  executed: z.boolean(),
  field_change: z.boolean(),
  paid_in_full: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface CommitmentOption {
  id: string;
  contract_number: string | null;
  title: string | null;
}

export default function NewCommitmentCOPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commitments, setCommitments] = useState<CommitmentOption[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      contract_id: "",
      title: "",
      change_order_number: "",
      description: "",
      status: "draft",
      amount: 0,
      change_reason: "",
      due_date: "",
      invoiced_date: "",
      designated_reviewer: "",
      schedule_impact: undefined,
      location: "",
      reference: "",
      is_private: false,
      executed: false,
      field_change: false,
      paid_in_full: false,
    },
  });

  // Load commitments for the dropdown
  useEffect(() => {
    const fetchCommitments = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("commitments_unified")
        .select("id, contract_number, title")
        .eq("project_id", Number(projectId))
        .order("contract_number");
      if (data) setCommitments(data.filter((d) => d.id != null) as CommitmentOption[]);
    };
    fetchCommitments();
  }, [projectId]);

  const handleSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/commitments/${data.contract_id}/change-orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            change_order_number: data.change_order_number,
            description: data.description || null,
            status: data.status,
            amount: data.amount,
            change_reason: data.change_reason || null,
            due_date: data.due_date || null,
            invoiced_date: data.invoiced_date || null,
            designated_reviewer: data.designated_reviewer || null,
            schedule_impact: data.schedule_impact ?? null,
            location: data.location || null,
            reference: data.reference || null,
            is_private: data.is_private,
            executed: data.executed,
            field_change: data.field_change,
            paid_in_full: data.paid_in_full,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Failed to create");
      }

      const created = await res.json();
      toast.success("Change order created");
      router.push(`/${projectId}/change-orders/commitment/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      variant="form"
      title="Create Commitment Change Order"
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${projectId}/change-orders?tab=commitment`)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Card 1: General */}
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Commitment (contract) selector */}
              <FormField
                control={form.control}
                name="contract_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commitment *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a commitment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {commitments.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.contract_number || "—"} — {c.title || "Untitled"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Change order title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* CO Number */}
              <FormField
                control={form.control}
                name="change_order_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CO Number *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 001" />
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
                      <Textarea {...field} rows={3} placeholder="Describe the change..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
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
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="out_for_signature">Out for Signature</SelectItem>
                        <SelectItem value="executed">Executed</SelectItem>
                        <SelectItem value="void">Void</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Change Reason */}
              <FormField
                control={form.control}
                name="change_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Change Reason</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CHANGE_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Card 2: Dates & Options */}
          <Card>
            <CardHeader>
              <CardTitle>Dates &amp; Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Due Date */}
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Invoiced Date */}
                <FormField
                  control={form.control}
                  name="invoiced_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoiced Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Designated Reviewer */}
                <FormField
                  control={form.control}
                  name="designated_reviewer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designated Reviewer</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Reviewer name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Schedule Impact */}
                <FormField
                  control={form.control}
                  name="schedule_impact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule Impact (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? undefined : parseInt(e.target.value, 10),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reference */}
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Reference number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Boolean flags in a grid */}
              <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                <FormField
                  control={form.control}
                  name="is_private"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">Private</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="executed"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">Executed</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="field_change"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">Field Change</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paid_in_full"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">Paid in Full</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </PageShell>
  );
}
