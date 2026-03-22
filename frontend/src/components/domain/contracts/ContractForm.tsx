"use client";

import * as React from "react";
import { Form } from "@/components/forms/Form";
import { TextField } from "@/components/forms/TextField";
import { SelectField } from "@/components/forms/SelectField";
import { NumberField } from "@/components/forms/NumberField";
import { DateField } from "@/components/forms/DateField";
import { RichTextField } from "@/components/forms/RichTextField";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { FormSection } from "@/components/forms/FormSection";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, HelpCircle, Sparkles, Search, ChevronRight, ChevronDown } from "lucide-react";
import { FormGrid, FormGridRow } from "@/components/forms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useCompanies } from "@/hooks/use-companies";
import { useProjectUsers } from "@/hooks/use-project-users";
import { getAutoFillData, isDevelopment } from "@/lib/dev-autofill";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ImportFromBudgetModal } from "@/components/domain/contracts/ImportFromBudgetModal";

// ============================================================================
// Types
// ============================================================================

interface BudgetCode {
  id: string;
  code: string;
  costType: string | null;
  description: string;
  fullLabel: string;
}

export interface SOVLineItem {
  id: string;
  isGroup?: boolean;
  changeEventLineItemId?: string;
  budgetCodeId?: string;
  budgetCodeLabel?: string;
  description: string;
  amount: number;
  quantity?: number;
  unitCost?: number;
  unitOfMeasure?: string;
  billedToDate: number;
  amountRemaining: number;
}

export interface ContractFormData {
  // General Info
  number: string; // Contract #
  title: string;
  ownerCompanyId?: string; // Owner/Client Company
  contractorId?: string; // Contractor
  architectEngineerId?: string; // Architect/Engineer
  contractCompanyId?: string; // Contract Company ID
  status: string;
  executed: boolean;
  defaultRetainage?: number;
  retentionPercent?: number;
  description?: string;
  originalAmount?: number;
  revisedAmount?: number;

  // Contract Dates
  startDate?: Date;
  estimatedCompletionDate?: Date;
  substantialCompletionDate?: Date;
  actualCompletionDate?: Date;
  signedContractReceivedDate?: Date;
  contractTerminationDate?: Date;

  // Schedule of Values
  sovItems?: SOVLineItem[];
  accountingMethod?: "amount" | "unit_quantity";

  // Payment Terms & Billing
  paymentTerms?: string;
  billingSchedule?: string;

  // Inclusions & Exclusions
  inclusions?: string;
  exclusions?: string;

  // Privacy
  isPrivate: boolean;
  allowedUsers?: string[];
  allowedUsersCanSeeSov?: boolean;

  // Attachments
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
  }>;
  attachmentFiles?: File[];
}

interface ContractFormProps {
  initialData?: Partial<ContractFormData>;
  onSubmit: (data: ContractFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  mode?: "create" | "edit";
  projectId: string;
}

// ============================================================================
// Constants
// ============================================================================

const CONTRACT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "out_for_bid", label: "Out for Bid" },
  { value: "out_for_signature", label: "Out for Signature" },
  { value: "approved", label: "Approved" },
  { value: "complete", label: "Complete" },
  { value: "terminated", label: "Terminated" },
];


// ============================================================================
// Main Component
// ============================================================================

