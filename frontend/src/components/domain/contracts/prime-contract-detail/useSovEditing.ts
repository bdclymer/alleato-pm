import { useState, useCallback } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import type { ContractLineItem, BudgetCode } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

const normalizeSovDraftItems = (items: ContractLineItem[]) =>
  items.filter((item): item is ContractLineItem => Boolean(item)).map((item, index) => {
    const quantity = Number(item.quantity) || 0;
    const unitCost = Number(item.unit_cost) || 0;
    return { ...item, line_number: index + 1, total_cost: quantity * unitCost };
  });

const buildSovDraftBudgetCodeIds = (items: ContractLineItem[], budgetCodes: BudgetCode[]) => {
  const budgetCodeIdByCostCodeId = new Map<string, string>();
  budgetCodes.forEach((bc) => {
    if (bc.legacyCostCodeId && !budgetCodeIdByCostCodeId.has(bc.legacyCostCodeId)) {
      budgetCodeIdByCostCodeId.set(bc.legacyCostCodeId, bc.id);
    }
  });
  const result: Record<string, string> = {};
  items.forEach((item) => {
    if (item.budget_code_id) result[item.id] = item.budget_code_id;
    else if (item.cost_code_id != null) {
      const bcId = budgetCodeIdByCostCodeId.get(String(item.cost_code_id));
      if (bcId) result[item.id] = bcId;
    }
  });
  return result;
};

interface UseSovEditingParams {
  projectId: string;
  contractId: string;
  lineItems: ContractLineItem[];
  setLineItems: React.Dispatch<React.SetStateAction<ContractLineItem[]>>;
  budgetCodes: BudgetCode[];
}

