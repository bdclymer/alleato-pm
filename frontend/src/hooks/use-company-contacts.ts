"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface CompanyContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_business: string | null;
  job_title: string | null;
  company_id: string | null;
}

export interface CompanyContactOption {
  value: string;
  label: string;
  email?: string;
}

interface UseCompanyContactsOptions {
  companyId?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
}

interface UseCompanyContactsReturn {
  contacts: CompanyContact[];
  options: CompanyContactOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching contacts belonging to a specific company.
 * Used for invoice contacts selection in commitment forms.
 * Only fetches when companyId is provided and enabled is true.
 */
export function useCompanyContacts(
  options: UseCompanyContactsOptions = {},
): UseCompanyContactsReturn {
  const { companyId, search, limit = 100, enabled = true } = options;
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchContacts = useCallback(async () => {
    // Only fetch if we have a company ID and the hook is enabled
    if (!enabled || !companyId) {
      setContacts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      let query = supabase
        .from("people")
        .select(
          "id, first_name, last_name, email, phone_business, job_title, company_id",
        )
        .eq("company_id", companyId)
        .order("last_name", { ascending: true })
        .limit(limit);

      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`,
        );
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      setContacts((data || []) as CompanyContact[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch company contacts"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [companyId, search, limit, enabled]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Transform contacts to options for dropdowns
  const contactOptions: CompanyContactOption[] = contacts.map((contact) => {
    const fullName = [contact.first_name, contact.last_name]
      .filter(Boolean)
      .join(" ");
    return {
      value: contact.id,
      label: fullName || contact.email || "Unnamed Contact",
      email: contact.email || undefined,
    };
  });

  return {
    contacts,
    options: contactOptions,
    isLoading,
    error,
    refetch: fetchContacts,
  };
}
