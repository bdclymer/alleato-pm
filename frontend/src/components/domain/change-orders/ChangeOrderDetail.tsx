"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Save, X } from "lucide-react";

const changeOrderSchema = z.object({
  co_number: z.string().min(1, "Change order number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "pending", "approved", "rejected", "executed", "void"]),
  amount: z.number().min(0, "Amount must be positive"),
  contract_id: z.number().optional().nullable(),
  designated_reviewer_id: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  is_private: z.boolean().optional().default(false),
  apply_vertical_markup: z.boolean().optional().default(false),
  change_event_id: z.string().optional().nullable(),
});

type ChangeOrderFormData = z.infer<typeof changeOrderSchema>;

interface ChangeOrder {
  id: number;
  project_id: number;
  co_number: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  amount: number | null;
  contract_id: number | null;
  designated_reviewer_id: string | null;
  due_date: string | null;
  created_at: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  is_private: boolean | null;
  apply_vertical_markup: boolean | null;
  change_event_id: string | null;
  updated_at: string | null;
}

interface Contract {
  id: number;
  contract_number: string;
  company_name?: string;
}

interface ChangeOrderDetailProps {
  changeOrder: ChangeOrder;
  contract?: Contract | null;
  projectId: string;
  onUpdate?: () => void;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  approved: "default",
  pending: "secondary",
  draft: "outline",
  executed: "default",
  rejected: "destructive",
  void: "destructive",
};

function formatCurrency(amount: number | null): string {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

export function ChangeOrderDetail({
  changeOrder,
  contract,
  projectId,
  onUpdate,
}: ChangeOrderDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm({
    resolver: zodResolver(changeOrderSchema),
    reValidateMode: "onBlur",
    defaultValues: {
      co_number: changeOrder.co_number || "",
      title: changeOrder.title || "",
      description: changeOrder.description || "",
      status: (changeOrder.status as ChangeOrderFormData["status"]) || "draft",
      amount: changeOrder.amount || 0,
      contract_id: changeOrder.contract_id,
      designated_reviewer_id: changeOrder.designated_reviewer_id,
      due_date: changeOrder.due_date,
      is_private: changeOrder.is_private || false,
      apply_vertical_markup: changeOrder.apply_vertical_markup || false,
      change_event_id: changeOrder.change_event_id,
    },
  });

  const handleSave = async (data: ChangeOrderFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-orders/${changeOrder.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update change order");
      }

      toast.success("Change order updated successfully");
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update change order");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const statusVariant = STATUS_VARIANTS[changeOrder.status ?? ""] ?? "outline";

  if (isEditing) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="co_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Change Order Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter change order number" />
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
                      <FormLabel>Title</FormLabel>
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
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="executed">Executed</SelectItem>
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
                <CardTitle className="text-base">Financial & Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          placeholder="0.00"
                        />
                      </FormControl>
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
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="change_event_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Change Event ID (if converted)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="CE-001"
                        disabled
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    );
  }

  // View Mode
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Details
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Change Order Number</span>
              <span className="text-sm font-medium">{changeOrder.co_number || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Title</span>
              <span className="text-sm font-medium">{changeOrder.title || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={statusVariant}>{changeOrder.status || "Unknown"}</Badge>
            </div>
            {contract && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Contract Number</span>
                  <span className="text-sm">{contract.contract_number}</span>
                </div>
                {contract.company_name && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Company</span>
                    <span className="text-sm">{contract.company_name}</span>
                  </div>
                )}
              </>
            )}
            {changeOrder.is_private && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Visibility</span>
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                  Private
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-sm font-medium">{formatCurrency(changeOrder.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Apply Vertical Markup</span>
              <span className="text-sm">
                {changeOrder.apply_vertical_markup ? "Yes" : "No"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description Card */}
      {changeOrder.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{changeOrder.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Timeline Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Date Initiated</span>
            <span className="text-sm">{formatDate(changeOrder.created_at)}</span>
          </div>
          {changeOrder.due_date && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Due Date</span>
              <span className="text-sm">{formatDate(changeOrder.due_date)}</span>
            </div>
          )}
          {changeOrder.submitted_at && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Submitted</span>
              <span className="text-sm">{formatDate(changeOrder.submitted_at)}</span>
            </div>
          )}
          {changeOrder.submitted_by && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Submitted By</span>
              <span className="text-sm">{changeOrder.submitted_by}</span>
            </div>
          )}
          {changeOrder.approved_at && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Review Date</span>
              <span className="text-sm">{formatDate(changeOrder.approved_at)}</span>
            </div>
          )}
          {changeOrder.approved_by && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Approved By</span>
              <span className="text-sm">{changeOrder.approved_by}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviewer Card */}
      {changeOrder.designated_reviewer_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Designated Reviewer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Reviewer</span>
              <span className="text-sm">{changeOrder.designated_reviewer_id}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection Reason */}
      {changeOrder.rejection_reason && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{changeOrder.rejection_reason}</p>
          </CardContent>
        </Card>
      )}

      {/* Change Event Link */}
      {changeOrder.change_event_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Related Change Event</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Change Event ID</span>
              <span className="text-sm font-mono">{changeOrder.change_event_id}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This change order was converted from a change event
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
