"use client";

import { useState, useEffect, useCallback } from "react";

export type PermissionLevel = "none" | "read_only" | "standard" | "admin";

export interface DirectoryUser {
  id: string;
  person_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  company_name: string | null;
  permission_level: PermissionLevel;
  has_explicit_permission: boolean;
  template_name: string | null;
}

interface UseDirectoryPermissionsResult {
  users: DirectoryUser[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updatePermission: (personId: string, level: PermissionLevel) => Promise<void>;
  searchUsers: (search: string) => void;
}

export function useDirectoryPermissions(
  projectId: string,
): UseDirectoryPermissionsResult {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPermissions = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = searchQuery
        ? `/api/projects/${projectId}/directory/permissions?search=${encodeURIComponent(searchQuery)}`
        : `/api/projects/${projectId}/directory/permissions`;

      const response = await fetch(url);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch permissions");
      }
      const { data } = await response.json();
      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, searchQuery]);

  useEffect(() => {
    let cancelled = false;

    const loadPermissions = async () => {
      if (!projectId || cancelled) return;

      setIsLoading(true);
      setError(null);

      try {
        const url = searchQuery
          ? `/api/projects/${projectId}/directory/permissions?search=${encodeURIComponent(searchQuery)}`
          : `/api/projects/${projectId}/directory/permissions`;

        const response = await fetch(url);

        if (cancelled) return;

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch permissions");
        }
        const { data } = await response.json();

        if (!cancelled) {
          setUsers(data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [projectId, searchQuery]);

  const updatePermission = useCallback(
    async (personId: string, level: PermissionLevel) => {
      const response = await fetch(
        `/api/projects/${projectId}/directory/permissions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            person_id: personId,
            permission_level: level,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update permission");
      }

      // Update local state optimistically
      setUsers((prev) =>
        prev.map((user) =>
          user.person_id === personId
            ? {
                ...user,
                permission_level: level,
                has_explicit_permission: true,
              }
            : user,
        ),
      );
    },
    [projectId],
  );

  const searchUsers = useCallback((search: string) => {
    setSearchQuery(search);
  }, []);

  return {
    users,
    isLoading,
    error,
    refetch: fetchPermissions,
    updatePermission,
    searchUsers,
  };
}
