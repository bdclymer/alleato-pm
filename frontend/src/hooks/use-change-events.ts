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
      // Project-scoped pages should use API enrichment so table parity fields
      // (RFQ title, commitment info, cost rollups) are consistently available.
      if (projectId) {
        const searchParams = new URLSearchParams();
        searchParams.set("limit", String(limit));
        if (status) searchParams.set("status", status);
        if (includeDeleted) searchParams.set("includeDeleted", "true");

        const response = await fetch(
          `/api/projects/${projectId}/change-events?${searchParams.toString()}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          const errorPayload = await response
            .json()
            .catch(() => ({ error: "Failed to fetch change events" }));
          throw new Error(
            errorPayload.error || "Failed to fetch change events",
          );
        }

        const payload = await response.json();
        setChangeEvents(payload.data || []);
        return;
      }

      const supabase = createClient();
      let query = supabase
        .from("change_events")
        .select("*")
        .order("number", { ascending: true })
        .limit(limit);

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
  }, [projectId, status, limit, enabled, includeDeleted]);

  useEffect(() => {
    fetchChangeEvents();
  }, [fetchChangeEvents]);

  const createChangeEvent = useCallback(
    async (changeEvent: Partial<ChangeEvent>): Promise<ChangeEvent | null> => {
      try {
        if (!changeEvent.project_id) {
          throw new Error("Project ID is required");
        }

        const response = await fetch(
          `/api/projects/${changeEvent.project_id}/change-events`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: changeEvent.title,
              type: changeEvent.type || "Owner Change",
              scope: changeEvent.scope || "TBD",
              reason: changeEvent.reason || undefined,
              description: changeEvent.description || undefined,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || "Failed to create change event");
        }

        const data = await response.json();

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
