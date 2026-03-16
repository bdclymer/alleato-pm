"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface Client {
  id: string;
  name: string;
  type: string | null;
  status: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  created_at: string | null;
}

export interface ClientOption {
  value: string;
  label: string;
}

interface UseClientsOptions {
  search?: string;
  status?: "active" | "inactive" | null;
  limit?: number;
  enabled?: boolean;
}

interface UseClientsReturn {
  clients: Client[];
  options: ClientOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createClient: (name: string) => Promise<Client | null>;
}

export function useClients(options: UseClientsOptions = {}): UseClientsReturn {
  const { search, status, limit = 100, enabled = true } = options;
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchClients = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      let query = supabase
        .from("companies")
        .select("id, name, type, status, website, address, city, state, created_at")
        .eq("type", "client")
        .order("name", { ascending: true })
        .limit(limit);

      if (search) query = query.ilike("name", `%${search}%`);
      if (status) query = query.eq("status", status);

      const { data, error: queryError } = await query;
      if (queryError) throw new Error(queryError.message);
      setClients((data as Client[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch clients"));
    } finally {
      setIsLoading(false);
    }
  }, [search, status, limit, enabled]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const createClientRecord = useCallback(
    async (name: string): Promise<Client | null> => {
      try {
        const supabase = createClient();
        const { data, error: insertError } = await supabase
          .from("companies")
          .insert({ name, type: "client", status: "active" })
          .select("id, name, type, status, website, address, city, state, created_at")
          .single();
        if (insertError) throw new Error(insertError.message);
        await fetchClients();
        return data as Client;
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to create client"));
        return null;
      }
    },
    [fetchClients],
  );

  const clientOptions: ClientOption[] = clients.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return {
    clients,
    options: clientOptions,
    isLoading,
    error,
    refetch: fetchClients,
    createClient: createClientRecord,
  };
}
