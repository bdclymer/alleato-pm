"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";

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
    phone_mobile: string | null;
    phone_business: string | null;
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
      const { data } = await apiFetch<{ data: ProjectRole[] }>(
        `/api/projects/${projectId}/directory/roles`,
      );
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
        const { data } = await apiFetch<{ data: ProjectRole[] }>(
          `/api/projects/${projectId}/directory/roles`,
        );

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
      await apiFetch(
        `/api/projects/${projectId}/directory/roles`,
        {
          method: "PUT",
          body: JSON.stringify({
            role_id: roleId,
            member_person_ids: memberPersonIds,
          }),
        },
      );

      // Refetch to get updated data
      await fetchRoles();
    },
    [projectId, fetchRoles],
  );

  const createRole = useCallback(
    async (roleName: string): Promise<ProjectRole> => {
      const { data } = await apiFetch<{ data: Omit<ProjectRole, "members"> }>(
        `/api/projects/${projectId}/directory/roles`,
        {
          method: "POST",
          body: JSON.stringify({ role_name: roleName }),
        },
      );

      // Refetch to get updated list
      await fetchRoles();

      return { ...data, members: [] };
    },
    [projectId, fetchRoles],
  );

  const deleteRole = useCallback(
    async (roleId: string) => {
      await apiFetch(`/api/projects/${projectId}/directory/roles`, {
        method: "DELETE",
        body: JSON.stringify({ role_id: roleId }),
      });

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
