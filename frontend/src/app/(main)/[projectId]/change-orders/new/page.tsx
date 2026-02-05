"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { z } from "zod";
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
import { PageContainer, ProjectPageHeader } from "@/components/layout";

/**
 * Form schema for creating change orders
 * Matches the changeOrderSchema from financial-schemas.ts
 */
const createChangeOrderSchema = z.object({
  co_number: z.string().min(1, "Change order number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "pending", "approved", "executed", "rejected", "void"]).default("draft"),
  contract_id: z.number().int().positive().optional().nullable(),
  amount: z.number().default(0),
  due_date: z.string().optional().nullable(),
  is_private: z.boolean().default(false),
  designated_reviewer_id: z.string().optional().nullable(),
  // Future Procore-aligned fields (not yet in schema but mentioned in spec)
  scope: z.enum(["in_scope", "out_of_scope"]).optional(),
  schedule_impact: z.enum(["yes", "no", "unknown"]).optional(),
});

type ChangeOrderFormValues = z.infer<typeof createChangeOrderSchema>;

interface ContractOption {
  id: number;
  contract_number: string | null;
  contract_name: string | null;
}

/**
 * Helper to format date for input
 */
function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

export default function NewChangeOrderPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const numericProjectId = parseInt(projectId, 10);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(true);

  const form = useForm<ChangeOrderFormValues>({
    resolver: zodResolver(createChangeOrderSchema) as any,
    defaultValues: {
      co_number: "",
      title: "",
      description: "",
      status: "draft",
      contract_id: null,
      amount: 0,
      due_date: null,
      is_private: false,
      designated_reviewer_id: null,
    },
  });

  // Fetch available contracts for the project
  useEffect(() => {
    const fetchContracts = async () => {
      if (isNaN(numericProjectId)) return;

      try {
        setIsLoadingContracts(true);
        const response = await fetch(`/api/contracts?projectId=${numericProjectId}`);

        if (response.ok) {
          const data = await response.json();
          setContracts(data);
        }
      } catch (error) {
        console.error("Failed to load contracts:", error);
      } finally {
        setIsLoadingContracts(false);
      }
    };

    fetchContracts();
  }, [numericProjectId]);

  const handleSubmit = async (data: ChangeOrderFormValues) => {
    setIsSubmitting(true);

    try {
      // Remove fields that aren't in the API schema yet
      const { scope, schedule_impact, ...apiData } = data;

      const response = await fetch(`/api/projects/${projectId}/change-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));

        // Handle validation errors
        if (errorData.issues) {
          errorData.issues.forEach((issue: any) => {
            toast.error(`${issue.path.join(".")}: ${issue.message}`);
          });
          throw new Error("Validation failed");
        }

        throw new Error(errorData.error || "Failed to create change order");
      }

      const createdChangeOrder = await response.json();
      toast.success("Change order created successfully");
      router.push(`/${projectId}/change-orders/${createdChangeOrder.id}`);
    } catch (error) {
      if (error instanceof Error && error.message !== "Validation failed") {
        toast.error(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/${projectId}/change-orders`);
  };

  if (isNaN(numericProjectId)) {
    return (
      <>
        <ProjectPageHeader
          title="Error"
          description="Invalid project ID"
        />
        <PageContainer>
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-destructive">Invalid project ID provided</p>
            </CardContent>
          </Card>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectPageHeader
        title="New Change Order"
        description="Create a new change order for this project"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSubmitting}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={form.handleSubmit(handleSubmit)} disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Creating..." : "Create Change Order"}
            </Button>
          </div>
        }
      />
      <PageContainer>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="co_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Change Order Number *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="CO-001" data-testid="change-order-number" />
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
                            <SelectTrigger data-testid="change-order-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="executed">Executed</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="void">Void</SelectItem>
                          </SelectContent>
                        </Select>
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
                        <Input
                          {...field}
                          placeholder="Owner-requested modification"
                          data-testid="change-order-title"
                        />
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
                          placeholder="Describe the scope and justification..."
                          rows={4}
                          data-testid="change-order-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Contract & Financial Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Contract & Financial Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="contract_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Associated Contract</FormLabel>
                      <Select
                        value={field.value?.toString() || "none"}
                        onValueChange={(value) =>
                          field.onChange(value === "none" ? null : parseInt(value, 10))
                        }
                        disabled={isLoadingContracts}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="change-order-contract">
                            <SelectValue placeholder={isLoadingContracts ? "Loading..." : "Select contract"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No contract</SelectItem>
                          {contracts.map((contract) => (
                            <SelectItem key={contract.id} value={contract.id.toString()}>
                              {contract.contract_number || contract.contract_name || `Contract #${contract.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the prime contract or commitment this change order affects
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            {...field}
                            value={field.value || 0}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            data-testid="change-order-amount"
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
                            data-testid="change-order-due-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Workflow & Review Card */}
            <Card>
              <CardHeader>
                <CardTitle>Workflow & Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                          placeholder="Reviewer user ID or email"
                        />
                      </FormControl>
                      <FormDescription>
                        User ID of the person designated to review and approve this change order
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_private"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="change-order-submit">
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Creating..." : "Create Change Order"}
              </Button>
            </div>
          </form>
        </Form>
      </PageContainer>
    </>
  );
}