export function useSovEditing({ projectId, contractId, lineItems, setLineItems, budgetCodes }: UseSovEditingParams) {
  const [isSovEditing, setIsSovEditing] = useState(false);
  const [isSavingSovChanges, setIsSavingSovChanges] = useState(false);
  const [sovDraftItems, setSovDraftItems] = useState<ContractLineItem[]>([]);
  const [sovDraftBudgetCodeIds, setSovDraftBudgetCodeIds] = useState<Record<string, string>>({});

  const handleStartSovEdit = useCallback(() => {
    setSovDraftItems(normalizeSovDraftItems(lineItems.map((item) => ({ ...item }))));
    setSovDraftBudgetCodeIds(buildSovDraftBudgetCodeIds(lineItems, budgetCodes));
    setIsSovEditing(true);
  }, [lineItems, budgetCodes]);

  const handleCancelSovEdit = useCallback(() => {
    setSovDraftItems([]);
    setSovDraftBudgetCodeIds({});
    setIsSovEditing(false);
  }, []);

  const handleAddSovLine = useCallback(() => {
    if (!isSovEditing) {
      setSovDraftItems(normalizeSovDraftItems(lineItems.map((item) => ({ ...item }))));
      setSovDraftBudgetCodeIds(buildSovDraftBudgetCodeIds(lineItems, budgetCodes));
      setIsSovEditing(true);
    }
    setSovDraftItems((prev) => normalizeSovDraftItems([...prev, {
      id: `new-${crypto.randomUUID()}`, contract_id: contractId, line_number: prev.length + 1, description: "", cost_code_id: null,
      quantity: 1, unit_of_measure: null, unit_cost: 0, total_cost: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }]));
  }, [isSovEditing, lineItems, budgetCodes, contractId]);

  const handleAddSovGroup = useCallback(() => {
    setSovDraftItems((prev) => normalizeSovDraftItems([...prev, {
      id: `group-${crypto.randomUUID()}`, contract_id: contractId, line_number: prev.length + 1, description: "", cost_code_id: null,
      quantity: 0, unit_of_measure: null, unit_cost: 0, total_cost: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      is_group_header: true, group_name: "New Group",
    }]));
  }, [contractId]);

  const handleUpdateSovLine = useCallback((lineId: string, updates: Partial<Pick<ContractLineItem, "description" | "quantity" | "unit_of_measure" | "unit_cost" | "cost_code_id">>) => {
    setSovDraftItems((prev) => normalizeSovDraftItems(prev.map((item) => (item.id === lineId ? { ...item, ...updates } : item))));
  }, []);

  const handleUpdateSovLineBudgetCode = useCallback((lineId: string, budgetCodeId: string) => {
    const selectedCode = budgetCodes.find((code) => code.id === budgetCodeId);
    const costCodeId = selectedCode?.legacyCostCodeId != null ? String(selectedCode.legacyCostCodeId) : null;
    setSovDraftBudgetCodeIds((prev) => ({ ...prev, [lineId]: budgetCodeId }));
    setSovDraftItems((prev) => normalizeSovDraftItems(prev.map((item) =>
      item.id === lineId ? { ...item, cost_code_id: costCodeId, cost_code: selectedCode ? { id: costCodeId ?? "", code: selectedCode.code, name: selectedCode.description } : item.cost_code } : item,
    )));
  }, [budgetCodes]);

  const handleRemoveSovLine = useCallback((lineId: string) => {
    setSovDraftBudgetCodeIds((prev) => { const next = { ...prev }; delete next[lineId]; return next; });
    setSovDraftItems((prev) => normalizeSovDraftItems(prev.filter((item) => item.id !== lineId)));
  }, []);

  const handleDeleteSovLine = useCallback(async (lineId: string) => {
    setLineItems((prev) => prev.filter((li) => li.id !== lineId));
    try {
      const response = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items/${lineId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete line item");
        const restored = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items`);
        if (restored.ok) setLineItems(await restored.json());
        return;
      }
      toast.success("Line item deleted");
    } catch {
      toast.error("Failed to delete line item");
      const restored = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items`);
      if (restored.ok) setLineItems(await restored.json());
    }
  }, [projectId, contractId, setLineItems]);

  const handleReorderSovLines = useCallback((oldIndex: number, newIndex: number) => {
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    if (!isSovEditing) {
      const seeded = normalizeSovDraftItems(lineItems.map((item) => ({ ...item })));
      if (oldIndex >= seeded.length || newIndex >= seeded.length) return;
      setSovDraftItems(normalizeSovDraftItems(arrayMove(seeded, oldIndex, newIndex)));
      setSovDraftBudgetCodeIds(buildSovDraftBudgetCodeIds(lineItems, budgetCodes));
      setIsSovEditing(true);
      return;
    }
    setSovDraftItems((prev) => {
      if (oldIndex >= prev.length || newIndex >= prev.length) return prev;
      return normalizeSovDraftItems(arrayMove(prev, oldIndex, newIndex));
    });
  }, [isSovEditing, lineItems, budgetCodes]);

  const handleSaveSovEdit = useCallback(async () => {
    const normalizedDraftItems = normalizeSovDraftItems(sovDraftItems);
    const persistableItems = normalizedDraftItems.filter((item) => !item.is_group_header).map((item, idx) => ({ ...item, line_number: idx + 1 }));
    if (persistableItems.length === 0) { toast.error("At least one SOV line item is required"); return; }
    setIsSavingSovChanges(true);
    try {
      const existingIds = new Set(lineItems.map((item) => item.id));
      const incomingIds = new Set(persistableItems.filter((item) => existingIds.has(item.id)).map((item) => item.id));
      const updatePayload = persistableItems.filter((item) => existingIds.has(item.id));
      const createPayload = persistableItems.filter((item) => !existingIds.has(item.id));
      const deletionIds = lineItems.filter((item) => !incomingIds.has(item.id)).map((item) => item.id);

      // Reorder to temp range to avoid unique constraint
      const temporaryLineBase = 100000;
      for (let index = 0; index < updatePayload.length; index++) {
        const item = updatePayload[index];
        const tempRes = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items/${item.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ line_number: temporaryLineBase + index + 1 }),
        });
        if (!tempRes.ok) {
          const errorData = await tempRes.json().catch(() => ({}));
          throw new Error(`Could not save "${item.description || `Line ${item.line_number}`}": ${errorData.error || errorData.details || "unknown error"}`);
        }
      }
      const deletionResponses = await Promise.all(deletionIds.map((id) => fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items/${id}`, { method: "DELETE" })));
      const failedDeletion = deletionResponses.findIndex((r) => !r.ok);
      if (failedDeletion !== -1) {
        const errorData = await deletionResponses[failedDeletion].json().catch(() => ({}));
        throw new Error(`Could not delete a removed line item: ${errorData.error || errorData.details || "unknown error"}`);
      }
      for (const item of updatePayload) {
        const updateRes = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items/${item.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ line_number: item.line_number, description: item.description || `Line ${item.line_number}`, cost_code_id: item.cost_code_id, budget_code_id: sovDraftBudgetCodeIds[item.id] || null, quantity: Number(item.quantity) || 0, unit_cost: Number(item.unit_cost) || 0, unit_of_measure: item.unit_of_measure || null }),
        });
        if (!updateRes.ok) {
          const errorData = await updateRes.json().catch(() => ({}));
          throw new Error(`Could not save "${item.description || `Line ${item.line_number}`}": ${errorData.error || errorData.details || "unknown error"}`);
        }
      }
      for (const item of createPayload) {
        const createRes = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ line_number: item.line_number, description: item.description || `Line ${item.line_number}`, cost_code_id: item.cost_code_id, budget_code_id: sovDraftBudgetCodeIds[item.id] || null, quantity: Number(item.quantity) || 0, unit_cost: Number(item.unit_cost) || 0, unit_of_measure: item.unit_of_measure || null }),
        });
        if (!createRes.ok) {
          const errorData = await createRes.json().catch(() => ({}));
          throw new Error(`Could not add "${item.description || `Line ${item.line_number}`}": ${errorData.error || errorData.details || "unknown error"}`);
        }
      }
      const refreshed = await fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items`);
      if (refreshed.ok) setLineItems((await refreshed.json()) || []);
      setIsSovEditing(false);
      setSovDraftItems([]);
      setSovDraftBudgetCodeIds({});
      toast.success("Schedule of values updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save schedule of values");
    } finally {
      setIsSavingSovChanges(false);
    }
  }, [sovDraftItems, sovDraftBudgetCodeIds, lineItems, projectId, contractId, setLineItems]);

  return {
    isSovEditing,
    isSavingSovChanges,
    sovDraftItems,
    sovDraftBudgetCodeIds,
    setSovDraftItems,
    setSovDraftBudgetCodeIds,
    handleStartSovEdit,
    handleCancelSovEdit,
    handleAddSovLine,
    handleAddSovGroup,
    handleUpdateSovLine,
    handleUpdateSovLineBudgetCode,
    handleRemoveSovLine,
    handleDeleteSovLine,
    handleReorderSovLines,
    handleSaveSovEdit,
    normalizeSovDraftItems,
    buildSovDraftBudgetCodeIds,
  };
}
