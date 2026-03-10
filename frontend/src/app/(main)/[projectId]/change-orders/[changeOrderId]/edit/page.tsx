"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { ProjectFormPageLayout } from "@/components/layout";
import { ContractChangeOrder } from "@/types/contract-change-orders";

/**
 * Form schema for editing change orders
 * Based on the ChangeOrderDetail component and API requirements
 */
const changeOrderEditSchema = z.object({
  co_number: z.string().min(1, "Change order number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "submitted", "pending", "approved", "rejected", "executed", "withdrawn", "void"]),
  amount: z.number().min(0, "Amount must be positive"),
  contract_id: z.number().optional().nullable(),
  designated_reviewer_id: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  is_private: z.boolean().default(false),
  apply_vertical_markup: z.boolean().default(false),
  change_event_id: z.string().optional().nullable(),
});

type ChangeOrderFormData = z.infer<typeof changeOrderEditSchema>;

/**
 * Helper to format date for input
 */
function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

/**
 * Determine which fields can be edited based on status
 */
function getEditableFields(status: string | null) {
  const statusLower = (status || "draft").toLowerCase();

  // Can't edit amount or contract after approval
  const canEditFinancials = !["approved", "executed"].includes(statusLower);

  // Can't edit at all if executed or void
  const canEdit = !["executed", "void"].includes(statusLower);

  return { canEdit, canEditFinancials };
}

export default function EditChangeOrderPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const changeOrderId = params.changeOrderId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [changeOrder, setChangeOrder] = useState<ContractChangeOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ChangeOrderFormData>({
    resolver: zodResolver(changeOrderEditSchema) as any,
  });

  // Fetch change order data
  useEffect(() => {
    const fetchChangeOrder = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${projectId}/change-orders/${changeOrderId}`);

        if (!response.ok) {
          throw new Error(`Failed to load change order: ${response.statusText}`);
        }

        const data: ContractChangeOrder = await response.json();
        setChangeOrder(data);

        // Set form default values
        form.reset({
          co_number: data.co_number || "",
          title: data.title || "",
          description: data.description || "",
          status: (data.status as ChangeOrderFormData["status"]) || "draft",
          amount: data.amount || 0,
          contract_id: data.contract_id,
          designated_reviewer_id: data.designated_reviewer_id,
          due_date: data.due_date,
          is_private: data.is_private || false,
          apply_vertical_markup: data.apply_vertical_markup || false,
          change_event_id: data.change_event_id,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load change order");
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId && changeOrderId) {
      fetchChangeOrder();
    }
  }, [projectId, changeOrderId, form]);

  const handleSubmit: SubmitHandler<ChangeOrderFormData> = async (data) => {
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-orders/${changeOrderId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Failed to update change order`);
      }

      toast.success("Change order updated successfully");
      router.push(`/${projectId}/change-orders/${changeOrderId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update change order");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/${projectId}/change-orders/${changeOrderId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <ProjectFormPageLayout
        title="Loading..."
        description="Loading change order details"
        maxWidth="xl"
      >
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading change order...</p>
          </div>
        </div>
      </ProjectFormPageLayout>
    );
  }

  // Error state
  if (error || !changeOrder) {
    return (
      <ProjectFormPageLayout
        title="Error"
        description="Failed to load change order"
        maxWidth="xl"
      >
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <p className="mb-4 text-destructive">{error || "Change order not found"}</p>
            <Button variant="outline" onClick={() => router.push(`/${projectId}/change-orders`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Change Orders
            </Button>
          </div>
        </div>
      </ProjectFormPageLayout>
    );
  }

  const { canEdit, canEditFinancials } = getEditableFields(changeOrder.status);

  // Non-editable state
  if (!canEdit) {
    return (
      <ProjectFormPageLayout
        title="Cannot Edit Change Order"
        description={`Change Order ${changeOrder.co_number || changeOrder.id} cannot be edited in ${changeOrder.status} status`}
        maxWidth="xl"
      >
        <Card>
          <CardContent className="pt-6">
            <p className="mb-4 text-center text-muted-foreground">
              This change order is in <strong>{changeOrder.status}</strong> status and cannot be edited.
            </p>
            <div className="flex justify-center">
              <Button onClick={() => router.push(`/${projectId}/change-orders/${changeOrderId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Detail Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </ProjectFormPageLayout>
    );
  }

  const pageTitle = changeOrder.co_number
    ? `Edit ${changeOrder.co_number}`
    : `Edit Change Order #${changeOrder.id}`;

  return (
    <ProjectFormPageLayout
      title={pageTitle}
      description="Update change order details"
      maxWidth="xl"
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button size="sm" onClick={form.handleSubmit(handleSubmit)} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="co_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Change Order Number *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="CO-001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Describe the change order..."
                          rows={4}
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
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="executed">Executed</SelectItem>
                          <SelectItem value="withdrawn">Withdrawn</SelectItem>
                          <SelectItem value="void">Void</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Financial & Schedule Card */}
            <Card>
              <CardHeader>
                <CardTitle>Financial & Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          disabled={!canEditFinancials}
                        />
                      </FormControl>
                      {!canEditFinancials && (
                        <FormDescription>
                          Amount cannot be changed after approval
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? formatDateForInput(field.value) : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="designated_reviewer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designated Reviewer</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="Reviewer ID or email"
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
                    <FormItem className="flex flex-row items-start space-x-4 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Private Change Order</FormLabel>
                        <FormDescription>
                          Restrict visibility to authorized users only
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apply_vertical_markup"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-4 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Apply Vertical Markup</FormLabel>
                        <FormDescription>
                          Apply markup to subcontractor costs
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Related Information */}
            {changeOrder.change_event_id && (
              <Card>
                <CardHeader>
                  <CardTitle>Related Change Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="change_event_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Change Event ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            disabled
                            className="font-mono"
                          />
                        </FormControl>
                        <FormDescription>
                          This change order was converted from a change event
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
        </form>
      </Form>
    </ProjectFormPageLayout>
  );
}
