"use client";

import * as React from "react";
import { Plus, X, Check, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface BudgetCode {
  id: string;
  code: string;
  costType: string | null;
  description: string;
  fullLabel: string;
}

interface CostCodeOption {
  id: string;
  title: string | null;
  status: string | null;
  division_id: string;
  division_code: string;
  division_title: string;
}

export interface InlineLineItemData {
  budgetCodeId: string;
  budgetCodeLabel: string;
  qty: string;
  uom: string;
  unitCost: string;
  amount: string;
}

interface InlineBudgetLineItemCreatorProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: InlineLineItemData[]) => Promise<void>;
  isLocked?: boolean;
}

export function InlineBudgetLineItemCreator({
  projectId,
  isOpen,
  onClose,
  onCreate,
  isLocked = false,
}: InlineBudgetLineItemCreatorProps) {
  const [rows, setRows] = React.useState<InlineLineItemData[]>([
    {
      budgetCodeId: "",
      budgetCodeLabel: "",
      qty: "",
      uom: "",
      unitCost: "",
      amount: "0.00",
    },
  ]);

  const [budgetCodes, setBudgetCodes] = React.useState<BudgetCode[]>([]);
  const [loadingCodes, setLoadingCodes] = React.useState(false);
  const [openPopoverId, setOpenPopoverId] = React.useState<number | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [currentRowIndex, setCurrentRowIndex] = React.useState<number | null>(null);

  // Budget Code creation modal state
  const [showCreateCodeModal, setShowCreateCodeModal] = React.useState(false);
  const [newCodeData, setNewCodeData] = React.useState({
    costCodeId: "",
    costType: "",
  });
  const [availableCostCodes, setAvailableCostCodes] = React.useState<
    CostCodeOption[]
  >([]);
  const [loadingCostCodes, setLoadingCostCodes] = React.useState(false);
  const [expandedDivisions, setExpandedDivisions] = React.useState<Set<string>>(
    new Set()
  );
  const [groupedCostCodes, setGroupedCostCodes] = React.useState<
    Record<string, CostCodeOption[]>
  >({});

  // Smart defaults toggle
  const [smartCopyUOM, setSmartCopyUOM] = React.useState(true);

  // Fetch budget codes
  React.useEffect(() => {
    const fetchBudgetCodes = async () => {
      if (!projectId || !isOpen) return;

      try {
        setLoadingCodes(true);
        const response = await fetch(`/api/projects/${projectId}/budget-codes`);

        if (!response.ok) {
          throw new Error("Failed to load budget codes");
        }

        const { budgetCodes } = await response.json();
        setBudgetCodes(budgetCodes || []);
      } catch (error) {
        setBudgetCodes([]);
      } finally {
        setLoadingCodes(false);
      }
    };

    fetchBudgetCodes();
  }, [projectId, isOpen]);

  // Fetch cost codes when modal opens
  React.useEffect(() => {
    const fetchCostCodes = async () => {
      if (!showCreateCodeModal) return;

      try {
        setLoadingCostCodes(true);
        const supabase = createClient();

        const { data, error } = await supabase
          .from("cost_codes")
          .select(
            `
            id,
            title,
            status,
            division_id,
            cost_code_divisions!inner (
              code,
              title
            )
          `
          )
          .order("id", { ascending: true });

        if (error) {
          console.error("Error fetching cost codes:", error);
          return;
        }

        const codesWithDivisions: CostCodeOption[] =
          data
            ?.filter((code) => code.title !== null && code.title !== "")
            .map((code) => {
              const division = Array.isArray(code.cost_code_divisions)
                ? code.cost_code_divisions[0]
                : code.cost_code_divisions;

              return {
                id: code.id,
                title: code.title || "",
                status: code.status,
                division_id: code.division_id,
                division_code: division?.code || "",
                division_title: division?.title || "",
              };
            }) ?? [];

        setAvailableCostCodes(codesWithDivisions);

        // Group cost codes by division
        const grouped = codesWithDivisions.reduce(
          (acc, code) => {
            const divisionKey = code.division_title || "Other";
            if (!acc[divisionKey]) {
              acc[divisionKey] = [];
            }
            acc[divisionKey].push(code);
            return acc;
          },
          {} as Record<string, CostCodeOption[]>
        );

        setGroupedCostCodes(grouped);
      } finally {
        setLoadingCostCodes(false);
      }
    };

    fetchCostCodes();
  }, [showCreateCodeModal]);

  const calculateAmount = (qty: string, unitCost: string): string => {
    const qtyNum = parseFloat(qty) || 0;
    const costNum = parseFloat(unitCost) || 0;
    return (qtyNum * costNum).toFixed(2);
  };

  const formatCurrency = (value: string): string => {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const calculateTotal = (): number => {
    return rows.reduce((sum, row) => {
      return sum + (parseFloat(row.amount) || 0);
    }, 0);
  };

  const handleRowChange = (
    index: number,
    field: keyof InlineLineItemData,
    value: string
  ) => {
    setRows(
      rows.map((row, i) => {
        if (i !== index) return row;

        const updatedRow = { ...row, [field]: value };

        // Auto-calculate amount when qty or unitCost changes
        if (field === "qty" || field === "unitCost") {
          updatedRow.amount = calculateAmount(updatedRow.qty, updatedRow.unitCost);
        }

        return updatedRow;
      })
    );
  };

  const handleBudgetCodeSelect = (index: number, code: BudgetCode) => {
    setRows(
      rows.map((row, i) =>
        i === index
          ? { ...row, budgetCodeId: code.id, budgetCodeLabel: code.fullLabel }
          : row
      )
    );
    setOpenPopoverId(null);
  };

  const addRow = () => {
    const previousRow = rows[rows.length - 1];
    const newRowIndex = rows.length;

    // Create new row with smart defaults
    const newRow = {
      budgetCodeId: "",
      budgetCodeLabel: "",
      qty: "",
      uom: smartCopyUOM && previousRow.uom ? previousRow.uom : "",
      unitCost: "",
      amount: "0.00",
    };

    setRows([...rows, newRow]);

    // Auto-focus first input of new row after render
    setTimeout(() => {
      const firstInput = document.querySelector(
        `input[tabindex="${newRowIndex * 5 + 1}"]`
      ) as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 50);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleCreateBudgetCode = async () => {
    try {
      const selectedCostCode = availableCostCodes.find(
        (cc) => cc.id === newCodeData.costCodeId
      );
      if (!selectedCostCode) {
        toast.error("Please select a cost code");
        return;
      }

      const response = await fetch(`/api/projects/${projectId}/budget-codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cost_code_id: newCodeData.costCodeId,
          cost_type_id: newCodeData.costType,
          description: selectedCostCode.title,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create budget code");
      }

      const { budgetCode: createdCode } = await response.json();

      setBudgetCodes([...budgetCodes, createdCode]);

      // Auto-populate the newly created budget code on the row that triggered the modal
      if (currentRowIndex !== null) {
        setRows(
          rows.map((row, i) =>
            i === currentRowIndex
              ? { ...row, budgetCodeId: createdCode.id, budgetCodeLabel: createdCode.fullLabel }
              : row
          )
        );
      }

      setShowCreateCodeModal(false);
      setNewCodeData({ costCodeId: "", costType: "" });
      setCurrentRowIndex(null);
      toast.success("Budget code created and applied successfully");
    } catch (error) {
      toast.error(
        `Failed to create budget code: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleCreate = async () => {
    // Validate all rows
    const invalidRows = rows.filter(
      (row) => !row.budgetCodeId || parseFloat(row.amount) === 0
    );

    if (invalidRows.length > 0) {
      toast.error("All rows must have a budget code and a non-zero amount");
      return;
    }

    setIsCreating(true);
    try {
      await onCreate(rows);
      // Reset after successful creation
      setRows([
        {
          budgetCodeId: "",
          budgetCodeLabel: "",
          qty: "",
          uom: "",
          unitCost: "",
          amount: "0.00",
        },
      ]);
      onClose();
    } catch (error) {
      toast.error("Failed to create budget line items");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredCodes = budgetCodes.filter((code) =>
    code.fullLabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const getCostTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      L: "Labor",
      M: "Material",
      E: "Equipment",
      S: "Subcontract",
      O: "Other",
    };
    return types[type] || type;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="bg-blue-50 border-y-2 border-blue-200 p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Add Budget Line Items
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Smart Copy UOM Toggle */}
          <div className="flex gap-4 text-xs mb-2">
            <label className="flex items-center gap-2 cursor-pointer text-muted-foreground">
              <input
                type="checkbox"
                checked={smartCopyUOM}
                onChange={(e) => setSmartCopyUOM(e.target.checked)}
                className="rounded border-border"
              />
              <span>Copy UOM to new rows</span>
            </label>
          </div>

          {rows.map((row, index) => (
            <div key={index} className="bg-muted rounded-lg p-4">
              <div className="grid grid-cols-12 gap-4">
                {/* Budget Code Selector */}
                <div className="col-span-4">
                  <Label className="text-xs">Budget Code*</Label>
                  <Popover
                    open={openPopoverId === index}
                    onOpenChange={(open) => setOpenPopoverId(open ? index : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between text-left font-normal h-9"
                      >
                        <span className="truncate">
                          {row.budgetCodeLabel || "Select budget code..."}
                        </span>
                        <Search className="shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search budget codes..."
                          value={searchQuery}
                          onValueChange={setSearchQuery}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {loadingCodes ? "Loading..." : "No budget codes found."}
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredCodes.map((code) => (
                              <CommandItem
                                key={code.id}
                                value={code.fullLabel}
                                onSelect={() => handleBudgetCodeSelect(index, code)}
                              >
                                {code.fullLabel}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setCurrentRowIndex(index);
                                setOpenPopoverId(null);
                                setShowCreateCodeModal(true);
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
                </div>

                {/* Quantity */}
                <div className="col-span-2">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={row.qty}
                    onChange={(e) => handleRowChange(index, "qty", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        addRow();
                      }
                    }}
                    placeholder="0"
                    className="h-9"
                    disabled={isCreating}
                    tabIndex={index * 5 + 1}
                  />
                </div>

                {/* UOM */}
                <div className="col-span-2">
                  <Label className="text-xs">UOM</Label>
                  <Select
                    value={row.uom}
                    onValueChange={(value) => handleRowChange(index, "uom", value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EA">EA</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="SF">SF</SelectItem>
                      <SelectItem value="LF">LF</SelectItem>
                      <SelectItem value="LS">LS</SelectItem>
                      <SelectItem value="CY">CY</SelectItem>
                      <SelectItem value="TON">TON</SelectItem>
                      <SelectItem value="DAY">DAY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Unit Cost */}
                <div className="col-span-2">
                  <Label className="text-xs">Unit Cost</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={row.unitCost}
                    onChange={(e) => handleRowChange(index, "unitCost", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        addRow();
                      }
                    }}
                    placeholder="0.00"
                    className="h-9"
                    disabled={isCreating}
                    tabIndex={index * 5 + 3}
                  />
                </div>

                {/* Amount */}
                <div className="col-span-2">
                  <Label className="text-xs">Amount*</Label>
                  <div className="flex items-center gap-1">
                    <div className="relative w-full">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="text"
                        value={formatCurrency(row.amount)}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          handleRowChange(index, "amount", value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            addRow();
                          }
                        }}
                        placeholder="0.00"
                        className="h-9 font-medium pl-6"
                        disabled={isCreating}
                        tabIndex={index * 5 + 4}
                      />
                    </div>
                    {rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => removeRow(index)}
                        disabled={isCreating}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Running Total */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
              <span className="text-2xl font-bold text-blue-900">
                ${formatCurrency(calculateTotal().toString())}
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {rows.length} line item{rows.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={isCreating}
              className="gap-2"
            >
              <Plus />
              Add Row
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating || rows.every(r => !r.budgetCodeId)}
              >
                {isCreating
                  ? "Creating..."
                  : `Create ${rows.length} Line Item${rows.length > 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Budget Code Modal */}
      <Dialog open={showCreateCodeModal} onOpenChange={setShowCreateCodeModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Budget Code</DialogTitle>
            <DialogDescription>
              Add a new budget code that can be used for line items in this project.
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
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => toggleDivision(division)}
                          className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-muted transition-colors rounded-none h-auto"
                        >
                          <span className="text-sm font-semibold text-foreground">
                            {division}
                          </span>
                          {expandedDivisions.has(division) ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>

                        {expandedDivisions.has(division) && (
                          <div className="bg-muted/50">
                            {groupedCostCodes[division].map((costCode) => (
                              <Button
                                key={costCode.id}
                                type="button"
                                variant="ghost"
                                onClick={() =>
                                  setNewCodeData({
                                    ...newCodeData,
                                    costCodeId: costCode.id,
                                  })
                                }
                                className={cn(
                                  "w-full text-left px-6 py-2 text-sm hover:bg-muted transition-colors rounded-none h-auto justify-start",
                                  newCodeData.costCodeId === costCode.id &&
                                    "bg-muted text-foreground font-medium"
                                )}
                              >
                                {costCode.id} – {costCode.title}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="costType">Cost Type*</Label>
              <Select
                value={newCodeData.costType}
                onValueChange={(value) =>
                  setNewCodeData({ ...newCodeData, costType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cost type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">L - Labor</SelectItem>
                  <SelectItem value="M">M - Material</SelectItem>
                  <SelectItem value="S">S - Subcontract</SelectItem>
                  <SelectItem value="X">X - Expense</SelectItem>
                  <SelectItem value="E">E - Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm font-medium text-foreground">Preview:</p>
              <p className="text-sm text-foreground mt-1">
                {newCodeData.costCodeId ? (
                  <>
                    {newCodeData.costCodeId}.{newCodeData.costType} –{" "}
                    {availableCostCodes.find((cc) => cc.id === newCodeData.costCodeId)?.title} –{" "}
                    {getCostTypeLabel(newCodeData.costType)}
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
              onClick={() => setShowCreateCodeModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateBudgetCode}
              disabled={!newCodeData.costCodeId || !newCodeData.costType}
            >
              Create Budget Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
