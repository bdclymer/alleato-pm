"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { FormActions } from "@/components/forms/FormActions";
import { FormGrid, FormSection } from "@/components/forms";
import { PageShell } from "@/components/layout";
import { apiFetch } from "@/lib/api-client";
import { cn, formatCurrency } from "@/lib/utils";
import { useCommitments } from "@/hooks/use-commitments-query";
import { useContracts } from "@/hooks/use-contracts";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ContractType = "prime" | "commitment";

interface InvoiceFormData {
  invoiceNumber: string;
  contractId: string;
  contractType: ContractType;
  billingPeriod: string;
  invoiceDate: Date;
  dueDate: Date | null;
  status: string;
  description: string;
}

interface LineItem {
  id: string;
  costCode: string;
  description: string;
  contractAmount: string;
  previouslyBilled: string;
  thisMonthAmount: string;
  thisMonthPercent: string;
  totalCompleted: string;
  percentComplete: string;
  retention: string;
  netDue: string;
}

const parseAmount = (value: string): number => {
  const parsed = Number.parseFloat(value || "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

const createLineItem = (): LineItem => ({
  id: crypto.randomUUID(),
  costCode: "",
  description: "",
  contractAmount: "0.00",
  previouslyBilled: "0.00",
  thisMonthAmount: "0.00",
  thisMonthPercent: "0.00",
  totalCompleted: "0.00",
  percentComplete: "0.00",
  retention: "0.00",
  netDue: "0.00",
});

const withCalculatedFields = (
  item: LineItem,
  includeRetention: boolean,
  retentionPercentage: number,
): LineItem => {
  const contractAmount = parseAmount(item.contractAmount);
  const previouslyBilled = parseAmount(item.previouslyBilled);
  const thisMonthAmount = parseAmount(item.thisMonthAmount);

  const totalCompleted = previouslyBilled + thisMonthAmount;
  const thisMonthPercent =
    contractAmount > 0 ? (thisMonthAmount / contractAmount) * 100 : 0;
  const percentComplete = contractAmount > 0 ? (totalCompleted / contractAmount) * 100 : 0;
  const retention = includeRetention ? (thisMonthAmount * retentionPercentage) / 100 : 0;
  const netDue = thisMonthAmount - retention;

  return {
    ...item,
    totalCompleted: totalCompleted.toFixed(2),
    thisMonthPercent: thisMonthPercent.toFixed(2),
    percentComplete: percentComplete.toFixed(2),
    retention: retention.toFixed(2),
    netDue: netDue.toFixed(2),
  };
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Invoice creation failed because the request did not return a usable error message.";
};

export default function NewInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const parsedProjectId = Number.parseInt(projectId, 10);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialContractType: ContractType =
    searchParams.get("contractType") === "commitment" ? "commitment" : "prime";
  const initialContractId =
    searchParams.get("commitmentId") ?? searchParams.get("contractId") ?? "";

  const { options: contractOptions, isLoading: contractsLoading } = useContracts();
  const { options: commitmentOptions, isLoading: commitmentsLoading } = useCommitments();

  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceNumber: "",
    contractId: initialContractId,
    contractType: initialContractType,
    billingPeriod: "",
    invoiceDate: new Date(),
    dueDate: null,
    status: "draft",
    description: "",
  });

  const [includeRetention, setIncludeRetention] = useState(true);
  const [retentionPercentage, setRetentionPercentage] = useState("10");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    withCalculatedFields(createLineItem(), true, 10),
  ]);

  const retentionPercentValue = parseAmount(retentionPercentage);

  const totals = useMemo(() => {
    return lineItems.reduce(
      (acc, item) => {
        acc.contractAmount += parseAmount(item.contractAmount);
        acc.previouslyBilled += parseAmount(item.previouslyBilled);
        acc.thisMonthBilling += parseAmount(item.thisMonthAmount);
        acc.totalCompleted += parseAmount(item.totalCompleted);
        acc.retentionAmount += parseAmount(item.retention);
        acc.netDue += parseAmount(item.netDue);
        return acc;
      },
      {
        contractAmount: 0,
        previouslyBilled: 0,
        thisMonthBilling: 0,
        totalCompleted: 0,
        retentionAmount: 0,
        netDue: 0,
      },
    );
  }, [lineItems]);

  const updateForm = useCallback(
    (patch: Partial<InvoiceFormData>) => {
      setFormData((previous) => ({ ...previous, ...patch }));
    },
    [],
  );

  const recalculateAllLineItems = useCallback(
    (items: LineItem[]): LineItem[] =>
      items.map((item) =>
        withCalculatedFields(item, includeRetention, retentionPercentValue),
      ),
    [includeRetention, retentionPercentValue],
  );

  const addLineItem = useCallback(() => {
    setLineItems((previous) => [
      ...previous,
      withCalculatedFields(createLineItem(), includeRetention, retentionPercentValue),
    ]);
  }, [includeRetention, retentionPercentValue]);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((previous) => {
      if (previous.length === 1) {
        toast.error("An invoice must have at least one line item.");
        return previous;
      }
      return previous.filter((item) => item.id !== id);
    });
  }, []);

  const updateLineItem = useCallback(
    (id: string, field: keyof LineItem, value: string) => {
      setLineItems((previous) =>
        previous.map((item) => {
          if (item.id !== id) return item;

          const updated = { ...item, [field]: value };
          if (
            field === "contractAmount" ||
            field === "previouslyBilled" ||
            field === "thisMonthAmount"
          ) {
            return withCalculatedFields(updated, includeRetention, retentionPercentValue);
          }

          return updated;
        }),
      );
    },
    [includeRetention, retentionPercentValue],
  );

  useEffect(() => {
    setLineItems((previous) => recalculateAllLineItems(previous));
  }, [recalculateAllLineItems]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!Number.isFinite(parsedProjectId)) {
      toast.error(
        `Cannot create an invoice because project id '${projectId}' is invalid for this route.`,
      );
      return;
    }

    if (!formData.contractId) {
      toast.error("Select a contract before creating the invoice.");
      return;
    }

    if (!formData.invoiceNumber.trim()) {
      toast.error("Invoice number is required.");
      return;
    }

    if (!formData.billingPeriod.trim()) {
      toast.error("Billing period is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          invoice_number: formData.invoiceNumber.trim(),
          project_id: parsedProjectId,
          contract_id: formData.contractType === "prime" ? formData.contractId : null,
          commitment_id: formData.contractType === "commitment" ? formData.contractId : null,
          billing_period_start: formData.billingPeriod,
          billing_period_end: formData.billingPeriod,
          invoice_date: formData.invoiceDate.toISOString(),
          due_date: formData.dueDate?.toISOString() ?? null,
          status: formData.status,
          amount: totals.thisMonthBilling,
          retention_amount: totals.retentionAmount,
          net_amount: totals.netDue,
          notes: formData.description.trim() || null,
        }),
      });

      router.push(`/${projectId}/invoices`);
    } catch (error) {
      const message = toErrorMessage(error);
      console.error("Invoice create request failed", {
        projectId,
        contractType: formData.contractType,
        contractId: formData.contractId,
        message,
      });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const contractOptionsToRender =
    formData.contractType === "prime" ? contractOptions : commitmentOptions;
  const isContractSelectLoading =
    formData.contractType === "prime" ? contractsLoading : commitmentsLoading;

  return (
    <PageShell
      variant="form"
      title="New Invoice"
      description="Create a new owner or commitment invoice."
      onBack={() => router.push(`/${projectId}/invoices`)}
      backLabel="Back to Invoices"
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection
          title="Invoice Information"
          description="Define invoice metadata, billing period, and contract source."
        >
          <FormGrid columns={2}>
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number *</Label>
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={(event) => updateForm({ invoiceNumber: event.target.value })}
                placeholder="INV-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingPeriod">Billing Period *</Label>
              <Input
                id="billingPeriod"
                value={formData.billingPeriod}
                onChange={(event) => updateForm({ billingPeriod: event.target.value })}
                placeholder="January 2026"
                required
              />
            </div>
          </FormGrid>

          <FormGrid columns={2}>
            <div className="space-y-2">
              <Label htmlFor="contractType">Contract Type *</Label>
              <Select
                value={formData.contractType}
                onValueChange={(value) =>
                  updateForm({ contractType: value as ContractType, contractId: "" })
                }
              >
                <SelectTrigger id="contractType">
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prime">Prime Contract</SelectItem>
                  <SelectItem value="commitment">Commitment/Subcontract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractId">
                {formData.contractType === "prime" ? "Contract *" : "Commitment *"}
              </Label>
              <Select
                value={formData.contractId}
                onValueChange={(value) => updateForm({ contractId: value })}
                disabled={isContractSelectLoading}
              >
                <SelectTrigger id="contractId">
                  <SelectValue
                    placeholder={
                      isContractSelectLoading
                        ? "Loading options..."
                        : formData.contractType === "prime"
                          ? "Select contract"
                          : "Select commitment"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {contractOptionsToRender.length > 0 ? (
                    contractOptionsToRender.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No options found
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </FormGrid>

          <FormGrid columns={3}>
            <div className="space-y-2">
              <Label>Invoice Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.invoiceDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {formData.invoiceDate ? format(formData.invoiceDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.invoiceDate}
                    onSelect={(date) => updateForm({ invoiceDate: date ?? new Date() })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate ?? undefined}
                    onSelect={(date) => updateForm({ dueDate: date ?? null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceStatus">Status</Label>
              <Select value={formData.status} onValueChange={(value) => updateForm({ status: value })}>
                <SelectTrigger id="invoiceStatus">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FormGrid>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(event) => updateForm({ description: event.target.value })}
              placeholder="Invoice notes"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="retention-enabled"
                checked={includeRetention}
                onCheckedChange={(checked) => {
                  setIncludeRetention(Boolean(checked));
                }}
              />
              <Label htmlFor="retention-enabled">Apply retention</Label>
            </div>

            {includeRetention ? (
              <div className="flex items-center gap-2">
                <Label htmlFor="retention-rate">Retention %</Label>
                <Input
                  id="retention-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={retentionPercentage}
                  className="w-24 text-right"
                  onChange={(event) => setRetentionPercentage(event.target.value)}
                />
              </div>
            ) : null}
          </div>
        </FormSection>

        <FormSection
          title="Invoice Line Items"
          description="Enter schedule of values amounts for this billing cycle."
        >
          <div className="space-y-4">
            <div className="overflow-x-auto overflow-hidden rounded-lg border border-border/70 bg-muted/20">
              <Table>
                <TableHeader className="border-y-0 [&_tr]:border-b-0">
                  <TableRow className="bg-muted/70 hover:bg-muted/70">
                    <TableHead className="min-w-24 px-2 py-1.5 text-[11px] font-normal normal-case text-muted-foreground">
                      Cost Code
                    </TableHead>
                    <TableHead className="min-w-56 px-2 py-1.5 text-[11px] font-normal normal-case text-muted-foreground">
                      Description
                    </TableHead>
                    <TableHead className="min-w-32 px-2 py-1.5 text-right text-[11px] font-normal normal-case text-muted-foreground">
                      Contract
                    </TableHead>
                    <TableHead className="min-w-32 px-2 py-1.5 text-right text-[11px] font-normal normal-case text-muted-foreground">
                      Previously
                    </TableHead>
                    <TableHead className="min-w-32 px-2 py-1.5 text-right text-[11px] font-normal normal-case text-muted-foreground">
                      This Month
                    </TableHead>
                    <TableHead className="min-w-20 px-2 py-1.5 text-right text-[11px] font-normal normal-case text-muted-foreground">
                      This %
                    </TableHead>
                    <TableHead className="min-w-32 px-2 py-1.5 text-right text-[11px] font-normal normal-case text-muted-foreground">
                      Total
                    </TableHead>
                    <TableHead className="min-w-24 px-2 py-1.5 text-right text-[11px] font-normal normal-case text-muted-foreground">
                      Complete %
                    </TableHead>
                    <TableHead className="min-w-24 px-2 py-1.5 text-right text-[11px] font-normal normal-case text-muted-foreground">
                      Retention
                    </TableHead>
                    <TableHead className="min-w-32 px-2 py-1.5 text-right text-[11px] font-normal normal-case text-muted-foreground">
                      Net Due
                    </TableHead>
                    <TableHead className="w-12 px-2 py-1.5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="px-2 py-1.5 align-top">
                        <Input
                          value={item.costCode}
                          onChange={(event) => updateLineItem(item.id, "costCode", event.target.value)}
                          placeholder="01-000"
                          className="h-9 min-w-20"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1.5 align-top">
                        <Input
                          value={item.description}
                          onChange={(event) => updateLineItem(item.id, "description", event.target.value)}
                          placeholder="Line item description"
                          className="h-9 min-w-48"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1.5 align-top">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.contractAmount}
                          onChange={(event) =>
                            updateLineItem(item.id, "contractAmount", event.target.value)
                          }
                          className="h-9 min-w-24 text-right"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1.5 align-top">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.previouslyBilled}
                          onChange={(event) =>
                            updateLineItem(item.id, "previouslyBilled", event.target.value)
                          }
                          className="h-9 min-w-24 text-right"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1.5 align-top">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.thisMonthAmount}
                          onChange={(event) =>
                            updateLineItem(item.id, "thisMonthAmount", event.target.value)
                          }
                          className="h-9 min-w-24 text-right"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right text-sm tabular-nums">
                        {item.thisMonthPercent}%
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right text-sm tabular-nums">
                        {formatCurrency(item.totalCompleted)}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right text-sm tabular-nums">
                        {item.percentComplete}%
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right text-sm tabular-nums">
                        {formatCurrency(item.retention)}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right text-sm font-medium tabular-nums">
                        {formatCurrency(item.netDue)}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right">
                        {lineItems.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}

                  <TableRow className="hover:bg-muted">
                    <TableCell className="px-2 py-2" />
                    <TableCell colSpan={5} className="px-2 py-3 text-xs font-semibold text-foreground">
                      Totals
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right text-sm font-semibold tabular-nums">
                      {formatCurrency(totals.totalCompleted)}
                    </TableCell>
                    <TableCell className="px-2 py-2" />
                    <TableCell className="px-2 py-2 text-right text-sm font-semibold tabular-nums">
                      {formatCurrency(totals.retentionAmount)}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right text-sm font-semibold tabular-nums">
                      {formatCurrency(totals.netDue)}
                    </TableCell>
                    <TableCell className="px-2 py-2" />
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Button type="button" variant="outline" onClick={addLineItem}>
              <Plus className="h-4 w-4" />
              Add Line Item
            </Button>
          </div>
        </FormSection>

        <FormSection
          title="Invoice Summary"
          description="Review financial totals before saving this invoice."
        >
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Contract Amount</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(totals.contractAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Previously Billed</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(totals.previouslyBilled)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">This Month Billing</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(totals.thisMonthBilling)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/70 pt-3 text-sm">
                <span className="font-medium text-foreground">Total Completed to Date</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(totals.totalCompleted)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Billing</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(totals.thisMonthBilling)}
                </span>
              </div>
              {includeRetention ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Retention ({Math.round(retentionPercentValue * 100) / 100}%)
                  </span>
                  <span className="font-medium tabular-nums text-destructive">
                    -{formatCurrency(totals.retentionAmount)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-border/70 pt-3">
                <span className="text-base font-semibold">Net Due</span>
                <span className="text-lg font-semibold tabular-nums">
                  {formatCurrency(totals.netDue)}
                </span>
              </div>
            </div>
          </div>
        </FormSection>

        <FormActions
          submitLabel="Create Invoice"
          isSubmitting={isSubmitting}
          onCancel={() => router.push(`/${projectId}/invoices`)}
        />
      </form>
    </PageShell>
  );
}
