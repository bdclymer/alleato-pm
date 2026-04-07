"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  /** Filter contacts assigned to this specific vendor (preferred) */
  vendorId?: string;
  /** Legacy: filter by company_id on the people table */
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
 * Hook for fetching contacts belonging to a specific vendor via vendor_contacts join table.
 * Falls back to company_id filter if vendorId is not provided.
 */
export function useCompanyContacts(
  options: UseCompanyContactsOptions = {},
): UseCompanyContactsReturn {
  const { vendorId, companyId, search, limit = 100, enabled = true } = options;
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchContacts = useCallback(async () => {
    const hasFilter = !!vendorId || !!companyId;
    if (!enabled || !hasFilter) {
      setContacts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      if (vendorId) {
        // Query via vendor_contacts join table for exact vendor assignment
        let query = supabase
          .from("vendor_contacts")
          .select(
            "people!vendor_contacts_person_id_fkey(id, first_name, last_name, email, phone_business, job_title, company_id)",
          )
          .eq("vendor_id", vendorId)
          .limit(limit);

        if (search) {
          query = query.or(
            `people.first_name.ilike.%${search}%,people.last_name.ilike.%${search}%,people.email.ilike.%${search}%`,
          );
        }

        const { data, error: queryError } = await query;

        if (queryError) throw new Error(queryError.message);

        const people = (data || [])
          .map((row) => (row as Record<string, unknown>).people)
          .filter(Boolean) as CompanyContact[];

        setContacts(people);
      } else if (companyId) {
        // Legacy: filter directly on people.company_id
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
        if (queryError) throw new Error(queryError.message);
        setContacts((data || []) as CompanyContact[]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch company contacts"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [vendorId, companyId, search, limit, enabled]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

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
