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

  // Budget Code creation modal state
  const [showCreateCodeModal, setShowCreateCodeModal] = React.useState(false);
  const [newCodeData, setNewCodeData] = React.useState({
    costCodeId: "",
    costType: "L",
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
    setRows([
      ...rows,
      {
        budgetCodeId: "",
        budgetCodeLabel: "",
        qty: "",
        uom: "",
        unitCost: "",
        amount: "0.00",
      },
    ]);
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
      setShowCreateCodeModal(false);
      setNewCodeData({ costCodeId: "", costType: "L" });
      toast.success("Budget code created successfully");
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
            <h3 className="text-sm font-semibold text-gray-900">
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

          {rows.map((row, index) => (
            <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="grid grid-cols-12 gap-3">
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
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                                setOpenPopoverId(null);
                                setShowCreateCodeModal(true);
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
                </div>

                {/* Quantity */}
                <div className="col-span-2">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={row.qty}
                    onChange={(e) => handleRowChange(index, "qty", e.target.value)}
                    placeholder="0"
                    className="h-9"
                    disabled={isCreating}
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
                    placeholder="0.00"
                    className="h-9"
                    disabled={isCreating}
                  />
                </div>

                {/* Amount */}
                <div className="col-span-2">
                  <Label className="text-xs">Amount*</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => handleRowChange(index, "amount", e.target.value)}
                      placeholder="0.00"
                      className="h-9 font-medium"
                      disabled={isCreating}
                    />
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

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={isCreating}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
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
                <div className="border rounded-md p-3 text-sm text-muted-foreground">
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
                          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted transition-colors"
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
                                  setNewCodeData({
                                    ...newCodeData,
                                    costCodeId: costCode.id,
                                  })
                                }
                                className={cn(
                                  "w-full text-left px-6 py-2 text-sm hover:bg-muted transition-colors",
                                  newCodeData.costCodeId === costCode.id &&
                                    "bg-blue-50 text-blue-700 font-medium"
                                )}
                              >
                                {costCode.id} – {costCode.title}
                              </button>
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">L - Labor</SelectItem>
                  <SelectItem value="M">M - Material</SelectItem>
                  <SelectItem value="E">E - Equipment</SelectItem>
                  <SelectItem value="S">S - Subcontract</SelectItem>
                  <SelectItem value="O">O - Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted rounded-md">
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