"use client";

import * as React from "react";
import { useForm, useWatch, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  X,
  Plus,
  AlertCircle,
  Package,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  CreatePurchaseOrderSchema,
  type CreatePurchaseOrderInput,
  type PurchaseOrderSovLineItem,
} from "@/lib/schemas/create-purchase-order-schema";
import type { CompanyOption } from "@/hooks/use-companies";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RichTextField } from "@/components/forms/RichTextField";
import { BudgetCodeSelector } from "@/components/budget/budget-code-selector";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Form system
import {
  Form,
  FormSection,
  FormGrid,
  FormActions,
  RHFTextareaField,
  RHFSelectField,
  RHFNumberField,
  RHFCheckboxField,
  RHFDateField,
  RHFComboboxField,
} from "@/components/forms";
import { RHFTextField } from "@/components/forms/fields/RHFTextField";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FormServerError } from "@/components/forms/FormServerError";

interface CreatePurchaseOrderFormProps {
  projectId: number;
  onSubmit: (data: CreatePurchaseOrderInput) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreatePurchaseOrderInput> & {
    sovLines?: PurchaseOrderSovLineItem[];
  };
  mode?: "create" | "edit";
}

interface BudgetCode {
  id: string;
  code: string;
  costType: string | null;
  description: string;
  fullLabel: string;
}

interface BudgetCodesResponse {
  budgetCodes: BudgetCode[];
}

