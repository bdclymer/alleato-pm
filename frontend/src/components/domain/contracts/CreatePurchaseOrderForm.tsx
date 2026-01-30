"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Plus, Sparkles, Loader2, AlertCircle } from "lucide-react";
import {
  CreatePurchaseOrderSchema,
  type CreatePurchaseOrderInput,
  type PurchaseOrderSovLineItem,
} from "@/lib/schemas/create-purchase-order-schema";
import { useCompanies } from "@/hooks/use-companies";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CreatePurchaseOrderFormProps {
  projectId: number;
  onSubmit: (data: CreatePurchaseOrderInput) => Promise<void>;
  onCancel: () => void;
}

interface BudgetCodeSummary {
  code: string;
}

interface BudgetCodesResponse {
  budgetCodes: BudgetCodeSummary[];
}

const UNIT_OF_MEASURES = [
  { value: "EA", label: "Each" },
  { value: "LF", label: "Linear Foot" },
  { value: "SF", label: "Square Foot" },
  { value: "CY", label: "Cubic Yard" },
  { value: "TON", label: "Ton" },
  { value: "HR", label: "Hour" },
  { value: "LS", label: "Lump Sum" },
];

export function CreatePurchaseOrderForm({
  projectId,
  onSubmit,
  onCancel,
}: CreatePurchaseOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [sovLines, setSovLines] = React.useState<PurchaseOrderSovLineItem[]>(
    [],
  );
  const [accountingMethod, setAccountingMethod] = React.useState<
    "unit-quantity" | "amount"
  >("unit-quantity");
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [budgetCodes, setBudgetCodes] = React.useState<string[]>([]);
  const [budgetCodesLoaded, setBudgetCodesLoaded] = React.useState(false);
  const [budgetCodesError, setBudgetCodesError] = React.useState<string | null>(
    null,
  );

  // Use the companies hook - returns { value: uuid, label: name } options
  const { options: companyOptions, isLoading: isLoadingCompanies } =
    useCompanies();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreatePurchaseOrderInput>({
    resolver: zodResolver(CreatePurchaseOrderSchema) as any,
    defaultValues: {
      contractNumber: "PO-001",
      status: "Draft",
      executed: false,
      accountingMethod: "unit-quantity",
      sov: [],
      privacy: {
        isPrivate: true,
        allowNonAdminViewSovItems: false,
      },
    },
  });

  const contractCompanyId = watch("contractCompanyId");
  const privacyIsPrivate = watch("privacy.isPrivate") ?? true;

  React.useEffect(() => {
    let isMounted = true;
    const fetchBudgetCodes = async () => {
      try {
        setBudgetCodesError(null);
        const response = await fetch(
          `/api/projects/${projectId}/budget-codes`,
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error || "Failed to load budget codes");
        }

        const data = (await response.json()) as BudgetCodesResponse;
        if (!isMounted) return;
        setBudgetCodes(data.budgetCodes.map((code) => code.code));
      } catch (error) {
        if (!isMounted) return;
        setBudgetCodesError(
          error instanceof Error ? error.message : "Failed to load budget codes",
        );
        setBudgetCodes([]);
      } finally {
        if (isMounted) {
          setBudgetCodesLoaded(true);
        }
      }
    };

    fetchBudgetCodes();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const budgetCodeSet = React.useMemo(() => {
    return new Set(budgetCodes);
  }, [budgetCodes]);

  const unbudgetedLines = React.useMemo(() => {
    return sovLines
      .map((line, index) => ({
        lineNumber: index + 1,
        code: line.budgetCode?.trim() ?? "",
      }))
      .filter(({ code }) => code.length > 0 && !budgetCodeSet.has(code));
  }, [sovLines, budgetCodeSet]);

  const handleFormSubmit = async (data: CreatePurchaseOrderInput) => {
    setIsSubmitting(true);
    try {
      const submitData = {
        ...data,
        sov: sovLines,
        accountingMethod,
      };
      await onSubmit(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSOVLine = () => {
    const newLine: PurchaseOrderSovLineItem & { _id: string } = {
      _id: `line-${Date.now()}-${Math.random()}`,
      lineNumber: sovLines.length + 1,
      quantity: 0,
      unitCost: 0,
      amount: 0,
      billedToDate: 0,
    };
    setSovLines([...sovLines, newLine as PurchaseOrderSovLineItem]);
  };

  const updateSOVLine = (
    index: number,
    field: keyof PurchaseOrderSovLineItem,
    value: unknown,
  ) => {
    const updated = [...sovLines];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate amount if quantity or unitCost changes
    if (field === "quantity" || field === "unitCost") {
      const qty =
        field === "quantity" ? (value as number) : updated[index].quantity || 0;
      const cost =
        field === "unitCost" ? (value as number) : updated[index].unitCost || 0;
      updated[index].amount = qty * cost;
    }

    setSovLines(updated);
  };

  const removeSOVLine = (index: number) => {
    setSovLines(sovLines.filter((_, i) => i !== index));
  };

  const calculateSOVTotals = () => {
    const totals = sovLines.reduce(
      (acc, line) => {
        const lineAmount = line.amount || 0;
        const lineBilled = line.billedToDate || 0;
        return {
          amount: acc.amount + lineAmount,
          billedToDate: acc.billedToDate + lineBilled,
        };
      },
      { amount: 0, billedToDate: 0 },
    );
    return {
      ...totals,
      amountRemaining: totals.amount - totals.billedToDate,
    };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setAttachments((prev) => [...prev, ...Array.from(files)]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files) {
      setAttachments((prev) => [...prev, ...Array.from(files)]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const totals = calculateSOVTotals();

  const handleFormSubmitWrapper = async (data: CreatePurchaseOrderInput) => {
    await handleFormSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmitWrapper)} className="space-y-8">
      {/* General Information Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          General Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contractNumber">Contract #</Label>
            <Input
              id="contractNumber"
              {...register("contractNumber")}
              disabled={isSubmitting}
            />
            {errors.contractNumber && (
              <p className="text-sm text-red-600">
                {errors.contractNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractCompanyId">Contract Company</Label>
            <Select
              value={watch("contractCompanyId") || ""}
              onValueChange={(value) => setValue("contractCompanyId", value)}
              disabled={isSubmitting || isLoadingCompanies}
            >
              <SelectTrigger>
                {isLoadingCompanies ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading companies...
                  </span>
                ) : (
                  <SelectValue placeholder="Select company" />
                )}
              </SelectTrigger>
              <SelectContent>
                {companyOptions.length === 0 ? (
                  <SelectItem value="_no_companies" disabled>
                    No companies available
                  </SelectItem>
                ) : (
                  companyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...register("title")} disabled={isSubmitting} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status*</Label>
            <Select
              value={watch("status")}
              onValueChange={(value) => setValue("status", value as "Draft")}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Sent">Sent to Vendor</SelectItem>
                <SelectItem value="Acknowledged">Acknowledged</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="executed"
                checked={watch("executed")}
                onCheckedChange={(checked) =>
                  setValue("executed", checked as boolean)
                }
                disabled={isSubmitting}
              />
              <Label htmlFor="executed" className="text-sm font-normal">
                Executed
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultRetainagePercent">Default Retainage</Label>
            <div className="flex items-center gap-2">
              <Input
                id="defaultRetainagePercent"
                type="number"
                step="0.01"
                {...register("defaultRetainagePercent", {
                  valueAsNumber: true,
                })}
                disabled={isSubmitting}
              />
              <span className="text-sm text-foreground">%</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignedTo">Assigned To</Label>
          <Select
            value={watch("assignedTo") || ""}
            onValueChange={(value) => setValue("assignedTo", value)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select person" />
            </SelectTrigger>
            <SelectContent>
              {/* TODO: Load users from database */}
              <SelectItem value="user1">John Doe</SelectItem>
              <SelectItem value="user2">Jane Smith</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="billTo">Bill To</Label>
            <Textarea
              id="billTo"
              {...register("billTo")}
              disabled={isSubmitting}
              className="min-h-[80px]"
              placeholder="Billing address..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipTo">Ship To</Label>
            <Textarea
              id="shipTo"
              {...register("shipTo")}
              disabled={isSubmitting}
              className="min-h-[80px]"
              placeholder="Shipping address..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Input
              id="paymentTerms"
              {...register("paymentTerms")}
              disabled={isSubmitting}
              placeholder="e.g., Net 30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipVia">Ship Via</Label>
            <Input
              id="shipVia"
              {...register("shipVia")}
              disabled={isSubmitting}
              placeholder="Shipping method"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register("description")}
            disabled={isSubmitting}
            className="min-h-[100px]"
            placeholder="Purchase order description..."
          />
        </div>
      </section>

      {/* Attachments Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Attachments</h2>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          aria-label="File upload"
        />

        <div
          className="border-2 border-dashed rounded-lg p-8 text-center"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
              >
                Attach Files
              </Button>
              <span className="text-sm text-foreground">or Drag & Drop</span>
            </div>
          </div>
        </div>

        {/* Display attached files */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-foreground" />
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAttachment(index)}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Schedule of Values Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          Schedule of Values
        </h2>

        {/* Accounting Method Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-900">
              This purchase order&apos;s accounting method is{" "}
              {accountingMethod === "unit-quantity"
                ? "unit/quantity-based"
                : "amount-based"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setAccountingMethod(
                  accountingMethod === "unit-quantity"
                    ? "amount"
                    : "unit-quantity",
                )
              }
              disabled={isSubmitting}
            >
              Change to{" "}
              {accountingMethod === "unit-quantity"
                ? "Amount-Based"
                : "Unit/Quantity"}
            </Button>
          </div>
        </div>

        {budgetCodesError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Budget codes unavailable</AlertTitle>
            <AlertDescription>{budgetCodesError}</AlertDescription>
          </Alert>
        )}

        {budgetCodesLoaded && unbudgetedLines.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50 text-yellow-900">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unbudgeted line items</AlertTitle>
            <AlertDescription className="text-yellow-800">
              Line items{" "}
              {unbudgetedLines
                .map((line) => `${line.lineNumber} (${line.code})`)
                .join(", ")}{" "}
              are not on the project budget. Add them to the budget or update
              these line items before approval.
            </AlertDescription>
          </Alert>
        )}

        {/* SOV Table */}
        {sovLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="text-muted-foreground">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                <span className="text-4xl">📦</span>
              </div>
            </div>
            <p className="text-lg font-medium text-foreground">
              You Have No Line Items Yet
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={addSOVLine}
                disabled={isSubmitting}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Line
              </Button>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Import SOV from CSV
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={addSOVLine}
                size="sm"
                disabled={isSubmitting}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Line
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
              >
                Import SOV from CSV
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-foreground w-12">
                      #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-foreground">
                      Change Event
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-foreground">
                      Budget Code
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-foreground">
                      Description
                    </th>
                    {accountingMethod === "unit-quantity" && (
                      <>
                        <th className="px-3 py-2 text-right text-xs font-medium text-foreground">
                          Qty
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-foreground">
                          UOM
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-foreground">
                          Unit Cost
                        </th>
                      </>
                    )}
                    <th className="px-3 py-2 text-right text-xs font-medium text-foreground">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-foreground">
                      Billed to Date
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-foreground">
                      Amount Remaining
                    </th>
                    <th className="px-3 py-2 w-12" aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y">
                  {sovLines.map((line, index) => (
                    <tr
                      key={
                        (line as PurchaseOrderSovLineItem & { _id?: string })
                          ._id || `line-${index}`
                      }
                    >
                      <td className="px-3 py-2 text-sm">{index + 1}</td>
                      <td className="px-3 py-2">
                        <Input
                          className="text-sm"
                          placeholder="Change Event"
                          value={line.changeEventLineItem || ""}
                          onChange={(e) =>
                            updateSOVLine(
                              index,
                              "changeEventLineItem",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="text-sm"
                          placeholder="Budget Code"
                          value={line.budgetCode || ""}
                          onChange={(e) =>
                            updateSOVLine(index, "budgetCode", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="text-sm"
                          placeholder="Description"
                          value={line.description || ""}
                          onChange={(e) =>
                            updateSOVLine(index, "description", e.target.value)
                          }
                        />
                      </td>
                      {accountingMethod === "unit-quantity" && (
                        <>
                          <td className="px-3 py-2">
                            <Input
                              className="text-sm text-right"
                              type="number"
                              step="0.01"
                              placeholder="0"
                              value={line.quantity || 0}
                              onChange={(e) =>
                                updateSOVLine(
                                  index,
                                  "quantity",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              value={line.uom || ""}
                              onValueChange={(value) =>
                                updateSOVLine(index, "uom", value)
                              }
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="UOM" />
                              </SelectTrigger>
                              <SelectContent>
                                {UNIT_OF_MEASURES.map((uom) => (
                                  <SelectItem key={uom.value} value={uom.value}>
                                    {uom.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              className="text-sm text-right"
                              type="number"
                              step="0.01"
                              placeholder="$0.00"
                              value={line.unitCost || 0}
                              onChange={(e) =>
                                updateSOVLine(
                                  index,
                                  "unitCost",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </td>
                        </>
                      )}
                      <td className="px-3 py-2 text-sm text-right">
                        ${(line.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        ${(line.billedToDate || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        $
                        {(
                          (line.amount || 0) - (line.billedToDate || 0)
                        ).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSOVLine(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted font-semibold">
                  <tr>
                    <td
                      colSpan={accountingMethod === "unit-quantity" ? 7 : 4}
                      className="px-3 py-2 text-sm"
                    >
                      Total:
                    </td>
                    <td className="px-3 py-2 text-sm text-right">
                      ${totals.amount.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-sm text-right">
                      ${totals.billedToDate.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-sm text-right">
                      ${totals.amountRemaining.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Contract Dates Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Contract Dates</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dates.contractDate">Contract Date</Label>
            <Input
              id="dates.contractDate"
              type="text"
              {...register("dates.contractDate")}
              disabled={isSubmitting}
              placeholder="mm/dd/yyyy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dates.deliveryDate">Delivery Date</Label>
            <Input
              id="dates.deliveryDate"
              type="text"
              {...register("dates.deliveryDate")}
              disabled={isSubmitting}
              placeholder="mm/dd/yyyy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dates.signedPoReceivedDate">
              Signed PO Received Date
            </Label>
            <Input
              id="dates.signedPoReceivedDate"
              type="text"
              {...register("dates.signedPoReceivedDate")}
              disabled={isSubmitting}
              placeholder="mm/dd/yyyy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dates.issuedOnDate">Issued On Date</Label>
            <Input
              id="dates.issuedOnDate"
              type="text"
              {...register("dates.issuedOnDate")}
              disabled={isSubmitting}
              placeholder="mm/dd/yyyy"
            />
          </div>
        </div>
      </section>

      {/* Contract Privacy Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          Privacy & Access
        </h2>

        <p className="text-sm text-foreground">
          Using the privacy setting allows only project admins and select
          non-admin users access.
        </p>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="privacy.isPrivate"
              checked={privacyIsPrivate}
              onCheckedChange={(checked) =>
                setValue("privacy.isPrivate", checked as boolean)
              }
              disabled={isSubmitting}
            />
            <Label htmlFor="privacy.isPrivate" className="text-sm font-normal">
              Private
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="privacy.nonAdminUserIds">
              Access for Non-Admin Users
            </Label>
            <Input
              id="privacy.nonAdminUserIds"
              disabled={isSubmitting || !privacyIsPrivate}
              placeholder={
                privacyIsPrivate
                  ? "Select users..."
                  : "Enable Private to use this field"
              }
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="privacy.allowNonAdminViewSovItems"
              checked={watch("privacy.allowNonAdminViewSovItems")}
              onCheckedChange={(checked) =>
                setValue(
                  "privacy.allowNonAdminViewSovItems",
                  checked as boolean,
                )
              }
              disabled={isSubmitting || !privacyIsPrivate}
            />
            <Label
              htmlFor="privacy.allowNonAdminViewSovItems"
              className="text-sm font-normal"
            >
              Allow these non-admin users to view the SOV items.
            </Label>
          </div>
        </div>
      </section>

      {/* Invoice Contacts Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          Invoice Contacts
        </h2>

        {!contractCompanyId ? (
          <p className="text-sm text-foreground">
            Please select a Contract Company first
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="invoiceContacts">Invoice Contacts</Label>
            <Input
              id="invoiceContacts"
              disabled={isSubmitting}
              placeholder="Select invoice contacts..."
            />
          </div>
        )}
      </section>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <p className="text-sm text-foreground">*Required fields</p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </div>
    </form>
  );
}
