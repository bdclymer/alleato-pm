"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  DirectoryFilters,
  PersonWithDetails,
} from "@/components/directory/DirectoryFilters";
import { apiFetch } from "@/lib/api-client";

interface DirectoryGroup {
  key: string;
  label: string;
  items: PersonWithDetails[];
}

interface UseDirectoryResult {
  data: PersonWithDetails[];
  groups?: DirectoryGroup[];
  loading: boolean;
  error: Error | null;
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
  refetch: () => void;
  updateFilters: (filters: DirectoryFilters) => void;
  offline: boolean;
}

/**
 * React hook that fetches and exposes a project's directory of people with support for filtering, grouping, and pagination metadata.
 *
 * @param projectId - The ID of the project whose directory will be fetched
 * @param initialFilters - Optional initial filters applied to the directory query
 * @returns An object with:
 *  - `data`: array of `PersonWithDetails` for the current query
 *  - `groups`: optional grouped representation of `data`
 *  - `loading`: boolean indicating an in-flight fetch
 *  - `error`: an `Error` instance if the last fetch failed, or `null`
 *  - `meta`: pagination metadata (`total`, `page`, `perPage`, `totalPages`)
 *  - `refetch`: function to re-run the current fetch
 *  - `updateFilters`: function to replace the current filters
 */
export function useDirectory(
  projectId: string,
  initialFilters: DirectoryFilters = {},
): UseDirectoryResult {
  const [data, setData] = useState<PersonWithDetails[]>([]);
  const [groups, setGroups] = useState<DirectoryGroup[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<DirectoryFilters>(initialFilters);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    perPage: 50,
    totalPages: 0,
  });
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );

  const cacheKey = useMemo(() => {
    const signature = JSON.stringify({
      projectId,
      filters,
    });
    return `directory:${signature}`;
  }, [projectId, filters]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setData(parsed.data || []);
        setGroups(parsed.groups);
        setMeta(parsed.meta || meta);
      } catch {
        // ignore cache errors
      }
    }
  }, [cacheKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();

      if (filters.search) params.append("search", filters.search);
      if (filters.type) params.append("type", filters.type);
      if (filters.status) params.append("status", filters.status);
      if (filters.companyId) params.append("company_id", filters.companyId);
      if (filters.permissionTemplateId)
        params.append("permission_template_id", filters.permissionTemplateId);
      if (filters.groupBy) params.append("group_by", filters.groupBy);
      if (filters.sortBy?.length)
        params.append("sort", filters.sortBy.join(","));
      params.append("page", "1");
      params.append("per_page", "50");

      // Fetch from API
      const result = await apiFetch<{
        data?: PersonWithDetails[];
        groups?: DirectoryGroup[];
        meta?: {
          total: number;
          page: number;
          perPage: number;
          totalPages: number;
        };
      }>(
        `/api/projects/${projectId}/directory/people?${params}`,
      );

      setData(result.data || []);
      setGroups(result.groups);
      setMeta(
        result.meta || {
          total: 0,
          page: 1,
          perPage: 50,
          totalPages: 0,
        },
      );
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: result.data || [],
            groups: result.groups,
            meta: result.meta,
          }),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An unexpected error occurred."));
      if (typeof window !== "undefined") {
        const cached = window.localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setData(parsed.data || []);
            setGroups(parsed.groups);
            setMeta(parsed.meta || meta);
          } catch {
            // ignore cache errors
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, filters, cacheKey, meta]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateFilters = useCallback((newFilters: DirectoryFilters) => {
    setFilters(newFilters);
  }, []);

  return {
    data,
    groups,
    loading,
    error,
    meta,
    refetch: fetchData,
    updateFilters,
    offline,
  };
}
