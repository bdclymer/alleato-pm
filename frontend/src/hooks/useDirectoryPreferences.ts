"use client";

import * as React from "react";
import type { DirectoryFilters } from "@/components/directory/DirectoryFilters";
import type { ColumnConfig } from "@/components/directory/ColumnManager";
import type { DirectorySavedFilter } from "@/services/directoryPreferencesService";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";

interface DirectoryPreferencesState {
  savedFilters: DirectorySavedFilter[];
  lastFilters?: DirectoryFilters;
  columnPreferences?: ColumnConfig[];
  loading: boolean;
}

export function useDirectoryPreferences(projectId: string) {
  const [state, setState] = React.useState<DirectoryPreferencesState>({
    savedFilters: [],
    loading: true,
  });

  const refresh = React.useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const [filtersPayload, prefsPayload] = await Promise.all([
        apiFetch<{ data?: DirectorySavedFilter[] }>(
          `/api/projects/${projectId}/directory/filters`,
        ),
        apiFetch<{
          data?: {
            lastFilters?: DirectoryFilters;
            columnPreferences?: ColumnConfig[];
          };
        }>(`/api/projects/${projectId}/directory/preferences`),
      ]);

      setState({
        savedFilters: filtersPayload.data || [],
        lastFilters: prefsPayload.data?.lastFilters,
        columnPreferences: prefsPayload.data?.columnPreferences,
        loading: false,
      });
    } catch (error) {
      console.error("[DirectoryPreferences] load failed", error);
      setState((prev) => ({ ...prev, loading: false }));
      toast.error("Unable to load saved filters");
    }
  }, [projectId]);

  React.useEffect(() => {
    if (!projectId) return;
    void refresh();
  }, [projectId, refresh]);

  const saveFilter = React.useCallback(
    async (payload: {
      id?: string;
      name: string;
      description?: string;
      filters: DirectoryFilters;
      search?: string;
    }) => {
      try {
        const data = await apiFetch<{ data: DirectorySavedFilter }>(
          `/api/projects/${projectId}/directory/filters`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        setState((prev) => ({
          ...prev,
          savedFilters: prev.savedFilters.some(
            (filter) => filter.id === data.data.id,
          )
            ? prev.savedFilters.map((filter) =>
                filter.id === data.data.id ? data.data : filter,
              )
            : [...prev.savedFilters, data.data],
        }));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save filter",
        );
      }
    },
    [projectId],
  );

  const deleteFilter = React.useCallback(
    async (filterId: string) => {
      try {
        await apiFetch(
          `/api/projects/${projectId}/directory/filters?id=${filterId}`,
          { method: "DELETE" },
        );
        setState((prev) => ({
          ...prev,
          savedFilters: prev.savedFilters.filter(
            (filter) => filter.id !== filterId,
          ),
        }));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete filter",
        );
      }
    },
    [projectId],
  );

  const persistPreferences = React.useCallback(
    async (payload: {
      lastFilters?: DirectoryFilters;
      columnPreferences?: ColumnConfig[];
    }) => {
      try {
        await apiFetch(
          `/api/projects/${projectId}/directory/preferences`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        setState((prev) => ({
          ...prev,
          lastFilters: payload.lastFilters ?? prev.lastFilters,
          columnPreferences: payload.columnPreferences ?? prev.columnPreferences,
        }));
      } catch (error) {
        console.error("[DirectoryPreferences] save failed", error);
      }
    },
    [projectId],
  );

  return {
    ...state,
    refresh,
    saveFilter,
    deleteFilter,
    persistPreferences,
  };
}
