"use client";

import * as React from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  AlertCircle,
  Loader2,
  Search,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Wand2,
} from "lucide-react";
import {
  CreateSubcontractSchema,
  type CreateSubcontractInput,
  type SovLineItem,
  CommitmentStatusValues,
  AccountingMethodValues,
} from "@/lib/schemas/create-subcontract-schema";
import { Textarea } from "@/components/ui/textarea";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { DateField } from "@/components/forms/DateField";
import { MultiSelectField } from "@/components/forms/MultiSelectField";
import { BudgetCodeSelector } from "@/components/budget/budget-code-selector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProjectUsers } from "@/hooks/use-project-users";
import { useCompanyContacts } from "@/hooks/use-company-contacts";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BudgetCode {
  id: string;
  code: string;
  costType: string | null;
  description: string;
  fullLabel: string;
}

interface VendorOption {
  value: string;
  label: string;
  companyId: string | null;
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


interface CreateSubcontractFormProps {
  projectId: number;
  onSubmit: (data: CreateSubcontractInput) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateSubcontractInput> & {
    sovLines?: SovLineItem[];
  };
  mode?: "create" | "edit";
}

interface SortableSovRowProps {
  id: string;
  className: string;
  children: (handle: {
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
  }) => React.ReactNode;
}

function SortableSovRow({ id, className, children }: SortableSovRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`${className} ${isDragging ? "opacity-60" : ""}`}
    >
      {children({ attributes, listeners })}
    </tr>
  );
}

