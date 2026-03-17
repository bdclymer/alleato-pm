"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  ChevronsUpDown,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/table-config/formatters";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  CheckboxField,
  FileUploadField,
  Form,
  FormGrid,
  FormSection,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/forms";
import { FormActions } from "@/components/forms/FormActions";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BudgetCodeSelector } from "@/components/budget/budget-code-selector";
import { CreateBudgetCodeModal } from "@/app/(main)/[projectId]/budget/setup/components/CreateBudgetCodeModal";
import { toast } from "sonner";

type ChangeEventStatus = "open" | "pending" | "close" | "void";
type ChangeEventOrigin = "emails" | "meetings" | "rfis";
type ChangeEventType =
  | "allowance"
  | "contingency"
  | "owner_change"
  | "tbd"
  | "transfer";
type ChangeReason =
  | "allowance"
  | "backcharge"
  | "client_request"
  | "design_development"
  | "existing_condition";

export interface ChangeEventLineItem {
  budgetCode: string;
  description: string;
  vendor: string;
  contract: string;
  revenueUnitOfMeasure: string;
  revenueQuantity: number;
  revenueUnitCost: number;
  revenueRom: number;
  costQuantity: number;
  costUnitCost: number;
  costRom: number;
  nonCommittedCost: number;
}

export interface ChangeEventFormData {
  number?: string;
  contractNumber: string;
  title: string;
  status: ChangeEventStatus | string;
  origin?: ChangeEventOrigin | string;
  type?: ChangeEventType | string;
  changeReason?: ChangeReason | string;
  scope?: string;
  expectingRevenue?: boolean;
  lineItemRevenueSource?: string;
  primeContractId?: string;
  description?: string;
  notes?: string;
  estimatedImpact?: number;
  attachments: File[];
  lineItems: ChangeEventLineItem[];
}

