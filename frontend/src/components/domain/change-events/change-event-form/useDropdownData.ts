"use client";

import * as React from "react";

import type {
  PrimeContractOption,
  VendorOption,
  ContractOption,
  BudgetCodeOption,
} from "./types";

interface UseDropdownDataOptions {
  projectId: number;
}

export function useDropdownData({ projectId }: UseDropdownDataOptions) {
  const [primeContractOptions, setPrimeContractOptions] = React.useState<
    PrimeContractOption[]
  >([]);
  const [vendors, setVendors] = React.useState<VendorOption[]>([]);
  const [contracts, setContracts] = React.useState<ContractOption[]>([]);
  const [budgetCodes, setBudgetCodes] = React.useState<BudgetCodeOption[]>([]);

  const fetchVendors = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/vendors`);
      if (!response.ok) return;
      const data = await response.json();
      setVendors(Array.isArray(data) ? data : data.data || []);
    } catch {
      setVendors([]);
    }
  }, [projectId]);

  const fetchBudgetCodes = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget-codes`);
      if (!response.ok) return;
      const payload = await response.json();
      const codes = (payload.budgetCodes || payload.data || []) as Array<{
        id: string;
        code: string;
        description?: string;
        costType?: string | null;
        fullLabel?: string;
      }>;
      setBudgetCodes(
        codes.map((bc) => ({
          id: bc.id,
          code: bc.code,
          description: bc.description || "",
          costType: bc.costType || null,
          fullLabel:
            bc.fullLabel || `${bc.code}${bc.description ? ` - ${bc.description}` : ""}`,
        })),
      );
    } catch {
      setBudgetCodes([]);
    }
  }, [projectId]);

  React.useEffect(() => {
    const fetchAll = async () => {
      // Prime contracts
      try {
        const response = await fetch(`/api/projects/${projectId}/contracts`);
        if (response.ok) {
          const payload = await response.json();
          const records = (
            Array.isArray(payload)
              ? payload
              : Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload?.contracts)
                  ? payload.contracts
                  : []
          ) as Array<{
            id: number | string;
            contract_number?: string;
            number?: string;
            title?: string;
            description?: string;
          }>;
          setPrimeContractOptions(
            records
              .filter((record) => record.id !== undefined && record.id !== null)
              .map((record) => ({
                value: String(record.id),
                label: `${record.contract_number || record.number || "PC"} - ${record.title || record.description || "Untitled"}`,
              })),
          );
        }
      } catch {
        setPrimeContractOptions([]);
      }

      // Vendors
      await fetchVendors();

      // Purchase orders + subcontracts
      try {
        const [poRes, subRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/purchase-orders`),
          fetch(`/api/projects/${projectId}/subcontracts`),
        ]);

        const contractList: ContractOption[] = [];

        if (poRes.ok) {
          const poPayload = await poRes.json();
          const poData = poPayload.data || poPayload || [];
          for (const po of poData) {
            // Skip deleted or voided commitments
            if (po.deleted_at || po.status === "Void") continue;
            const companyLabel = po.company_name ? ` (${po.company_name})` : "";
            contractList.push({
              id: `po-${po.id}`,
              label: `${po.contract_number || po.number || "PO"} - ${po.title || "Untitled"}${companyLabel}`,
              type: "purchase_order",
              vendorId: po.contract_company_id || null,
              vendorName: po.company_name || null,
            });
          }
        }

        if (subRes.ok) {
          const subPayload = await subRes.json();
          const subData = subPayload.data || subPayload || [];
          for (const sub of subData) {
            // Skip deleted or voided commitments
            if (sub.deleted_at || sub.status === "Void") continue;
            const companyLabel = sub.company_name ? ` (${sub.company_name})` : "";
            contractList.push({
              id: `sub-${sub.id}`,
              label: `${sub.contract_number || sub.number || "SC"} - ${sub.title || "Untitled"}${companyLabel}`,
              type: "subcontract",
              vendorId: sub.contract_company_id || null,
              vendorName: sub.company_name || null,
            });
          }
        }

        setContracts(contractList);

        // Backfill any commitment vendors that aren't in the vendor list yet.
        // contract_company_id may not be in project_vendors or marked is_vendor=true,
        // but we still need to display (and submit) it when a commitment is selected.
        setVendors((prev) => {
          const existingIds = new Set(prev.map((v) => v.id));
          const missing: VendorOption[] = [];
          for (const c of contractList) {
            if (c.vendorId && c.vendorName && !existingIds.has(c.vendorId)) {
              existingIds.add(c.vendorId);
              missing.push({ id: c.vendorId, vendor_name: c.vendorName });
            }
          }
          return missing.length > 0 ? [...prev, ...missing] : prev;
        });
      } catch {
        setContracts([]);
      }

      // Budget codes
      await fetchBudgetCodes();
    };

    fetchAll();
  }, [projectId, fetchVendors, fetchBudgetCodes]);

  const primeContractSelectOptions = React.useMemo(
    () =>
      primeContractOptions.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [primeContractOptions],
  );

  return {
    vendors,
    contracts,
    budgetCodes,
    primeContractOptions,
    primeContractSelectOptions,
    fetchVendors,
    fetchBudgetCodes,
  };
}
