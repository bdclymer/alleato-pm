"use client";

import * as React from "react";

import type {
  PrimeContractOption,
  VendorOption,
  ContractOption,
  BudgetCodeOption,
} from "./types";

// Commitments in these statuses have not been awarded yet and should not appear
// in the Change Event vendor or commitment dropdowns.
const EXCLUDED_COMMITMENT_STATUSES = new Set(["Draft", "Out for Bid"]);

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

  // Called after a company is added via AddCompanyModal so the new vendor
  // appears immediately. Merges with the existing contract-derived list.
  const fetchVendors = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/vendors`);
      if (!response.ok) return;
      const data = await response.json();
      const apiVendors: VendorOption[] = Array.isArray(data) ? data : data.data || [];
      setVendors((prev) => {
        const existingIds = new Set(prev.map((v) => v.id));
        const incoming = apiVendors.filter((v) => !existingIds.has(v.id));
        return incoming.length > 0 ? [...prev, ...incoming] : prev;
      });
    } catch {
      // Keep existing list on error
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

      // Purchase orders + subcontracts.
      // Only commitments that have been issued (not Draft/Out for Bid) are eligible
      // for Change Events. The vendor list is derived from these commitments so that
      // only vendors with an active contract on this project appear in the dropdown.
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
            if (po.deleted_at || po.status === "Void" || EXCLUDED_COMMITMENT_STATUSES.has(po.status)) continue;
            const companyLabel = po.company_name ? ` (${po.company_name})` : "";
            contractList.push({
              id: `po-${po.id}`,
              label: `${po.contract_number || po.number || "PO"} - ${po.title || "Untitled"}${companyLabel}`,
              type: "purchase_order",
              vendorId: po.contract_company_id || null,
              vendorName: po.company_name || null,
              title: po.title || null,
              status: po.status || null,
            });
          }
        }

        if (subRes.ok) {
          const subPayload = await subRes.json();
          const subData = subPayload.data || subPayload || [];
          for (const sub of subData) {
            if (sub.deleted_at || sub.status === "Void" || EXCLUDED_COMMITMENT_STATUSES.has(sub.status)) continue;
            const companyLabel = sub.company_name ? ` (${sub.company_name})` : "";
            contractList.push({
              id: `sub-${sub.id}`,
              label: `${sub.contract_number || sub.number || "SC"} - ${sub.title || "Untitled"}${companyLabel}`,
              type: "subcontract",
              vendorId: sub.contract_company_id || null,
              vendorName: sub.company_name || null,
              title: sub.title || null,
              status: sub.status || null,
            });
          }
        }

        setContracts(contractList);

        // Derive vendor list from active commitments only — vendors without a
        // commitment on this project must not appear in the dropdown.
        // Include vendors even if company_name is null so that commitment-based
        // auto-fill always has a visible entry in the dropdown.
        const vendorMap = new Map<string, VendorOption>();
        for (const c of contractList) {
          if (c.vendorId && !vendorMap.has(c.vendorId)) {
            vendorMap.set(c.vendorId, {
              id: c.vendorId,
              vendor_name: c.vendorName || "Unknown Vendor",
            });
          }
        }
        setVendors(Array.from(vendorMap.values()));
      } catch {
        setContracts([]);
      }

      // Budget codes
      await fetchBudgetCodes();
    };

    fetchAll();
  }, [projectId, fetchBudgetCodes]);

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
    setVendors,
    contracts,
    budgetCodes,
    primeContractOptions,
    primeContractSelectOptions,
    fetchVendors,
    fetchBudgetCodes,
  };
}
