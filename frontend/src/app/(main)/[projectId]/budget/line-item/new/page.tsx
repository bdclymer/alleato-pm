"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { DevAutoFillButton } from "@/hooks/use-dev-autofill";
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
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import { BudgetItemDeleteDialog } from "@/components/budget/BudgetItemDeleteDialog";
import { PageShell } from "@/components/layout";
import { FormSection } from "@/components/forms";
import { FormActions } from "@/components/forms/FormActions";
import { BudgetCodeSelector } from "@/components/budget/budget-code-selector";
interface BudgetCode {
  id: string;
  code: string;
  costType: string | null; // L = Labor, M = Material, E = Equipment, S = Subcontract, O = Other
  description: string;
  fullLabel: string; // Composite label like "01-3120.L – Vice President – Labor"
}

interface BudgetLineItemRow {
  id: string;
  budgetCodeId: string;
  budgetCodeLabel: string;
  qty: string;
  uom: string;
  unitCost: string;
  amount: string;
}

type CostCodeOption = {
  id: string;
  title: string | null;
  status: string | null;
  division_id: string;
  division_code: string;
  division_title: string;
};

export default function NewBudgetLineItemPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(false);
  const [budgetCodes, setBudgetCodes] = useState<BudgetCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(true);

  // Cost codes from Supabase
  const [availableCostCodes, setAvailableCostCodes] = useState<
    CostCodeOption[]
  >([]);
  const [loadingCostCodes, setLoadingCostCodes] = useState(false);
  const [groupedCostCodes, setGroupedCostCodes] = useState<
    Record<string, CostCodeOption[]>
  >({});

  // Multiple rows state
  const [rows, setRows] = useState<BudgetLineItemRow[]>([
    {
      id: "1",
      budgetCodeId: "",
      budgetCodeLabel: "",
      qty: "1",
      uom: "",
      unitCost: "",
      amount: "0.00",
    },
  ]);

  // Budget Code creation modal state
  const [showCreateCodeModal, setShowCreateCodeModal] = useState(false);
  const [newCodeData, setNewCodeData] = useState({
    costCodeId: "", // ID from cost_codes table
    costType: "L",
  });
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(
    new Set(),
  );

  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);

  // Fetch cost codes from Supabase when modal opens
  useEffect(() => {
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
          // Get all cost codes, we'll filter them client-side if needed
          .order("id", { ascending: true });

        if (error) {
          console.error("Error fetching cost codes:", error);
          return;
        }

        // Filter and map the cost codes
        const codesWithDivisions: CostCodeOption[] =
          data
            ?.filter((code) => {
              // Only include codes that have a title
              return code.title !== null && code.title !== "";
            })
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

        // Group cost codes by division_title
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
      } catch (error) {

        console.error("Failed to load budget data:", error);

        toast.error("Failed to load budget data", { description: "Please try again." });

      } finally {
        setLoadingCostCodes(false);
      }
    };

    fetchCostCodes();
  }, [showCreateCodeModal]);

  // Fetch budget codes for the project
  useEffect(() => {
    const fetchBudgetCodes = async () => {
      if (!projectId) return;

      try {
        setLoadingCodes(true);
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
        setLoadingCodes(false);
      }
    };

    fetchBudgetCodes();
  }, [projectId]);

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
      setLoading(true);

      // Find the selected cost code
      const selectedCostCode = availableCostCodes.find(
        (cc) => cc.id === newCodeData.costCodeId,
      );
      if (!selectedCostCode) {
        alert("Please select a cost code");
        return;
      }

      // API call to create budget code
      const response = await fetch(`/api/projects/${projectId}/budget-codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cost_code_id: newCodeData.costCodeId,
          cost_type_id: newCodeData.costType, // Send 'L', 'M', 'E', 'S', or 'O' directly
          description: selectedCostCode.title,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.details || error.error || "Failed to create budget code",
        );
      }

      const { budgetCode: createdCode } = await response.json();

      // Add the new code to the list
      setBudgetCodes([...budgetCodes, createdCode]);

      // Reset modal
      setShowCreateCodeModal(false);
      setNewCodeData({ costCodeId: "", costType: "L" });
    } catch (error) {
      alert(
        `Failed to create budget code: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetCodeSelect = (rowId: string, code: BudgetCode) => {
    setRows(
      rows.map((row) =>
        row.id === rowId
          ? { ...row, budgetCodeId: code.id, budgetCodeLabel: code.fullLabel }
          : row,
      ),
    );
  };

  const calculateAmount = (qty: string, unitCost: string): string => {
    const qtyNum = parseFloat(qty) || 0;
    const costNum = parseFloat(unitCost) || 0;
    return (qtyNum * costNum).toFixed(2);
  };

  const handleRowChange = (
    rowId: string,
    field: keyof BudgetLineItemRow,
    value: string,
  ) => {
    setRows(
      rows.map((row) => {
        if (row.id !== rowId) return row;

        const updatedRow = { ...row, [field]: value };

        // Auto-calculate amount when qty or unitCost changes
        if (field === "qty" || field === "unitCost") {
          updatedRow.amount = calculateAmount(
            updatedRow.qty,
            updatedRow.unitCost,
          );
        }

        return updatedRow;
      }),
    );
  };

  const addRow = () => {
    const newRow: BudgetLineItemRow = {
      id: Date.now().toString(),
      budgetCodeId: "",
      budgetCodeLabel: "",
      qty: "1",
      uom: "",
      unitCost: "",
      amount: "0.00",
    };
    setRows([...rows, newRow]);
  };

  const handleDeleteClick = (rowId: string) => {
    if (rows.length === 1) return; // Keep at least one row
    setRowToDelete(rowId);
    setShowDeleteDialog(true);
  };

  const confirmRemoveRow = () => {
    if (rowToDelete) {
      setRows(rows.filter((row) => row.id !== rowToDelete));
      setRowToDelete(null);
    }
    setShowDeleteDialog(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate: all rows must have a budget code and amount
      const invalidRows = rows.filter(
        (row) => !row.budgetCodeId || parseFloat(row.amount) === 0,
      );

      if (invalidRows.length > 0) {
        alert("All rows must have a budget code and a non-zero amount.");
        setLoading(false);
        return;
      }

      const lineItemsToSubmit = rows.map((row) => {
        const budgetCode = budgetCodes.find(
          (code) => code.id === row.budgetCodeId,
        );

        return {
          costCodeId: budgetCode?.code || row.budgetCodeId,
          costType: budgetCode?.costType || null,
          qty: row.qty,
          uom: row.uom,
          unitCost: row.unitCost,
          amount: row.amount,
        };
      });

      const response = await fetch(`/api/projects/${projectId}/budget`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lineItems: lineItemsToSubmit,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.details || error.error || "Failed to create budget line items",
        );
      }

      await response.json();

      // Navigate back to project budget page
      router.push(`/${projectId}/budget`);
    } catch (error) {
      alert(
        `Failed to create budget line items: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/${projectId}/budget`);
  };

  const previewCostCode = availableCostCodes.find(
    (cc) => cc.id === newCodeData.costCodeId,
  );

  return (
    <PageShell
      variant="form"
      title="Create Budget Line Items"
      description="Add one or more line items to the project budget."
      onBack={() => router.push(`/${projectId}/budget`)}
      backLabel="Back to Budget"
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection
          title="Line Items"
          description="Add budget code, quantity, UOM, unit cost, and amount for each row."
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="gap-2"
            >
              <Plus />
              Add Row
            </Button>
          }
        >
          <div className="overflow-hidden rounded-lg border bg-background">
          {/* Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-medium text-foreground w-12">
                    #
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium text-foreground min-w-[300px]">
                    Budget Code*
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium text-foreground w-24">
                    Qty
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium text-foreground w-28">
                    UOM
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium text-foreground w-32">
                    Unit Cost
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium text-foreground w-32">
                    Amount*
                  </th>
                  <th className="px-4 py-4 w-12">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-muted">
                    <td className="px-4 py-4 text-sm text-foreground">
                      {index + 1}
                    </td>

                    {/* Budget Code Selector */}
                    <td className="px-4 py-4">
                      <BudgetCodeSelector
                        value={row.budgetCodeId}
                        onValueChange={(_, code) =>
                          handleBudgetCodeSelect(row.id, code)
                        }
                        budgetCodes={budgetCodes}
                        loading={loadingCodes}
                        onCreateNew={() => setShowCreateCodeModal(true)}
                        placeholder="Select budget code..."
                        className="h-9"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        step="0.001"
                        value={row.qty}
                        onChange={(e) =>
                          handleRowChange(row.id, "qty", e.target.value)
                        }
                        placeholder=""
                        className="h-9"
                      />
                    </td>

                    {/* UOM */}
                    <td className="px-4 py-4">
                      <Select
                        value={row.uom}
                        onValueChange={(value) =>
                          handleRowChange(row.id, "uom", value)
                        }
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
                    </td>

                    {/* Unit Cost */}
                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        step="0.01"
                        value={row.unitCost}
                        onChange={(e) =>
                          handleRowChange(row.id, "unitCost", e.target.value)
                        }
                        placeholder=""
                        className="h-9"
                      />
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4">
                      <Input
                        type="number"
                        step="0.01"
                        value={row.amount}
                        onChange={(e) =>
                          handleRowChange(row.id, "amount", e.target.value)
                        }
                        placeholder=""
                        className="h-9 font-medium"
                      />
                    </td>

                    {/* Delete */}
                    <td className="px-4 py-4">
                      {rows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(row.id)}
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </FormSection>

        <FormActions
          submitLabel={`Create ${rows.length} Line Item${rows.length > 1 ? "s" : ""}`}
          onCancel={handleCancel}
          isSubmitting={loading}
          align="between"
        >
          <DevAutoFillButton
            formType="budgetLineItem"
            onAutoFill={(data) => {
              const firstBudgetCode = budgetCodes[0];
              setRows([
                {
                  id: "1",
                  budgetCodeId: firstBudgetCode?.id || "",
                  budgetCodeLabel: firstBudgetCode?.fullLabel || "",
                  qty: data.quantity?.toString() || "1",
                  uom: data.unit || "EA",
                  unitCost: data.unit_cost?.toString() || "",
                  amount:
                    data.amount?.toString() ||
                    calculateAmount(
                      data.quantity?.toString() || "1",
                      data.unit_cost?.toString() || "0",
                    ),
                },
              ]);
            }}
          />
        </FormActions>
      </form>

      {/* Create Budget Code Modal */}
      <Modal open={showCreateCodeModal} onOpenChange={setShowCreateCodeModal}>
        <ModalContent className="sm:max-w-[500px]">
          <ModalHeader>
            <ModalTitle>Create New Budget Code</ModalTitle>
            <ModalDescription>
              Add a new budget code that can be used for line items in this
              project.
            </ModalDescription>
          </ModalHeader>
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
                        {/* Division Header - Clickable */}
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => toggleDivision(division)}
                          className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-muted transition-colors h-auto rounded-none"
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

                        {/* Cost Codes - Only show when expanded */}
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
                                className={`w-full text-left px-6 py-2 text-sm hover:bg-muted transition-colors h-auto rounded-none justify-start ${
                                  newCodeData.costCodeId === costCode.id
                                    ? "bg-info/10 text-info font-medium"
                                    : "text-foreground"
                                }`}
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
              <p className="text-sm text-muted-foreground">
                Click on a division to expand and select a cost code
              </p>
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
                  <SelectItem value="S">S - Subcontract</SelectItem>
                  <SelectItem value="X">X - Expense</SelectItem>
                  <SelectItem value="E">E - Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm font-medium text-foreground">Preview:</p>
              <p className="text-sm text-foreground mt-1">
                {newCodeData.costCodeId && previewCostCode ? (
                  <>
                    {previewCostCode.id}.{newCodeData.costType} –{" "}
                    {previewCostCode.title} –{" "}
                    {getCostTypeLabel(newCodeData.costType)}
                  </>
                ) : (
                  "Select cost code and cost type to see preview"
                )}
              </p>
            </div>
          </div>
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
              disabled={
                loading || !newCodeData.costCodeId || !newCodeData.costType
              }
            >
              {loading ? "Creating..." : "Create Budget Code"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <BudgetItemDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmRemoveRow}
        itemDescription={
          rowToDelete
            ? `Line ${rows.findIndex((r) => r.id === rowToDelete) + 1}`
            : "this line item"
        }
      />
    </PageShell>
  );
}