interface ChangeEventFormProps {
  initialData?: Partial<ChangeEventFormData>;
  onSubmit: (data: ChangeEventFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  mode?: "create" | "edit";
  projectId: number;
}

interface PrimeContractOption {
  value: string;
  label: string;
}

interface VendorOption {
  id: string;
  vendor_name: string;
  company?: string;
}

interface ContractOption {
  id: string;
  label: string;
  type: "purchase_order" | "subcontract";
}

interface BudgetCodeOption {
  id: string;
  code: string;
  description: string;
  costType: string | null;
  fullLabel: string;
}

const createEmptyLineItem = (): ChangeEventLineItem => ({
  budgetCode: "",
  description: "",
  vendor: "",
  contract: "",
  revenueUnitOfMeasure: "",
  revenueQuantity: 1,
  revenueUnitCost: 0,
  revenueRom: 0,
  costQuantity: 1,
  costUnitCost: 0,
  costRom: 0,
  nonCommittedCost: 0,
});

const UOM_OPTIONS = [
  "LOT",
  "EA",
  "LF",
  "SF",
  "CY",
  "SY",
  "TON",
  "GAL",
  "HR",
  "DAY",
  "WK",
  "MO",
  "LS",
];

// ---------------------------------------------------------------------------
// Vendor Combobox (inline per line item)
// ---------------------------------------------------------------------------

function VendorCombobox({
  value,
  onChange,
  vendors,
  onAddCompany,
}: {
  value: string;
  onChange: (value: string) => void;
  vendors: VendorOption[];
  onAddCompany: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const vendorListId = React.useId();
  const selected = vendors.find((v) => v.id === value);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) =>
        v.vendor_name.toLowerCase().includes(q) ||
        v.company?.toLowerCase().includes(q),
    );
  }, [vendors, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={vendorListId}
          aria-label="Select vendor"
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors",
            "focus-visible:border-neutral-400 focus-visible:outline-none",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate text-left">
            {selected ? selected.vendor_name : "Select vendor..."}
          </span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start" sideOffset={0}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search vendors..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList id={vendorListId} className="max-h-[200px]">
            <CommandEmpty>No vendors found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((vendor) => (
                <CommandItem
                  key={vendor.id}
                  value={vendor.id}
                  onSelect={() => {
                    onChange(vendor.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === vendor.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {vendor.vendor_name}
                  {vendor.company && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({vendor.company})
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  onAddCompany();
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4 text-primary" />
                <span className="font-medium text-primary">
                  Add Company to Directory
                </span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Contract Combobox (PO / Subcontract selector)
// ---------------------------------------------------------------------------

function ContractCombobox({
  value,
  onChange,
  contracts,
}: {
  value: string;
  onChange: (value: string) => void;
  contracts: ContractOption[];
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const contractListId = React.useId();
  const selected = contracts.find((c) => c.id === value);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return contracts;
    const q = search.toLowerCase();
    return contracts.filter((c) => c.label.toLowerCase().includes(q));
  }, [contracts, search]);

  const poContracts = filtered.filter((c) => c.type === "purchase_order");
  const subContracts = filtered.filter((c) => c.type === "subcontract");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={contractListId}
          aria-label="Select contract"
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors",
            "focus-visible:border-neutral-400 focus-visible:outline-none",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate text-left">
            {selected ? selected.label : "Select contract..."}
          </span>
          <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start" sideOffset={0}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search POs & subcontracts..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList id={contractListId} className="max-h-[200px]">
            <CommandEmpty>No contracts found.</CommandEmpty>
            {poContracts.length > 0 && (
              <CommandGroup heading="Purchase Orders">
                {poContracts.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => {
                      onChange(c.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === c.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {c.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {subContracts.length > 0 && (
              <CommandGroup heading="Subcontracts">
                {subContracts.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => {
                      onChange(c.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === c.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {c.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Add Company Modal
// ---------------------------------------------------------------------------

function AddCompanyModal({
  open,
  onOpenChange,
  projectId,
  onCompanyAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onCompanyAdded: () => void;
}) {
  const [companyName, setCompanyName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!companyName.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName.trim() }),
      });
      if (response.ok) {
        setCompanyName("");
        onOpenChange(false);
        onCompanyAdded();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Add Company to Directory</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a new company to the project directory so it can be selected as a vendor.
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCompanyName("");
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!companyName.trim() || saving}
          >
            {saving ? "Adding..." : "Add Company"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Form
// ---------------------------------------------------------------------------

export function ChangeEventForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode = "create",
  projectId,
}: ChangeEventFormProps) {
  const [formData, setFormData] = React.useState<ChangeEventFormData>({
    contractNumber: initialData?.contractNumber || initialData?.number || "",
    title: initialData?.title || "",
    status: initialData?.status || "open",
    origin: initialData?.origin,
    type: initialData?.type,
    changeReason: initialData?.changeReason,
    scope: initialData?.scope || "",
    expectingRevenue: initialData?.expectingRevenue ?? true,
    lineItemRevenueSource: initialData?.lineItemRevenueSource || "",
    primeContractId: initialData?.primeContractId || "",
    description: initialData?.description || "",
    attachments: initialData?.attachments || [],
    lineItems:
      initialData?.lineItems && initialData.lineItems.length > 0
        ? initialData.lineItems
        : [createEmptyLineItem()],
  });

  const [errors, setErrors] = React.useState<
    Partial<Record<keyof ChangeEventFormData, string>>
  >({});
  const [primeContractOptions, setPrimeContractOptions] = React.useState<
    PrimeContractOption[]
  >([]);
  const [vendors, setVendors] = React.useState<VendorOption[]>([]);
  const [contracts, setContracts] = React.useState<ContractOption[]>([]);
  const [budgetCodes, setBudgetCodes] = React.useState<BudgetCodeOption[]>([]);
  const [addCompanyOpen, setAddCompanyOpen] = React.useState(false);
  const [showCreateBudgetCodeModal, setShowCreateBudgetCodeModal] =
    React.useState(false);
  const [targetBudgetCodeRowIndex, setTargetBudgetCodeRowIndex] =
    React.useState<number | null>(null);

  // Fetch dropdown options
  const fetchVendors = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/vendors`);
      if (!response.ok) return;
      const data = await response.json();
      setVendors(Array.isArray(data) ? data : data.data || []);
    } catch {
      setVendors([]);
    }
  }, [projectId]);

  const fetchBudgetCodes = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget-codes`);
      if (!response.ok) return;
      const payload = await response.json();
      const codes = (payload.budgetCodes || payload.data || []) as Array<{
        id: string;
        code: string;
        description?: string;
        costType?: string | null;
        fullLabel?: string;
      }>;
      setBudgetCodes(
        codes.map((bc) => ({
          id: bc.id,
          code: bc.code,
          description: bc.description || "",
          costType: bc.costType || null,
          fullLabel:
            bc.fullLabel || `${bc.code}${bc.description ? ` - ${bc.description}` : ""}`,
        })),
      );
    } catch {
      setBudgetCodes([]);
    }
  }, [projectId]);

  React.useEffect(() => {
    const fetchAll = async () => {
      // Prime contracts
      try {
        const response = await fetch(`/api/projects/${projectId}/contracts`);
        if (response.ok) {
          const payload = await response.json();
          const records = (
            Array.isArray(payload)
              ? payload
              : Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload?.contracts)
                  ? payload.contracts
                  : []
          ) as Array<{
            id: number | string;
            contract_number?: string;
            number?: string;
            title?: string;
            description?: string;
          }>;
          setPrimeContractOptions(
            records
              .filter((record) => record.id !== undefined && record.id !== null)
              .map((record) => ({
                value: String(record.id),
                label: `${record.contract_number || record.number || "PC"} - ${record.title || record.description || "Untitled"}`,
              })),
          );
        }
      } catch {
        setPrimeContractOptions([]);
      }

      // Vendors
      await fetchVendors();

      // Purchase orders + subcontracts → contracts
      try {
        const [poRes, subRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/purchase-orders`),
          fetch(`/api/projects/${projectId}/subcontracts`),
        ]);

        const contractList: ContractOption[] = [];

        if (poRes.ok) {
          const poPayload = await poRes.json();
          const poData = poPayload.data || poPayload || [];
          for (const po of poData) {
            contractList.push({
              id: `po-${po.id}`,
              label: `${po.contract_number || po.number || "PO"} - ${po.title || "Untitled"}`,
              type: "purchase_order",
            });
          }
        }

        if (subRes.ok) {
          const subPayload = await subRes.json();
          const subData = subPayload.data || subPayload || [];
          for (const sub of subData) {
            contractList.push({
              id: `sub-${sub.id}`,
              label: `${sub.contract_number || sub.number || "SC"} - ${sub.title || "Untitled"}`,
              type: "subcontract",
            });
          }
        }

        setContracts(contractList);
      } catch {
        setContracts([]);
      }

      // Budget codes
      await fetchBudgetCodes();
    };

    fetchAll();
  }, [projectId, fetchVendors, fetchBudgetCodes]);

  const handleBudgetCodeCreated = React.useCallback(
    async (budgetCodeId: string) => {
      await fetchBudgetCodes();
      if (targetBudgetCodeRowIndex !== null && budgetCodeId) {
        updateLineItem(targetBudgetCodeRowIndex, "budgetCode", budgetCodeId);
      }
      setTargetBudgetCodeRowIndex(null);
      toast.success("Budget code created successfully");
    },
    [fetchBudgetCodes, targetBudgetCodeRowIndex],
  );

  const updateFormData = (updates: Partial<ChangeEventFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setErrors((prev) => {
      const next = { ...prev };
      (Object.keys(updates) as Array<keyof ChangeEventFormData>).forEach(
        (key) => {
          delete next[key];
        },
      );
      return next;
    });
  };

  const updateLineItem = (
    index: number,
    key: keyof ChangeEventLineItem,
    value: string | number,
  ) => {
    setFormData((prev) => {
      const nextItems = [...prev.lineItems];
      const current = { ...nextItems[index], [key]: value };

      if (key === "revenueQuantity" || key === "revenueUnitCost") {
        current.revenueRom =
          Number(current.revenueQuantity || 0) *
          Number(current.revenueUnitCost || 0);
      }
      if (key === "costQuantity" || key === "costUnitCost") {
        current.costRom =
          Number(current.costQuantity || 0) *
          Number(current.costUnitCost || 0);
      }

      nextItems[index] = current;
      return { ...prev, lineItems: nextItems };
    });
  };

  const addLineItem = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, createEmptyLineItem()],
    }));
  };

  const removeLineItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      lineItems:
        prev.lineItems.length > 1
          ? prev.lineItems.filter((_, i) => i !== index)
          : [createEmptyLineItem()],
    }));
  };

  const addAttachments = (files: FileList | null) => {
    if (!files) return;
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...Array.from(files)],
    }));
  };

  const removeAttachment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof ChangeEventFormData, string>> = {};

    if (!formData.contractNumber.trim()) {
      nextErrors.contractNumber = "Contract number is required";
    }
    if (!formData.title.trim()) {
      nextErrors.title = "Title is required";
    }
    if (!formData.status) {
      nextErrors.status = "Status is required";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit(formData);
  };

  const attachmentsAsInfo = React.useMemo(
    () =>
      formData.attachments.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    [formData.attachments],
  );

  const statusOptions = React.useMemo(
    () => [
      { value: "close", label: "Close" },
      { value: "open", label: "Open" },
      { value: "pending", label: "Pending" },
      { value: "void", label: "Void" },
    ],
    [],
  );

  const originOptions = React.useMemo(
    () => [
      { value: "emails", label: "Emails" },
      { value: "meetings", label: "Meetings" },
      { value: "rfis", label: "RFI's" },
    ],
    [],
  );

  const typeOptions = React.useMemo(
    () => [
      { value: "allowance", label: "Allowance" },
      { value: "contingency", label: "Contingency" },
      { value: "owner_change", label: "Owner Change" },
      { value: "tbd", label: "TBD" },
      { value: "transfer", label: "Transfer" },
    ],
    [],
  );

  const changeReasonOptions = React.useMemo(
    () => [
      { value: "allowance", label: "Allowance" },
      { value: "backcharge", label: "Backcharge" },
      { value: "client_request", label: "Client Request" },
      { value: "design_development", label: "Design Development" },
      { value: "existing_condition", label: "Existing Condition" },
    ],
    [],
  );

  const scopeOptions = React.useMemo(
    () => [
      { value: "In Scope", label: "In Scope" },
      { value: "Out of Scope", label: "Out of Scope" },
      { value: "To Be Determined", label: "To Be Determined" },
    ],
    [],
  );

  const revenueSourceOptions = React.useMemo(
    () => [
      { value: "match_latest_cost", label: "Match Latest Cost" },
      { value: "latest_cost", label: "Latest Cost" },
      { value: "latest_price", label: "Latest Price" },
    ],
    [],
  );

  const primeContractSelectOptions = React.useMemo(
    () =>
      primeContractOptions.map((option) => ({
      value: option.value,
      label: option.label,
      })),
    [primeContractOptions],
  );

  return (
    <>
      <AddCompanyModal
        open={addCompanyOpen}
        onOpenChange={setAddCompanyOpen}
        projectId={projectId}
        onCompanyAdded={fetchVendors}
      />

      <Form
        onSubmit={handleSubmit}
        data-dev-autofill-disabled="true"
        data-form-id="change-event-create"
      >
        <div className="space-y-4">
          {/* ── General Information ── */}
          <FormSection title="General Information">
            <FormGrid columns={3}>
              <TextField
                label="Contract Number"
                required
                value={formData.contractNumber}
                onChange={(e) => updateFormData({ contractNumber: e.target.value })}
                placeholder="Enter contract number"
                error={errors.contractNumber}
              />
              <TextField
                label="Title"
                required
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                placeholder="Enter title"
                error={errors.title}
              />
              <SelectField
                label="Status"
                required
                options={statusOptions}
                value={formData.status}
                onValueChange={(value) => updateFormData({ status: value as ChangeEventStatus })}
                error={errors.status}
              />

              <SelectField
                label="Origin"
                options={originOptions}
                value={formData.origin || ""}
                onValueChange={(value) => updateFormData({ origin: value as ChangeEventOrigin })}
                placeholder="Select Origin"
              />
              <SelectField
                label="Type"
                options={typeOptions}
                value={formData.type || ""}
                onValueChange={(value) => updateFormData({ type: value as ChangeEventType })}
                placeholder="Select Type"
              />
              <SelectField
                label="Change Reason"
                options={changeReasonOptions}
                value={formData.changeReason || ""}
                onValueChange={(value) => updateFormData({ changeReason: value as ChangeReason })}
                placeholder="Select Change Reason"
              />

              <SelectField
                label="Scope"
                options={scopeOptions}
                value={formData.scope || ""}
                onValueChange={(value) => updateFormData({ scope: value })}
                placeholder="Select Scope"
              />
              <SelectField
                label="Line Item Revenue Source"
                options={revenueSourceOptions}
                value={formData.lineItemRevenueSource || ""}
                onValueChange={(value) => updateFormData({ lineItemRevenueSource: value })}
                placeholder="Select Revenue Source"
              />
              <SelectField
                label="Prime Contract For Markup Estimates"
                options={primeContractSelectOptions}
                value={formData.primeContractId || ""}
                onValueChange={(value) => updateFormData({ primeContractId: value })}
                placeholder="Select Prime Contract"
                disabled={primeContractOptions.length === 0}
              />

              <div className="md:col-span-3">
                <TextareaField
                  label="Description"
                  rows={4}
                  value={formData.description || ""}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  placeholder="Describe the change event"
                />
              </div>
              <div className="md:col-span-3">
                <CheckboxField
                  label="Expecting Revenue"
                  checked={!!formData.expectingRevenue}
                  onCheckedChange={(checked) =>
                    updateFormData({ expectingRevenue: checked === true })
                  }
                  hint="Enable revenue fields"
                />
              </div>
            </FormGrid>
          </FormSection>

          {/* ── Line Items ── */}
          <FormSection title="Line Items">

            <TooltipProvider>
            <div className="overflow-x-auto overflow-hidden rounded-lg border border-border/70 bg-muted/20">
              <Table>
                <TableHeader className="border-y-0 [&_tr]:border-b-0">
                  {/* Group headers */}
                  <TableRow className="border-b-0 bg-muted/70 hover:bg-muted/70">
                    <TableHead className="w-[40px] px-1.5 py-1.5" />
                    <TableHead colSpan={4} className="px-1 py-1 text-xs font-semibold normal-case tracking-normal text-muted-foreground">
                      Detail
                    </TableHead>
                    <TableHead colSpan={4} className="px-1 py-1 text-xs font-semibold normal-case tracking-normal text-muted-foreground">
                      Revenue
                    </TableHead>
                    <TableHead colSpan={3} className="px-1 py-1 text-xs font-semibold normal-case tracking-normal text-muted-foreground">
                      Cost
                    </TableHead>
                    <TableHead className="px-1 py-1" />
                    <TableHead className="w-12 px-1 py-1" />
                  </TableRow>
                  {/* Column headers */}
                  <TableRow className="border-b-0 bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[36px] px-1 py-1.5" />
                    <TableHead className="min-w-52 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Budget Code</TableHead>
                    <TableHead className="min-w-40 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Description</TableHead>
                    <TableHead className="min-w-40 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Vendor</TableHead>
                    <TableHead className="min-w-40 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Contract</TableHead>
                    <TableHead className="w-28 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help border-b border-dotted border-muted-foreground">UOM</span>
                        </TooltipTrigger>
                        <TooltipContent>Unit of Measure</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="w-40 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help border-b border-dotted border-muted-foreground">Qty</span>
                        </TooltipTrigger>
                        <TooltipContent>Revenue quantity for this line item</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="w-56 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Unit Cost</TableHead>
                    <TableHead className="w-36 px-1 py-1.5 text-right text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Revenue ROM</TableHead>
                    <TableHead className="w-40 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help border-b border-dotted border-muted-foreground">Qty</span>
                        </TooltipTrigger>
                        <TooltipContent>Cost quantity for this line item</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="w-56 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Unit Cost</TableHead>
                    <TableHead className="w-36 px-1 py-1.5 text-right text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Cost ROM</TableHead>
                    <TableHead className="w-44 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Non-committed $</TableHead>
                    <TableHead className="w-12 px-1 py-1.5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.lineItems.map((item, index) => (
                    <TableRow
                      key={`line-item-${index}`}
                      className="group border-b border-border/60 bg-background transition-colors hover:bg-muted/20"
                    >
                      {/* Drag handle */}
                      <TableCell className="w-9 px-1 py-1.5 align-top">
                        <div className="mt-1 cursor-grab rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted active:cursor-grabbing">
                          <GripVertical className="h-4 w-4" />
                        </div>
                      </TableCell>

                      {/* Budget Code */}
                      <TableCell className="min-w-52 px-1 py-1.5 align-top">
                        <BudgetCodeSelector
                          value={item.budgetCode || ""}
                          onValueChange={(value) =>
                            updateLineItem(index, "budgetCode", value)
                          }
                          budgetCodes={budgetCodes}
                          onCreateNew={() => {
                            setTargetBudgetCodeRowIndex(index);
                            setShowCreateBudgetCodeModal(true);
                          }}
                          placeholder="Select budget code..."
                        />
                      </TableCell>

                      {/* Description */}
                      <TableCell className="min-w-40 px-1 py-1.5 align-top">
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(index, "description", e.target.value)
                          }
                          placeholder="Enter description"
                        />
                      </TableCell>

                      {/* Vendor */}
                      <TableCell className="min-w-40 px-1 py-1.5 align-top">
                        <VendorCombobox
                          value={item.vendor}
                          onChange={(value) =>
                            updateLineItem(index, "vendor", value)
                          }
                          vendors={vendors}
                          onAddCompany={() => setAddCompanyOpen(true)}
                        />
                      </TableCell>

                      {/* Contract */}
                      <TableCell className="min-w-40 px-1 py-1.5 align-top">
                        <ContractCombobox
                          value={item.contract}
                          onChange={(value) =>
                            updateLineItem(index, "contract", value)
                          }
                          contracts={contracts}
                        />
                      </TableCell>

                      {/* Revenue: UOM */}
                      <TableCell className="w-28 px-1 py-1.5 align-top">
                        <Select
                          value={item.revenueUnitOfMeasure || ""}
                          onValueChange={(value) =>
                            updateLineItem(index, "revenueUnitOfMeasure", value)
                          }
                        >
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {UOM_OPTIONS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Revenue: Quantity */}
                      <TableCell className="w-40 px-1 py-1.5 align-top">
                        <Input
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min="0"
                          className="min-w-[96px] text-right"
                          value={Number.isFinite(item.revenueQuantity) ? Math.trunc(item.revenueQuantity) : 1}
                          onChange={(e) =>
                            updateLineItem(
                              index,
                              "revenueQuantity",
                              e.target.value === "" ? 1 : Math.max(0, parseInt(e.target.value, 10) || 1),
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          placeholder="1"
                        />
                      </TableCell>

                      {/* Revenue: Unit Cost */}
                      <TableCell className="w-56 px-1 py-1.5 align-top">
                        <InputGroup>
                          <InputGroupAddon>$</InputGroupAddon>
                          <InputGroupInput
                            type="number"
                            step="0.01"
                            className="h-9 min-w-[120px] text-right"
                            value={item.revenueUnitCost ?? ""}
                            onChange={(e) =>
                              updateLineItem(
                                index,
                                "revenueUnitCost",
                                Number(e.target.value) || 0,
                              )
                            }
                            onFocus={(e) => e.target.select()}
                            placeholder="0.00"
                          />
                        </InputGroup>
                      </TableCell>

                      {/* Revenue ROM (computed) */}
                      <TableCell className="w-36 px-1 py-1.5 align-top">
                        <div
                          className={cn(
                            "pt-2 text-right text-sm font-semibold",
                            item.revenueRom > 0
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatCurrency(item.revenueRom)}
                        </div>
                      </TableCell>

                      {/* Cost: Quantity */}
                      <TableCell className="w-40 px-1 py-1.5 align-top">
                        <Input
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min="0"
                          className="min-w-[96px] text-right"
                          value={Number.isFinite(item.costQuantity) ? Math.trunc(item.costQuantity) : 1}
                          onChange={(e) =>
                            updateLineItem(
                              index,
                              "costQuantity",
                              e.target.value === "" ? 1 : Math.max(0, parseInt(e.target.value, 10) || 1),
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          placeholder="1"
                        />
                      </TableCell>

                      {/* Cost: Unit Cost */}
                      <TableCell className="w-56 px-1 py-1.5 align-top">
                        <InputGroup>
                          <InputGroupAddon>$</InputGroupAddon>
                          <InputGroupInput
                            type="number"
                            step="0.01"
                            className="h-9 min-w-[120px] text-right"
                            value={item.costUnitCost ?? ""}
                            onChange={(e) =>
                              updateLineItem(
                                index,
                                "costUnitCost",
                                Number(e.target.value) || 0,
                              )
                            }
                            onFocus={(e) => e.target.select()}
                            placeholder="0.00"
                          />
                        </InputGroup>
                      </TableCell>

                      {/* Cost ROM (computed) */}
                      <TableCell className="w-36 px-1 py-1.5 align-top">
                        <div
                          className={cn(
                            "pt-2 text-right text-sm font-semibold",
                            item.costRom > 0
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatCurrency(item.costRom)}
                        </div>
                      </TableCell>

                      {/* Non-committed cost */}
                      <TableCell className="w-44 px-1 py-1.5 align-top">
                        <InputGroup>
                          <InputGroupAddon>$</InputGroupAddon>
                          <InputGroupInput
                            type="number"
                            step="0.01"
                            className="h-9 min-w-[120px] text-right"
                            value={item.nonCommittedCost ?? ""}
                            onChange={(e) =>
                              updateLineItem(
                                index,
                                "nonCommittedCost",
                                Number(e.target.value) || 0,
                              )
                            }
                            onFocus={(e) => e.target.select()}
                            placeholder="0.00"
                          />
                        </InputGroup>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="w-12 px-1 py-1.5 align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                          disabled={formData.lineItems.length === 1}
                          className="h-7 w-7 p-0 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="hover:bg-muted">
                    <TableCell className="px-1.5 py-2" />
                    <TableCell colSpan={4} className="px-1.5 py-3 text-xs font-semibold text-foreground">
                      Totals
                    </TableCell>
                    <TableCell colSpan={3} className="px-1.5 py-2" />
                    <TableCell className="px-1.5 py-2 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(formData.lineItems.reduce((sum, i) => sum + (i.revenueRom || 0), 0))}
                    </TableCell>
                    <TableCell colSpan={2} className="px-1.5 py-3" />
                    <TableCell className="px-1.5 py-2 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(formData.lineItems.reduce((sum, i) => sum + (i.costRom || 0), 0))}
                    </TableCell>
                    <TableCell className="px-1.5 py-3 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(formData.lineItems.reduce((sum, i) => sum + (i.nonCommittedCost || 0), 0))}
                    </TableCell>
                    <TableCell className="px-1.5 py-2" />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            </TooltipProvider>

            <div className="flex items-center gap-4">
              <Button
                type="button"
                onClick={addLineItem}
                className="h-10 gap-2 bg-primary px-4 text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add Line Item
              </Button>
              {formData.lineItems.length > 1 && (
                <span className="text-sm text-muted-foreground">
                  {formData.lineItems.length} line items
                </span>
              )}
            </div>
          </FormSection>

          {/* ── Attachments ── */}
          <FormSection title="Attachments">
            <FileUploadField
              label="Attach Files"
              value={attachmentsAsInfo}
              multiple
              variant="minimal"
              onFilesSelected={(files) => {
                updateFormData({
                  attachments: [...formData.attachments, ...files],
                });
              }}
              onChange={(nextFiles) => {
                const remaining = nextFiles.map(
                  (f) => `${f.name}:${f.size}:${f.type || ""}`,
                );
                updateFormData({
                  attachments: formData.attachments.filter((file) =>
                    remaining.includes(`${file.name}:${file.size}:${file.type || ""}`),
                  ),
                });
              }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.heic,.csv"
              maxSize={25 * 1024 * 1024}
            />
          </FormSection>

          {/* ── Submit Bar ── */}
          <FormActions
            onCancel={onCancel}
            isSubmitting={isSubmitting}
            submitLabel={mode === "create" ? "Create Change Event" : "Update Change Event"}
          >
            <p className="text-sm text-muted-foreground">
              <span className="text-destructive">*</span> Required fields
            </p>
          </FormActions>
        </div>
      </Form>

      <CreateBudgetCodeModal
        open={showCreateBudgetCodeModal}
        onOpenChange={(open) => {
          setShowCreateBudgetCodeModal(open);
          if (!open) {
            setTargetBudgetCodeRowIndex(null);
          }
        }}
        projectId={String(projectId)}
        onSuccess={handleBudgetCodeCreated}
      />
    </>
  );
}