export function CreateSubcontractForm({
  projectId,
  onSubmit,
  onCancel,
  initialData,
  mode = "create",
}: CreateSubcontractFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [errorDetails, setErrorDetails] = React.useState<unknown>(null);
  const [sovLines, setSovLines] = React.useState<SovLineItem[]>(
    initialData?.sovLines || [],
  );
  const [attachments, setAttachments] = React.useState<
    Array<{ name: string; size: number; type: string }>
  >([]);

  // Budget code state (matching prime contracts pattern)
  const [budgetCodes, setBudgetCodes] = React.useState<BudgetCode[]>([]);
  const [loadingBudgetCodes, setLoadingBudgetCodes] = React.useState(true);
  const [showCreateBudgetCodeModal, setShowCreateBudgetCodeModal] =
    React.useState(false);
  const [newBudgetCodeData, setNewBudgetCodeData] = React.useState({
    costCodeId: "",
    costType: "S", // Default to Subcontract for commitments
  });
  const [availableCostCodes, setAvailableCostCodes] = React.useState<
    Array<{
      id: string;
      title: string | null;
      status: string | null;
      division_title: string | null;
    }>
  >([]);
  const [loadingCostCodes, setLoadingCostCodes] = React.useState(false);
  const [expandedDivisions, setExpandedDivisions] = React.useState<Set<string>>(
    new Set(),
  );
  const [groupedCostCodes, setGroupedCostCodes] = React.useState<
    Record<
      string,
      Array<{
        id: string;
        title: string | null;
        status: string | null;
        division_title: string | null;
      }>
    >
  >({});
  const [isCreatingBudgetCode, setIsCreatingBudgetCode] = React.useState(false);
  const [isAutoFilling, setIsAutoFilling] = React.useState(false);
  const [openContractCompanyPopover, setOpenContractCompanyPopover] =
    React.useState(false);
  const [vendorOptions, setVendorOptions] = React.useState<VendorOption[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = React.useState(true);

  // Fetch vendors for vendor selection
  React.useEffect(() => {
    const fetchVendors = async () => {
      try {
        setIsLoadingVendors(true);
        const response = await fetch(`/api/projects/${projectId}/vendors`);
        if (!response.ok) {
          throw new Error("Failed to load vendors");
        }
        const data = (await response.json()) as Array<{
          id: string;
          vendor_name: string;
          company_id?: string | null;
        }>;
        setVendorOptions(
          (data || []).map((vendor) => ({
            value: vendor.id,
            label: vendor.vendor_name,
            companyId: vendor.company_id ?? null,
          })),
        );
      } catch {
        setVendorOptions([]);
      } finally {
        setIsLoadingVendors(false);
      }
    };

    fetchVendors();
  }, [projectId]);

  // Use project users hook for non-admin user selection
  const { users: projectUsers, isLoading: isLoadingUsers } = useProjectUsers(
    String(projectId),
  );

  // Transform project users to options for multi-select
  const userOptions = React.useMemo(() => {
    return projectUsers.map((user) => ({
      value: user.id,
      label:
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        user.email ||
        "Unknown User",
    }));
  }, [projectUsers]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    control,
  } = useForm<CreateSubcontractInput>({
    resolver: zodResolver(CreateSubcontractSchema) as never,
    reValidateMode: "onBlur",
    defaultValues: {
      contractNumber: initialData?.contractNumber || "",
      status: initialData?.status || "Draft",
      executed: initialData?.executed ?? false,
      accountingMethod: initialData?.accountingMethod || "amount_based",
      sov: initialData?.sov || [],
      privacy: initialData?.privacy || {
        isPrivate: true,
        nonAdminUserIds: [],
        allowNonAdminViewSovItems: false,
      },
      title: initialData?.title || "",
      contractCompanyId: initialData?.contractCompanyId || "",
      description: initialData?.description || "",
      inclusions: initialData?.inclusions || "",
      exclusions: initialData?.exclusions || "",
      defaultRetainagePercent: initialData?.defaultRetainagePercent,
      dates: initialData?.dates || {
        startDate: undefined,
        estimatedCompletionDate: undefined,
        actualCompletionDate: undefined,
        contractDate: undefined,
        signedContractReceivedDate: undefined,
        issuedOnDate: undefined,
      },
      invoiceContactIds: initialData?.invoiceContactIds || [],
      attachments: [],
    },
  });
  const showAutoFill = process.env.NODE_ENV === "development";

  const contractCompanyId = useWatch({ control, name: "contractCompanyId" });
  const privacyIsPrivate = useWatch({ control, name: "privacy.isPrivate" }) ?? true;
  const accountingMethod = useWatch({ control, name: "accountingMethod" });
  const statusValue = useWatch({ control, name: "status" });
  const executedValue = useWatch({ control, name: "executed" });
  const selectedVendor = React.useMemo(
    () => vendorOptions.find((option) => option.value === contractCompanyId),
    [vendorOptions, contractCompanyId],
  );
  const selectedVendorCompanyId = React.useMemo(
    () => selectedVendor?.companyId ?? null,
    [selectedVendor],
  );

  // Fetch company contacts from selected vendor's linked company
  const { options: invoiceContactOptions, isLoading: isLoadingContacts } =
    useCompanyContacts({
      companyId: selectedVendorCompanyId ?? undefined,
      enabled: !!selectedVendorCompanyId,
    });

  // Clear invoice contacts when company changes
  React.useEffect(() => {
    if (!contractCompanyId) {
      setValue("invoiceContactIds", []);
    }
  }, [contractCompanyId, setValue]);

  // Fetch budget codes for the project
  React.useEffect(() => {
    const fetchBudgetCodes = async () => {
      if (!projectId) return;
      try {
        setLoadingBudgetCodes(true);
        const response = await fetch(`/api/projects/${projectId}/budget-codes`);
        if (!response.ok) {
          throw new Error("Failed to load budget codes");
        }
        const data = (await response.json()) as { budgetCodes: BudgetCode[] };
        setBudgetCodes(data.budgetCodes || []);
      } catch {
        setBudgetCodes([]);
      } finally {
        setLoadingBudgetCodes(false);
      }
    };
    fetchBudgetCodes();
  }, [projectId]);

  // Fetch cost codes when create budget code modal opens
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

        const codes = data || [];
        setAvailableCostCodes(codes);

        const grouped = codes.reduce(
          (acc: Record<string, typeof codes>, code: (typeof codes)[0]) => {
            const divisionKey = code.division_title || "Other";
            if (!acc[divisionKey]) acc[divisionKey] = [];
            acc[divisionKey].push(code);
            return acc;
          },
          {} as Record<string, typeof codes>,
        );
        setGroupedCostCodes(grouped);
      } catch {
        // Intentionally swallowed: component shows appropriate state on error
      } finally {
        setLoadingCostCodes(false);
      }
    };
    fetchCostCodes();
  }, [showCreateBudgetCodeModal]);

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

  const handleBudgetCodeSelect = (lineIndex: number, code: BudgetCode) => {
    const updated = [...sovLines];
    updated[lineIndex] = {
      ...updated[lineIndex],
      budgetCodeId: code.id,
      budgetCodeLabel: code.fullLabel,
      budgetCode: code.code,
    };
    setSovLines(updated);
  };

  const handleCreateBudgetCode = async () => {
    try {
      setIsCreatingBudgetCode(true);
      const selectedCostCode = availableCostCodes.find(
        (cc) => cc.id === newBudgetCodeData.costCodeId,
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
        const error = await response.json();
        throw new Error(error?.error || "Failed to create budget code");
      }

      const { budgetCode } = (await response.json()) as {
        budgetCode: BudgetCode;
      };
      setBudgetCodes([...budgetCodes, budgetCode]);

      // Find first empty budget code row and assign
      const emptyIndex = sovLines.findIndex(
        (line) => !line.budgetCodeId && !line.isGroup,
      );
      if (emptyIndex >= 0) {
        const updated = [...sovLines];
        updated[emptyIndex] = {
          ...updated[emptyIndex],
          budgetCodeId: budgetCode.id,
          budgetCodeLabel: budgetCode.fullLabel,
          budgetCode: budgetCode.code,
        };
        setSovLines(updated);
      } else {
        // Add a new line with the budget code
        const isUnitQuantity = accountingMethod === "unit_quantity";
        setSovLines([
          ...sovLines,
          {
            lineNumber: sovLines.length + 1,
            budgetCodeId: budgetCode.id,
            budgetCodeLabel: budgetCode.fullLabel,
            budgetCode: budgetCode.code,
            description: "",
            amount: 0,
            quantity: isUnitQuantity ? 1 : undefined,
            unitCost: isUnitQuantity ? 0 : undefined,
            unitOfMeasure: isUnitQuantity ? "" : undefined,
            billedToDate: 0,
          } as SovLineItem,
        ]);
      }

      setShowCreateBudgetCodeModal(false);
      setNewBudgetCodeData({ costCodeId: "", costType: "S" });
      toast.success("Budget code created and added to form");
    } catch (error) {
      toast.error(
        `Failed to create budget code: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsCreatingBudgetCode(false);
    }
  };

  const handleFormSubmit = async (data: CreateSubcontractInput) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setErrorDetails(null);
    try {
      // Add SOV lines to submission data
      const submitData = {
        ...data,
        sov: sovLines,
      };

      await onSubmit(submitData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setSubmitError(errorMessage);
      setErrorDetails(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevAutoFill = () => {
    setIsAutoFilling(true);
    try {
      const now = Date.now();
      const defaultCompanyId = vendorOptions[0]?.value || "";

      setValue("title", `Autofilled subcontract ${now}`, {
        shouldValidate: true,
      });
      setValue("contractNumber", `SC-${now}`, { shouldValidate: true });
      setValue("status", "Draft", { shouldValidate: true });
      setValue("description", "Autofilled subcontract for form verification.", {
        shouldValidate: true,
      });
      if (defaultCompanyId) {
        setValue("contractCompanyId", defaultCompanyId, { shouldValidate: true });
      }
    } finally {
      setIsAutoFilling(false);
    }
  };

  const csvInputRef = React.useRef<HTMLInputElement>(null);

  const addSOVLine = () => {
    const isUnitQuantity = accountingMethod === "unit_quantity";
    const newLine: SovLineItem = {
      lineNumber: sovLines.length + 1,
      budgetCodeId: "",
      budgetCodeLabel: "",
      description: "",
      amount: 0,
      quantity: 1,
      unitCost: isUnitQuantity ? 0 : undefined,
      unitOfMeasure: isUnitQuantity ? "" : undefined,
      billedToDate: 0,
    };
    setSovLines([...sovLines, newLine]);
  };

  const addGroup = () => {
    const groupLine: SovLineItem = {
      lineNumber: sovLines.length + 1,
      description: "",
      amount: 0,
      billedToDate: 0,
      isGroup: true,
    };
    setSovLines([...sovLines, groupLine]);
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").filter((line) => line.trim());
      if (lines.length < 2) return;

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const descIdx = headers.findIndex((h) => h.includes("description"));
      const amountIdx = headers.findIndex(
        (h) =>
          h.includes("amount") &&
          !h.includes("remaining") &&
          !h.includes("billed"),
      );
      const budgetCodeIdx = headers.findIndex(
        (h) => h.includes("budget") || h.includes("cost") || h.includes("code"),
      );

      const imported: SovLineItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]
          .split(",")
          .map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.every((c) => !c)) continue;

        imported.push({
          lineNumber: sovLines.length + imported.length + 1,
          description: descIdx >= 0 ? cols[descIdx] : cols[0] || "",
          budgetCode: budgetCodeIdx >= 0 ? cols[budgetCodeIdx] : undefined,
          amount: amountIdx >= 0 ? parseFloat(cols[amountIdx]) || 0 : 0,
          quantity: 1,
          billedToDate: 0,
        } as SovLineItem);
      }

      if (imported.length > 0) {
        setSovLines([...sovLines, ...imported]);
      }
    };
    reader.readAsText(file);

    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  const updateSOVLine = (index: number, updates: Partial<SovLineItem>) => {
    const updated = [...sovLines];
    const isUnitQuantity = accountingMethod === "unit_quantity";
    const current = updated[index];

    const merged = { ...current, ...updates };

    // Auto-calculate amount when in unit/quantity mode
    if (
      isUnitQuantity &&
      (updates.quantity !== undefined || updates.unitCost !== undefined)
    ) {
      merged.amount =
        (updates.quantity ?? current.quantity ?? 0) *
        (updates.unitCost ?? current.unitCost ?? 0);
    }

    updated[index] = merged;
    setSovLines(updated);
  };

  const removeSOVLine = (index: number) => {
    setSovLines(sovLines.filter((_, i) => i !== index));
  };

  const toggleAccountingMethod = () => {
    const nextMethod =
      accountingMethod === "unit_quantity" ? "amount_based" : "unit_quantity";
    const updatedItems = sovLines.map((item) => {
      if (item.isGroup) return item;
      if (nextMethod === "unit_quantity") {
        const quantity = item.quantity ?? 1;
        let unitCost = item.unitCost;
        if (unitCost === undefined || unitCost === null) {
          unitCost = (item.amount || 0) / quantity;
        }
        return {
          ...item,
          quantity,
          unitCost,
          unitOfMeasure: item.unitOfMeasure || "",
          amount: quantity * unitCost,
        };
      } else {
        const amount = (item.quantity ?? 1) * (item.unitCost ?? 0);
        return {
          ...item,
          amount: amount || item.amount || 0,
          quantity: item.quantity,
          unitCost: item.unitCost,
          unitOfMeasure: item.unitOfMeasure,
        };
      }
    });
    setValue(
      "accountingMethod",
      nextMethod as (typeof AccountingMethodValues)[number],
    );
    setSovLines(updatedItems);
  };

  const calculateSOVTotals = () => {
    const totals = sovLines.reduce(
      (acc, line) => {
        if (line.isGroup) return acc; // Skip group headers
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

  const totals = calculateSOVTotals();
  const sovSortableIds = React.useMemo(
    () => sovLines.map((_, index) => `sov-line-${index}`),
    [sovLines.length],
  );
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleSovDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = Number(String(active.id).replace("sov-line-", ""));
    const newIndex = Number(String(over.id).replace("sov-line-", ""));

    if (Number.isNaN(oldIndex) || Number.isNaN(newIndex)) return;

    setSovLines((prev) =>
      arrayMove(prev, oldIndex, newIndex).map((line, index) => ({
        ...line,
        lineNumber: index + 1,
      })),
    );
  };

  React.useEffect(() => {
    if (sovLines.length > 0) return;

    const isUnitQuantity = accountingMethod === "unit_quantity";
    setSovLines([
      {
        lineNumber: 1,
        budgetCodeId: "",
        budgetCodeLabel: "",
        description: "",
        amount: 0,
        quantity: 1,
        unitCost: isUnitQuantity ? 0 : undefined,
        unitOfMeasure: isUnitQuantity ? "" : undefined,
        billedToDate: 0,
      } as SovLineItem,
    ]);
  }, [sovLines.length, accountingMethod]);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      <div className="space-y-8">
        {/* Hidden CSV file input */}
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleCSVImport}
        />
        {/* Error Display */}
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Submission Failed</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{submitError}</p>
              {errorDetails &&
              typeof errorDetails === "object" &&
              "details" in (errorDetails as Record<string, unknown>) ? (
                <div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      View Error Details
                    </summary>
                    <pre className="mt-2 text-xs bg-destructive/10 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(
                        (errorDetails as Record<string, unknown>).details,
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </div>
              ) : null}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-8">

        {/* General Information Section */}
        <section className="space-y-6 border-b border-border/70 pb-8">
          <h2 className="text-lg font-semibold text-foreground">
            General Information
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                {...register("title")}
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

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
                Vendor <span className="text-destructive">*</span>
              </Label>
              <Popover
                open={openContractCompanyPopover}
                onOpenChange={setOpenContractCompanyPopover}
              >
                <PopoverTrigger asChild>
                  <Button
                    id="contractCompanyId"
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between text-left font-normal"
                    disabled={isSubmitting || isLoadingVendors}
                  >
                    <span className="truncate">
                      {isLoadingVendors ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading vendors...
                        </span>
                      ) : (
                        selectedVendor?.label || "Select vendor"
                      )}
                    </span>
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Type to search vendors..." />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingVendors
                          ? "Loading vendors..."
                          : "No vendors found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {vendorOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.label}
                            onSelect={() => {
                              setValue("contractCompanyId", option.value, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              setOpenContractCompanyPopover(false);
                            }}
                          >
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.contractCompanyId && (
                <p className="text-sm text-destructive">
                  {errors.contractCompanyId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={statusValue}
                onValueChange={(value) =>
                  setValue(
                    "status",
                    value as (typeof CommitmentStatusValues)[number],
                  )
                }
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CommitmentStatusValues.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
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
            <div>
              <Label htmlFor="defaultRetainagePercent">Default Retainage</Label>
              <InputGroup>
                <InputGroupInput
                  id="defaultRetainagePercent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register("defaultRetainagePercent", {
                    valueAsNumber: true,
                  })}
                  disabled={isSubmitting}
                  className="text-right"
                  placeholder="0.00"
                />
                <InputGroupAddon align="inline-end">%</InputGroupAddon>
              </InputGroup>
              {errors.defaultRetainagePercent && (
                <p className="text-sm text-destructive">
                  {errors.defaultRetainagePercent.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="executed" className="block">
                Executed
              </Label>
              <div className="flex items-center space-x-2 h-9">
                <Checkbox
                  id="executed"
                  checked={executedValue}
                  onCheckedChange={(checked) =>
                    setValue("executed", checked as boolean)
                  }
                  disabled={isSubmitting}
                />
                <Label
                  htmlFor="executed"
                  className="text-sm font-normal cursor-pointer"
                >
                  Mark as Executed
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="description"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter detailed contract description..."
                  rows={3}
                />
              )}
            />
          </div>
        </section>

        {/* Attachments Section */}
        <section className="space-y-4 border-b border-border/70 pb-8">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Attachments</h2>
            <p className="text-sm text-muted-foreground">
              Attach contract documents, plans, or other relevant files
            </p>
          </div>
            <FileUploadField
              label=""
              value={attachments}
              onChange={setAttachments}
              multiple
              maxFiles={20}
              maxSize={50 * 1024 * 1024}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              disabled={isSubmitting}
            />
        </section>

        <section
          className="border-b border-border/70 pb-8"
          data-testid="sov-section"
        >
          <h2 className="text-lg font-semibold text-foreground">
            Schedule of Values
          </h2>
          <div className="space-y-6 pt-4">
          {/* Accounting Method Info */}
          <p className="text-sm text-muted-foreground">
            This contract&apos;s default accounting method is{" "}
            <strong>
              {accountingMethod === "amount_based"
                ? "amount-based"
                : "unit/quantity"}
            </strong>
            .{" "}
            <button
              type="button"
              className="underline hover:text-foreground transition-colors"
              disabled={isSubmitting}
              onClick={toggleAccountingMethod}
              data-testid="sov-accounting-toggle"
            >
              Change to{" "}
              {accountingMethod === "amount_based"
                ? "Unit/Quantity"
                : "Amount-based"}
            </button>
          </p>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
            <Select
              onValueChange={(value) => {
                if (value === "add_group") addGroup();
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Add Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add_group">Add Group</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* SOV Table */}
          <div
            className="overflow-x-auto overflow-hidden rounded-lg border border-border/70 bg-muted/20"
            data-testid="sov-table"
            data-accounting-method={accountingMethod}
          >
            <DndContext
              sensors={dndSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSovDragEnd}
            >
              <SortableContext
                items={sovSortableIds}
                strategy={verticalListSortingStrategy}
              >
                <table className="w-full">
              <thead className="border-y-0">
                <tr className="bg-muted/70 hover:bg-muted/70">
                  <th className="w-12 px-1 py-1.5 text-left text-[11px] font-normal tracking-normal text-muted-foreground">
                  </th>
                  <th className="min-w-72 px-1 py-1.5 text-left text-[11px] font-normal tracking-normal text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline decoration-dotted underline-offset-2 decoration-muted-foreground/40">
                              Budget Code
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Link to a budget code</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </th>
                  <th className="min-w-64 px-1 py-1.5 text-left text-[11px] font-normal tracking-normal text-muted-foreground">
                    Description
                  </th>
                  {accountingMethod === "unit_quantity" && (
                    <>
                      <th className="w-32 px-1 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">
                        Qty
                      </th>
                      <th className="w-32 px-1 py-1.5 text-left text-[11px] font-normal tracking-normal text-muted-foreground">
                        UOM
                      </th>
                      <th className="w-48 px-1 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">
                        Unit Cost
                      </th>
                    </>
                  )}
                  <th className="w-48 px-1 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">
                    Amount
                  </th>
                  <th className="w-40 px-1 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">
                    Billed to Date
                  </th>
                  <th className="w-40 px-1 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">
                    Amount Remaining
                  </th>
                  <th className="w-12 px-1 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {sovLines.map((line, index) =>
                  line.isGroup ? (
                    <SortableSovRow
                      id={`sov-line-${index}`}
                      key={`group-${index}`}
                      className="border-b border-border/60 bg-muted/40"
                    >
                      {({ attributes, listeners }) => (
                        <>
                      <td
                        className="px-1 py-1.5 text-sm font-semibold"
                        data-testid={`sov-group-${index}`}
                      >
                        <div
                          {...attributes}
                          {...listeners}
                          className="inline-flex cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                      </td>
                      <td
                        colSpan={accountingMethod === "unit_quantity" ? 8 : 5}
                        className="px-1 py-1.5"
                      >
                        <Input
                          className="h-10 font-semibold"
                          placeholder="Group name (e.g. General Conditions)"
                          value={line.description || ""}
                          onChange={(e) =>
                            updateSOVLine(index, {
                              description: e.target.value,
                            })
                          }
                          data-testid="sov-group-name"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSOVLine(index)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                        >
                          ×
                        </Button>
                      </td>
                        </>
                      )}
                    </SortableSovRow>
                  ) : (
                    <SortableSovRow
                      id={`sov-line-${index}`}
                      key={`line-${index}`}
                      className="group border-b border-border/60 bg-background transition-colors hover:bg-muted/20"
                    >
                      {({ attributes, listeners }) => (
                        <>
                      <td
                        className="px-1 py-1.5 text-sm"
                        data-testid={`sov-line-${index}`}
                      >
                        <div
                          {...attributes}
                          {...listeners}
                          className="inline-flex cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                      </td>
                      <td className="px-1 py-1.5">
                        <BudgetCodeSelector
                          value={line.budgetCodeId || ""}
                          onValueChange={(_, code) =>
                            handleBudgetCodeSelect(index, code)
                          }
                          budgetCodes={budgetCodes}
                          loading={loadingBudgetCodes}
                          onCreateNew={() => setShowCreateBudgetCodeModal(true)}
                          placeholder="Select budget code..."
                          className="h-10"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input
                          value={line.description || ""}
                          onChange={(e) =>
                            updateSOVLine(index, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Description"
                          className="h-10"
                          data-testid="sov-line-description"
                        />
                      </td>
                      {accountingMethod === "unit_quantity" && (
                        <>
                          <td className="px-1 py-1.5">
                            <Input
                              type="number"
                              value={line.quantity ?? 1}
                              onChange={(e) =>
                                updateSOVLine(index, {
                                  quantity: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="h-10 text-right"
                              data-testid="sov-line-quantity"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <Select
                              value={line.unitOfMeasure || undefined}
                              onValueChange={(value) =>
                                updateSOVLine(index, {
                                  unitOfMeasure: value,
                                })
                              }
                            >
                              <SelectTrigger
                                className="h-10 w-full"
                                data-testid="sov-line-unit-of-measure"
                              >
                                <SelectValue placeholder="Select" />
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
                          <td className="w-48 px-1 py-1.5">
                            <InputGroup className="h-10 overflow-hidden bg-transparent">
                              <InputGroupAddon>$</InputGroupAddon>
                              <InputGroupInput
                                type="number"
                                step="0.01"
                                value={line.unitCost ?? ""}
                                onChange={(e) =>
                                  updateSOVLine(index, {
                                    unitCost: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-10 bg-transparent text-right"
                                data-testid="sov-line-unit-cost"
                              />
                            </InputGroup>
                          </td>
                        </>
                      )}
                      <td className="w-48 px-1 py-1.5">
                        <InputGroup className="h-10 overflow-hidden bg-transparent">
                          <InputGroupAddon>$</InputGroupAddon>
                          {accountingMethod === "unit_quantity" ? (
                            <InputGroupInput
                              type="number"
                              step="0.01"
                              value={line.amount || ""}
                              className="h-10 bg-transparent text-right"
                              data-testid="sov-line-amount"
                              disabled
                              readOnly
                            />
                          ) : (
                            <InputGroupInput
                              type="number"
                              step="0.01"
                              value={line.amount || ""}
                              onChange={(e) =>
                                updateSOVLine(index, {
                                  amount: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="h-10 bg-transparent text-right"
                              data-testid="sov-line-amount"
                            />
                          )}
                        </InputGroup>
                      </td>
                      <td className="px-1 py-1.5 pt-3 text-right text-sm">
                        ${(line.billedToDate || 0).toFixed(2)}
                      </td>
                      <td
                        className="px-1 py-1.5 pt-3 text-right text-sm"
                        data-testid="sov-line-amount-remaining"
                      >
                        $
                        {(
                          (line.amount || 0) - (line.billedToDate || 0)
                        ).toFixed(2)}
                      </td>
                      <td className="px-1 py-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSOVLine(index)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                        >
                          ×
                        </Button>
                      </td>
                        </>
                      )}
                    </SortableSovRow>
                  ),
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-1 py-2" />
                  <td colSpan={accountingMethod === "unit_quantity" ? 5 : 2} className="px-1 py-3 text-xs font-semibold text-foreground">
                    Totals
                  </td>
                  <td
                    className="px-1 py-2 text-right text-sm font-semibold text-foreground"
                    data-testid="sov-total-amount"
                  >
                    ${totals.amount.toFixed(2)}
                  </td>
                  <td
                    className="px-1 py-2 text-right text-sm font-semibold text-foreground"
                    data-testid="sov-total-billed"
                  >
                    ${totals.billedToDate.toFixed(2)}
                  </td>
                  <td
                    className="px-1 py-2 text-right text-sm font-semibold text-foreground"
                    data-testid="sov-total-remaining"
                  >
                    ${totals.amountRemaining.toFixed(2)}
                  </td>
                  <td className="px-1 py-2" />
                </tr>
              </tfoot>
                </table>
              </SortableContext>
            </DndContext>
          </div>

          <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              onClick={addSOVLine}
              disabled={isSubmitting}
              className="h-10 gap-2 px-4"
              data-testid="sov-add-line-footer"
            >
              <Plus className="h-4 w-4" />
              Add Line Item
            </Button>
            <Select
              onValueChange={(value) => {
                if (value === "csv") csvInputRef.current?.click();
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
          </div>
        </section>

        {/* Inclusions & Exclusions Section */}
        <section className="space-y-4 border-b border-border/70 pb-8">
          <h2 className="text-lg font-semibold text-foreground">
            Inclusions & Exclusions
          </h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Inclusions</Label>
              <Controller
                name="inclusions"
                control={control}
                render={({ field }) => (
                  <Textarea
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Enter scope inclusions..."
                    rows={3}
                  />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Exclusions</Label>
              <Controller
                name="exclusions"
                control={control}
                render={({ field }) => (
                  <Textarea
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Enter scope exclusions..."
                    rows={3}
                  />
                )}
              />
            </div>
          </div>
        </section>

        {/* Contract Dates Section */}
        <section className="space-y-4 border-b border-border/70 pb-8">
          <h2 className="text-lg font-semibold text-foreground">
            Contract Dates
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Controller
                name="dates.startDate"
                control={control}
                render={({ field }) => (
                  <DateField
                    label="Start Date"
                    value={field.value instanceof Date ? field.value : undefined}
                    onChange={(date) => field.onChange(date)}
                    disabled={isSubmitting}
                    placeholder="Select start date"
                    error={errors.dates?.startDate?.message}
                  />
                )}
              />

              <Controller
                name="dates.estimatedCompletionDate"
                control={control}
                render={({ field }) => (
                  <DateField
                    label="Estimated Completion Date"
                    value={field.value instanceof Date ? field.value : undefined}
                    onChange={(date) => field.onChange(date)}
                    disabled={isSubmitting}
                    placeholder="Select estimated completion"
                    error={errors.dates?.estimatedCompletionDate?.message}
                  />
                )}
              />
              <Controller
                name="dates.actualCompletionDate"
                control={control}
                render={({ field }) => (
                  <DateField
                    label="Actual Completion Date"
                    value={field.value instanceof Date ? field.value : undefined}
                    onChange={(date) => field.onChange(date)}
                    disabled={isSubmitting}
                    placeholder="Select actual completion"
                    error={errors.dates?.actualCompletionDate?.message}
                  />
                )}
              />

              <Controller
                name="dates.contractDate"
                control={control}
                render={({ field }) => (
                  <DateField
                    label="Contract Date"
                    value={field.value instanceof Date ? field.value : undefined}
                    onChange={(date) => field.onChange(date)}
                    disabled={isSubmitting}
                    placeholder="Select contract date"
                    error={errors.dates?.contractDate?.message}
                  />
                )}
              />

              <Controller
                name="dates.signedContractReceivedDate"
                control={control}
                render={({ field }) => (
                  <DateField
                    label="Signed Contract Received Date"
                    value={field.value instanceof Date ? field.value : undefined}
                    onChange={(date) => field.onChange(date)}
                    disabled={isSubmitting}
                    placeholder="Select signed contract received"
                    error={errors.dates?.signedContractReceivedDate?.message}
                  />
                )}
              />

              <Controller
                name="dates.issuedOnDate"
                control={control}
                render={({ field }) => (
                  <DateField
                    label="Issued On Date"
                    value={field.value instanceof Date ? field.value : undefined}
                    onChange={(date) => field.onChange(date)}
                    disabled={isSubmitting}
                    placeholder="Select issued on date"
                    error={errors.dates?.issuedOnDate?.message}
                  />
                )}
              />
            </div>
          </div>
        </section>

        {/* Contract Privacy Section */}
        <section className="space-y-4 border-b border-border/70 pb-8">
          <h2 className="text-lg font-semibold text-foreground">
            Contract Privacy
          </h2>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Privacy restricts access to project admins and selected non-admin users.
            </p>

            <div className="flex items-center space-x-2">
              <Controller
                name="privacy.isPrivate"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="privacy.isPrivate"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                    disabled={isSubmitting}
                  />
                )}
              />
              <Label
                htmlFor="privacy.isPrivate"
                className="text-sm font-normal"
              >
                Private (default)
              </Label>
            </div>

            {/* Non-Admin Users Access - Only shown when Private is checked */}
            {privacyIsPrivate && (
              <>
                <div className="space-y-2">
                  <Label>Access for Non-Admin Users</Label>
                  <Controller
                    name="privacy.nonAdminUserIds"
                    control={control}
                    render={({ field }) => (
                      <MultiSelectField
                        label=""
                        options={userOptions}
                        value={field.value || []}
                        onChange={(values) => field.onChange(values)}
                        disabled={isSubmitting || isLoadingUsers}
                        placeholder={
                          isLoadingUsers
                            ? "Loading users..."
                            : "Select users who can access this contract..."
                        }
                      />
                    )}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Controller
                    name="privacy.allowNonAdminViewSovItems"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="privacy.allowNonAdminViewSovItems"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked)}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                  <Label
                    htmlFor="privacy.allowNonAdminViewSovItems"
                    className="text-sm font-normal"
                  >
                    Allow these non-admin users to view the SOV items
                  </Label>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Invoice Contacts Section - Conditional on Company Selection */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Invoice Contacts
          </h2>
          <div>
            {!contractCompanyId ? (
              <p className="text-sm text-muted-foreground">
                Select a vendor above to enable invoice contacts.
              </p>
            ) : (
              <div className="space-y-2">
                <Controller
                  name="invoiceContactIds"
                  control={control}
                  render={({ field }) => (
                    <MultiSelectField
                      label="Invoice Contacts"
                      options={invoiceContactOptions}
                      value={field.value || []}
                      onChange={(values) => field.onChange(values)}
                      disabled={isSubmitting || isLoadingContacts}
                      placeholder={
                        isLoadingContacts
                          ? "Loading contacts..."
                          : invoiceContactOptions.length === 0
                            ? "No contacts found for this vendor"
                            : "Select contacts who can submit invoices..."
                      }
                    />
                  )}
                />
              </div>
            )}
          </div>
        </section>

        </div>

        {/* Footer Actions */}
        <div className="mt-10 flex items-center justify-between gap-4 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            <span className="text-destructive">*</span> Required fields
          </p>
          <div className="flex gap-3">
            {showAutoFill && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDevAutoFill}
                disabled={isSubmitting || isAutoFilling}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {isAutoFilling ? "Filling..." : "Auto-fill"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "edit" ? "Saving..." : "Creating..."}
                </>
              ) : mode === "edit" ? (
                "Save Changes"
              ) : (
                "Create Subcontract"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Create Budget Code Modal */}
      <Dialog
        open={showCreateBudgetCodeModal}
        onOpenChange={setShowCreateBudgetCodeModal}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Budget Code</DialogTitle>
            <DialogDescription>
              Add a new budget code that can be used for line items in this
              project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="costCode">Cost Code*</Label>
              {loadingCostCodes ? (
                <div className="border rounded-md p-4 text-sm text-muted-foreground">
                  Loading cost codes...
                </div>
              ) : (
                <div className="border rounded-md max-h-96 overflow-y-auto">
                  {Object.entries(groupedCostCodes)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([division]) => (
                      <div key={division} className="border-b last:border-b-0">
                        <button
                          type="button"
                          onClick={() => toggleDivision(division)}
                          className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-muted transition-colors"
                        >
                          <span className="text-sm font-semibold text-foreground">
                            {division}
                          </span>
                          {expandedDivisions.has(division) ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>

                        {expandedDivisions.has(division) && (
                          <div className="bg-muted/50">
                            {groupedCostCodes[division].map((costCode) => (
                              <button
                                key={costCode.id}
                                type="button"
                                onClick={() =>
                                  setNewBudgetCodeData({
                                    ...newBudgetCodeData,
                                    costCodeId: costCode.id,
                                  })
                                }
                                className={`w-full text-left px-6 py-2 text-sm hover:bg-muted transition-colors ${
                                  newBudgetCodeData.costCodeId === costCode.id
                                    ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-950 dark:text-blue-300"
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
                Click on a division to expand and select a cost code
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="costType">Cost Type*</Label>
              <Select
                value={newBudgetCodeData.costType}
                onValueChange={(value) =>
                  setNewBudgetCodeData({
                    ...newBudgetCodeData,
                    costType: value,
                  })
                }
              >
                <SelectTrigger className="w-full">
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
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm font-medium text-foreground">Preview:</p>
              <p className="text-sm text-foreground mt-1">
                {newBudgetCodeData.costCodeId ? (
                  <>
                    {availableCostCodes.find(
                      (cc) => cc.id === newBudgetCodeData.costCodeId,
                    )?.division_title ||
                      availableCostCodes.find(
                        (cc) => cc.id === newBudgetCodeData.costCodeId,
                      )?.id}
                    .{newBudgetCodeData.costType} –{" "}
                    {
                      availableCostCodes.find(
                        (cc) => cc.id === newBudgetCodeData.costCodeId,
                      )?.title
                    }{" "}
                    – {getCostTypeLabel(newBudgetCodeData.costType)}
                  </>
                ) : (
                  "Select cost code and cost type to see preview"
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
