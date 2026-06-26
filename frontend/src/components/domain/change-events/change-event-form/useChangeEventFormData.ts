"use client";

import * as React from "react";
import { toast } from "sonner";

import type {
  BudgetCodeOption,
  ChangeEventFormData,
  ChangeEventLineItem,
  CommitmentSovLineItem,
} from "./types";
import { createEmptyLineItem, isMatchCostRevenueSource } from "./types";
import { apiFetch } from "@/lib/api-client";
import { useDropdownData } from "./useDropdownData";
import {
  findBudgetCode,
  resolveBudgetCodeFromSov,
} from "@/lib/change-events/budget-code-match";

// Thin adapter over the shared resolver: maps the resolution onto this form's
// line-item shape (budgetCode / description). Matching itself lives in
// @/lib/change-events/budget-code-match so the detail-page inline editor and
// this form can never drift apart again.
function resolveBudgetCodeFromItems(
  items: CommitmentSovLineItem[],
  budgetCodes: BudgetCodeOption[],
): Partial<ChangeEventLineItem> {
  const resolution = resolveBudgetCodeFromSov(items, budgetCodes);
  const updates: Partial<ChangeEventLineItem> = {};
  if (resolution.budgetCodeId) updates.budgetCode = resolution.budgetCodeId;
  if (resolution.description) updates.description = resolution.description;
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
    originId: initialData?.originId,
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

  // On mount (edit mode): fetch SOV items for any committed line items that are
  // missing a budget code and don't yet have cached SOV data. This ensures the
  // re-resolve effect below can run once the data arrives.
  const fetchedOnMountRef = React.useRef<Set<string>>(new Set());
  const initialLineItems = initialData?.lineItems;
  React.useEffect(() => {
    if (!initialLineItems) return;
    const ids = initialLineItems
      .filter((item) => item.commitmentId && !item.budgetCode)
      .map((item) => String(item.contract || item.commitmentId))
      .filter((id) => id && !fetchedOnMountRef.current.has(id));
    if (ids.length === 0) return;
    ids.forEach((commitmentId) => {
      fetchedOnMountRef.current.add(commitmentId);
      const rawId = commitmentId.replace(/^(po|sub)-/, "");
      apiFetch<{ data: CommitmentSovLineItem[] }>(
        `/api/projects/${projectId}/commitments/${rawId}/line-items`,
      )
        .then((data) => {
          const items: CommitmentSovLineItem[] = data.data || [];
          setCommitmentLineItemsMap((prev) => ({ ...prev, [commitmentId]: items }));
        })
        .catch(() => {
          setCommitmentLineItemsMap((prev) => ({ ...prev, [commitmentId]: [] }));
        });
    });
  }, [initialLineItems, projectId]);

  // Re-resolve budget codes for committed line items that are still missing one.
  // Handles two failure modes:
  //   1. Race condition — budgetCodes loaded after commitment was selected
  //   2. Edit form — existing line item has a commitment but budget_code_id was null in DB
  // Runs whenever budgetCodes or commitmentLineItemsMap becomes available.
  React.useEffect(() => {
    if (budgetCodes.length === 0) return;

    setFormData((prev) => {
      let changed = false;
      const nextItems = prev.lineItems.map((item) => {
        if (!item.commitmentId || item.budgetCode) return item;
        const cached = commitmentLineItemsMap[item.contract];
        if (!cached || cached.length === 0) return item;
        const updates = resolveBudgetCodeFromItems(cached, budgetCodes);
        if (!updates.budgetCode) return item;
        changed = true;
        return { ...item, ...updates };
      });
      return changed ? { ...prev, lineItems: nextItems } : prev;
    });
  }, [budgetCodes, commitmentLineItemsMap]);

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

          // Auto-sync revenue ROM when revenue mirrors cost (match-cost source).
          if (isMatchCostRevenueSource(prev.lineItemRevenueSource)) {
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
        let unresolvedBudgetCodes = 0;
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
          const rawBudgetCode = get(["budget code", "budget_code", "code"]);
          const matchedBudgetCode = findBudgetCode(rawBudgetCode, budgetCodes);
          if (rawBudgetCode && !matchedBudgetCode) {
            unresolvedBudgetCodes += 1;
          }
          newItems.push({
            ...createEmptyLineItem(),
            budgetCode: matchedBudgetCode?.id || "",
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
          if (unresolvedBudgetCodes > 0) {
            toast.warning(
              `${unresolvedBudgetCodes} budget code${unresolvedBudgetCodes !== 1 ? "s" : ""} could not be matched. Select them before saving.`,
            );
          }
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [budgetCodes],
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
