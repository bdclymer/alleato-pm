"use client";

import * as React from "react";
import { toast } from "sonner";

import type {
  BudgetCodeOption,
  ChangeEventFormData,
  ChangeEventLineItem,
  CommitmentSovLineItem,
} from "./types";
import { createEmptyLineItem } from "./types";
import { apiFetch } from "@/lib/api-client";
import { useDropdownData } from "./useDropdownData";

// When all SOV items share the same budget code, auto-fill it; if only one item
// exists also use its description. Returns only the fields that should update.
function findBudgetCode(code: string | null, budgetCodes: BudgetCodeOption[]): BudgetCodeOption | undefined {
  if (!code) return undefined;
  const q = code.trim().toLowerCase();
  // 1. Exact match on cost_code_id
  return (
    budgetCodes.find((b) => b.code === code) ||
    // 2. Case-insensitive code match
    budgetCodes.find((b) => b.code.toLowerCase() === q) ||
    // 3. Match on description (cost_code title)
    budgetCodes.find((b) => b.description.toLowerCase() === q) ||
    // 4. Match on full label prefix (e.g. "23-000 - HVAC" starts with "23-000")
    budgetCodes.find((b) => b.fullLabel.toLowerCase().startsWith(q))
  );
}

function resolveBudgetCodeFromItems(
  items: CommitmentSovLineItem[],
  budgetCodes: BudgetCodeOption[],
): Partial<ChangeEventLineItem> {
  if (items.length === 0) return {};
  const updates: Partial<ChangeEventLineItem> = {};

  const firstCode = items[0].budget_code;
  const allSameCode = firstCode !== null && items.every((i) => i.budget_code === firstCode);
  if (allSameCode) {
    const bc = findBudgetCode(firstCode, budgetCodes);
    if (bc) updates.budgetCode = bc.id;
  }

  if (items.length === 1 && items[0].description) {
    updates.description = items[0].description;
  }

  return updates;
}

interface UseChangeEventFormDataOptions {
  initialData?: Partial<ChangeEventFormData>;
  projectId: number;
}

