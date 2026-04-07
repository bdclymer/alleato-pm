"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useContracts } from "@/hooks/use-contracts";
import { useCommitments } from "@/hooks/use-commitments-query";
import { PageShell } from "@/components/layout";
import { FormSection } from "@/components/forms";
import { FormActions } from "@/components/forms/FormActions";


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

export default function NewInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const [loading, setLoading] = useState(false);
  const initialContractType =
    searchParams.get("contractType") === "commitment" ? "commitment" : "prime";
  const initialContractId =
    searchParams.get("commitmentId") ??
    searchParams.get("contractId") ??
    "";

  // Data hooks for contracts and commitments
  const { options: contractOptions, isLoading: contractsLoading } =
    useContracts();
  const { options: commitmentOptions, isLoading: commitmentsLoading } =
    useCommitments();

  // Form state
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: "",
    contractId: initialContractId,
    contractType: initialContractType, // prime or commitment
    billingPeriod: "",
    invoiceDate: new Date(),
    dueDate: null as Date | null,
    status: "draft",
    description: "",
    contractAmount: "0.00",
    previouslyBilled: "0.00",
    thisMonthBilling: "0.00",
    totalCompleted: "0.00",
    retentionAmount: "0.00",
    netDue: "0.00",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: "1",
      costCode: "",
      description: "",
      contractAmount: "0.00",
      previouslyBilled: "0.00",
      thisMonthAmount: "0.00",
      thisMonthPercent: "0",
      totalCompleted: "0.00",
      percentComplete: "0",
      retention: "0.00",
      netDue: "0.00",
    },
  ]);

  const [includeRetention, setIncludeRetention] = useState(true);
  const [retentionPercentage, setRetentionPercentage] = useState("10");

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        costCode: "",
        description: "",
        contractAmount: "0.00",
        previouslyBilled: "0.00",
        thisMonthAmount: "0.00",
        thisMonthPercent: "0",
        totalCompleted: "0.00",
        percentComplete: "0",
        retention: "0.00",
        netDue: "0.00",
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
    calculateTotals();
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    const updatedItems = lineItems.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };

        // Auto-calculate related fields
        if (field === "thisMonthAmount" || field === "previouslyBilled") {
          const thisMonth =
            parseFloat(
              field === "thisMonthAmount" ? value : updatedItem.thisMonthAmount,
            ) || 0;
          const previous =
            parseFloat(
              field === "previouslyBilled"
                ? value
                : updatedItem.previouslyBilled,
            ) || 0;
          const contract = parseFloat(updatedItem.contractAmount) || 0;
          const total = previous + thisMonth;
          const percent =
            contract > 0 ? ((total / contract) * 100).toFixed(2) : "0";
          const retention = includeRetention
            ? (thisMonth * parseFloat(retentionPercentage)) / 100
            : 0;
          const netDue = thisMonth - retention;

          updatedItem.totalCompleted = total.toFixed(2);
          updatedItem.percentComplete = percent;
          updatedItem.retention = retention.toFixed(2);
          updatedItem.netDue = netDue.toFixed(2);

          if (field === "thisMonthAmount" && contract > 0) {
            updatedItem.thisMonthPercent = (
              (thisMonth / contract) *
              100
            ).toFixed(2);
          }
        }

        return updatedItem;
      }
      return item;
    });

    setLineItems(updatedItems);
    calculateTotals(updatedItems);
  };

  const calculateTotals = (items = lineItems) => {
    const totals = items.reduce(
      (acc, item) => ({
        contractAmount:
          acc.contractAmount + parseFloat(item.contractAmount || "0"),
        previouslyBilled:
          acc.previouslyBilled + parseFloat(item.previouslyBilled || "0"),
        thisMonthBilling:
          acc.thisMonthBilling + parseFloat(item.thisMonthAmount || "0"),
        totalCompleted:
          acc.totalCompleted + parseFloat(item.totalCompleted || "0"),
        retentionAmount:
          acc.retentionAmount + parseFloat(item.retention || "0"),
        netDue: acc.netDue + parseFloat(item.netDue || "0"),
      }),
      {
        contractAmount: 0,
        previouslyBilled: 0,
        thisMonthBilling: 0,
        totalCompleted: 0,
        retentionAmount: 0,
        netDue: 0,
      },
    );

    setInvoiceData({
      ...invoiceData,
      contractAmount: totals.contractAmount.toFixed(2),
      previouslyBilled: totals.previouslyBilled.toFixed(2),
      thisMonthBilling: totals.thisMonthBilling.toFixed(2),
      totalCompleted: totals.totalCompleted.toFixed(2),
      retentionAmount: totals.retentionAmount.toFixed(2),
      netDue: totals.netDue.toFixed(2),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoice_number: invoiceData.invoiceNumber,
          project_id: Number.isNaN(parseInt(projectId, 10))
            ? null
            : parseInt(projectId, 10),
          contract_id:
            invoiceData.contractType === "prime"
              ? invoiceData.contractId
              : null,
          commitment_id:
            invoiceData.contractType === "commitment"
              ? invoiceData.contractId
              : null,
          billing_period_start: invoiceData.billingPeriod,
          billing_period_end: invoiceData.billingPeriod,
          invoice_date: invoiceData.invoiceDate?.toISOString(),
          due_date: invoiceData.dueDate?.toISOString(),
          status: invoiceData.status,
          amount: parseFloat(invoiceData.thisMonthBilling) || 0,
          retention_amount: parseFloat(invoiceData.retentionAmount) || 0,
          net_amount: parseFloat(invoiceData.netDue) || 0,
          notes: invoiceData.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create invoice");
      }

      router.push(`/${projectId}/invoices`);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to create invoice",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/${projectId}/invoices`);
  };

  return (
    <PageShell
      variant="form"
      title="New Invoice"
      description="Create a new invoice for billing"
      onBack={() => router.back()}
    >
      <div className="max-w-none mx-0">
        <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList variant="line">
            <TabsTrigger value="general">General Info</TabsTrigger>
            <TabsTrigger value="line-items">Line Items</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <FormSection
              title="Invoice Information"
              description="Basic invoice details and billing period."
            >
              <div className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice Number*</Label>
                    <Input
                      id="invoiceNumber"
                      value={invoiceData.invoiceNumber}
                      onChange={(e) =>
                        setInvoiceData({
                          ...invoiceData,
                          invoiceNumber: e.target.value,
                        })
                      }
                      placeholder="INV-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingPeriod">Billing Period*</Label>
                    <Input
                      id="billingPeriod"
                      value={invoiceData.billingPeriod}
                      onChange={(e) =>
                        setInvoiceData({
                          ...invoiceData,
                          billingPeriod: e.target.value,
                        })
                      }
                      placeholder="January 2024"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contractType">Contract Type*</Label>
                    <Select
                      value={invoiceData.contractType}
                      onValueChange={(value) =>
                        setInvoiceData({
                          ...invoiceData,
                          contractType: value,
                          contractId: "",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select contract type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prime">Prime Contract</SelectItem>
                        <SelectItem value="commitment">
                          Commitment/Subcontract
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contractId">
                      {invoiceData.contractType === "prime"
                        ? "Contract*"
                        : "Commitment*"}
                    </Label>
                    <Select
                      value={invoiceData.contractId}
                      onValueChange={(value) =>
                        setInvoiceData({ ...invoiceData, contractId: value })
                      }
                      disabled={
                        invoiceData.contractType === "prime"
                          ? contractsLoading
                          : commitmentsLoading
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            invoiceData.contractType === "prime"
                              ? contractsLoading
                                ? "Loading contracts..."
                                : "Select contract"
                              : commitmentsLoading
                                ? "Loading commitments..."
                                : "Select commitment"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {invoiceData.contractType === "prime" ? (
                          // Show prime contracts
                          contractOptions.length > 0 ? (
                            contractOptions.map((contract) => (
                              <SelectItem
                                key={contract.value}
                                value={contract.value}
                              >
                                {contract.label}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No contracts found
                            </div>
                          )
                        ) : // Show commitments (subcontracts/purchase orders)
                        commitmentOptions.length > 0 ? (
                          commitmentOptions.map((commitment) => (
                            <SelectItem
                              key={commitment.value}
                              value={commitment.value}
                            >
                              {commitment.label}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No commitments found
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Invoice Date*</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !invoiceData.invoiceDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon />
                          {invoiceData.invoiceDate
                            ? format(invoiceData.invoiceDate, "PPP")
                            : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={invoiceData.invoiceDate}
                          onSelect={(date) =>
                            setInvoiceData({
                              ...invoiceData,
                              invoiceDate: date || new Date(),
                            })
                          }
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
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !invoiceData.dueDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon />
                          {invoiceData.dueDate
                            ? format(invoiceData.dueDate, "PPP")
                            : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={invoiceData.dueDate ?? undefined}
                          onSelect={(date) =>
                            setInvoiceData({
                              ...invoiceData,
                              dueDate: date ?? null,
                            })
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={invoiceData.status}
                      onValueChange={(value) =>
                        setInvoiceData({ ...invoiceData, status: value })
                      }
                    >
                      <SelectTrigger>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={invoiceData.description}
                    onChange={(e) =>
                      setInvoiceData({
                        ...invoiceData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Invoice description or notes..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="retention"
                      checked={includeRetention}
                      onCheckedChange={(checked) =>
                        setIncludeRetention(checked as boolean)
                      }
                    />
                    <Label htmlFor="retention">Include Retention</Label>
                  </div>
                  {includeRetention && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="retentionPercentage">Retention %:</Label>
                      <Input
                        id="retentionPercentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={retentionPercentage}
                        onChange={(e) => setRetentionPercentage(e.target.value)}
                        className="w-20"
                      />
                    </div>
                  )}
                </div>
              </div>
            </FormSection>
          </TabsContent>

          <TabsContent value="line-items">
            <FormSection
              title="Invoice Line Items"
              description="Add line items for billing."
            >
              <div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-24">
                          Cost Code
                        </TableHead>
                        <TableHead className="min-w-48">
                          Description
                        </TableHead>
                        <TableHead className="min-w-32 text-right">
                          Contract
                        </TableHead>
                        <TableHead className="min-w-32 text-right">
                          Previously
                        </TableHead>
                        <TableHead className="min-w-32 text-right">
                          This Month
                        </TableHead>
                        <TableHead className="min-w-20 text-right">
                          %
                        </TableHead>
                        <TableHead className="min-w-32 text-right">
                          Total
                        </TableHead>
                        <TableHead className="min-w-20 text-right">
                          % Complete
                        </TableHead>
                        <TableHead className="min-w-24 text-right">
                          Retention
                        </TableHead>
                        <TableHead className="min-w-32 text-right">
                          Net Due
                        </TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input
                              value={item.costCode}
                              onChange={(e) =>
                                updateLineItem(
                                  item.id,
                                  "costCode",
                                  e.target.value,
                                )
                              }
                              placeholder="01-000"
                              className="min-w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) =>
                                updateLineItem(
                                  item.id,
                                  "description",
                                  e.target.value,
                                )
                              }
                              placeholder="Work description"
                              className="min-w-40"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.contractAmount}
                              onChange={(e) =>
                                updateLineItem(
                                  item.id,
                                  "contractAmount",
                                  e.target.value,
                                )
                              }
                              className="text-right min-w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.previouslyBilled}
                              onChange={(e) =>
                                updateLineItem(
                                  item.id,
                                  "previouslyBilled",
                                  e.target.value,
                                )
                              }
                              className="text-right min-w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.thisMonthAmount}
                              onChange={(e) =>
                                updateLineItem(
                                  item.id,
                                  "thisMonthAmount",
                                  e.target.value,
                                )
                              }
                              className="text-right min-w-24"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {item.thisMonthPercent}%
                          </TableCell>
                          <TableCell className="text-right">
                            ${item.totalCompleted}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.percentComplete}%
                          </TableCell>
                          <TableCell className="text-right">
                            ${item.retention}
                          </TableCell>
                          <TableCell className="text-right">
                            ${item.netDue}
                          </TableCell>
                          <TableCell>
                            {lineItems.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLineItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4">
                  <Button type="button" variant="outline" onClick={addLineItem}>
                    <Plus />
                    Add Line Item
                  </Button>
                </div>
              </div>
            </FormSection>
          </TabsContent>

          <TabsContent value="summary">
            <FormSection
              title="Invoice Summary"
              description="Review invoice totals before submission."
            >
              <div>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-foreground">
                          Original Contract Amount:
                        </span>
                        <span className="font-medium">
                          ${invoiceData.contractAmount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground">
                          Previously Billed:
                        </span>
                        <span className="font-medium">
                          ${invoiceData.previouslyBilled}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground">
                          This Month Billing:
                        </span>
                        <span className="font-medium">
                          ${invoiceData.thisMonthBilling}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-foreground">
                          Total Completed to Date:
                        </span>
                        <span className="font-medium">
                          ${invoiceData.totalCompleted}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-foreground">Current Billing:</span>
                        <span className="font-medium">
                          ${invoiceData.thisMonthBilling}
                        </span>
                      </div>
                      {includeRetention && (
                        <div className="flex justify-between">
                          <span className="text-foreground">
                            Less Retention ({retentionPercentage}%):
                          </span>
                          <span className="font-medium text-destructive">
                            -${invoiceData.retentionAmount}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-lg font-semibold">Net Due:</span>
                        <span className="text-lg font-bold">
                          ${invoiceData.netDue}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </FormSection>
          </TabsContent>
        </Tabs>

        <FormActions
          submitLabel="Create Invoice"
          onCancel={handleCancel}
          isSubmitting={loading}
        />
        </form>
      </div>
    </PageShell>
  );
}