export function ContractForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode = "create",
  projectId,
}: ContractFormProps) {
  const [formData, setFormData] = React.useState<Partial<ContractFormData>>({
    accountingMethod: "amount",
    sovItems: [],
    ...initialData,
  });
  const [validationErrors, setValidationErrors] = React.useState<
    Partial<Record<"number" | "title" | "executed", string>>
  >({});
  const [attachmentFiles, setAttachmentFiles] = React.useState<File[]>([]);
  const [attachmentFileInfos, setAttachmentFileInfos] = React.useState<
    Array<{ name: string; size: number; type: string }>
  >([]);

  // Budget code state
  const [budgetCodes, setBudgetCodes] = React.useState<BudgetCode[]>([]);
  const [loadingBudgetCodes, setLoadingBudgetCodes] = React.useState(true);
  const [openBudgetCodePopover, setOpenBudgetCodePopover] = React.useState<string | null>(null);
  const [budgetCodeSearchQuery, setBudgetCodeSearchQuery] = React.useState("");
  const [showCreateBudgetCodeModal, setShowCreateBudgetCodeModal] = React.useState(false);
  const [newBudgetCodeData, setNewBudgetCodeData] = React.useState({
    costCodeId: "",
    costType: "R",
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
  const [expandedDivisions, setExpandedDivisions] = React.useState<Set<string>>(new Set());
  const [groupedCostCodes, setGroupedCostCodes] = React.useState<
    Record<string, Array<{
      id: string;
      title: string | null;
      status: string | null;
      division_title: string | null;
    }>>
  >({});
  const [showImportFromBudget, setShowImportFromBudget] = React.useState(false);
  const [sovActionMenuKey, setSovActionMenuKey] = React.useState(0);

  // Data hooks
  const {
    options: companyOptions,
    isLoading: companiesLoading,
    createCompany,
  } = useCompanies();
  const { users: projectUsers } = useProjectUsers(projectId);
  const userOptions = projectUsers.map((u) => ({
    value: u.id,
    label: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "Unnamed",
  }));

  // State for "Add New Company" dialog
  const [showAddCompany, setShowAddCompany] = React.useState(false);
  const [newCompanyName, setNewCompanyName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  // Fetch budget codes for the project
  React.useEffect(() => {
    const fetchBudgetCodes = async () => {
      if (!projectId) return;

      try {
        setLoadingBudgetCodes(true);
        const response = await fetch(`/api/projects/${projectId}/budget-codes`);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error?.error || "Failed to load budget codes");
        }

        const { budgetCodes } = (await response.json()) as {
          budgetCodes: BudgetCode[];
        };

        setBudgetCodes(budgetCodes || []);
      } catch (error) {
        setBudgetCodes([]);
      } finally {
        setLoadingBudgetCodes(false);
      }
    };

    fetchBudgetCodes();
  }, [projectId]);

  // Fetch cost codes from Supabase when create budget code modal opens
  React.useEffect(() => {
    const fetchCostCodes = async () => {
      if (!showCreateBudgetCodeModal) return;

      try {
        setLoadingCostCodes(true);
        const supabaseClient = createClient();

        // Fetch cost codes from Supabase
        const { data, error } = await supabaseClient.from("cost_codes")
          .select("id, title, status, division_title")
          .eq("status", "Active")
          .order("id", { ascending: true });

        if (error) {
          return;
        }

        const codes = data || [];
        setAvailableCostCodes(codes);

        // Group cost codes by division_title
        const grouped = codes.reduce(
          (acc: Record<string, typeof codes>, code: typeof codes[0]) => {
            const divisionKey = code.division_title || "Other";
            if (!acc[divisionKey]) {
              acc[divisionKey] = [];
            }
            acc[divisionKey].push(code);
            return acc;
          },
          {} as Record<string, typeof codes>,
        );

        setGroupedCostCodes(grouped);
      } catch (error) {

        console.error("Failed to fetch form data:", error);

        // Intentionally swallowed: component shows appropriate state on error

      } finally {
        setLoadingCostCodes(false);
      }
    };

    fetchCostCodes();
  }, [showCreateBudgetCodeModal]);

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Partial<Record<"number" | "title" | "executed", string>> = {};
    if (!formData.number?.trim()) {
      errors.number = "Contract # is required.";
    }
    if (!formData.title?.trim()) {
      errors.title = "Title is required.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Include the actual File objects in the submission
    const submissionData = {
      ...formData,
      attachmentFiles: attachmentFiles.length > 0 ? attachmentFiles : undefined
    };
    // Debug: Submitting with attachments count: attachmentFiles.length

    await onSubmit(submissionData as ContractFormData);
  };

  const updateFormData = (updates: Partial<ContractFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const clearValidationError = (field: "number" | "title" | "executed") => {
    setValidationErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;

    setIsCreating(true);
    try {
      const newCompany = await createCompany({
        name: newCompanyName.trim(),
      });

      if (newCompany) {
        // Set as owner/client in the form
        updateFormData({ ownerCompanyId: newCompany.id });
        toast.success("Company created");
        setNewCompanyName("");
        setShowAddCompany(false);
      }
    } catch (error) {
      console.error("Error creating company:", error);
      toast.error("Failed to create company");
    } finally {
      setIsCreating(false);
    }
  };

  // SOV handlers
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
      setIsCreating(true);

      const selectedCostCode = availableCostCodes.find(
        (cc) => cc.id === newBudgetCodeData.costCodeId,
      );
      if (!selectedCostCode) {
        toast.error("Please select a cost code");
        return;
      }

      // Call API to create project budget code
      const response = await fetch(`/api/projects/${projectId}/budget-codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      // Autopopulate the newly created budget code in the first empty row
      const firstEmptyRow = formData.sovItems?.find((row) => !row.budgetCodeId);

      if (firstEmptyRow) {
        // Populate the first empty row with the new budget code
        updateFormData({
          sovItems: formData.sovItems?.map((row) =>
            row.id === firstEmptyRow.id
              ? {
                  ...row,
                  budgetCodeId: budgetCode.id,
                  budgetCodeLabel: budgetCode.fullLabel,
                }
              : row,
          ),
        });
      } else {
        // All rows are filled, add a new row with the budget code
        const newLine: SOVLineItem = {
          id: `sov-${Date.now()}`,
          budgetCodeId: budgetCode.id,
          budgetCodeLabel: budgetCode.fullLabel,
          description: "",
          amount: 0,
          quantity: formData.accountingMethod === "unit_quantity" ? 1 : undefined,
          unitCost: formData.accountingMethod === "unit_quantity" ? 0 : undefined,
          unitOfMeasure: formData.accountingMethod === "unit_quantity" ? "" : undefined,
          billedToDate: 0,
          amountRemaining: 0,
        };
        updateFormData({ sovItems: [...(formData.sovItems || []), newLine] });
      }

      setShowCreateBudgetCodeModal(false);
      setNewBudgetCodeData({ costCodeId: "", costType: "R" });
      toast.success("Budget code created and added to form");
    } catch (error) {
      toast.error(
        `Failed to create budget code: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleBudgetCodeSelect = (rowId: string, code: BudgetCode) => {
    updateFormData({
      sovItems: formData.sovItems?.map((row) =>
        row.id === rowId
          ? { ...row, budgetCodeId: code.id, budgetCodeLabel: code.fullLabel }
          : row,
      ),
    });
    setOpenBudgetCodePopover(null);
  };

  const addSOVLine = () => {
    const isUnitQuantity = formData.accountingMethod === "unit_quantity";
    const newLine: SOVLineItem = {
      id: `sov-${Date.now()}`,
      budgetCodeId: "",
      budgetCodeLabel: "",
      description: "",
      amount: 0,
      // Only initialize quantity/unitCost in unit_quantity mode
      quantity: isUnitQuantity ? 1 : undefined,
      unitCost: isUnitQuantity ? 0 : undefined,
      unitOfMeasure: isUnitQuantity ? "" : undefined,
      billedToDate: 0,
      amountRemaining: 0,
    };
    updateFormData({ sovItems: [...(formData.sovItems || []), newLine] });
  };

  const addSOVGroup = () => {
    const newGroup: SOVLineItem = {
      id: `sov-group-${Date.now()}`,
      isGroup: true,
      description: "New Group",
      amount: 0,
      billedToDate: 0,
      amountRemaining: 0,
    };
    updateFormData({ sovItems: [...(formData.sovItems || []), newGroup] });
  };

  const updateSOVLine = (id: string, updates: Partial<SOVLineItem>) => {
    const items = formData.sovItems || [];
    const isUnitQuantity = formData.accountingMethod === "unit_quantity";
    updateFormData({
      sovItems: items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...updates,
              amount:
                isUnitQuantity && (updates.quantity || updates.unitCost)
                  ? (updates.quantity ?? item.quantity ?? 0) *
                    (updates.unitCost ?? item.unitCost ?? 0)
                  : updates.amount ?? item.amount,
            }
          : item,
      ),
    });
  };

  const removeSOVLine = (id: string) => {
    const items = formData.sovItems || [];
    updateFormData({ sovItems: items.filter((item) => item.id !== id) });
  };

  const handleImportFromBudgetSuccess = (items: unknown[]) => {
    const importedItems = Array.isArray(items) ? items : [];
    if (importedItems.length === 0) {
      return;
    }

    const mapped: SOVLineItem[] = importedItems.map((raw, index) => {
      const item = raw as {
        id?: string;
        // camelCase from budget API (new contract flow)
        costCode?: string;
        costCodeDescription?: string;
        description?: string;
        originalBudgetAmount?: number;
        costType?: string;
      };

      const label = item.costCode
        ? item.costCodeDescription
          ? `${item.costCode} - ${item.costCodeDescription}`
          : item.costCode
        : "";

      return {
        id: `sov-import-${Date.now()}-${index}`,
        budgetCodeId: item.id || item.costCode || "",
        budgetCodeLabel: label,
        description: item.costCodeDescription || item.description || item.costCode || "",
        amount: item.originalBudgetAmount || 0,
        billedToDate: 0,
        amountRemaining: item.originalBudgetAmount || 0,
      };
    });

    updateFormData({ sovItems: [...(formData.sovItems || []), ...mapped] });
    toast.success(`Imported ${mapped.length} SOV line item${mapped.length === 1 ? "" : "s"}`);
  };

  const handleFilesSelected = (files: File[]) => {
    // Add new files to our File array
    const updatedFiles = [...attachmentFiles, ...files];
    setAttachmentFiles(updatedFiles);

    // Create FileInfo objects for display
    const newFileInfos = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type
    }));
    const updatedFileInfos = [...attachmentFileInfos, ...newFileInfos];
    setAttachmentFileInfos(updatedFileInfos);

    updateFormData({ attachmentFiles: updatedFiles });
  };

  const handleFilesChanged = (fileInfos: Array<{ name: string; size: number; type: string }>) => {
    // This is called when files are removed from the UI
    // Update our FileInfo array
    setAttachmentFileInfos(fileInfos);

    // FileUploadField calls onFilesSelected and onChange during add flow.
    // Ignore add-flow onChange to avoid racing and clearing attachmentFiles.
    if (fileInfos.length >= attachmentFileInfos.length) {
      return;
    }

    // Also update the actual File array to match
    const filtered = attachmentFiles.filter((file) =>
      fileInfos.some(
        (info) => info.name === file.name && info.size === file.size,
      ),
    );
    setAttachmentFiles(filtered);
    updateFormData({ attachmentFiles: filtered });
  };

  const filteredBudgetCodes = budgetCodes.filter((code) =>
    code.fullLabel.toLowerCase().includes(budgetCodeSearchQuery.toLowerCase()),
  );

  // Auto-fill handler (development only)
  const handleAutoFill = () => {
    if (!isDevelopment) return;
    const autoFillData = getAutoFillData("primeContract");
    updateFormData(autoFillData);
  };

  // Calculate SOV totals
  const sovTotals = React.useMemo(() => {
    const items = (formData.sovItems || []).filter((item) => !item.isGroup);
    return {
      amount: items.reduce((sum, item) => sum + (item.amount || 0), 0),
      billedToDate: items.reduce(
        (sum, item) => sum + (item.billedToDate || 0),
        0,
      ),
      amountRemaining: items.reduce(
        (sum, item) => sum + ((item.amount || 0) - (item.billedToDate || 0)),
        0,
      ),
    };
  }, [formData.sovItems]);

  return (
    <Form
      className="space-y-0"
      onSubmit={handleSubmit}
      data-testid="prime-contract-form"
      data-dev-autofill-disabled
    >
      {/* ================================================================ */}
      {/* GENERAL INFORMATION */}
      {/* ================================================================ */}
      <FormSection
        title="General Information"
        description="Set the core contract details and assign primary companies."
      >
        <FormGrid columns={12} className="gap-y-8">
          {/* Row 1: Contract #, Owner/Client, Title */}
          <FormGridRow>
            <div className="col-span-12 md:col-span-4">
              <TextField
                label="Contract #"
                value={formData.number || ""}
                onChange={(e) => {
                  clearValidationError("number");
                  updateFormData({ number: e.target.value });
                }}
                placeholder="Enter contract number"
                error={validationErrors.number}
                required
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <SearchableSelect
                label="Owner/Client"
                options={companyOptions}
                value={formData.ownerCompanyId}
                onValueChange={(value) => updateFormData({ ownerCompanyId: value })}
                placeholder="Select company"
                searchPlaceholder="Search"
                disabled={companiesLoading}
                triggerTestId="owner-client-select"
                optionTestIdPrefix="owner-client-option"
                onCreateNew={() => setShowAddCompany(true)}
                createNewLabel="+ Create New Company"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <TextField
                label="Title"
                value={formData.title || ""}
                onChange={(e) => {
                  clearValidationError("title");
                  updateFormData({ title: e.target.value });
                }}
                placeholder="Enter title"
                error={validationErrors.title}
                required
              />
            </div>
          </FormGridRow>

          {/* Row 2: Status, Contractor, Architect/Engineer */}
          <FormGridRow>
            <div className="col-span-12 md:col-span-4">
              <SelectField
                label="Status"
                options={CONTRACT_STATUSES}
                value={formData.status || "draft"}
                onValueChange={(value) => updateFormData({ status: value })}
                required
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <SearchableSelect
                label="Contractor"
                options={companyOptions}
                value={formData.contractorId}
                onValueChange={(value) => updateFormData({ contractorId: value })}
                placeholder="Select contractor"
                searchPlaceholder="Search"
                disabled={companiesLoading}
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <SearchableSelect
                label="Architect/Engineer"
                options={companyOptions}
                value={formData.architectEngineerId}
                onValueChange={(value) =>
                  updateFormData({ architectEngineerId: value })
                }
                placeholder="Select architect/engineer"
                searchPlaceholder="Search"
                disabled={companiesLoading}
              />
            </div>
          </FormGridRow>

          {/* Row 3: Default Retainage, Executed */}
          <FormGridRow align="center">
            <div className="col-span-12 md:col-span-4">
              <NumberField
                label="Default Retainage"
                value={formData.defaultRetainage}
                onChange={(value) => updateFormData({ defaultRetainage: value })}
                suffix="%"
                placeholder=""
                min={0}
                max={100}
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-2">
                <Label>Executed</Label>
                <div className="flex items-center h-10">
                  <Checkbox
                    id="executed"
                    checked={formData.executed || false}
                    onCheckedChange={(checked) => {
                      clearValidationError("executed");
                      updateFormData({ executed: checked === true });
                    }}
                  />
                  <Label htmlFor="executed" className="ml-2 text-sm font-normal">
                    Contract is executed
                  </Label>
                </div>
                {validationErrors.executed && (
                  <p
                    className="text-sm text-destructive"
                    data-testid="executed-error"
                  >
                    {validationErrors.executed}
                  </p>
                )}
              </div>
            </div>
          </FormGridRow>
        </FormGrid>
      </FormSection>

      {/* ================================================================ */}
      {/* CONTRACT DATES */}
      {/* ================================================================ */}
      <FormSection
        title="Contract Dates"
        description="Track key schedule and execution milestones for this contract."
      >
        <FormGrid columns={12} className="gap-y-8">
          <FormGridRow>
            <div className="col-span-12 md:col-span-4">
              <DateField
                label="Start Date"
                value={formData.startDate}
                onChange={(date) => updateFormData({ startDate: date })}
                placeholder="mm / dd / yyyy"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <DateField
                label="Estimated Completion Date"
                value={formData.estimatedCompletionDate}
                onChange={(date) =>
                  updateFormData({ estimatedCompletionDate: date })
                }
                placeholder="mm / dd / yyyy"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label>Substantial Completion Date</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Date when work is sufficiently complete for its intended
                          use
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <DateField
                  label=""
                  value={formData.substantialCompletionDate}
                  onChange={(date) =>
                    updateFormData({ substantialCompletionDate: date })
                  }
                  placeholder="mm / dd / yyyy"
                />
              </div>
            </div>
          </FormGridRow>

          <FormGridRow>
            <div className="col-span-12 md:col-span-4">
              <DateField
                label="Actual Completion Date"
                value={formData.actualCompletionDate}
                onChange={(date) => updateFormData({ actualCompletionDate: date })}
                placeholder="mm / dd / yyyy"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <DateField
                label="Signed Contract Received Date"
                value={formData.signedContractReceivedDate}
                onChange={(date) =>
                  updateFormData({ signedContractReceivedDate: date })
                }
                placeholder="mm / dd / yyyy"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <DateField
                label="Contract Termination Date"
                value={formData.contractTerminationDate}
                onChange={(date) =>
                  updateFormData({ contractTerminationDate: date })
                }
                placeholder="mm / dd / yyyy"
              />
            </div>
          </FormGridRow>
        </FormGrid>
      </FormSection>

      <FormSection
        title="Description & Attachments"
        description="Capture narrative context and supporting files for the agreement."
      >
        <FormGrid columns={12} className="gap-y-8">
          <div className="col-span-12">
            <RichTextField
              label="Description"
              value={formData.description || ""}
              onChange={(value) => updateFormData({ description: value })}
              placeholder="Enter contract description..."
              fullWidth
            />
          </div>

          <div className="col-span-12">
            <div className="space-y-2">
              <Label>Attachments</Label>
              <FileUploadField
                label=""
                value={attachmentFileInfos}
                onChange={handleFilesChanged}
                onFilesSelected={handleFilesSelected}
                variant="minimal"
                multiple
                maxFiles={20}
                maxSize={50 * 1024 * 1024}
                hint="Attach contract documents and supporting files."
                dropzoneTestId="prime-contract-attachments-dropzone"
                inputTestId="prime-contract-attachments-input"
                fileListTestId="prime-contract-attachments-list"
              />
            </div>
          </div>
        </FormGrid>
      </FormSection>

      {/* Add New Company Dialog */}
      <Dialog open={showAddCompany} onOpenChange={setShowAddCompany}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
            <DialogDescription>
              Create a new company for the owner/client. It will be automatically added to the project directory.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="company-name">Company Name *</Label>
            <Input
              id="company-name"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="Enter company name"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddCompany(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateCompany}
              disabled={!newCompanyName.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* SCHEDULE OF VALUES */}
      {/* ================================================================ */}
      <FormSection
        title="Schedule of Values"
        description="Build line items that define contract value and billing progress."
        actions={
          <Select
            key={sovActionMenuKey}
            onValueChange={(value) => {
              if (value === "add_group") {
                addSOVGroup();
              }
              if (value === "import_budget") {
                setShowImportFromBudget(true);
              }
              setSovActionMenuKey((prev) => prev + 1);
            }}
          >
            <SelectTrigger className="h-8 w-36 border-border bg-muted">
              <SelectValue placeholder="Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add_group">Add Group</SelectItem>
              <SelectItem value="import_budget">Import from Budget</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        {/* SOV Table */}
        <div
          className="overflow-x-auto overflow-hidden rounded-lg border border-border/70 bg-muted/20"
          data-testid="sov-table"
          data-accounting-method={formData.accountingMethod}
        >
          <table className="w-full">
            <thead>
              <tr className="bg-muted/70">
                <th className="px-1 py-1.5 text-left text-[11px] font-normal normal-case tracking-normal text-muted-foreground min-w-[340px]">
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
                <th className="px-1 py-1.5 text-left text-[11px] font-normal normal-case tracking-normal text-muted-foreground min-w-[240px]">
                  Description
                </th>
                <th className="px-1 py-1.5 text-left text-[11px] font-normal normal-case tracking-normal text-muted-foreground w-36">
                  Amount
                </th>
                <th className="px-1 py-1.5 text-left text-[11px] font-normal normal-case tracking-normal text-muted-foreground w-36">
                  Billed to Date
                </th>
                <th className="px-1 py-1.5 text-left text-[11px] font-normal normal-case tracking-normal text-muted-foreground w-36">
                  Amount Remaining
                </th>
              </tr>
            </thead>
            <tbody>
              {(formData.sovItems || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center space-y-2">
                      <p className="text-sm text-muted-foreground">
                        No line items yet.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Click "Add Line Item" to get started.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                formData.sovItems?.map((item, index) => (
                  item.isGroup ? (
                    <tr
                      key={item.id}
                      className="border-b border-border bg-muted"
                      data-testid={`sov-group-${index}`}
                    >
                      <td
                        colSpan={5}
                        className="py-2 pr-3"
                      >
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateSOVLine(item.id, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Group name"
                          className="h-8 border-border bg-background font-medium"
                          data-testid="sov-group-name"
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-b-0"
                      data-testid={`sov-line-${index}`}
                    >
                      <td className="px-1 py-2 align-middle">
                        <Popover
                          open={openBudgetCodePopover === item.id}
                          onOpenChange={(open) =>
                            setOpenBudgetCodePopover(open ? item.id : null)
                          }
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              className="h-8 w-full justify-between border-border bg-muted text-left text-sm font-normal"
                              data-testid="sov-line-budget-code"
                            >
                              <span className="truncate">
                                {item.budgetCodeLabel
                                  || budgetCodes.find((c) => c.id === item.budgetCodeId)?.fullLabel
                                  || "Select budget code..."}
                              </span>
                              <Search className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[400px] p-0"
                            align="start"
                          >
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
                                        handleBudgetCodeSelect(item.id, code)
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
                                    className="text-primary"
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
                      <td className="px-1 py-2 align-middle">
                        <div className="flex items-center gap-2">
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              updateSOVLine(item.id, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Description"
                            className="h-8 border-border bg-muted"
                            data-testid="sov-line-description"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => removeSOVLine(item.id)}
                            className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                            aria-label="Remove line item"
                          >
                            ×
                          </Button>
                        </div>
                      </td>
                      <td className="px-1 py-2 align-middle">
                        <Input
                          type="number"
                          value={item.amount || ""}
                          onChange={(e) =>
                            updateSOVLine(item.id, {
                              amount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-8 border-border bg-muted text-right font-medium"
                          data-testid="sov-line-amount"
                          readOnly={
                            formData.accountingMethod === "unit_quantity"
                          }
                        />
                      </td>
                      <td className="px-1 py-2 text-right text-sm font-medium">
                        ${(item.billedToDate || 0).toFixed(2)}
                      </td>
                      <td
                        className="px-1 py-2 text-right text-sm font-medium"
                        data-testid="sov-line-amount-remaining"
                      >
                        ${((item.amount || 0) - (item.billedToDate || 0)).toFixed(2)}
                      </td>
                    </tr>
                  )
                ))
              )}
            </tbody>
            {(formData.sovItems || []).length > 0 ? (
              <tr className="hover:bg-muted">
                <td colSpan={2} className="px-1 py-3 text-xs font-semibold text-foreground">
                  Totals
                </td>
                <td
                  className="px-1 py-2 text-right text-sm font-semibold text-foreground"
                  data-testid="sov-total-amount"
                >
                  ${sovTotals.amount.toFixed(2)}
                </td>
                <td
                  className="px-1 py-2 text-right text-sm font-semibold text-foreground"
                  data-testid="sov-total-billed"
                >
                  ${sovTotals.billedToDate.toFixed(2)}
                </td>
                <td
                  className="px-1 py-2 text-right text-sm font-semibold text-foreground"
                  data-testid="sov-total-remaining"
                >
                  ${sovTotals.amountRemaining.toFixed(2)}
                </td>
              </tr>
            ) : null}
          </table>
        </div>

        <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              size="default"
              onClick={addSOVLine}
              className="h-10 gap-2 px-4"
              data-testid="sov-add-line-item"
            >
              <Plus className="h-4 w-4" />
              Add Line Item
            </Button>

            {(formData.sovItems || []).length > 1 ? (
              <div className="text-sm text-muted-foreground">
                {(formData.sovItems || []).length} line items
              </div>
            ) : null}
          </div>
        </div>

      </FormSection>

      <ImportFromBudgetModal
        open={showImportFromBudget}
        onOpenChange={setShowImportFromBudget}
        projectId={projectId}
        existingCostCodeIds={new Set(
          (formData.sovItems || []).map((item) => item.budgetCodeId).filter((id): id is string => !!id)
        )}
        onImportSuccess={(items) => handleImportFromBudgetSuccess(items as unknown[])}
      />

      {/* ================================================================ */}
      {/* INCLUSIONS & EXCLUSIONS */}
      {/* ================================================================ */}
      <FormSection
        title="Inclusions & Exclusions"
        description="Clarify scope boundaries that are included and excluded."
      >
        <FormGrid columns={12}>
          <div className="col-span-12">
            <RichTextField
              label="Inclusions"
              value={formData.inclusions || ""}
              onChange={(value) => updateFormData({ inclusions: value })}
              placeholder="Enter what is included in contract scope..."
              fullWidth
            />
          </div>
          <div className="col-span-12">
            <RichTextField
              label="Exclusions"
              value={formData.exclusions || ""}
              onChange={(value) => updateFormData({ exclusions: value })}
              placeholder="Enter what is excluded from contract scope..."
              fullWidth
            />
          </div>
        </FormGrid>
      </FormSection>

      {/* ================================================================ */}
      {/* CONTRACT PRIVACY */}
      {/* ================================================================ */}
      <FormSection
        title="Contract Privacy"
        description="Using the privacy setting allows only project admins and select non-admin users access."
        className="border-b-0 pb-0"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="private"
              checked={formData.isPrivate || false}
              onCheckedChange={(checked) =>
                updateFormData({ isPrivate: checked === true })
              }
            />
            <Label htmlFor="private" className="text-sm font-medium">
              Private
            </Label>
          </div>

          {formData.isPrivate && (
            <div className="space-y-4 pl-6 border-l-2 border-border">
              <div className="space-y-2">
                <Label>Access for Non-Admin Users</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Values" />
                  </SelectTrigger>
                  <SelectContent>
                    {userOptions.map((user) => (
                      <SelectItem key={user.value} value={user.value}>
                        {user.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allow-sov-access"
                  checked={formData.allowedUsersCanSeeSov || false}
                  onCheckedChange={(checked) =>
                    updateFormData({ allowedUsersCanSeeSov: checked === true })
                  }
                />
                <Label htmlFor="allow-sov-access" className="text-sm font-normal">
                  Allow these non-admin users to view the SOV items.
                </Label>
              </div>
            </div>
          )}
        </div>
      </FormSection>

      {/* ================================================================ */}
      {/* FORM ACTIONS */}
      {/* ================================================================ */}
      <div className="flex items-center justify-between gap-4 border-t pt-8">
        {isDevelopment ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleAutoFill}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Auto-fill
          </Button>
        ) : (
          <div />
        )}

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="default"
          >
            {isSubmitting
              ? "Creating..."
              : mode === "create"
                ? "Create"
                : "Update"}
          </Button>
        </div>
      </div>

      {/* Create Budget Code Modal */}
      <Dialog open={showCreateBudgetCodeModal} onOpenChange={setShowCreateBudgetCodeModal}>
        <DialogContent className="sm:max-w-[500px]">
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
                <div className="border rounded-md max-h-[400px] overflow-y-auto">
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
                          <div className="bg-muted">
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
                                    ? "bg-primary/10 text-primary font-medium"
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
                  setNewBudgetCodeData({ ...newBudgetCodeData, costType: value })
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
                isCreating || !newBudgetCodeData.costCodeId || !newBudgetCodeData.costType
              }
            >
              {isCreating ? "Creating..." : "Create Budget Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
