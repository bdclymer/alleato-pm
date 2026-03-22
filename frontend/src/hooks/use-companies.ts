"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Company } from "@/types/financial";

export interface CompanyOption {
  value: string;
  label: string;
}

interface UseCompaniesOptions {
  // Filter companies by search term
  search?: string;
  // Limit number of results
  limit?: number;
  // Whether to auto-fetch on mount
  enabled?: boolean;
}

interface UseCompaniesReturn {
  companies: Company[];
  options: CompanyOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createCompany: (company: Partial<Company>) => Promise<Company | null>;
}

/**
 * Hook for fetching companies from Supabase
 * Used in contract forms, vendor selection, etc.
 */
export function useCompanies(
  options: UseCompaniesOptions = {},
): UseCompaniesReturn {
  const { search, limit = 1000, enabled = true } = options;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCompanies = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from("companies")
        .select("*")
        .order("name", { ascending: true })
        .limit(limit);

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      setCompanies((data || []) as Company[]);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch companies"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [search, limit, enabled]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const createCompany = useCallback(
    async (company: Partial<Company>): Promise<Company | null> => {
      try {
        const supabase = createClient();
        const { data, error: insertError } = await supabase
          .from("companies")
          .insert({
            name: company.name || "",
            address: company.address,
            city: company.city,
            state: company.state,
            website: company.website,
            notes: company.notes,
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        // Refetch to update the list
        await fetchCompanies();
        return data as Company;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to create company"),
        );
        return null;
      }
    },
    [fetchCompanies],
  );

  // Transform companies to options for dropdowns
  const companyOptions: CompanyOption[] = companies.map((company) => ({
    value: company.id,
    label: company.name,
  }));

  return {
    companies,
    options: companyOptions,
    isLoading,
    error,
    refetch: fetchCompanies,
    createCompany,
  };
}
