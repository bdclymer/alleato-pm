"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface CostCode {
  id: string;
  title: string | null;
  description: string | null;
  division_id: string;
  division_title: string | null;
  status: string | null;
  created_at: string;
}

export interface CostCodeOption {
  value: string;
  label: string;
  code: string;
  description: string;
}

// Standard CSI MasterFormat divisions for fallback/seeding
export const CSI_DIVISIONS = [
  { code: "01", name: "General Requirements" },
  { code: "02", name: "Existing Conditions" },
  { code: "03", name: "Concrete" },
  { code: "04", name: "Masonry" },
  { code: "05", name: "Metals" },
  { code: "06", name: "Wood, Plastics, and Composites" },
  { code: "07", name: "Thermal and Moisture Protection" },
  { code: "08", name: "Openings" },
  { code: "09", name: "Finishes" },
  { code: "10", name: "Specialties" },
  { code: "11", name: "Equipment" },
  { code: "12", name: "Furnishings" },
  { code: "13", name: "Special Construction" },
  { code: "14", name: "Conveying Equipment" },
  { code: "21", name: "Fire Suppression" },
  { code: "22", name: "Plumbing" },
  { code: "23", name: "HVAC" },
  { code: "26", name: "Electrical" },
  { code: "27", name: "Communications" },
  { code: "28", name: "Electronic Safety and Security" },
  { code: "31", name: "Earthwork" },
  { code: "32", name: "Exterior Improvements" },
  { code: "33", name: "Utilities" },
];

interface UseCostCodesOptions {
  // Filter cost codes by search term
  search?: string;
  // Filter by status (active/inactive)
  status?: string;
  // Limit number of results
  limit?: number;
  // Whether to auto-fetch on mount
  enabled?: boolean;
  // Use standard CSI divisions as fallback if no DB records
  useFallback?: boolean;
}

interface UseCostCodesReturn {
  costCodes: CostCode[];
  options: CostCodeOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createCostCode: (costCode: Partial<CostCode>) => Promise<CostCode | null>;
}

/**
 * Hook for fetching cost codes from Supabase
 * Falls back to standard CSI divisions if database is empty
 */
export function useCostCodes(
  options: UseCostCodesOptions = {},
): UseCostCodesReturn {
  const {
    search,
    status,
    limit = 100,
    enabled = true,
    useFallback = true,
  } = options;
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCostCodes = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from("cost_codes")
        .select("*")
        .order("id", { ascending: true })
        .limit(limit);

      if (search) {
        query = query.or(`id.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      // If no cost codes found and fallback enabled, use CSI divisions
      if ((!data || data.length === 0) && useFallback) {
        const fallbackCodes: CostCode[] = CSI_DIVISIONS.map((div) => ({
          id: `${div.code}-000`,
          title: div.name,
          description: div.name,
          division_id: div.code,
          division_title: div.name,
          status: "active",
          created_at: new Date().toISOString(),
        }));
        setCostCodes(fallbackCodes);
      } else {
        setCostCodes((data || []) as unknown as CostCode[]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch cost codes"),
      );

      // Use fallback on error if enabled
      if (useFallback) {
        const fallbackCodes: CostCode[] = CSI_DIVISIONS.map((div) => ({
          id: `${div.code}-000`,
          title: div.name,
          description: div.name,
          division_id: div.code,
          division_title: div.name,
          status: "active",
          created_at: new Date().toISOString(),
        }));
        setCostCodes(fallbackCodes);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, status, limit, enabled, useFallback]);

  useEffect(() => {
    fetchCostCodes();
  }, [fetchCostCodes]);

  const createCostCode = useCallback(
    async (costCode: Partial<CostCode>): Promise<CostCode | null> => {
      try {
        const supabase = createClient();
        const { data, error: insertError } = await supabase
          .from("cost_codes")
          .insert({
            id: costCode.id || "",
            title: costCode.title || costCode.description,
            division_id: costCode.division_id || "",
            division_title: costCode.division_title,
            status: costCode.status || "active",
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        // Refetch to update the list
        await fetchCostCodes();
        return data as unknown as CostCode;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to create cost code"),
        );
        return null;
      }
    },
    [fetchCostCodes],
  );

  // Transform cost codes to options for dropdowns.
  // Deduplicate by id and filter out any records with a falsy id — duplicate or
  // empty ids would produce identical `key` props and trigger React's
  // "Encountered two children with the same key" warning.
  const seen = new Set<string>();
  const costCodeOptions: CostCodeOption[] = costCodes
    .filter((code) => {
      if (!code.id) return false;
      if (seen.has(code.id)) return false;
      seen.add(code.id);
      return true;
    })
    .map((code) => ({
      value: code.id,
      label: `${code.id} - ${code.title || code.description || "No Description"}`,
      code: code.id,
      description: code.title || code.description || "",
    }));

  return {
    costCodes,
    options: costCodeOptions,
    isLoading,
    error,
    refetch: fetchCostCodes,
    createCostCode,
  };
}
