"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Info,
  Search,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import {
  CreateSubcontractSchema,
  type CreateSubcontractInput,
  type SovLineItem,
  CommitmentStatusValues,
  AccountingMethodValues,
} from "@/lib/schemas/create-subcontract-schema";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { RichTextField } from "@/components/forms/RichTextField";
import { DateField } from "@/components/forms/DateField";
import { MultiSelectField } from "@/components/forms/MultiSelectField";
import { SectionHeader } from "@/components/ui/section-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCompanies } from "@/hooks/use-companies";
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

interface FormSectionHeadingProps {
  title: string;
  description?: string;
}

function FormSectionHeading({ title, description }: FormSectionHeadingProps) {
  return (
    <div className="pb-2">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

interface CreateSubcontractFormProps {
  projectId: number;
  onSubmit: (data: CreateSubcontractInput) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateSubcontractInput> & {
    sovLines?: SovLineItem[];
  };
  mode?: "create" | "edit";
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
  const [openBudgetCodePopover, setOpenBudgetCodePopover] = React.useState<
    number | null
  >(null);
  const [budgetCodeSearchQuery, setBudgetCodeSearchQuery] = React.useState("");
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
  const [openContractCompanyPopover, setOpenContractCompanyPopover] =
    React.useState(false);

  // Use the companies hook
  const { options: companyOptions, isLoading: isLoadingCompanies } =
    useCompanies();

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
    watch,
    setValue,
    control,
  } = useForm<CreateSubcontractInput>({
    resolver: zodResolver(CreateSubcontractSchema) as never,
    defaultValues: {
      contractNumber: initialData?.contractNumber || "SC-002",
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

  const contractCompanyId = watch("contractCompanyId");
  const privacyIsPrivate = watch("privacy.isPrivate") ?? true;
  const accountingMethod = watch("accountingMethod");
  const selectedContractCompany = React.useMemo(
    () => companyOptions.find((option) => option.value === contractCompanyId),
    [companyOptions, contractCompanyId],
  );

  // Fetch company contacts when a company is selected
  const { options: invoiceContactOptions, isLoading: isLoadingContacts } =
    useCompanyContacts({
      companyId: contractCompanyId,
      enabled: !!contractCompanyId,
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

  const filteredBudgetCodes = budgetCodes.filter((code) =>
    code.fullLabel.toLowerCase().includes(budgetCodeSearchQuery.toLowerCase()),
  );

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
    setOpenBudgetCodePopover(null);
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

  const csvInputRef = React.useRef<HTMLInputElement>(null);

  const addSOVLine = () => {
    const isUnitQuantity = accountingMethod === "unit_quantity";
    const newLine: SovLineItem = {
      lineNumber: sovLines.length + 1,
      budgetCodeId: "",
      budgetCodeLabel: "",
      description: "",
      amount: 0,
      quantity: isUnitQuantity ? 1 : undefined,
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

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      <div className="space-y-4 rounded-lg bg-muted/30 shadow-sm p-6 lg:p-8">
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

        {/* General Information Section */}
        <section className="space-y-6">
          <FormSectionHeading
            title="General Information"
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                {...register("title")}
                disabled={isSubmitting}
                placeholder="Enter contract title"
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
                Contract Company <span className="text-destructive">*</span>
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
                    disabled={isSubmitting || isLoadingCompanies}
                  >
                    <span className="truncate">
                      {isLoadingCompanies ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading companies...
                        </span>
                      ) : (
                        selectedContractCompany?.label || "Select company"
                      )}
                    </span>
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Type to search companies..." />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingCompanies
                          ? "Loading companies..."
                          : "No companies found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {companyOptions.map((option) => (
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
                value={watch("status")}
                onValueChange={(value) =>
                  setValue(
                    "status",
                    value as (typeof CommitmentStatusValues)[number],
                  )
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
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
              <div className="flex items-center gap-2">
                <Input
                  id="defaultRetainagePercent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register("defaultRetainagePercent", {
                    valueAsNumber: true,
                  })}
                  disabled={isSubmitting}
                  className="w-full"
                  placeholder="0.00"
                />
                <span className="text-sm text-foreground">%</span>
              </div>
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
                  checked={watch("executed")}
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

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <RichTextField
                label="Description"
                value={field.value || ""}
                onChange={field.onChange}
                disabled={isSubmitting}
                placeholder="Enter detailed contract description..."
              />
            )}
          />
        </section>

        {/* Attachments Section */}
        <section className="space-y-6 pt-8">
          <FormSectionHeading
            title="Attachments"
          />

          <FileUploadField
            label=""
            value={attachments}
            onChange={setAttachments}
            multiple
            maxFiles={20}
            maxSize={50 * 1024 * 1024}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            hint="Attach contract documents, plans, or other relevant files"
            disabled={isSubmitting}
          />
        </section>

        {/* Schedule of Values Section */}
        <section className="space-y-6" data-testid="sov-section">
          <FormSectionHeading
            title="Schedule of Values"
            description="Organize groupings and line items that drive commitment totals."
          />
          {/* Accounting Method Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-4 dark:bg-blue-950 dark:border-blue-800">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                This contract&apos;s default accounting method is{" "}
                <strong>
                  {accountingMethod === "amount_based"
                    ? "amount-based"
                    : "unit/quantity"}
                </strong>
                . To use budget codes with a unit of measure association, select
                Change to{" "}
                {accountingMethod === "amount_based"
                  ? "Unit/Quantity"
                  : "Amount-based"}
                .
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={isSubmitting}
              onClick={toggleAccountingMethod}
              data-testid="sov-accounting-toggle"
            >
              Change to{" "}
              {accountingMethod === "amount_based"
                ? "Unit/Quantity"
                : "Amount-based"}
            </Button>
          </div>

          <SectionHeader
            actions={
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
            }
          >
            Line Item Groups
          </SectionHeader>

          {/* SOV Table */}
          <div
            className="border rounded-lg overflow-hidden"
            data-testid="sov-table"
            data-accounting-method={accountingMethod}
          >
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-medium text-foreground w-12">
                    #
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-foreground min-w-72">
                    <div className="flex items-center gap-1">
                      Budget Code
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Link to a budget code</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-foreground">
                    Description
                  </th>
                  {accountingMethod === "unit_quantity" && (
                    <>
                      <th className="px-4 py-4 text-right text-sm font-medium text-foreground">
                        Qty
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-foreground">
                        UOM
                      </th>
                      <th className="px-4 py-4 text-right text-sm font-medium text-foreground">
                        Unit Cost
                      </th>
                    </>
                  )}
                  <th className="px-4 py-4 text-right text-sm font-medium text-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-medium text-foreground">
                    Billed to Date
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-medium text-foreground">
                    Amount Remaining
                  </th>
                  <th className="px-4 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {sovLines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={accountingMethod === "unit_quantity" ? 10 : 7}
                      className="px-4 py-12 text-center"
                    >
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                          <BarChart3 className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <p className="text-lg font-medium text-foreground">
                          You Have No Line Items Yet
                        </p>
                        <Button
                          type="button"
                          onClick={addSOVLine}
                          variant="default"
                          disabled={isSubmitting}
                          data-testid="sov-add-line-empty"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Line
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sovLines.map((line, index) =>
                    line.isGroup ? (
                      <tr
                        key={`group-${index}`}
                        className="border-b bg-muted/50"
                        data-testid={`sov-group-${index}`}
                      >
                        <td className="px-4 py-4 text-sm font-semibold">
                          {index + 1}
                        </td>
                        <td
                          colSpan={accountingMethod === "unit_quantity" ? 8 : 5}
                          className="px-4 py-4"
                        >
                          <Input
                            className="h-8 font-semibold"
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
                        <td className="px-4 py-4">
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
                      </tr>
                    ) : (
                      <tr
                        key={`line-${index}`}
                        className="border-b"
                        data-testid={`sov-line-${index}`}
                      >
                        <td className="px-4 py-4 text-sm">{index + 1}</td>
                        <td className="px-4 py-4">
                          <Popover
                            open={openBudgetCodePopover === index}
                            onOpenChange={(open) => {
                              setOpenBudgetCodePopover(open ? index : null);
                              if (open) setBudgetCodeSearchQuery("");
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between text-left font-normal h-8"
                                data-testid="sov-line-budget-code"
                              >
                                <span className="truncate">
                                  {line.budgetCodeLabel ||
                                    "Select budget code..."}
                                </span>
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-96 p-0" align="start">
                              <Command>
                                <CommandInput
                                  placeholder="Search budget codes..."
                                  value={budgetCodeSearchQuery}
                                  onValueChange={setBudgetCodeSearchQuery}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {loadingBudgetCodes
                                      ? "Loading..."
                                      : "No budget codes found."}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {filteredBudgetCodes.map((code) => (
                                      <CommandItem
                                        key={code.id}
                                        value={code.fullLabel}
                                        onSelect={() =>
                                          handleBudgetCodeSelect(index, code)
                                        }
                                      >
                                        {code.fullLabel}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                  <CommandSeparator />
                                  <CommandGroup>
                                    <CommandItem
                                      onSelect={() => {
                                        setOpenBudgetCodePopover(null);
                                        setShowCreateBudgetCodeModal(true);
                                      }}
                                      className="text-blue-600"
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Create New Budget Code
                                    </CommandItem>
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-4 py-4">
                          <Input
                            value={line.description || ""}
                            onChange={(e) =>
                              updateSOVLine(index, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Description"
                            className="h-8"
                            data-testid="sov-line-description"
                          />
                        </td>
                        {accountingMethod === "unit_quantity" && (
                          <>
                            <td className="px-4 py-4">
                              <Input
                                type="number"
                                value={line.quantity ?? ""}
                                onChange={(e) =>
                                  updateSOVLine(index, {
                                    quantity: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-8 text-right"
                                data-testid="sov-line-quantity"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <Input
                                value={line.unitOfMeasure || ""}
                                onChange={(e) =>
                                  updateSOVLine(index, {
                                    unitOfMeasure: e.target.value,
                                  })
                                }
                                className="h-8"
                                data-testid="sov-line-unit-of-measure"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <Input
                                type="number"
                                value={line.unitCost ?? ""}
                                onChange={(e) =>
                                  updateSOVLine(index, {
                                    unitCost: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-8 text-right"
                                data-testid="sov-line-unit-cost"
                              />
                            </td>
                          </>
                        )}
                        <td className="px-4 py-4">
                          <Input
                            type="number"
                            value={line.amount || ""}
                            onChange={(e) =>
                              updateSOVLine(index, {
                                amount: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-8 text-right"
                            data-testid="sov-line-amount"
                            readOnly={accountingMethod === "unit_quantity"}
                          />
                        </td>
                        <td className="px-4 py-4 text-right text-sm">
                          ${(line.billedToDate || 0).toFixed(2)}
                        </td>
                        <td
                          className="px-4 py-4 text-right text-sm"
                          data-testid="sov-line-amount-remaining"
                        >
                          $
                          {(
                            (line.amount || 0) - (line.billedToDate || 0)
                          ).toFixed(2)}
                        </td>
                        <td className="px-4 py-4">
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
                      </tr>
                    ),
                  )
                )}
              </tbody>
              <tfoot className="bg-muted border-t">
                <tr>
                  <td colSpan={2} className="px-4 py-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSOVLine}
                      disabled={isSubmitting}
                      data-testid="sov-add-line-footer"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Line
                    </Button>
                  </td>
                  <td className="px-4 py-4 text-right font-medium">Total:</td>
                  {accountingMethod === "unit_quantity" && (
                    <>
                      <td className="px-4 py-4" />
                      <td className="px-4 py-4" />
                      <td className="px-4 py-4" />
                    </>
                  )}
                  <td
                    className="px-4 py-4 text-right font-medium"
                    data-testid="sov-total-amount"
                  >
                    ${totals.amount.toFixed(2)}
                  </td>
                  <td
                    className="px-4 py-4 text-right font-medium"
                    data-testid="sov-total-billed"
                  >
                    ${totals.billedToDate.toFixed(2)}
                  </td>
                  <td
                    className="px-4 py-4 text-right font-medium"
                    data-testid="sov-total-remaining"
                  >
                    ${totals.amountRemaining.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Import dropdown below the table */}
          <div className="mt-4">
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
        </section>

        {/* Inclusions & Exclusions Section */}
        <section className="space-y-6">
          <FormSectionHeading
            title="Inclusions & Exclusions"
            description="Clarify what scope is explicitly covered versus excluded."
          />

          <div className="space-y-4">
            <Controller
              name="inclusions"
              control={control}
              render={({ field }) => (
                <RichTextField
                  label="Inclusions"
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  placeholder="Enter scope inclusions..."
                />
              )}
            />

            <Controller
              name="exclusions"
              control={control}
              render={({ field }) => (
                <RichTextField
                  label="Exclusions"
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  placeholder="Enter scope exclusions..."
                />
              )}
            />
          </div>
        </section>

        {/* Contract Dates Section */}
        <section className="space-y-6">
          <FormSectionHeading
            title="Contract Dates"
            description="Capture key execution and delivery milestones for this subcontract."
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
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
        </section>

        {/* Contract Privacy Section */}
        <section className="space-y-6">
          <FormSectionHeading
            title="Contract Privacy"
            description="Restrict access and SOV visibility for non-admin project users."
          />

          <div className="bg-muted/50 rounded-md p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Using the privacy setting restricts access to only project
                admins and the select non-admin users specified below.
              </p>
            </div>
          </div>

          <div className="space-y-4">
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
        <section className="space-y-6">
          <FormSectionHeading
            title="Invoice Contacts"
            description="Select external contacts who are authorized to submit invoices."
          />

          {!contractCompanyId ? (
            <div className="bg-muted/50 rounded-md p-4">
              <p className="text-sm text-muted-foreground">
                Select a contract company to enable invoice contacts.
              </p>
            </div>
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
                          ? "No contacts found for this company"
                          : "Select contacts who can submit invoices..."
                    }
                  />
                )}
              />
            </div>
          )}
        </section>

        {/* Footer Actions */}
        <div className="sticky bottom-0 -mx-6 mt-10 flex items-center justify-between gap-4 border-t bg-card/95 px-6 py-4 backdrop-blur lg:-mx-8 lg:px-8">
          <p className="text-sm text-muted-foreground">
            <span className="text-destructive">*</span> Required fields
          </p>
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
