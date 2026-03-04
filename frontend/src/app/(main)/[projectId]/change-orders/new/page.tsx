"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, AlertCircle } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
import { useUsers } from "@/hooks/use-users";
import {
  LineItemsTable,
  type ChangeOrderLineItem,
} from "@/components/domain/change-orders/LineItemsTable";
import { Alert, AlertDescription } from "@/components/ui/alert";

const createChangeOrderSchema = z.object({
  co_number: z.string().min(1, "Change order number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z
    .enum(["draft", "pending", "approved", "executed", "rejected", "void"])
    .default("draft"),
  contract_id: z.string().min(1, "Contract is required"),
  change_order_type: z.enum(["prime_contract", "commitment"]).optional(),
  amount: z.number().default(0),
  due_date: z.string().optional().nullable(),
  is_private: z.boolean().default(false),
  designated_reviewer_id: z.string().optional().nullable(),
  scope: z.enum(["in_scope", "out_of_scope"]).optional(),
  schedule_impact: z.enum(["yes", "no", "unknown"]).optional(),
});

type ChangeOrderFormValues = z.infer<typeof createChangeOrderSchema>;

interface ContractOption {
  id: string;
  contract_number: string;
  title: string | null;
  company_name: string | null;
  contract_type: "prime_contract" | "commitment";
  commitment_type?: string | null;
}

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
  const [lineItems, setLineItems] = useState<ChangeOrderLineItem[]>([]);

  const form = useForm<ChangeOrderFormValues>({
    resolver: zodResolver(createChangeOrderSchema) as any,
    defaultValues: {
      co_number: "",
      title: "",
      description: "",
      status: "draft",
      contract_id: "",
      change_order_type: undefined,
      amount: 0,
      due_date: null,
      is_private: false,
      designated_reviewer_id: null,
    },
  });

  const lineItemsTotal = lineItems.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unit_price || 0);
  }, 0);

  const manualAmount = form.watch("amount");
  const hasAmountConflict =
    lineItems.length > 0 &&
    manualAmount > 0 &&
    Math.abs(manualAmount - lineItemsTotal) > 0.01;

  const { users, options: userOptions, isLoading: isLoadingUsers } = useUsers({
    personType: "user",
  });

  useEffect(() => {
    const fetchContracts = async () => {
      if (isNaN(numericProjectId)) return;

      try {
        setIsLoadingContracts(true);

        const [primeContractsRes, commitmentsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/contracts`),
          fetch(`/api/commitments?project_id=${projectId}`),
        ]);

        const allContracts: ContractOption[] = [];

        if (primeContractsRes.ok) {
          const primeContracts = await primeContractsRes.json();
          const primeOptions: ContractOption[] = primeContracts.map(
            (contract: any) => ({
              id: contract.id,
              contract_number: contract.contract_number,
              title: contract.title,
              company_name: contract.vendor?.name || contract.client?.name || null,
              contract_type: "prime_contract" as const,
            }),
          );
          allContracts.push(...primeOptions);
        }

        if (commitmentsRes.ok) {
          const commitmentsData = await commitmentsRes.json();
          const commitments = Array.isArray(commitmentsData)
            ? commitmentsData
            : commitmentsData.items || [];

          const commitmentOptions: ContractOption[] = commitments.map(
            (commitment: any) => ({
              id: commitment.id,
              contract_number:
                commitment.number || commitment.contract_number || "N/A",
              title: commitment.title,
              company_name: commitment.contract_company?.name || null,
              contract_type: "commitment" as const,
              commitment_type: commitment.type || null,
            }),
          );
          allContracts.push(...commitmentOptions);
        }

        setContracts(allContracts);
      } catch (error) {
        console.error("Failed to load contracts:", error);
        toast.error("Failed to load contracts");
      } finally {
        setIsLoadingContracts(false);
      }
    };

    fetchContracts();
  }, [numericProjectId, projectId]);

  const handleSubmit = async (data: ChangeOrderFormValues) => {
    setIsSubmitting(true);

    try {
      const { scope, schedule_impact, ...apiData } = data;
      const finalAmount = lineItems.length > 0 ? lineItemsTotal : data.amount;
      const designated_reviewer_id =
        apiData.designated_reviewer_id === "__none__"
          ? null
          : apiData.designated_reviewer_id;
      const contract_id = apiData.contract_id ? Number(apiData.contract_id) : null;

      const response = await fetch(`/api/projects/${projectId}/change-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...apiData,
          contract_id,
          designated_reviewer_id,
          amount: finalAmount,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));

        if (errorData.issues) {
          errorData.issues.forEach((issue: any) => {
            toast.error(`${issue.path.join(".")}: ${issue.message}`);
          });
          throw new Error("Validation failed");
        }

        throw new Error(errorData.error || "Failed to create change order");
      }

      const createdChangeOrder = await response.json();

      if (lineItems.length > 0) {
        const lineItemPromises = lineItems.map(async (item) => {
          const lineItemData = {
            cost_code_id: item.cost_code_id,
            cost_type_id: "00000000-0000-0000-0000-000000000001",
            description: item.description,
            amount: (item.quantity || 0) * (item.unit_price || 0),
          };

          const lineItemResponse = await fetch(
            `/api/projects/${projectId}/change-orders/${createdChangeOrder.id}/line-items`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(lineItemData),
            },
          );

          if (!lineItemResponse.ok) {
            console.error("Failed to create line item:", await lineItemResponse.text());
          }

          return lineItemResponse;
        });

        await Promise.all(lineItemPromises);
      }

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
      <ProjectFormPageLayout
        title="Error"
        description="Invalid project ID"
        onBack={handleCancel}
      >
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Invalid project ID provided.
        </div>
      </ProjectFormPageLayout>
    );
  }

  return (
    <ProjectFormPageLayout
      title="New Change Order"
      description="Create a new change order with clear contract, pricing, and review details."
      onBack={handleCancel}
      backLabel="Back to Change Orders"
      maxWidth="lg"
    >
      <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Complete core details first, then add line items for the final total.
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <section className="space-y-4">
              <div className="border-b pb-2">
                <h2 className="text-lg font-semibold">Basic Information</h2>
                <p className="text-sm text-muted-foreground">
                  Identify the change order and provide a concise summary.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="co_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Change Order Number *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="CO-001"
                            data-testid="change-order-number"
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
              </div>
            </section>

            <section className="space-y-4">
              <div className="border-b pb-2">
                <h2 className="text-lg font-semibold">Contract & Financial Details</h2>
                <p className="text-sm text-muted-foreground">
                  Link this change to its contract and define the pricing target.
                </p>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="contract_id"
                  render={({ field }) => {
                    const primeContracts = contracts.filter(
                      (c) => c.contract_type === "prime_contract",
                    );
                    const commitments = contracts.filter(
                      (c) => c.contract_type === "commitment",
                    );
                    const selectedContract = contracts.find(
                      (c) => c.id === field.value,
                    );

                    return (
                      <FormItem>
                        <FormLabel>Associated Contract *</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={(value) => {
                            field.onChange(value);
                            const selected = contracts.find((c) => c.id === value);
                            if (selected) {
                              form.setValue("change_order_type", selected.contract_type);
                            }
                          }}
                          disabled={isLoadingContracts}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="change-order-contract">
                              <SelectValue
                                placeholder={
                                  isLoadingContracts
                                    ? "Loading contracts..."
                                    : "Select a contract"
                                }
                              >
                                {selectedContract && (
                                  <span className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {selectedContract.contract_number}
                                    </span>
                                    {selectedContract.title && (
                                      <span className="text-muted-foreground">
                                        • {selectedContract.title}
                                      </span>
                                    )}
                                    {selectedContract.company_name && (
                                      <span className="text-sm text-muted-foreground">
                                        ({selectedContract.company_name})
                                      </span>
                                    )}
                                  </span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {primeContracts.length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                  Prime Contracts
                                </div>
                                {primeContracts.map((contract) => (
                                  <SelectItem key={contract.id} value={contract.id}>
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                          {contract.contract_number}
                                        </span>
                                        {contract.title && (
                                          <span className="text-muted-foreground">
                                            • {contract.title}
                                          </span>
                                        )}
                                      </div>
                                      {contract.company_name && (
                                        <span className="text-xs text-muted-foreground">
                                          {contract.company_name}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </>
                            )}

                            {commitments.length > 0 && (
                              <>
                                {primeContracts.length > 0 && <div className="my-1 border-t" />}
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                  Commitments
                                </div>
                                {commitments.map((contract) => (
                                  <SelectItem key={contract.id} value={contract.id}>
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                          {contract.contract_number}
                                        </span>
                                        {contract.title && (
                                          <span className="text-muted-foreground">
                                            • {contract.title}
                                          </span>
                                        )}
                                        {contract.commitment_type && (
                                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                            {contract.commitment_type.replace("_", " ")}
                                          </span>
                                        )}
                                      </div>
                                      {contract.company_name && (
                                        <span className="text-xs text-muted-foreground">
                                          {contract.company_name}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </>
                            )}

                            {contracts.length === 0 && !isLoadingContracts && (
                              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                No contracts found for this project
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the prime contract or commitment this change order affects.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
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
                            value={
                              field.value ? formatDateForInput(field.value) : ""
                            }
                            data-testid="change-order-due-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="border-b pb-2">
                <h2 className="text-lg font-semibold">Line Items</h2>
                <p className="text-sm text-muted-foreground">
                  Add cost code line items. If line items exist, their total becomes the
                  final amount.
                </p>
              </div>

              <div className="space-y-4">
                {hasAmountConflict && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Amount Mismatch:</strong> You entered a manual amount of{" "}
                      <strong>${manualAmount.toFixed(2)}</strong>, but line items total{" "}
                      <strong>${lineItemsTotal.toFixed(2)}</strong>. The line items total
                      will be used when you submit.
                    </AlertDescription>
                  </Alert>
                )}

                <LineItemsTable
                  lineItems={lineItems}
                  onChange={setLineItems}
                  readOnly={false}
                  showTotals={true}
                />

                {lineItems.length > 0 && (
                  <div className="flex items-center justify-end gap-4 border-t pt-2">
                    <span className="text-sm text-muted-foreground">
                      Change Order Total (from line items):
                    </span>
                    <span className="text-2xl font-bold">${lineItemsTotal.toFixed(2)}</span>
                  </div>
                )}

                {lineItems.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No line items added yet. You can add line items now or later from
                    the detail page.
                    {manualAmount > 0 &&
                      ` The manual amount of $${manualAmount.toFixed(2)} will be used.`}
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div className="border-b pb-2">
                <h2 className="text-lg font-semibold">Scope & Schedule Impact</h2>
                <p className="text-sm text-muted-foreground">
                  Capture whether this affects contract scope and project schedule.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="scope"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormLabel>Scope</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="in_scope" id="in_scope" />
                              <Label htmlFor="in_scope" className="cursor-pointer font-normal">
                                In Scope
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="out_of_scope" id="out_of_scope" />
                              <Label
                                htmlFor="out_of_scope"
                                className="cursor-pointer font-normal"
                              >
                                Out of Scope
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          Is this change within the original project scope?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="schedule_impact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Impact</FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="change-order-schedule-impact">
                              <SelectValue placeholder="Select impact" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="yes">Yes - Impacts Schedule</SelectItem>
                            <SelectItem value="no">No - No Impact</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Will this change affect the project schedule?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="border-b pb-2">
                <h2 className="text-lg font-semibold">Workflow & Review</h2>
                <p className="text-sm text-muted-foreground">
                  Assign reviewer and visibility before submitting.
                </p>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="designated_reviewer_id"
                  render={({ field }) => {
                    const selectedUser = users.find((u) => u.id === field.value);

                    return (
                      <FormItem>
                        <FormLabel>Designated Reviewer</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          disabled={isLoadingUsers}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="change-order-reviewer">
                              <SelectValue
                                placeholder={
                                  isLoadingUsers
                                    ? "Loading users..."
                                    : "Select a reviewer"
                                }
                              >
                                {selectedUser && (
                                  <span className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {selectedUser.first_name} {selectedUser.last_name}
                                    </span>
                                    {selectedUser.email && (
                                      <span className="text-sm text-muted-foreground">
                                        ({selectedUser.email})
                                      </span>
                                    )}
                                  </span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">
                              <span className="text-muted-foreground">
                                No reviewer selected
                              </span>
                            </SelectItem>

                            {userOptions.map((option) => {
                              const user = users.find((u) => u.id === option.value);
                              return (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{option.label}</span>
                                      {user?.job_title && (
                                        <span className="text-xs text-muted-foreground">
                                          • {user.job_title}
                                        </span>
                                      )}
                                    </div>
                                    {option.email && (
                                      <span className="text-xs text-muted-foreground">
                                        {option.email}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })}

                            {userOptions.length === 0 && !isLoadingUsers && (
                              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                No users found
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the person designated to review and approve this
                          change order.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="is_private"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-4 space-y-0">
                      <FormControl>
                        <Checkbox
                          id="is_private"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel htmlFor="is_private">Private Change Order</FormLabel>
                        <FormDescription>
                          Restrict visibility to authorized users only.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <div className="flex justify-end gap-4 border-t pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="change-order-submit"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Creating..." : "Create Change Order"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </ProjectFormPageLayout>
  );
}
