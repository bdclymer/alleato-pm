"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface Project {
  id: number;
  name: string | null;
  project_number: string | null;
  client: string | null;
  client_id: string | null;
  phase: string | null;
  state: string | null;
  address: string | null;
  budget: number | null;
  budget_used: number | null;
  health_status: string | null;
  health_score: number | null;
  completion_percentage: number | null;
  project_manager: number | null;
  created_at: string;
  archived: boolean;
  // Joined data
  manager?: {
    id: number;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export interface ProjectOption {
  value: string;
  label: string;
  projectNumber?: string;
}

interface UseProjectsOptions {
  // Filter projects by search term
  search?: string;
  // Filter by phase
  phase?: string;
  // Whether to include archived projects
  includeArchived?: boolean;
  // Filter by client ID
  clientId?: string;
  // Limit number of results
  limit?: number;
  // Whether to auto-fetch on mount
  enabled?: boolean;
}

interface UseProjectsReturn {
  projects: Project[];
  options: ProjectOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching projects from Supabase
 * Used in project selection dropdowns, contract forms, etc.
 */
export function useProjects(
  options: UseProjectsOptions = {},
): UseProjectsReturn {
  const {
    search,
    phase,
    includeArchived = false,
    clientId,
    limit = 100,
    enabled = true,
  } = options;
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from("projects")
        .select("*")
        .order("name", { ascending: true })
        .limit(limit);

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,project_number.ilike.%${search}%`,
        );
      }

      if (phase) {
        query = query.eq("phase", phase);
      }

      if (!includeArchived) {
        query = query.eq("archived", false);
      }

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      setProjects(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch projects"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [search, phase, includeArchived, clientId, limit, enabled]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Transform projects to options for dropdowns
  const projectOptions: ProjectOption[] = projects.map((project) => {
    const label = project.project_number
      ? `${project.project_number} - ${project.name || "Unnamed Project"}`
      : project.name || "Unnamed Project";

    return {
      value: project.id.toString(),
      label,
      projectNumber: project.project_number || undefined,
    };
  });

  return {
    projects,
    options: projectOptions,
    isLoading,
    error,
    refetch: fetchProjects,
  };
}
