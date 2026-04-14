"use client";

import * as React from "react";
import {
  Plus,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { MoneyField } from "@/components/forms/MoneyField";
import { Checkbox } from "@/components/ui/checkbox";
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
  BaseSidebar,
  SidebarBody,
  SidebarFooter,
} from "@/components/budget/modals/BaseSidebar";
import {
  BaseModal,
  ModalBody,
  ModalFooter,
} from "@/components/budget/modals/BaseModal";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface BudgetCode {
  id: string;
  code: string;
  costType: string | null;
  costTypeId: string | null;
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
  costCodeId: string;
  costTypeId: string | null;
  qty: string;
  uom: string;
  unitCost: string;
  amount: string;
}

interface BudgetLineItemCreatorModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: InlineLineItemData[]) => Promise<void>;
  isLocked?: boolean;
}

export function BudgetLineItemCreatorModal({
  projectId,
  isOpen,
  onClose,
  onCreate,
  isLocked = false,
}: BudgetLineItemCreatorModalProps) {
  const [rows, setRows] = React.useState<InlineLineItemData[]>([
    {
      budgetCodeId: "",
      budgetCodeLabel: "",
      costCodeId: "",
      costTypeId: null,
      qty: "1",
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
  const [smartCopyUOM, setSmartCopyUOM] = React.useState(true);
  const [pendingRowIndex, setPendingRowIndex] = React.useState<number | null>(
    null,
  );
  const [negativeAmountRows, setNegativeAmountRows] = React.useState<
    Set<number>
  >(new Set());

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
    new Set(),
  );
  const [groupedCostCodes, setGroupedCostCodes] = React.useState<
    Record<string, CostCodeOption[]>
  >({});

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setRows([
        {
          budgetCodeId: "",
          budgetCodeLabel: "",
          costCodeId: "",
          costTypeId: null,
          qty: "1",
          uom: "",
          unitCost: "",
          amount: "0.00",
        },
      ]);
      setSearchQuery("");
      setOpenPopoverId(null);
      setPendingRowIndex(null);
      setNegativeAmountRows(new Set());
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!showCreateCodeModal) {
      setPendingRowIndex(null);
    }
  }, [showCreateCodeModal]);

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

  // Fetch cost codes when create code modal opens
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
          `,
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
          {} as Record<string, CostCodeOption[]>,
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
    value: string,
  ) => {
    const updatedRows = rows.map((row, i) => {
      if (i !== index) return row;

      const updatedRow = { ...row, [field]: value };

      // Auto-calculate amount when qty or unitCost changes
      if (field === "qty" || field === "unitCost") {
        updatedRow.amount = calculateAmount(
          updatedRow.qty,
          updatedRow.unitCost,
        );
      }

      return updatedRow;
    });

    setRows(updatedRows);

    // Check for negative amounts
    const updatedRow = updatedRows[index];
    if (updatedRow) {
      const amountValue = parseFloat(updatedRow.amount);
      setNegativeAmountRows((prev) => {
        const next = new Set(prev);
        if (amountValue < 0) {
          next.add(index);
        } else {
          next.delete(index);
        }
        return next;
      });
    }
  };

  const handleBudgetCodeSelect = (index: number, code: BudgetCode) => {
    setRows(
      rows.map((row, i) =>
        i === index
          ? {
              ...row,
              budgetCodeId: code.id,
              budgetCodeLabel: code.fullLabel,
              costCodeId: code.code,
              costTypeId: code.costTypeId,
            }
          : row,
      ),
    );
    setOpenPopoverId(null);
  };

  // Helper function for currency formatting
  const formatCurrency = (value: string): string => {
    const num = parseFloat(value) || 0;
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calculate total amount across all rows
  const calculateTotal = (): number => {
    return rows.reduce((sum, row) => {
      return sum + (parseFloat(row.amount) || 0);
    }, 0);
  };

  const addRow = () => {
    const previousRow = rows[rows.length - 1];
    const newRowIndex = rows.length;

    const newRow = {
      budgetCodeId: "",
      budgetCodeLabel: "",
      costCodeId: "",
      costTypeId: null,
      qty: "1",
      uom: smartCopyUOM && previousRow.uom ? previousRow.uom : "",
      unitCost: "",
      amount: "0.00",
    };

    setRows([...rows, newRow]);

    // Auto-focus first input of new row
    setTimeout(() => {
      const firstInput = document.querySelector(
        `input[tabindex="${newRowIndex * 5 + 1}"]`,
      ) as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 50);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
    // Update negative amount tracking for shifted indices
    setNegativeAmountRows((prev) => {
      const next = new Set<number>();
      for (const idx of prev) {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      }
      return next;
    });
  };

  const handleCreateBudgetCode = async () => {
    try {
      const selectedCostCode = availableCostCodes.find(
        (cc) => cc.id === newCodeData.costCodeId,
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
        const errorData = await response.json();
        if (response.status === 409) {
          const costTypeLabel = getCostTypeLabel(newCodeData.costType);
          toast.error(
            `Budget code "${selectedCostCode.title} – ${costTypeLabel}" already exists for this project. Select it from the dropdown instead.`,
          );
          setShowCreateCodeModal(false);
          setNewCodeData({ costCodeId: "", costType: "" });
          return;
        }
        throw new Error(errorData.error || "Failed to create budget code");
      }

      const { budgetCode: createdCode } = await response.json();

      setBudgetCodes((prev) => [...prev, createdCode]);
      setRows((prev) => {
        if (pendingRowIndex !== null && prev[pendingRowIndex]) {
          return prev.map((row, i) =>
            i === pendingRowIndex
              ? {
                  ...row,
                  budgetCodeId: createdCode.id,
                  budgetCodeLabel: createdCode.fullLabel,
                  costCodeId: createdCode.code,
                  costTypeId: createdCode.costTypeId,
                }
              : row,
          );
        }

        const firstEmptyIndex = prev.findIndex((row) => !row.budgetCodeId);
        if (firstEmptyIndex >= 0) {
          return prev.map((row, i) =>
            i === firstEmptyIndex
              ? {
                  ...row,
                  budgetCodeId: createdCode.id,
                  budgetCodeLabel: createdCode.fullLabel,
                  costCodeId: createdCode.code,
                  costTypeId: createdCode.costTypeId,
                }
              : row,
          );
        }

        return [
          ...prev,
          {
            budgetCodeId: createdCode.id,
            budgetCodeLabel: createdCode.fullLabel,
            costCodeId: createdCode.code,
            costTypeId: createdCode.costTypeId,
            qty: "1",
            uom: "",
            unitCost: "",
            amount: "0.00",
          },
        ];
      });
      setShowCreateCodeModal(false);
      setNewCodeData({ costCodeId: "", costType: "" });
      toast.success("Budget code created successfully");
    } catch (error) {
      toast.error(
        `Failed to create budget code: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  };

  const handleCreate = async () => {
    // Validate all rows
    const invalidRows = rows.filter(
      (row) =>
        !row.costCodeId ||
        !row.costTypeId ||
        (parseFloat(row.qty) || 0) < 1 ||
        parseFloat(row.amount) === 0,
    );

    if (invalidRows.length > 0) {
      toast.error(
        "All rows must have a budget code, an associated cost type, quantity of at least 1, and a non-zero amount",
      );
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
          costCodeId: "",
          costTypeId: null,
          qty: "1",
          uom: "",
          unitCost: "",
          amount: "0.00",
        },
      ]);
      onClose();
      toast.success(
        `Successfully created ${rows.length} budget line item${rows.length > 1 ? "s" : ""}`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create budget line items";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  // Deduplicate budget codes (same code + costType) and filter out codes already selected in other rows
  const deduplicatedCodes = React.useMemo(() => {
    const seen = new Set<string>();
    return budgetCodes.filter((code) => {
      const key = `${code.code}|${code.costTypeId ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [budgetCodes]);

  const getAvailableCodesForRow = React.useCallback(
    (rowIndex: number) => {
      // Collect budget code IDs already selected in OTHER rows
      const selectedIds = new Set(
        rows
          .filter((r, i) => i !== rowIndex && r.budgetCodeId)
          .map((r) => r.budgetCodeId),
      );
      return deduplicatedCodes.filter(
        (code) =>
          !selectedIds.has(code.id) &&
          code.fullLabel.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    },
    [deduplicatedCodes, rows, searchQuery],
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

  return (
    <>
      <BaseSidebar
        open={isOpen}
        onClose={onClose}
        title="Add Budget Line Items"
        size="full"
      >
        <SidebarBody className="min-h-0 px-6 pb-4">
          {/* Smart Copy UOM Toggle */}
          <div className="mb-4 flex gap-4 text-xs">
            <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
              <Checkbox
                checked={smartCopyUOM}
                onCheckedChange={(checked) => setSmartCopyUOM(Boolean(checked))}
              />
              <span>Copy UOM to new rows</span>
            </label>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-8 bg-primary/5 py-2 pr-4 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground">
                    #
                  </th>
                  <th className="w-72 bg-primary/5 py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground">
                    Budget Code <span className="text-destructive">*</span>
                  </th>
                  <th className="w-24 bg-primary/5 py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground">
                    Qty
                  </th>
                  <th className="w-24 bg-primary/5 py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground">
                    UOM
                  </th>
                  <th className="w-36 bg-primary/5 py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground">
                    Unit Cost
                  </th>
                  <th className="w-36 bg-primary/5 py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground">
                    Amount <span className="text-destructive">*</span>
                  </th>
                  <th className="w-8 bg-primary/5 py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {rows.map((row, index) => (
                    <motion.tr
                      key={index}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="group border-b border-border last:border-b-0"
                    >
                      <td className="py-2 pr-4 align-middle text-sm text-muted-foreground">
                        {index + 1}
                      </td>

                      <td className="py-2 pr-3 align-middle w-72">
                        <Popover
                          open={openPopoverId === index}
                          onOpenChange={(open) =>
                            setOpenPopoverId(open ? index : null)
                          }
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-label={`Budget code for line item ${index + 1}`}
                              data-testid={`budget-code-trigger-${index}`}
                              className="w-full justify-between text-left font-normal h-8 text-sm bg-muted/30 border-border/60"
                            >
                              <span className="truncate">
                                {row.budgetCodeLabel || "Select budget code..."}
                              </span>
                              <Search className="shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[400px] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput
                                placeholder="Search budget codes..."
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  {loadingCodes
                                    ? "Loading..."
                                    : "No budget codes found."}
                                </CommandEmpty>
                                <CommandGroup>
                                  {getAvailableCodesForRow(index).map(
                                    (code) => (
                                      <CommandItem
                                        key={code.id}
                                        value={code.fullLabel}
                                        onSelect={() =>
                                          handleBudgetCodeSelect(index, code)
                                        }
                                      >
                                        {code.fullLabel}
                                      </CommandItem>
                                    ),
                                  )}
                                </CommandGroup>
                                <CommandSeparator />
                                <CommandGroup>
                                  <CommandItem
                                    onSelect={() => {
                                      setOpenPopoverId(null);
                                      setPendingRowIndex(index);
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
                      </td>

                      <td className="py-2 pr-3 align-middle">
                        <NumberInput
                          step="1"
                          decimals={0}
                          aria-label={`Quantity for line item ${index + 1}`}
                          data-testid={`budget-qty-input-${index}`}
                          value={row.qty}
                          onChange={(e) =>
                            handleRowChange(index, "qty", e.target.value)
                          }
                          placeholder="1"
                          className="h-8 bg-muted/30 border-border/60 text-center"
                          disabled={isCreating}
                          clearZeroOnFocus={true}
                        />
                      </td>

                      <td className="py-2 pr-3 align-middle">
                        <Select
                          value={row.uom}
                          onValueChange={(value) =>
                            handleRowChange(index, "uom", value)
                          }
                        >
                          <SelectTrigger
                            aria-label={`Unit of measure for line item ${index + 1}`}
                            data-testid={`budget-uom-trigger-${index}`}
                            className="h-8 bg-muted/30 border-border/60"
                          >
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
                      </td>

                      <td className="py-2 pr-3 align-middle w-36">
                        <MoneyField
                          label="Unit cost"
                          data-testid={`budget-unit-cost-input-${index}`}
                          value={
                            row.unitCost
                              ? parseFloat(String(row.unitCost))
                              : undefined
                          }
                          onChange={(val) =>
                            handleRowChange(
                              index,
                              "unitCost",
                              String(val ?? ""),
                            )
                          }
                          inline
                          showCurrency={false}
                          className="h-8 bg-muted/30 border-border/60"
                          disabled={isCreating}
                        />
                      </td>

                      <td className="py-2 pr-2 align-top pt-3 w-36">
                        <div className="h-8 flex items-center justify-end px-3 tabular-nums font-medium text-foreground pointer-events-none select-none">
                          $
                          {parseFloat(row.amount || "0").toLocaleString(
                            "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </div>
                        {negativeAmountRows.has(index) && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Negative — verify intentional
                          </p>
                        )}
                      </td>

                      <td className="py-2 align-middle">
                        {rows.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRow(index)}
                            disabled={isCreating}
                            className="opacity-0 group-hover:opacity-100 h-7 w-7 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
              <tfoot>
                <tr className="border-t border-border !bg-transparent">
                  <td
                    colSpan={5}
                    className="py-2 pr-3 text-right text-sm font-semibold text-foreground"
                  >
                    Total
                  </td>
                  <td className="py-2 pr-2 text-right text-sm font-semibold text-foreground">
                    ${formatCurrency(calculateTotal().toString())}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Add Row Button */}
          <div className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={addRow}
              disabled={isCreating}
              aria-label="Add line item"
              title="Add line item"
              className="h-8 px-0 text-sm font-medium text-primary hover:text-primary/90 hover:bg-transparent border-0 shadow-none"
            >
              <Plus />
              Add Line Item
            </Button>
          </div>
        </SidebarBody>

        <SidebarFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || rows.every((r) => !r.costCodeId)}
            className="min-w-[140px]"
          >
            {isCreating ? (
              <span className="flex items-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                />
                Creating...
              </span>
            ) : (
              `Create ${rows.length} Line Item${rows.length > 1 ? "s" : ""}`
            )}
          </Button>
        </SidebarFooter>
      </BaseSidebar>

      {/* Create Budget Code Modal */}
      <BaseModal
        isOpen={showCreateCodeModal}
        onClose={() => setShowCreateCodeModal(false)}
        title="Create New Budget Code"
        size="sm"
      >
        <ModalBody>
          <div className="grid gap-4">
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
                                    "bg-muted text-foreground font-medium",
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
                {newCodeData.costCodeId && newCodeData.costType ? (
                  <>
                    {newCodeData.costCodeId}.{newCodeData.costType} –{" "}
                    {
                      availableCostCodes.find(
                        (cc) => cc.id === newCodeData.costCodeId,
                      )?.title
                    }{" "}
                    – {getCostTypeLabel(newCodeData.costType)}
                  </>
                ) : (
                  "Select cost code and cost type to see preview"
                )}
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
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
        </ModalFooter>
      </BaseModal>
    </>
  );
}