export function useChangeEventFormData({
  initialData,
  projectId,
}: UseChangeEventFormDataOptions) {
  const [formData, setFormData] = React.useState<ChangeEventFormData>({
    contractNumber: initialData?.contractNumber || initialData?.number || "",
    title: initialData?.title || "",
    status: initialData?.status || "Open",
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

  const [nextNumber, setNextNumber] = React.useState<string>("");

  // Fetch the predicted next number on mount (create mode only)
  React.useEffect(() => {
    if (initialData?.contractNumber || initialData?.number) return;
    apiFetch<{ number: string }>(`/api/projects/${projectId}/change-events/next-number`)
      .then((res) => setNextNumber(res.number))
      .catch(() => setNextNumber(""));
  }, [projectId, initialData?.contractNumber, initialData?.number]);

  const [errors, setErrors] = React.useState<
    Partial<Record<keyof ChangeEventFormData, string>>
  >({});
  const [addCompanyOpen, setAddCompanyOpen] = React.useState(false);
  const [showCreateBudgetCodeModal, setShowCreateBudgetCodeModal] =
    React.useState(false);
  const [targetBudgetCodeRowIndex, setTargetBudgetCodeRowIndex] =
    React.useState<number | null>(null);
  const [commitmentLineItemsMap, setCommitmentLineItemsMap] = React.useState<
    Record<string, CommitmentSovLineItem[]>
  >({});

  // Dropdown data from separate hook
  const {
    vendors,
    setVendors,
    contracts,
    budgetCodes,
    primeContractOptions,
    primeContractSelectOptions,
    fetchVendors,
    fetchBudgetCodes,
  } = useDropdownData({ projectId });

  // ── Update helpers ──

  const updateFormData = React.useCallback(
    (updates: Partial<ChangeEventFormData>) => {
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
    },
    [],
  );

  const updateLineItem = React.useCallback(
    (index: number, key: keyof ChangeEventLineItem, value: string | number) => {
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

          // Auto-sync revenue ROM when source is "match_cost"
          const revenueSource = prev.lineItemRevenueSource || "";
          const isMatchCost =
            revenueSource === "match_cost" ||
            revenueSource.toLowerCase().includes("match revenue to latest cost");
          if (isMatchCost) {
            current.revenueRom = current.costRom;
          }
        }
        if (
          key === "costQuantity" || key === "costUnitCost" ||
          key === "revenueQuantity" || key === "revenueUnitCost"
        ) {
          if (!current.contract) {
            current.nonCommittedCost =
              (Number(current.costRom) || 0) - (Number(current.revenueRom) || 0);
          }
        }

        nextItems[index] = current;
        return { ...prev, lineItems: nextItems };
      });
    },
    [],
  );

  // ── Commitment change handlers ──

  const handleCommitmentChange = React.useCallback(
    async (rowIndex: number, commitmentId: string) => {
      const commitment = contracts.find((c) => c.id === commitmentId);

      // Ensure the commitment's vendor appears in the dropdown list.
      // The vendor list is built from contracts that have a company_name; if
      // company_name is null in the view, the vendor was silently excluded.
      // Add it here using the contract's own vendorName so the combobox can
      // display it immediately after selection.
      if (commitment?.vendorId) {
        setVendors((prev) => {
          if (prev.some((v) => v.id === commitment.vendorId)) return prev;
          return [
            ...prev,
            {
              id: String(commitment.vendorId),
              vendor_name: commitment.vendorName || "Unknown Vendor",
            },
          ];
        });
      }

      setFormData((prev) => {
        const nextItems = [...prev.lineItems];
        const current = { ...nextItems[rowIndex], contract: commitmentId, commitmentId: commitmentId || undefined, commitmentLineItemId: "" };
        if (commitment?.vendorId) {
          current.vendor = String(commitment.vendorId);
        }
        // Immediately populate description from commitment title (same pattern as vendor)
        if (commitment?.title && !current.description) {
          current.description = commitment.title;
        }
        nextItems[rowIndex] = current;
        return { ...prev, lineItems: nextItems };
      });

      if (!commitmentId) return;

      if (commitmentLineItemsMap[commitmentId] !== undefined) {
        const items = commitmentLineItemsMap[commitmentId];
        const updates = resolveBudgetCodeFromItems(items, budgetCodes);
        if (Object.keys(updates).length > 0) {
          setFormData((prev) => {
            const nextItems = [...prev.lineItems];
            nextItems[rowIndex] = { ...nextItems[rowIndex], ...updates };
            return { ...prev, lineItems: nextItems };
          });
        }
        return;
      }

      const rawId = commitmentId.replace(/^(po|sub)-/, "");
      try {
        const data = await apiFetch<{ data: CommitmentSovLineItem[] }>(
          `/api/projects/${projectId}/commitments/${rawId}/line-items`,
        );
        const items: CommitmentSovLineItem[] = data.data || [];
        setCommitmentLineItemsMap((prev) => ({ ...prev, [commitmentId]: items }));

        const updates = resolveBudgetCodeFromItems(items, budgetCodes);
        if (Object.keys(updates).length > 0) {
          setFormData((prev) => {
            const nextItems = [...prev.lineItems];
            nextItems[rowIndex] = { ...nextItems[rowIndex], ...updates };
            return { ...prev, lineItems: nextItems };
          });
        }
      } catch {
        setCommitmentLineItemsMap((prev) => ({ ...prev, [commitmentId]: [] }));
      }
    },
    [contracts, commitmentLineItemsMap, budgetCodes, projectId, setVendors],
  );

  const handleCommitmentLineItemChange = React.useCallback(
    (rowIndex: number, commitmentId: string, sovLineItemId: string) => {
      const items = commitmentLineItemsMap[commitmentId] || [];
      const selectedItem = items.find((i) => i.id === sovLineItemId);
      setFormData((prev) => {
        const nextItems = [...prev.lineItems];
        const current = { ...nextItems[rowIndex], commitmentLineItemId: sovLineItemId };
        if (selectedItem?.budget_code) {
          const bc = findBudgetCode(selectedItem.budget_code, budgetCodes);
          if (bc) current.budgetCode = bc.id;
        }
        if (selectedItem?.description) {
          current.description = selectedItem.description;
        }
        nextItems[rowIndex] = current;
        return { ...prev, lineItems: nextItems };
      });
    },
    [commitmentLineItemsMap, budgetCodes],
  );

  // ── CSV import ──

  const csvInputRef = React.useRef<HTMLInputElement>(null);

  const handleCsvImport = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = (ev.target?.result as string) || "";
        const rows = text.split(/\r?\n/).filter((r) => r.trim());
        if (rows.length < 2) return;
        const headers = rows[0].split(",").map((h) => h.trim().toLowerCase());
        const newItems: ChangeEventLineItem[] = [];
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
          const get = (aliases: string[]) => {
            for (const a of aliases) {
              const idx = headers.indexOf(a);
              if (idx !== -1) return cols[idx] || "";
            }
            return "";
          };
          const costQty = Number(get(["cost qty", "cost quantity", "qty", "quantity"])) || 1;
          const costUnit = Number(get(["cost unit cost", "unit cost", "unit_cost", "cost"])) || 0;
          const costRom = costQty * costUnit;
          const revenueQty = Number(get(["revenue qty", "revenue quantity"])) || costQty;
          const revenueUnit = Number(get(["revenue unit cost"])) || costUnit;
          newItems.push({
            ...createEmptyLineItem(),
            budgetCode: get(["budget code", "budget_code", "code"]),
            description: get(["description", "desc"]),
            costQuantity: costQty,
            costUnitCost: costUnit,
            costRom,
            nonCommittedCost: costRom - (revenueQty * revenueUnit),
            revenueQuantity: revenueQty,
            revenueUnitCost: revenueUnit,
            revenueRom: revenueQty * revenueUnit,
            revenueUnitOfMeasure: get(["uom", "unit of measure", "unit"]),
          });
        }
        if (newItems.length > 0) {
          setFormData((prev) => ({
            ...prev,
            lineItems:
              prev.lineItems.length === 1 &&
              !prev.lineItems[0].description &&
              !prev.lineItems[0].budgetCode
                ? newItems
                : [...prev.lineItems, ...newItems],
          }));
          toast.success(`Imported ${newItems.length} line item${newItems.length !== 1 ? "s" : ""} from CSV`);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [],
  );

  // ── Add from commitment ──

  const [addFromCommitmentId, setAddFromCommitmentId] = React.useState("");

  const handleAddAllCommitmentLineItems = React.useCallback(
    async (commitmentId: string) => {
      if (!commitmentId) return;
      const rawId = commitmentId.replace(/^(po|sub)-/, "");
      let items: CommitmentSovLineItem[] = commitmentLineItemsMap[commitmentId] || [];
      if (items.length === 0) {
        try {
          const data = await apiFetch<{ data: CommitmentSovLineItem[] }>(
            `/api/projects/${projectId}/commitments/${rawId}/line-items`,
          );
          items = data.data || [];
          setCommitmentLineItemsMap((prev) => ({ ...prev, [commitmentId]: items }));
        } catch {
          toast.error("Failed to load commitment line items");
          return;
        }
      }
      if (items.length === 0) {
        toast.error("No line items found for this commitment");
        return;
      }
      const commitment = contracts.find((c) => c.id === commitmentId);
      const newRows: ChangeEventLineItem[] = items.map((li) => {
        const bc = findBudgetCode(li.budget_code, budgetCodes);
        return {
          ...createEmptyLineItem(),
          budgetCode: bc?.id || "",
          description: li.description || "",
          vendor: commitment?.vendorId || "",
          contract: commitmentId,
          commitmentId: commitmentId,
          commitmentLineItemId: li.id,
        };
      });
      setFormData((prev) => ({
        ...prev,
        lineItems:
          prev.lineItems.length === 1 &&
          !prev.lineItems[0].description &&
          !prev.lineItems[0].budgetCode
            ? newRows
            : [...prev.lineItems, ...newRows],
      }));
      setAddFromCommitmentId("");
      toast.success(
        `Added ${newRows.length} line item${newRows.length !== 1 ? "s" : ""} from commitment`,
      );
    },
    [commitmentLineItemsMap, contracts, budgetCodes, projectId],
  );

  // ── Line item CRUD ──

  const addLineItem = React.useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, createEmptyLineItem()],
    }));
  }, []);

  const removeLineItem = React.useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      lineItems:
        prev.lineItems.length > 1
          ? prev.lineItems.filter((_, i) => i !== index)
          : [createEmptyLineItem()],
    }));
  }, []);

  // ── Attachments ──

  const attachmentsAsInfo = React.useMemo(
    () =>
      formData.attachments.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    [formData.attachments],
  );

  // ── Budget code created handler ──

  const handleBudgetCodeCreated = React.useCallback(
    async (budgetCodeId: string) => {
      await fetchBudgetCodes();
      if (targetBudgetCodeRowIndex !== null && budgetCodeId) {
        updateLineItem(targetBudgetCodeRowIndex, "budgetCode", budgetCodeId);
      }
      setTargetBudgetCodeRowIndex(null);
      toast.success("Budget code created successfully");
    },
    [fetchBudgetCodes, targetBudgetCodeRowIndex, updateLineItem],
  );

  // ── Validation ──

  const validate = React.useCallback((): boolean => {
    const nextErrors: Partial<Record<keyof ChangeEventFormData, string>> = {};
    if (!formData.title.trim()) {
      nextErrors.title = "Title is required";
    } else if (formData.title.length > 255) {
      nextErrors.title = "Title must be 255 characters or fewer";
    }
    if (!formData.status) {
      nextErrors.status = "Status is required";
    }
    if (!formData.type) {
      nextErrors.type = "Type is required";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formData.title, formData.status, formData.type]);

  return {
    formData,
    nextNumber,
    errors,
    updateFormData,
    updateLineItem,
    vendors,
    contracts,
    budgetCodes,
    primeContractOptions,
    primeContractSelectOptions,
    commitmentLineItemsMap,
    addCompanyOpen,
    setAddCompanyOpen,
    showCreateBudgetCodeModal,
    setShowCreateBudgetCodeModal,
    targetBudgetCodeRowIndex,
    setTargetBudgetCodeRowIndex,
    handleCommitmentChange,
    handleCommitmentLineItemChange,
    addFromCommitmentId,
    setAddFromCommitmentId,
    handleAddAllCommitmentLineItems,
    addLineItem,
    removeLineItem,
    csvInputRef,
    handleCsvImport,
    attachmentsAsInfo,
    setFormData,
    handleBudgetCodeCreated,
    fetchVendors,
    validate,
  };
}
