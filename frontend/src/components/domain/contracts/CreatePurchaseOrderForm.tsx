"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
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
import {
  Upload,
  X,
  Plus,
  Loader2,
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
import { useCompanies } from "@/hooks/use-companies";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RichTextField } from "@/components/forms/RichTextField";
import { FormActions } from "@/components/forms/FormActions";
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

interface FormSectionHeadingProps {
  title: string;
  description?: string;
}

function FormSectionHeading({ title, description }: FormSectionHeadingProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      {description ? (
        <p className="text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
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
  initialData,
  mode = "create",
}: CreatePurchaseOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [sovLines, setSovLines] = React.useState<PurchaseOrderSovLineItem[]>(
    initialData?.sovLines || [],
  );
  const [accountingMethod, setAccountingMethod] = React.useState<
    "unit-quantity" | "amount"
  >((initialData?.accountingMethod as any) || "unit-quantity");
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [budgetCodes, setBudgetCodes] = React.useState<BudgetCode[]>([]);
  const [budgetCodesLoaded, setBudgetCodesLoaded] = React.useState(false);
  const [budgetCodesError, setBudgetCodesError] = React.useState<string | null>(
    null,
  );
  const [showCreateBudgetCodeModal, setShowCreateBudgetCodeModal] =
    React.useState(false);
  const [newBudgetCodeData, setNewBudgetCodeData] = React.useState({
    costCodeId: "",
    costType: "X",
  });
  const [availableCostCodes, setAvailableCostCodes] = React.useState<
    CostCodeOption[]
  >([]);
  const [loadingCostCodes, setLoadingCostCodes] = React.useState(false);
  const [groupedCostCodes, setGroupedCostCodes] = React.useState<
    Record<string, CostCodeOption[]>
  >({});
  const [expandedDivisions, setExpandedDivisions] = React.useState<Set<string>>(
    new Set(),
  );
  const [isCreatingBudgetCode, setIsCreatingBudgetCode] = React.useState(false);

  // Use the companies hook - returns { value: uuid, label: name } options
  const { options: companyOptions, isLoading: isLoadingCompanies } =
    useCompanies();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    control,
  } = useForm<CreatePurchaseOrderInput>({
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

  const contractCompanyId = useWatch({ control, name: "contractCompanyId" });
  const privacyIsPrivate = useWatch({ control, name: "privacy.isPrivate" }) ?? true;
  const statusValue = useWatch({ control, name: "status" });
  const executedValue = useWatch({ control, name: "executed" });
  const assignedToValue = useWatch({ control, name: "assignedTo" });
  const descriptionValue = useWatch({ control, name: "description" });
  const allowNonAdminViewSov = useWatch({ control, name: "privacy.allowNonAdminViewSovItems" });

  React.useEffect(() => {
    let isMounted = true;
    const fetchBudgetCodes = async () => {
      try {
        setBudgetCodesError(null);
        const response = await fetch(`/api/projects/${projectId}/budget-codes`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error || "Failed to load budget codes");
        }

        const data = (await response.json()) as BudgetCodesResponse;
        if (!isMounted) return;
        setBudgetCodes(data.budgetCodes || []);
      } catch (error) {
        if (!isMounted) return;
        setBudgetCodesError(
          error instanceof Error
            ? error.message
            : "Failed to load budget codes",
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
            if (!acc[division]) {
              acc[division] = [];
            }
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

  const budgetCodeSet = React.useMemo(() => {
    return new Set(budgetCodes.map((code) => code.code));
  }, [budgetCodes]);

  const unbudgetedLines = React.useMemo(() => {
    return sovLines
      .map((line, index) => ({
        lineNumber: index + 1,
        code: line.budgetCode?.trim() ?? "",
      }))
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
      if (next.has(division)) {
        next.delete(division);
      } else {
        next.add(division);
      }
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

      const { budgetCode } = (await response.json()) as {
        budgetCode: BudgetCode;
      };

      setBudgetCodes((prev) => [...prev, budgetCode]);

      const firstEmptyLineIndex = sovLines.findIndex(
        (line) => !line.budgetCode?.trim(),
      );

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
    <form
      onSubmit={handleSubmit(handleFormSubmitWrapper)}
      className="space-y-8"
    >
      <div className="space-y-8">
        {/* General Information Section */}
        <section className="space-y-6 border-b border-border/70 pb-8">
          <FormSectionHeading
            title="General Information"
            description="Define the purchase order identity, vendor, and commercial terms."
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contractNumber">
                Contract # <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contractNumber"
                {...register("contractNumber")}
                disabled={isSubmitting}
              />
              {errors.contractNumber && (
                <p className="text-sm text-destructive">
                  {errors.contractNumber.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractCompanyId">
                Contract Company <span className="text-destructive">*</span>
              </Label>
              <Select
                value={contractCompanyId || ""}
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
              {errors.contractCompanyId && (
                <p className="text-sm text-destructive">
                  {errors.contractCompanyId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                {...register("title")}
                disabled={isSubmitting}
                placeholder="Enter purchase order title"
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={statusValue}
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
                <p className="text-sm text-destructive">
                  {errors.status.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">

            <div className="space-y-2">
              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="executed"
                  checked={executedValue}
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
              value={assignedToValue || ""}
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

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
            <div className="space-y-2">
              <Label htmlFor="billTo">Bill To</Label>
              <Textarea
                id="billTo"
                {...register("billTo")}
                disabled={isSubmitting}
                rows={4}
                placeholder="Billing address..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipTo">Ship To</Label>
              <Textarea
                id="shipTo"
                {...register("shipTo")}
                disabled={isSubmitting}
                rows={4}
                placeholder="Shipping address..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
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

          <RichTextField
            label="Description"
            value={descriptionValue}
            onChange={(val) =>
              setValue("description", val, { shouldDirty: true })
            }
            disabled={isSubmitting}
            placeholder="Purchase order description..."
          />
        </section>

        {/* Attachments Section */}
        <section className="space-y-6 border-b border-border/70 pb-8">
          <FormSectionHeading
            title="Attachments"
            description="Upload source documents, drawings, and supporting files."
          />

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

          {/* Display attached files */}
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
        </section>

        {/* Schedule of Values Section */}
        <section className="space-y-6 border-b border-border/70 pb-8">
          <FormSectionHeading
            title="Schedule of Values"
            description="Build line items and totals that define the PO financial breakdown."
          />

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
                  <Package className="h-10 w-10" />
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
                      <th className="px-4 py-2 text-left text-xs font-medium text-foreground w-12">
                        #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-foreground">
                        Change Event
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-foreground">
                        Budget Code
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-foreground">
                        Description
                      </th>
                      {accountingMethod === "unit-quantity" && (
                        <>
                          <th className="px-4 py-2 text-right text-xs font-medium text-foreground">
                            Qty
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-foreground">
                            UOM
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-foreground">
                            Unit Cost
                          </th>
                        </>
                      )}
                      <th className="px-4 py-2 text-right text-xs font-medium text-foreground">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-foreground">
                        Billed to Date
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-foreground">
                        Amount Remaining
                      </th>
                      <th className="px-4 py-2 w-12" aria-label="Actions"></th>
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
                        <td className="px-4 py-2 text-sm">{index + 1}</td>
                        <td className="px-4 py-2">
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
                        <td className="px-4 py-2">
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
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            className="text-sm"
                            placeholder="Description"
                            value={line.description || ""}
                            onChange={(e) =>
                              updateSOVLine(
                                index,
                                "description",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        {accountingMethod === "unit-quantity" && (
                          <>
                            <td className="px-4 py-2">
                              <Input
                                className="text-sm text-right"
                                type="number"
                                step="0.01"
                                placeholder="1"
                                value={line.quantity ?? 1}
                                onChange={(e) =>
                                  updateSOVLine(
                                    index,
                                    "quantity",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Select
                                value={line.uom || undefined}
                                onValueChange={(value) =>
                                  updateSOVLine(index, "uom", value)
                                }
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Select UOM" />
                                </SelectTrigger>
                                <SelectContent>
                                  {UNIT_OF_MEASURES.map((uom) => (
                                    <SelectItem
                                      key={uom.value}
                                      value={uom.value}
                                    >
                                      {uom.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-2">
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
                        <td className="px-4 py-2 text-sm text-right">
                          ${(line.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          ${(line.billedToDate || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          $
                          {(
                            (line.amount || 0) - (line.billedToDate || 0)
                          ).toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
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
                        className="px-4 py-2 text-sm"
                      >
                        Total:
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        ${totals.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        ${totals.billedToDate.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
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
        <section className="space-y-6 border-b border-border/70 pb-8">
          <FormSectionHeading
            title="Contract Dates"
            description="Capture timing milestones used for procurement and tracking."
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
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
        <section className="space-y-6 border-b border-border/70 pb-8">
          <FormSectionHeading
            title="Privacy & Access"
            description="Control which non-admin users can access this commitment."
          />

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
              <Label
                htmlFor="privacy.isPrivate"
                className="text-sm font-normal"
              >
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
                checked={allowNonAdminViewSov}
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
        <section className="space-y-6">
          <FormSectionHeading
            title="Invoice Contacts"
            description="Define who can submit and manage invoice communication."
          />

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
        </section>

        <FormActions
          submitLabel="Create Purchase Order"
          onCancel={onCancel}
          isSubmitting={isSubmitting}
        >
          <p className="text-sm text-muted-foreground">
            <span className="text-destructive">*</span> Required fields
          </p>
        </FormActions>
      </div>

      <Dialog
        open={showCreateBudgetCodeModal}
        onOpenChange={setShowCreateBudgetCodeModal}
      >
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
                          <span className="text-sm font-semibold text-foreground">
                            {division}
                          </span>
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
                                    ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                    : "text-foreground"
                                }`}
                              >
                                {costCode.division_title || costCode.id} -{" "}
                                {costCode.title}
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
                  setNewBudgetCodeData((prev) => ({
                    ...prev,
                    costType: value,
                  }))
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
                    {availableCostCodes.find(
                      (code) => code.id === newBudgetCodeData.costCodeId,
                    )?.division_title ||
                      availableCostCodes.find(
                        (code) => code.id === newBudgetCodeData.costCodeId,
                      )?.id}
                    .{newBudgetCodeData.costType} -{" "}
                    {
                      availableCostCodes.find(
                        (code) => code.id === newBudgetCodeData.costCodeId,
                      )?.title
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
                isCreatingBudgetCode ||
                !newBudgetCodeData.costCodeId ||
                !newBudgetCodeData.costType
              }
            >
              {isCreatingBudgetCode ? "Creating..." : "Create Budget Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