interface CostCodeOption {
  id: string;
  title: string | null;
  status: string | null;
  division_title: string | null;
}

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Approved", label: "Approved" },
  { value: "Sent", label: "Sent to Vendor" },
  { value: "Acknowledged", label: "Acknowledged" },
  { value: "Completed", label: "Completed" },
];

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
  initialData,
  mode = "create",
}: CreatePurchaseOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [sovLines, setSovLines] = React.useState<PurchaseOrderSovLineItem[]>(
    initialData?.sovLines || [],
  );
  const [accountingMethod, setAccountingMethod] = React.useState<
    "unit-quantity" | "amount"
  >((initialData?.accountingMethod as "unit-quantity" | "amount") || "unit-quantity");
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [budgetCodes, setBudgetCodes] = React.useState<BudgetCode[]>([]);
  const [budgetCodesLoaded, setBudgetCodesLoaded] = React.useState(false);
  const [budgetCodesError, setBudgetCodesError] = React.useState<string | null>(null);
  const [showCreateBudgetCodeModal, setShowCreateBudgetCodeModal] = React.useState(false);
  const [newBudgetCodeData, setNewBudgetCodeData] = React.useState({
    costCodeId: "",
    costType: "X",
  });
  const [availableCostCodes, setAvailableCostCodes] = React.useState<CostCodeOption[]>([]);
  const [loadingCostCodes, setLoadingCostCodes] = React.useState(false);
  const [groupedCostCodes, setGroupedCostCodes] = React.useState<
    Record<string, CostCodeOption[]>
  >({});
  const [expandedDivisions, setExpandedDivisions] = React.useState<Set<string>>(new Set());
  const [isCreatingBudgetCode, setIsCreatingBudgetCode] = React.useState(false);

  const [vendorOptions, setVendorOptions] = React.useState<CompanyOption[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = React.useState(true);

  React.useEffect(() => {
    const fetchVendors = async () => {
      try {
        setIsLoadingVendors(true);
        const response = await fetch(`/api/projects/${projectId}/vendors`);
        if (!response.ok) throw new Error("Failed to load vendors");
        const data = (await response.json()) as Array<{
          id: string;
          vendor_name: string;
        }>;
        setVendorOptions(
          (data || []).map((v) => ({ value: v.id, label: v.vendor_name })),
        );
      } catch {
        setVendorOptions([]);
      } finally {
        setIsLoadingVendors(false);
      }
    };
    fetchVendors();
  }, [projectId]);

  const form = useForm<CreatePurchaseOrderInput>({
    resolver: zodResolver(CreatePurchaseOrderSchema) as any,
    reValidateMode: "onBlur",
    defaultValues: {
      contractNumber: initialData?.contractNumber || "",
      status: initialData?.status || "Draft",
      executed: initialData?.executed || false,
      accountingMethod: initialData?.accountingMethod || "unit-quantity",
      sov: initialData?.sov || [],
      privacy: initialData?.privacy || {
        isPrivate: true,
        allowNonAdminViewSovItems: false,
      },
      title: initialData?.title || "",
      contractCompanyId: initialData?.contractCompanyId || "",
      description: initialData?.description || "",
      assignedTo: initialData?.assignedTo || "",
      billTo: initialData?.billTo || "",
      shipTo: initialData?.shipTo || "",
      shipVia: initialData?.shipVia || "",
      paymentTerms: initialData?.paymentTerms || "",
      dates: initialData?.dates || {},
    },
  });

  const { handleSubmit, formState: { errors }, setValue, setError, control } = form;

  const contractCompanyId = useWatch({ control, name: "contractCompanyId" });
  const privacyIsPrivate = useWatch({ control, name: "privacy.isPrivate" }) ?? true;
  const assignedToValue = useWatch({ control, name: "assignedTo" });
  const descriptionValue = useWatch({ control, name: "description" });

  React.useEffect(() => {
    let isMounted = true;
    const fetchBudgetCodes = async () => {
      try {
        setBudgetCodesError(null);
        const response = await fetch(`/api/projects/${projectId}/budget-codes`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || "Failed to load budget codes");
        }
        const data = (await response.json()) as BudgetCodesResponse;
        if (!isMounted) return;
        setBudgetCodes(data.budgetCodes || []);
      } catch (error) {
        if (!isMounted) return;
        setBudgetCodesError(
          error instanceof Error ? error.message : "Failed to load budget codes",
        );
        setBudgetCodes([]);
      } finally {
        if (isMounted) setBudgetCodesLoaded(true);
      }
    };
    fetchBudgetCodes();
    return () => { isMounted = false; };
  }, [projectId]);

  React.useEffect(() => {
    const fetchCostCodes = async () => {
      if (!showCreateBudgetCodeModal) return;
      try {
        setLoadingCostCodes(true);
        const supabaseClient = createClient();
        const { data, error } = await supabaseClient
          .from("cost_codes")
          .select("id, title, status, division_title")
          .eq("status", "Active")
          .order("id", { ascending: true });
        if (error) return;
        const costCodes = (data || []) as CostCodeOption[];
        setAvailableCostCodes(costCodes);
        const grouped = costCodes.reduce(
          (acc: Record<string, CostCodeOption[]>, code: CostCodeOption) => {
            const division = code.division_title || "Other";
            if (!acc[division]) acc[division] = [];
            acc[division].push(code);
            return acc;
          },
          {},
        );
        setGroupedCostCodes(grouped);
      } finally {
        setLoadingCostCodes(false);
      }
    };
    fetchCostCodes();
  }, [showCreateBudgetCodeModal]);

  const budgetCodeSet = React.useMemo(
    () => new Set(budgetCodes.map((code) => code.code)),
    [budgetCodes],
  );

  const unbudgetedLines = React.useMemo(() => {
    return sovLines
      .map((line, index) => ({ lineNumber: index + 1, code: line.budgetCode?.trim() ?? "" }))
      .filter(({ code }) => code.length > 0 && !budgetCodeSet.has(code));
  }, [sovLines, budgetCodeSet]);

  const getCostTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      R: "Contract Revenue",
      E: "Equipment",
      X: "Expense",
      L: "Labor",
      M: "Material",
      S: "Subcontract",
    };
    return types[type] || type;
  };

  const toggleDivision = (division: string) => {
    setExpandedDivisions((prev) => {
      const next = new Set(prev);
      if (next.has(division)) next.delete(division);
      else next.add(division);
      return next;
    });
  };

  const handleCreateBudgetCode = async () => {
    try {
      setIsCreatingBudgetCode(true);
      const selectedCostCode = availableCostCodes.find(
        (code) => code.id === newBudgetCodeData.costCodeId,
      );
      if (!selectedCostCode) {
        toast.error("Please select a cost code");
        return;
      }
      const response = await fetch(`/api/projects/${projectId}/budget-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cost_code_id: newBudgetCodeData.costCodeId,
          cost_type_id: newBudgetCodeData.costType,
          description: selectedCostCode.title || null,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "Failed to create budget code");
      }
      const { budgetCode } = (await response.json()) as { budgetCode: BudgetCode };
      setBudgetCodes((prev) => [...prev, budgetCode]);
      const firstEmptyLineIndex = sovLines.findIndex((line) => !line.budgetCode?.trim());
      if (firstEmptyLineIndex >= 0) {
        updateSOVLine(firstEmptyLineIndex, "budgetCode", budgetCode.code);
      } else {
        setSovLines((prev) => [
          ...prev,
          {
            lineNumber: prev.length + 1,
            budgetCode: budgetCode.code,
            description: "",
            quantity: 1,
            uom: "",
            unitCost: 0,
            amount: 0,
            billedToDate: 0,
          },
        ]);
      }
      setShowCreateBudgetCodeModal(false);
      setNewBudgetCodeData({ costCodeId: "", costType: "X" });
      toast.success("Budget code created and added to form");
    } catch (error) {
      toast.error(
        `Failed to create budget code: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsCreatingBudgetCode(false);
    }
  };

  const handleFormSubmit = async (data: CreatePurchaseOrderInput) => {
    setIsSubmitting(true);
    try {
      const submitData = { ...data, sov: sovLines, accountingMethod };
      await onSubmit(submitData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create purchase order";
      setError("root", { message });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSOVLine = () => {
    const newLine: PurchaseOrderSovLineItem & { _id: string } = {
      _id: `line-${Date.now()}-${Math.random()}`,
      lineNumber: sovLines.length + 1,
      quantity: 1,
      uom: "",
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
    if (field === "quantity" || field === "unitCost") {
      const qty = field === "quantity" ? (value as number) : updated[index].quantity || 0;
      const cost = field === "unitCost" ? (value as number) : updated[index].unitCost || 0;
      updated[index].amount = qty * cost;
    }
    setSovLines(updated);
  };

  const removeSOVLine = (index: number) => {
    setSovLines(sovLines.filter((_, i) => i !== index));
  };

  const calculateSOVTotals = () => {
    const totals = sovLines.reduce(
      (acc, line) => ({
        amount: acc.amount + (line.amount || 0),
        billedToDate: acc.billedToDate + (line.billedToDate || 0),
      }),
      { amount: 0, billedToDate: 0 },
    );
    return { ...totals, amountRemaining: totals.amount - totals.billedToDate };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) setAttachments((prev) => [...prev, ...Array.from(files)]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files) setAttachments((prev) => [...prev, ...Array.from(files)]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const totals = calculateSOVTotals();

  return (
    <FormProvider {...form}>
    <Form onSubmit={handleSubmit(handleFormSubmit)}>

      {/* General Information */}
      <FormSection
        title="General Information"
        description="Define the purchase order identity, vendor, and commercial terms."
      >
        <FormGrid columns={2}>
          <FormField
            control={control}
            name="contractNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contract #</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="e.g., PO-001"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={isSubmitting}
                    onClick={() =>
                      setValue("contractNumber", `PO-${Date.now()}`, {
                        shouldValidate: true,
                      })
                    }
                  >
                    Generate
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <RHFComboboxField
            control={control}
            name="contractCompanyId"
            label="Contract Company"
            options={vendorOptions}
            placeholder={isLoadingVendors ? "Loading vendors..." : "Search vendors..."}
            searchPlaceholder="Type vendor name..."
            emptyMessage="No vendors found."
            disabled={isSubmitting || isLoadingVendors}
          />

          <RHFTextField
            control={control}
            name="title"
            label="Title"
            placeholder="Enter purchase order title"
            disabled={isSubmitting}
          />

          <RHFSelectField
            control={control}
            name="status"
            label="Status"
            options={STATUS_OPTIONS}
            disabled={isSubmitting}
          />
        </FormGrid>

        <FormGrid columns={2}>
          <RHFCheckboxField
            control={control}
            name="executed"
            label="Executed"
            disabled={isSubmitting}
          />

          <RHFNumberField
            control={control}
            name="defaultRetainagePercent"
            label="Default Retainage (%)"
            step={0.01}
            min={0}
            max={100}
            disabled={isSubmitting}
          />
        </FormGrid>

        {/* Assigned To — placeholder until users are loaded from DB */}
        <div className="flex w-full flex-col gap-2">
          <Label htmlFor="assignedTo">Assigned To</Label>
          <Select
            value={assignedToValue || ""}
            onValueChange={(value) => setValue("assignedTo", value)}
            disabled={isSubmitting}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select person" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user1">John Doe</SelectItem>
              <SelectItem value="user2">Jane Smith</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <FormGrid columns={2}>
          <RHFTextareaField
            control={control}
            name="billTo"
            label="Bill To"
            placeholder="Billing address..."
            rows={4}
            disabled={isSubmitting}
          />
          <RHFTextareaField
            control={control}
            name="shipTo"
            label="Ship To"
            placeholder="Shipping address..."
            rows={4}
            disabled={isSubmitting}
          />
        </FormGrid>

        <FormGrid columns={2}>
          <RHFTextField
            control={control}
            name="paymentTerms"
            label="Payment Terms"
            placeholder="e.g., Net 30"
            disabled={isSubmitting}
          />
          <RHFTextField
            control={control}
            name="shipVia"
            label="Ship Via"
            placeholder="Shipping method"
            disabled={isSubmitting}
          />
        </FormGrid>

        <RichTextField
          label="Description"
          value={descriptionValue}
          onChange={(val) => setValue("description", val, { shouldDirty: true })}
          disabled={isSubmitting}
          placeholder="Purchase order description..."
        />
      </FormSection>

      {/* Attachments */}
      <FormSection
        title="Attachments"
        description="Upload source documents, drawings, and supporting files."
      >
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
          <div className="flex flex-col items-center gap-4">
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

        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
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
      </FormSection>

      {/* Schedule of Values */}
      <FormSection
        title="Schedule of Values"
        description="Build line items and totals that define the PO financial breakdown."
      >
        {/* Accounting Method */}
        <p className="text-sm text-muted-foreground">
          This purchase order&apos;s accounting method is{" "}
          <strong>{accountingMethod === "unit-quantity" ? "unit/quantity" : "amount-based"}</strong>.{" "}
          <button
            type="button"
            className="underline hover:text-foreground transition-colors"
            disabled={isSubmitting}
            onClick={() =>
              setAccountingMethod(accountingMethod === "unit-quantity" ? "amount" : "unit-quantity")
            }
          >
            Change to {accountingMethod === "unit-quantity" ? "Amount-based" : "Unit/Quantity"}
          </button>
        </p>

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
              {unbudgetedLines.map((line) => `${line.lineNumber} (${line.code})`).join(", ")}{" "}
              are not on the project budget. Add them to the budget or update these line items
              before approval.
            </AlertDescription>
          </Alert>
        )}

        {/* SOV Table — always shown */}
        <div className="overflow-x-auto rounded-lg border border-border/70 bg-muted/20">
          <table className="min-w-max w-max text-sm">
            <thead>
              <tr className="bg-muted/70 hover:bg-muted/70">
                <th className="w-12 px-2 py-1.5 text-left text-[11px] font-normal tracking-normal text-muted-foreground">#</th>
                <th className="min-w-60 px-2 py-1.5 text-left text-[11px] font-normal tracking-normal text-muted-foreground">Budget Code</th>
                <th className="min-w-80 px-2 py-1.5 text-left text-[11px] font-normal tracking-normal text-muted-foreground">Description</th>
                {accountingMethod === "unit-quantity" && (
                  <>
                    <th className="min-w-32 px-2 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">Qty</th>
                    <th className="min-w-36 px-2 py-1.5 text-left text-[11px] font-normal tracking-normal text-muted-foreground">UOM</th>
                    <th className="min-w-44 px-2 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">Unit Cost</th>
                  </>
                )}
                <th className="min-w-44 px-2 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">Amount</th>
                <th className="min-w-44 px-2 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">Billed to Date</th>
                <th className="min-w-44 px-2 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">Amount Remaining</th>
                <th className="w-12 px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {sovLines.map((line, index) => (
                <tr
                  key={
                    (line as PurchaseOrderSovLineItem & { _id?: string })._id ||
                    `line-${index}`
                  }
                  className="group border-b border-border/60 bg-background transition-colors hover:bg-muted/20"
                >
                  <td className="px-2 py-1.5 text-sm text-muted-foreground">{index + 1}</td>
                  <td className="min-w-60 px-2 py-1.5">
                    <BudgetCodeSelector
                      value={
                        budgetCodes.find(
                          (code) => code.code === (line.budgetCode || ""),
                        )?.id || ""
                      }
                      onValueChange={(_, code) =>
                        updateSOVLine(index, "budgetCode", code.code)
                      }
                      budgetCodes={budgetCodes}
                      loading={!budgetCodesLoaded}
                      onCreateNew={() => setShowCreateBudgetCodeModal(true)}
                      placeholder="Select budget code..."
                      className="h-10"
                    />
                  </td>
                  <td className="min-w-80 px-2 py-1.5">
                    <Input
                      placeholder="Description"
                      value={line.description || ""}
                      onChange={(e) =>
                        updateSOVLine(index, "description", e.target.value)
                      }
                      className="h-10 min-w-72"
                    />
                  </td>
                  {accountingMethod === "unit-quantity" && (
                    <>
                      <td className="min-w-32 px-2 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="1"
                          value={line.quantity ?? 1}
                          onChange={(e) =>
                            updateSOVLine(index, "quantity", parseFloat(e.target.value) || 0)
                          }
                          className="h-10 min-w-24 text-right"
                        />
                      </td>
                      <td className="min-w-36 px-2 py-1.5">
                        <Select
                          value={line.uom || undefined}
                          onValueChange={(value) => updateSOVLine(index, "uom", value)}
                        >
                          <SelectTrigger className="h-10">
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
                      <td className="min-w-44 px-2 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="$0.00"
                          value={line.unitCost || 0}
                          onChange={(e) =>
                            updateSOVLine(index, "unitCost", parseFloat(e.target.value) || 0)
                          }
                          className="h-10 min-w-36 text-right"
                        />
                      </td>
                    </>
                  )}
                  <td className="min-w-44 px-2 py-1.5 text-right text-sm whitespace-nowrap">
                    {formatCurrency(line.amount || 0)}
                  </td>
                  <td className="min-w-44 px-2 py-1.5 text-right text-sm whitespace-nowrap">
                    {formatCurrency(line.billedToDate || 0)}
                  </td>
                  <td className="min-w-44 px-2 py-1.5 text-right text-sm whitespace-nowrap">
                    {formatCurrency((line.amount || 0) - (line.billedToDate || 0))}
                  </td>
                  <td className="px-2 py-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSOVLine(index)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-2 py-2" />
                <td
                  colSpan={accountingMethod === "unit-quantity" ? 5 : 2}
                  className="px-2 py-3 text-xs font-semibold text-foreground"
                >
                  Totals
                </td>
                <td className="px-2 py-2 text-right text-sm font-semibold text-foreground whitespace-nowrap">
                  {formatCurrency(totals.amount)}
                </td>
                <td className="px-2 py-2 text-right text-sm font-semibold text-foreground whitespace-nowrap">
                  {formatCurrency(totals.billedToDate)}
                </td>
                <td className="px-2 py-2 text-right text-sm font-semibold text-foreground whitespace-nowrap">
                  {formatCurrency(totals.amountRemaining)}
                </td>
                <td className="px-2 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            onClick={addSOVLine}
            disabled={isSubmitting}
            className="h-10 gap-2 px-4"
          >
            <Plus className="h-4 w-4" />
            Add Line Item
          </Button>
          <Select
            onValueChange={(value) => {
              if (value === "csv") {
                // CSV import placeholder
              }
            }}
          >
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Import" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FormSection>

      {/* Contract Dates */}
      <FormSection
        title="Contract Dates"
        description="Capture timing milestones used for procurement and tracking."
      >
        <FormGrid columns={2}>
          <RHFDateField
            control={control}
            name="dates.contractDate"
            label="Contract Date"
            nullable
          />
          <RHFDateField
            control={control}
            name="dates.deliveryDate"
            label="Delivery Date"
            nullable
          />
          <RHFDateField
            control={control}
            name="dates.signedPoReceivedDate"
            label="Signed PO Received Date"
            nullable
          />
          <RHFDateField
            control={control}
            name="dates.issuedOnDate"
            label="Issued On Date"
            nullable
          />
        </FormGrid>
      </FormSection>

      {/* Privacy & Access */}
      <FormSection
        title="Privacy & Access"
        description="Control which non-admin users can access this commitment. Using the privacy setting allows only project admins and select non-admin users access."
      >
        <RHFCheckboxField
          control={control}
          name="privacy.isPrivate"
          label="Private"
          disabled={isSubmitting}
        />

        <div className="flex w-full flex-col gap-2">
          <Label htmlFor="privacy.nonAdminUserIds">Access for Non-Admin Users</Label>
          <Input
            id="privacy.nonAdminUserIds"
            className="w-full"
            disabled={isSubmitting || !privacyIsPrivate}
            placeholder={
              privacyIsPrivate ? "Select users..." : "Enable Private to use this field"
            }
          />
        </div>

        <RHFCheckboxField
          control={control}
          name="privacy.allowNonAdminViewSovItems"
          label="Allow these non-admin users to view the SOV items."
          disabled={isSubmitting || !privacyIsPrivate}
        />
      </FormSection>

      {/* Invoice Contacts */}
      <FormSection
        title="Invoice Contacts"
        description="Define who can submit and manage invoice communication."
      >
        {!contractCompanyId ? (
          <p className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
            Select a contract company to enable invoice contacts.
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
      </FormSection>

      <FormServerError message={errors.root?.message} />

      <FormActions
        submitLabel="Create Purchase Order"
        onCancel={onCancel}
        isSubmitting={isSubmitting}
      >
        <p className="text-sm text-muted-foreground">
          <span className="text-destructive">*</span> Required fields
        </p>
      </FormActions>

      {/* Create Budget Code Modal */}
      <Dialog open={showCreateBudgetCodeModal} onOpenChange={setShowCreateBudgetCodeModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Budget Code</DialogTitle>
            <DialogDescription>
              Add a budget code and assign it directly to this commitment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="costCode">Cost Code*</Label>
              {loadingCostCodes ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                  Loading cost codes...
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto rounded-md border">
                  {Object.entries(groupedCostCodes)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([division]) => (
                      <div key={division} className="border-b last:border-b-0">
                        <button
                          type="button"
                          onClick={() => toggleDivision(division)}
                          className="flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-muted"
                        >
                          <span className="text-sm font-semibold text-foreground">{division}</span>
                          {expandedDivisions.has(division) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        {expandedDivisions.has(division) && (
                          <div className="bg-muted/50">
                            {groupedCostCodes[division].map((costCode) => (
                              <button
                                key={costCode.id}
                                type="button"
                                onClick={() =>
                                  setNewBudgetCodeData((prev) => ({
                                    ...prev,
                                    costCodeId: costCode.id,
                                  }))
                                }
                                className={`w-full px-6 py-2 text-left text-sm transition-colors hover:bg-muted ${
                                  newBudgetCodeData.costCodeId === costCode.id
                                    ? "bg-primary/10 font-medium text-primary"
                                    : "text-foreground"
                                }`}
                              >
                                {costCode.division_title || costCode.id} - {costCode.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Select a division and choose a cost code.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="costType">Cost Type*</Label>
              <Select
                value={newBudgetCodeData.costType}
                onValueChange={(value) =>
                  setNewBudgetCodeData((prev) => ({ ...prev, costType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="R">R - Contract Revenue</SelectItem>
                  <SelectItem value="E">E - Equipment</SelectItem>
                  <SelectItem value="X">X - Expense</SelectItem>
                  <SelectItem value="L">L - Labor</SelectItem>
                  <SelectItem value="M">M - Material</SelectItem>
                  <SelectItem value="S">S - Subcontract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium text-foreground">Preview:</p>
              <p className="mt-1 text-sm text-foreground">
                {newBudgetCodeData.costCodeId ? (
                  <>
                    {availableCostCodes.find((code) => code.id === newBudgetCodeData.costCodeId)
                      ?.division_title ||
                      availableCostCodes.find((code) => code.id === newBudgetCodeData.costCodeId)
                        ?.id}
                    .{newBudgetCodeData.costType} -{" "}
                    {
                      availableCostCodes.find((code) => code.id === newBudgetCodeData.costCodeId)
                        ?.title
                    }{" "}
                    - {getCostTypeLabel(newBudgetCodeData.costType)}
                  </>
                ) : (
                  "Select cost code and cost type to preview the budget code."
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateBudgetCodeModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateBudgetCode}
              disabled={
                isCreatingBudgetCode || !newBudgetCodeData.costCodeId || !newBudgetCodeData.costType
              }
            >
              {isCreatingBudgetCode ? "Creating..." : "Create Budget Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
    </FormProvider>
  );
}
