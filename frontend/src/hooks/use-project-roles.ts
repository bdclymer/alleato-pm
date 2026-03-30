"use client";

import { useState, useEffect, useCallback } from "react";

export interface RoleMember {
  id: string;
  person_id: string;
  assigned_at: string;
  person: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    company_name: string | null;
  } | null;
}

export interface ProjectRole {
  id: string;
  role_name: string;
  role_type: string;
  display_order: number;
  members: RoleMember[];
}

interface UseProjectRolesResult {
  roles: ProjectRole[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateRoleMembers: (
    roleId: string,
    memberPersonIds: string[],
  ) => Promise<void>;
  createRole: (roleName: string) => Promise<ProjectRole>;
  deleteRole: (roleId: string) => Promise<void>;
}

export function useProjectRoles(projectId: string): UseProjectRolesResult {
  const [roles, setRoles] = useState<ProjectRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoles = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/directory/roles`,
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch roles");
      }
      const { data } = await response.json();
      setRoles(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("an unexpected error occurred — please try again"));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    const loadRoles = async () => {
      if (!projectId || cancelled) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/projects/${projectId}/directory/roles`,
        );

        if (cancelled) return;

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch roles");
        }
        const { data } = await response.json();

        if (!cancelled) {
          setRoles(data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("an unexpected error occurred — please try again"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadRoles();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const updateRoleMembers = useCallback(
    async (roleId: string, memberPersonIds: string[]) => {
      const response = await fetch(
        `/api/projects/${projectId}/directory/roles`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role_id: roleId,
            member_person_ids: memberPersonIds,
          }),
        },
      );

      if (!response.ok) {
        let errorMessage = "Failed to update role members";
        try {
          const data = await response.json();
          if (typeof data?.error === "string" && data.error.trim().length > 0) {
            errorMessage = data.error;
          }
        } catch {
          // Keep fallback message for non-JSON error responses.
        }
        throw new Error(errorMessage);
      }

      // Refetch to get updated data
      await fetchRoles();
    },
    [projectId, fetchRoles],
  );

  const createRole = useCallback(
    async (roleName: string): Promise<ProjectRole> => {
      const response = await fetch(
        `/api/projects/${projectId}/directory/roles`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role_name: roleName }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create role");
      }

      const { data } = await response.json();

      // Refetch to get updated list
      await fetchRoles();

      return { ...data, members: [] };
    },
    [projectId, fetchRoles],
  );

  const deleteRole = useCallback(
    async (roleId: string) => {
      const response = await fetch(`/api/projects/${projectId}/directory/roles`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_id: roleId }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to delete role";
        try {
          const data = await response.json();
          if (typeof data?.error === "string" && data.error.trim().length > 0) {
            errorMessage = data.error;
          }
        } catch {
          // Keep fallback message for non-JSON error responses.
        }
        throw new Error(errorMessage);
      }

      await fetchRoles();
    },
    [projectId, fetchRoles],
  );

  return {
    roles,
    isLoading,
    error,
    refetch: fetchRoles,
    updateRoleMembers,
    createRole,
    deleteRole,
  };
}
