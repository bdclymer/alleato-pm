"use client";

import * as React from "react";
import { toast } from "sonner";

import type {
  ChangeEventFormData,
  ChangeEventLineItem,
  CommitmentSovLineItem,
} from "./types";
import { createEmptyLineItem } from "./types";
import { useDropdownData } from "./useDropdownData";

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

      setFormData((prev) => {
        const nextItems = [...prev.lineItems];
        const current = { ...nextItems[rowIndex], contract: commitmentId, commitmentLineItemId: "" };
        if (commitment?.vendorId) {
          current.vendor = commitment.vendorId;
        }
        nextItems[rowIndex] = current;
        return { ...prev, lineItems: nextItems };
      });

      if (!commitmentId) return;

      if (commitmentLineItemsMap[commitmentId] !== undefined) {
        const items = commitmentLineItemsMap[commitmentId];
        if (items.length === 1 && items[0].budget_code) {
          const bc = budgetCodes.find((b) => b.code === items[0].budget_code);
          if (bc) {
            setFormData((prev) => {
              const nextItems = [...prev.lineItems];
              nextItems[rowIndex] = { ...nextItems[rowIndex], budgetCode: bc.id };
              return { ...prev, lineItems: nextItems };
            });
          }
        }
        return;
      }

      const rawId = commitmentId.replace(/^(po|sub)-/, "");
      try {
        const res = await fetch(
          `/api/projects/${projectId}/commitments/${rawId}/line-items`,
        );
        if (!res.ok) {
          setCommitmentLineItemsMap((prev) => ({ ...prev, [commitmentId]: [] }));
          return;
        }
        const data = await res.json();
        const items: CommitmentSovLineItem[] = data.data || [];
        setCommitmentLineItemsMap((prev) => ({ ...prev, [commitmentId]: items }));

        if (items.length === 1 && items[0].budget_code) {
          const bc = budgetCodes.find((b) => b.code === items[0].budget_code);
          if (bc) {
            setFormData((prev) => {
              const nextItems = [...prev.lineItems];
              nextItems[rowIndex] = { ...nextItems[rowIndex], budgetCode: bc.id };
              return { ...prev, lineItems: nextItems };
            });
          }
        }
      } catch {
        setCommitmentLineItemsMap((prev) => ({ ...prev, [commitmentId]: [] }));
      }
    },
    [contracts, commitmentLineItemsMap, budgetCodes, projectId],
  );

  const handleCommitmentLineItemChange = React.useCallback(
    (rowIndex: number, commitmentId: string, sovLineItemId: string) => {
      const items = commitmentLineItemsMap[commitmentId] || [];
      const selectedItem = items.find((i) => i.id === sovLineItemId);
      setFormData((prev) => {
        const nextItems = [...prev.lineItems];
        const current = { ...nextItems[rowIndex], commitmentLineItemId: sovLineItemId };
        if (selectedItem?.budget_code) {
          const bc = budgetCodes.find((b) => b.code === selectedItem.budget_code);
          if (bc) current.budgetCode = bc.id;
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
          const res = await fetch(
            `/api/projects/${projectId}/commitments/${rawId}/line-items`,
          );
          if (res.ok) {
            const data = await res.json();
            items = data.data || [];
            setCommitmentLineItemsMap((prev) => ({ ...prev, [commitmentId]: items }));
          }
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
        const bc = budgetCodes.find((b) => b.code === li.budget_code);
        return {
          ...createEmptyLineItem(),
          budgetCode: bc?.id || "",
          description: li.description || "",
          vendor: commitment?.vendorId || "",
          contract: commitmentId,
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
    }
    if (!formData.status) {
      nextErrors.status = "Status is required";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formData.title, formData.status]);

  return {
    formData,
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
