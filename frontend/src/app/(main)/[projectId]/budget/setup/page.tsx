"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Inline } from "@/components/ui/inline";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { BudgetLineItemTable } from "@/components/budget/BudgetLineItemTable";
import { createClient } from "@/lib/supabase/client";
import { CreateBudgetCodeModal } from "./components";
import {
  type BudgetLineItem,
  createEmptyLineItem,
  formatCostCodeLabel,
  type ProjectCostCode,
} from "./types";

export default function BudgetSetupPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [projectCostCodes, setProjectCostCodes] = useState<ProjectCostCode[]>(
    [],
  );
  const [lineItems, setLineItems] = useState<BudgetLineItem[]>([
    createEmptyLineItem(),
  ]);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [showCreateCodeModal, setShowCreateCodeModal] = useState(false);

  // Load active project cost codes
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const supabase = createClient();

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

        const validCostCodes =
          (data as unknown as ProjectCostCode[])?.filter(
            (cc) => cc.cost_type_id,
          ) || [];
        setProjectCostCodes(validCostCodes);
      } catch (error) {
        toast.error("Failed to load project cost codes");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [projectId]);

  const refreshProjectCostCodes = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
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

    if (data) {
      const validCostCodes =
        (data as unknown as ProjectCostCode[])?.filter(
          (cc) => cc.cost_type_id,
        ) || [];
      setProjectCostCodes(validCostCodes);
      return validCostCodes;
    }
    return [];
  }, [projectId]);

  const handleAddRow = useCallback(() => {
    const newItem = createEmptyLineItem();
    setLineItems((prev) => [...prev, newItem]);
    // Focus the budget code selector of the new row after render
    setTimeout(() => {
      const newRowButton = document.querySelector(
        `[data-row-id="${newItem.id}"] button`,
      ) as HTMLButtonElement | null;
      newRowButton?.focus();
    }, 0);
  }, []);

  const handleRemoveRow = (id: string) => {
    if (lineItems.length === 1) {
      toast.error("At least one line item is required");
      return;
    }
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleBudgetCodeSelect = (rowId: string, costCode: ProjectCostCode) => {
    const label = formatCostCodeLabel(costCode);

    setLineItems(
      lineItems.map((item) =>
        item.id === rowId
          ? {
              ...item,
              projectCostCodeId: costCode.id,
              costCodeLabel: label,
              qty: item.qty || "1",
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

        return updated;
      }),
    );
  };

  const handleCreateBudgetCodeSuccess = async (budgetCodeId: string) => {
    const refreshedCodes = await refreshProjectCostCodes();

    // Auto-populate the pending row with the newly created budget code
    if (pendingRowId && budgetCodeId) {
      const newCode = refreshedCodes.find((cc) => cc.id === budgetCodeId);
      if (newCode) {
        handleBudgetCodeSelect(pendingRowId, newCode);
      }
    }

    setPendingRowId(null);
    toast.success("Budget code created successfully");
  };

  const handleSubmit = async () => {
    // Validate that all rows have a budget code selected
    const invalidRows = lineItems.filter((item) => !item.projectCostCodeId);
    if (invalidRows.length > 0) {
      toast.error("Please select a budget code for all line items");
      return;
    }

    // Validate that all selected cost codes have a cost type
    const missingCostType = lineItems.filter((item) => {
      const costCode = projectCostCodes.find(
        (cc) => cc.id === item.projectCostCodeId,
      );
      return !costCode?.cost_type_id;
    });
    if (missingCostType.length > 0) {
      toast.error("All selected budget codes must have a cost type");
      return;
    }

    try {
      setLoading(true);

      const formattedLineItems = lineItems.map((item) => {
        const costCode = projectCostCodes.find(
          (cc) => cc.id === item.projectCostCodeId,
        );
        return {
          costCodeId: costCode?.cost_code_id || "",
          costType: costCode?.cost_type_id ?? null,
          amount: item.amount || "0",
          description: null,
          qty: item.qty || null,
          uom: item.uom || null,
          unitCost: item.unitCost || null,
        };
      });

      const response = await fetch(`/api/projects/${projectId}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems: formattedLineItems }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create budget lines");
      }

      toast.success(`Successfully created ${lineItems.length} budget line(s)`);
      router.push(`/${projectId}/budget`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create budget lines",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="lg" as="main" className="min-h-screen">
      <Stack gap="lg">
        {/* Header */}
        <div className="border-b bg-background">
          <Container>
            <Stack gap="md" className="py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${projectId}/budget`)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Budget
              </Button>

              <Inline justify="between" align="start" wrap className="gap-4">
                <Stack gap="xs" className="min-w-0 flex-1">
                  <Heading level={3}>Add Budget Line Items</Heading>
                  <Text size="sm" tone="muted">
                    Add new line items to your project budget
                  </Text>
                </Stack>

                {/* Action Buttons - Hidden on mobile */}
                <Inline gap="sm" className="hidden sm:flex">
                  <Button variant="outline" onClick={handleAddRow}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Row
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || lineItems.length === 0}
                  >
                    {loading
                      ? "Creating..."
                      : `Create ${lineItems.length} Line Item${lineItems.length !== 1 ? "s" : ""}`}
                  </Button>
                </Inline>
              </Inline>
            </Stack>
          </Container>
        </div>

        {/* Main Content */}
        <BudgetLineItemTable
          lineItems={lineItems}
          projectCostCodes={projectCostCodes}
          loadingData={loadingData}
          openPopoverId={openPopoverId}
          onPopoverOpenChange={(id, open) => setOpenPopoverId(open ? id : null)}
          onBudgetCodeSelect={handleBudgetCodeSelect}
          onFieldChange={handleFieldChange}
          onRemoveRow={handleRemoveRow}
          onCreateNew={(rowId) => {
            setPendingRowId(rowId);
            setOpenPopoverId(null);
            setShowCreateCodeModal(true);
          }}
          onAddRow={handleAddRow}
          onSubmit={handleSubmit}
          loading={loading}
        />

        {/* Create Budget Code Modal */}
        <CreateBudgetCodeModal
          open={showCreateCodeModal}
          onOpenChange={setShowCreateCodeModal}
          projectId={projectId}
          onSuccess={handleCreateBudgetCodeSuccess}
        />
      </Stack>
    </Container>
  );
}
