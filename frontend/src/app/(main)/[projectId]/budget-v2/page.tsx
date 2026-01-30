"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronDown } from "lucide-react";
import { BudgetPageHeader, BudgetTabs } from "@/components/budget";
import { useProjectTitle } from "@/hooks/useProjectTitle";

interface ProjectCostCode {
  id: string;
  cost_code_id: string;
  cost_type_id: string | null;
  is_active: boolean | null;
  cost_codes: {
    id: string;
    title: string | null;
    division_title: string | null;
  } | null;
  cost_code_types: {
    id: string;
    code: string;
    description: string;
  } | null;
}

interface BudgetLineItem {
  id: string;
  projectCostCodeId: string;
  costCodeLabel: string;
  costTypeId: string;
  description: string;
  qty: string;
  uom: string;
  unitCost: string;
  amount: string;
}

export default function BudgetV2Page() {
  const params = useParams();
  const projectId = params.projectId as string;
  useProjectTitle("Budget V2");

  const [activeTab, setActiveTab] = React.useState("budget");
  const [loadingData, setLoadingData] = useState(true);
  const [projectCostCodes, setProjectCostCodes] = useState<ProjectCostCode[]>(
    [],
  );
  const [lineItems, setLineItems] = useState<BudgetLineItem[]>([]);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [costTypes, setCostTypes] = useState<
    Array<{ id: string; code: string; description: string }>
  >([]);

  // Budget Code creation state
  const [showCreateCodeModal, setShowCreateCodeModal] = useState(false);
  const [creatingBudgetCode, setCreatingBudgetCode] = useState(false);
  const [newCodeData, setNewCodeData] = useState({
    costCodeId: "",
    costType: "L",
  });
  const [availableCostCodes, setAvailableCostCodes] = useState<
    Array<{
      id: string;
      title: string | null;
      status: string | null;
      division_title: string | null;
    }>
  >([]);
  const [loadingCostCodes, setLoadingCostCodes] = useState(false);
  const [groupedCostCodes, setGroupedCostCodes] = useState<
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
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(
    new Set(),
  );

  // Budget lock state
  const [isLocked, setIsLocked] = React.useState(false);
  const [lockedAt, setLockedAt] = React.useState<string | null>(null);
  const [lockedBy, setLockedBy] = React.useState<string | null>(null);

  // Fetch budget lock status
  const fetchLockStatus = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget/lock`);
      if (response.ok) {
        const data = await response.json();
        setIsLocked(data.isLocked || false);
        setLockedAt(data.lockedAt);
        setLockedBy(data.lockedBy);
      }
    } catch (error) {
      console.error("Failed to fetch budget lock status:", error);
      // Intentionally swallowed: lock status fetch is non-critical
    }
  }, [projectId]);

  // Load active project cost codes and create initial line items
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const supabase = createClient();

        // Fetch budget data, cost types, and lock status in parallel
        await Promise.all([
          (async () => {
            const { data, error } = await supabase
              .from("project_budget_codes")
              .select(
                `
                id,
                cost_code_id,
                cost_type_id,
                is_active,
                cost_codes!inner (
                  id,
                  title,
                  division_title
                ),
                cost_code_types (
                  id,
                  code,
                  description
                )
              `,
              )
              .eq("project_id", parseInt(projectId, 10))
              .eq("is_active", true)
              .order("cost_code_id", { ascending: true });

            if (error) throw error;

            // Filter to only include cost codes with cost types (required by schema)
            const validCostCodes =
              (data as unknown as ProjectCostCode[])?.filter(
                (cc) => cc.cost_type_id,
              ) || [];
            setProjectCostCodes(validCostCodes);

            // Auto-populate line items from copied cost codes
            const initialLineItems: BudgetLineItem[] = validCostCodes.map(
              (code) => {
                const costCodeTitle = code.cost_codes?.title || "";
                const costTypeDesc = code.cost_code_types?.description || "";
                const label = `${code.cost_code_id} – ${costCodeTitle}`;
                const description = `${costCodeTitle}.${costTypeDesc}`;

                return {
                  id: crypto.randomUUID(),
                  projectCostCodeId: code.id,
                  costCodeLabel: label,
                  costTypeId: code.cost_type_id || "L",
                  description: description,
                  qty: "",
                  uom: "",
                  unitCost: "",
                  amount: "",
                };
              },
            );

            setLineItems(initialLineItems);
          })(),
          (async () => {
            const { data, error } = await supabase
              .from("cost_code_types")
              .select("id, code, description")
              .order("code", { ascending: true });

            if (error) throw error;
            setCostTypes(data || []);
          })(),
          fetchLockStatus(),
        ]);
      } catch (error) {
        toast.error("Failed to load project cost codes");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [projectId, fetchLockStatus]);

  // Fetch cost codes when create modal opens
  useEffect(() => {
    const fetchCostCodes = async () => {
      if (!showCreateCodeModal) return;

      try {
        setLoadingCostCodes(true);
        const supabase = createClient();

        const { data, error } = await supabase
          .from("cost_codes")
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
          (acc, code) => {
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
        console.error("Failed to fetch cost codes:", error);
        // Intentionally swallowed: modal shows empty state on error
      } finally {
        setLoadingCostCodes(false);
      }
    };

    fetchCostCodes();
  }, [showCreateCodeModal]);

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
      setCreatingBudgetCode(true);

      const selectedCostCode = availableCostCodes.find(
        (cc) => cc.id === newCodeData.costCodeId,
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
          cost_code_id: newCodeData.costCodeId,
          cost_type_id: newCodeData.costType,
          description: selectedCostCode.title || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || "Failed to create budget code");
      }

      const result = await response.json();

      // Refresh project cost codes to include the new one
      const supabase = createClient();
      const { data: refreshedData } = await supabase
        .from("project_budget_codes")
        .select(
          `
          id,
          cost_code_id,
          cost_type_id,
          is_active,
          cost_codes!inner ( id, title, division_title ),
          cost_code_types ( id, code, description )
        `,
        )
        .eq("project_id", parseInt(projectId, 10))
        .eq("is_active", true)
        .order("cost_code_id", { ascending: true });

      if (refreshedData) {
        const validCostCodes =
          (refreshedData as unknown as ProjectCostCode[])?.filter(
            (cc) => cc.cost_type_id,
          ) || [];
        setProjectCostCodes(validCostCodes);

        // Add new line item for the newly created budget code
        const newCode = validCostCodes.find((cc) => cc.id === result.data?.id);
        if (newCode) {
          const costCodeTitle = newCode.cost_codes?.title || "";
          const costTypeDesc = newCode.cost_code_types?.description || "";
          const label = `${newCode.cost_code_id} – ${costCodeTitle}`;
          const description = `${costCodeTitle}.${costTypeDesc}`;

          setLineItems([
            ...lineItems,
            {
              id: crypto.randomUUID(),
              projectCostCodeId: newCode.id,
              costCodeLabel: label,
              costTypeId: newCode.cost_type_id || "L",
              description: description,
              qty: "",
              uom: "",
              unitCost: "",
              amount: "",
            },
          ]);
        }
      }

      setShowCreateCodeModal(false);
      setNewCodeData({ costCodeId: "", costType: "L" });
      toast.success("Budget code created successfully");
    } catch (error) {
      toast.error(
        `Failed to create budget code: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setCreatingBudgetCode(false);
    }
  };

  const handleBudgetCodeSelect = (rowId: string, costCode: ProjectCostCode) => {
    const costCodeTitle = costCode.cost_codes?.title || "";
    const costTypeDesc = costCode.cost_code_types?.description || "";
    const label = `${costCode.cost_code_id} – ${costCodeTitle}`;
    const description = `${costCodeTitle}.${costTypeDesc}`;
    setLineItems(
      lineItems.map((item) =>
        item.id === rowId
          ? {
              ...item,
              projectCostCodeId: costCode.id,
              costCodeLabel: label,
              costTypeId: costCode.cost_type_id || "L",
              description: description,
            }
          : item,
      ),
    );
    setOpenPopoverId(null);
  };

  const handleFieldChange = (
    id: string,
    field: keyof BudgetLineItem,
    value: string,
  ) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        // Auto-calculate amount when qty or unitCost changes
        if (field === "qty" || field === "unitCost") {
          const qty = parseFloat(field === "qty" ? value : item.qty) || 0;
          const unitCost =
            parseFloat(field === "unitCost" ? value : item.unitCost) || 0;
          updated.amount = (qty * unitCost).toFixed(2);
        }

        // Auto-update description when cost type changes
        if (field === "costTypeId") {
          const costCode = projectCostCodes.find(
            (cc) => cc.id === item.projectCostCodeId,
          );
          if (costCode) {
            const costCodeTitle = costCode.cost_codes?.title || "";
            const costType = projectCostCodes.find(
              (cc) => cc.cost_type_id === value,
            );
            const costTypeDesc =
              costType?.cost_code_types?.description || getCostTypeLabel(value);
            updated.description = `${costCodeTitle}.${costTypeDesc}`;
          }
        }

        return updated;
      }),
    );
  };

  const filteredCostCodes = projectCostCodes.filter((code) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const costCodeTitle = code.cost_codes?.title || "";
    const costTypeCode = code.cost_code_types?.code || "";
    const costTypeDesc = code.cost_code_types?.description || "";
    return (
      code.cost_code_id.toLowerCase().includes(query) ||
      costCodeTitle.toLowerCase().includes(query) ||
      costTypeCode.toLowerCase().includes(query) ||
      costTypeDesc.toLowerCase().includes(query)
    );
  });

  const totalAmount = lineItems.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0,
  );

  const handleCreateClick = () => {
    if (isLocked) {
      toast.error("Budget is locked. Unlock to add new budget codes.");
      return;
    }
    setShowCreateCodeModal(true);
  };

  const handleModificationClick = () => {
    toast.info("Budget modifications coming soon");
  };

  const handleResendToERP = () => {
    toast.info("ERP integration coming soon");
  };

  const handleLockBudget = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget/lock`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setIsLocked(true);
        setLockedAt(data.data.budget_locked_at);
        setLockedBy(data.data.budget_locked_by);
        toast.success("Budget locked successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to lock budget");
      }
    } catch (error) {
      toast.error("Failed to lock budget");
    }
  };

  const handleUnlockBudget = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget/lock`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIsLocked(false);
        setLockedAt(null);
        setLockedBy(null);
        toast.success("Budget unlocked successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to unlock budget");
      }
    } catch (error) {
      toast.error("Failed to unlock budget");
    }
  };

  const handleExport = (format: string) => {
    toast.info(`${format.toUpperCase()} export coming soon`);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <div className="flex flex-1 flex-col bg-muted/30">
      <BudgetPageHeader
        title="Budget V2"
        isLocked={isLocked}
        lockedAt={lockedAt}
        lockedBy={lockedBy}
        onCreateClick={handleCreateClick}
        onModificationClick={handleModificationClick}
        onResendToERP={handleResendToERP}
        onLockBudget={handleLockBudget}
        onUnlockBudget={handleUnlockBudget}
        onExport={handleExport}
      />

      <BudgetTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="flex flex-1 flex-col gap-4 px-4 sm:px-6 lg:px-12 py-6">
        {activeTab === "budget" && (
          <>
            {/* Summary Bar */}
            <div className="rounded-lg border bg-background shadow-sm">
              <div className="border-b bg-muted px-6 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {lineItems.length} Line Item
                    {lineItems.length !== 1 ? "s" : ""}
                  </span>
                  <span className="font-semibold text-foreground">
                    Total: $
                    {totalAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Budget Code
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Cost Type
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Description
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        UOM
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Unit Cost
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-background">
                    {loadingData ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-6 text-center text-muted-foreground"
                        >
                          Loading project cost codes...
                        </td>
                      </tr>
                    ) : lineItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-6 text-center text-muted-foreground"
                        >
                          No budget codes found. Add budget codes to get
                          started.
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((row) => (
                        <tr key={row.id} className="hover:bg-muted">
                          <td className="px-3 py-2">
                            <Popover
                              open={openPopoverId === row.id}
                              onOpenChange={(open) =>
                                setOpenPopoverId(open ? row.id : null)
                              }
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-start text-left font-normal h-8 text-sm"
                                  disabled={isLocked}
                                >
                                  <span
                                    className={
                                      row.costCodeLabel
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {row.costCodeLabel ||
                                      "Select budget code..."}
                                  </span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-[500px] p-0"
                                align="start"
                              >
                                <Command>
                                  <CommandInput
                                    placeholder="Search budget codes..."
                                    value={searchQuery}
                                    onValueChange={setSearchQuery}
                                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      No budget codes found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {filteredCostCodes.map((code) => {
                                        const costCodeTitle =
                                          code.cost_codes?.title || "";
                                        const displayLabel = `${code.cost_code_id} – ${costCodeTitle}`;

                                        return (
                                          <CommandItem
                                            key={code.id}
                                            value={displayLabel}
                                            onSelect={() =>
                                              handleBudgetCodeSelect(
                                                row.id,
                                                code,
                                              )
                                            }
                                          >
                                            {displayLabel}
                                          </CommandItem>
                                        );
                                      })}
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
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create New Budget Code
                                      </CommandItem>
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              value={row.costTypeId}
                              onValueChange={(value) =>
                                handleFieldChange(row.id, "costTypeId", value)
                              }
                              disabled={isLocked}
                            >
                              <SelectTrigger className="w-32 h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {costTypes.map((type) => (
                                  <SelectItem key={type.id} value={type.id}>
                                    {type.code} - {type.description}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              placeholder="Description"
                              value={row.description}
                              onChange={(e) =>
                                handleFieldChange(
                                  row.id,
                                  "description",
                                  e.target.value,
                                )
                              }
                              className="w-full h-8 text-sm"
                              disabled={isLocked}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              placeholder="0"
                              value={row.qty}
                              onChange={(e) =>
                                handleFieldChange(row.id, "qty", e.target.value)
                              }
                              className="w-20 h-8 text-sm"
                              disabled={isLocked}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              placeholder="EA"
                              value={row.uom}
                              onChange={(e) =>
                                handleFieldChange(row.id, "uom", e.target.value)
                              }
                              className="w-16 h-8 text-sm"
                              disabled={isLocked}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={row.unitCost}
                              onChange={(e) =>
                                handleFieldChange(
                                  row.id,
                                  "unitCost",
                                  e.target.value,
                                )
                              }
                              className="w-28 h-8 text-sm"
                              disabled={isLocked}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={row.amount}
                              onChange={(e) =>
                                handleFieldChange(
                                  row.id,
                                  "amount",
                                  e.target.value,
                                )
                              }
                              className="w-28 h-8 text-sm"
                              disabled={isLocked}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === "settings" && (
          <div className="flex-1 rounded-lg border bg-background shadow-sm p-6">
            <p className="text-muted-foreground">Settings for Budget V2 coming soon</p>
          </div>
        )}

        {activeTab === "cost-codes" && (
          <div className="flex-1 rounded-lg border bg-background shadow-sm p-6">
            <p className="text-muted-foreground">
              Cost Codes management for Budget V2 coming soon
            </p>
          </div>
        )}
      </div>

      {/* Create Budget Code Modal */}
      <Dialog open={showCreateCodeModal} onOpenChange={setShowCreateCodeModal}>
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
                                className={`w-full text-left px-6 py-2 text-sm hover:bg-muted transition-colors ${
                                  newCodeData.costCodeId === costCode.id
                                    ? "bg-blue-50 text-blue-700 font-medium"
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
                value={newCodeData.costType}
                onValueChange={(value) =>
                  setNewCodeData({ ...newCodeData, costType: value })
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
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium text-foreground">Preview:</p>
              <p className="text-sm text-foreground mt-1">
                {newCodeData.costCodeId ? (
                  <>
                    {availableCostCodes.find(
                      (cc) => cc.id === newCodeData.costCodeId,
                    )?.division_title ||
                      availableCostCodes.find(
                        (cc) => cc.id === newCodeData.costCodeId,
                      )?.id}
                    .{newCodeData.costType} –{" "}
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
              disabled={
                creatingBudgetCode ||
                !newCodeData.costCodeId ||
                !newCodeData.costType
              }
            >
              {creatingBudgetCode ? "Creating..." : "Create Budget Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
