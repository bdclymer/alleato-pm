"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { ChangeEvent } from "@/types/change-events";

export type { ChangeEvent };

/**
 * Change Event in the Procore workflow:
 *
 * Change Events are the initial triggers for potential changes in a project.
 * They capture:
 * - Unforeseen field conditions
 * - Owner requests
 * - Design changes
 * - RFI outcomes
 * - Code compliance issues
 *
 * Workflow: Change Events → Potential Change Orders (PCO) → Prime Contract Change Orders (PCCO)
 */
export interface ChangeEventOption {
  value: string;
  label: string;
  status?: string;
  eventNumber?: string;
}

interface UseChangeEventsOptions {
  // Filter by project ID
  projectId?: number;
  // Filter by status
  status?: string;
  // Limit results
  limit?: number;
  // Whether to auto-fetch
  enabled?: boolean;
  // Include soft deleted records
  includeDeleted?: boolean;
}

interface UseChangeEventsReturn {
  changeEvents: ChangeEvent[];
  options: ChangeEventOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createChangeEvent: (
    changeEvent: Partial<ChangeEvent>,
  ) => Promise<ChangeEvent | null>;
}

/**
 * Hook for fetching and managing change events from Supabase
 * Used in contract detail pages, change event forms, etc.
 */
export function useChangeEvents(
  options: UseChangeEventsOptions = {},
): UseChangeEventsReturn {
  const { projectId, status, limit = 100, enabled = true } = options;
  const { includeDeleted = false } = options;
  const [changeEvents, setChangeEvents] = useState<ChangeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchChangeEvents = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from("change_events")
        .select("*")
        .order("number", { ascending: true })
        .limit(limit);

      // Filter by project_id
      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      // Filter by status if provided
      if (status) {
        query = query.eq("status", status);
      }

      if (!includeDeleted) {
        query = query.is("deleted_at", null);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      setChangeEvents(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch change events"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId, status, limit, enabled]);

  useEffect(() => {
    fetchChangeEvents();
  }, [fetchChangeEvents]);

  const createChangeEvent = useCallback(
    async (changeEvent: Partial<ChangeEvent>): Promise<ChangeEvent | null> => {
      try {
        const supabase = createClient();

        // Prepare the insert data
        const insertData: Record<string, unknown> = {
          project_id: changeEvent.project_id,
          number: changeEvent.number,
          title: changeEvent.title,
          reason: changeEvent.reason,
          scope: changeEvent.scope,
          status: changeEvent.status || "draft",
          notes: changeEvent.notes,
        };

        // Add optional fields
        if (changeEvent.description) {
          insertData.description = changeEvent.description;
        }
        if (changeEvent.estimated_impact !== undefined) {
          insertData.estimated_impact = changeEvent.estimated_impact;
        }

        const { data, error: insertError } = await (supabase as any)
          .from("change_events")
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        // Refetch to update the list
        await fetchChangeEvents();
        return data;
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to create change event"),
        );
        return null;
      }
    },
    [fetchChangeEvents],
  );

  // Transform change events to options for dropdowns
  const changeEventOptions: ChangeEventOption[] = changeEvents.map((ce) => {
    const number = ce.number || `CE-${ce.id}`;
    const label = ce.title ? `${number}: ${ce.title}` : number;

    return {
      value: ce.id.toString(),
      label,
      status: ce.status || undefined,
      eventNumber: number,
    };
  });

  return {
    changeEvents,
    options: changeEventOptions,
    isLoading,
    error,
    refetch: fetchChangeEvents,
    createChangeEvent,
  };
}

/**
 * Helper hook to get change events for a specific project
 */
type ProjectOptions = Omit<UseChangeEventsOptions, "projectId">;

export function useProjectChangeEvents(
  projectId: number,
  options: ProjectOptions = {},
) {
  const { enabled, ...rest } = options;
  return useChangeEvents({
    projectId,
    enabled: enabled ?? !!projectId,
    ...rest,
  });
}
