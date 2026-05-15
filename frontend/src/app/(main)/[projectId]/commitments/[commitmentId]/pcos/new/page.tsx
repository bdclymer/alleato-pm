"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import { Button } from "@/components/ui/button";
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
import { Text } from "@/components/ds/text";
import { apiFetch } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PCO_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "no_charge", label: "No Charge" },
  { value: "pending_in_review", label: "Pending – In Review" },
  { value: "pending_not_pricing", label: "Pending – Not Pricing" },
  { value: "pending_not_proceeding", label: "Pending – Not Proceeding" },
  { value: "pending_pricing", label: "Pending – Pricing" },
  { value: "pending_proceeding", label: "Pending – Proceeding" },
  { value: "pending_revised", label: "Pending – Revised" },
  { value: "rejected", label: "Rejected" },
  { value: "void", label: "Void" },
] as const;

const CHANGE_REASONS = [
  "Client Request",
  "Design Development",
  "Existing Condition",
  "Backcharge",
  "Allowance",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommitmentSummary {
  id: string;
  contract_number: string | null;
  title: string | null;
  commitment_type: string | null;
  vendor_name: string | null;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  number: z.string().min(1, "PCO number is required"),
  title: z.string().min(1, "Title is required").max(255),
  status: z.string(),
  description: z.string().nullable().optional(),
  change_reason: z.string().nullable().optional(),
  revision: z.number().int().nullable().optional(),
  is_private: z.boolean(),
  executed: z.boolean(),
  signed_co_received_date: z.string().nullable().optional(),
  requested_by: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  schedule_impact: z.number().int().nullable().optional(),
  field_change: z.boolean(),
  reference: z.string().nullable().optional(),
  paid_in_full: z.boolean(),
  due_date: z.string().nullable().optional(),
  amount: z.number(),
});

type FormData = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewCommitmentPcoPage() {
  const router = useRouter();
  const params = useParams()!;
  const projectId = params.projectId as string;
  const commitmentId = params.commitmentId as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commitment, setCommitment] = useState<CommitmentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nextNumber, setNextNumber] = useState("001");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      number: "",
      title: "",
      status: "draft",
      description: "",
      change_reason: "",
      revision: 0,
      is_private: false,
      executed: false,
      signed_co_received_date: null,
      requested_by: "",
      location: "",
      schedule_impact: null,
      field_change: false,
      reference: "",
      paid_in_full: false,
      due_date: null,
      amount: 0,
    },
  });

  // Fetch commitment details and next PCO number
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch commitment summary
        const commitData = await apiFetch<{
          id: string;
          contract_number: string;
          title: string;
          commitment_type?: string;
          type?: string;
          vendor_name?: string | null;
          vendor?: { name?: string } | null;
        }>(`/api/commitments/${commitmentId}`).catch(() => null);
        if (commitData) {
          setCommitment({
            id: commitData.id,
            contract_number: commitData.contract_number,
            title: commitData.title,
            commitment_type: commitData.commitment_type ?? commitData.type ?? null,
            vendor_name: commitData.vendor_name ?? commitData.vendor?.name ?? null,
          });
        }

        // Fetch existing PCOs to auto-generate next number
        const pcosData = await apiFetch<{ data?: unknown[] }>(
          `/api/projects/${projectId}/commitments/${commitmentId}/pcos`,
        ).catch(() => null);
        if (pcosData) {
          const pcos = pcosData.data ?? [];
          const nextNum = String(pcos.length + 1).padStart(3, "0");
          setNextNumber(nextNum);
          form.setValue("number", nextNum);
        }
      } catch {
        toast.error("Failed to load commitment details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
     
  }, [commitmentId, projectId]);

  type PcoStatus = "open" | "pending" | "approved" | "rejected" | "void";

  const mapStatusToApiStatus = (status: string): PcoStatus => {
    if (
      status === "open" ||
      status === "pending" ||
      status === "approved" ||
      status === "rejected" ||
      status === "void"
    ) {
      return status;
    }

    if (
      status === "draft" ||
      status === "pending_in_review" ||
      status === "pending_not_pricing" ||
      status === "pending_not_proceeding" ||
      status === "pending_pricing" ||
      status === "pending_proceeding" ||
      status === "pending_revised"
    ) {
      return "pending";
    }

    return "open";
  };

  const handleSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await apiFetch(
        `/api/projects/${projectId}/commitments/${commitmentId}/pcos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: data.number,
            title: data.title,
            status: mapStatusToApiStatus(data.status),
            amount: data.amount,
            description: data.description || null,
            change_reason: data.change_reason || null,
            revision: data.revision ?? 0,
            is_private: data.is_private,
            executed: data.executed,
            signed_co_received_date: data.signed_co_received_date || null,
            requested_by: data.requested_by || null,
            location: data.location || null,
            schedule_impact: data.schedule_impact,
            field_change: data.field_change,
            reference: data.reference || null,
            paid_in_full: data.paid_in_full,
            due_date: data.due_date || null,
          }),
        },
      );

      toast.success("Potential change order created");
      router.push(
        `/${projectId}/commitments/${commitmentId}?tab=change-orders`,
      );
    } catch (err) {
      toast.error("Failed to create PCO");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      variant="form"
      title="Create Potential Change Order"
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(
                `/${projectId}/commitments/${commitmentId}?tab=change-orders`,
              )
            }
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? "Creating…" : "Create"}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-8"
          >
            {/* Contract Information (read-only) */}
            <section className="space-y-4">
              <SectionRuleHeading
                label="Contract Information"
                className="[&_span]:text-primary"
              />
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
                <FormItem>
                  <FormLabel>Contract Company</FormLabel>
                  <Input
                    value={commitment?.vendor_name ?? ""}
                    disabled
                    placeholder="Determined by commitment"
                  />
                </FormItem>
                <FormItem>
                  <FormLabel>Contract</FormLabel>
                  <Input
                    value={
                      commitment
                        ? `${commitment.contract_number ?? ""} — ${commitment.title ?? ""}`
                        : ""
                    }
                    disabled
                    placeholder="Linked commitment"
                  />
                </FormItem>
              </div>
            </section>

            {/* General Information */}
            <section className="space-y-4">
              <SectionRuleHeading
                label="General Information"
                className="[&_span]:text-primary"
              />
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
                {/* PCO Number */}
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel># *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={nextNumber} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Revision */}
                <FormField
                  control={form.control}
                  name="revision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revision</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? 0}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseInt(e.target.value, 10)
                                : 0,
                            )
                          }
                          placeholder=""
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Potential change order title" />
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PCO_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
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
                      <Select
                        onValueChange={(val) =>
                          field.onChange(val === "__none__" ? null : val)
                        }
                        value={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {CHANGE_REASONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
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
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Request Received From */}
                <FormField
                  control={form.control}
                  name="requested_by"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Received From</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Name of requester"
                        />
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
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={4}
                          placeholder="Detailed description of the change…"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* Dates & Details */}
            <section className="space-y-4">
              <SectionRuleHeading
                label="Dates & Details"
                className="[&_span]:text-primary"
              />
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
                {/* Due Date */}
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Signed CO Received Date */}
                <FormField
                  control={form.control}
                  name="signed_co_received_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signed Change Order Received Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
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
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseInt(e.target.value, 10)
                                : null,
                            )
                          }
                          placeholder="days"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Project location"
                        />
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
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="External reference number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Boolean flags */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
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
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
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
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Field Change
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paid_in_full"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Paid in Full
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </section>
          </form>
        </Form>
      )}
    </PageShell>
  );
}
