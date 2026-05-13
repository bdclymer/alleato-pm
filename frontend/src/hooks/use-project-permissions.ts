"use client";

import { useEffect, useState } from "react";
import type { PermissionModule } from "@/lib/navigation-config";
import { apiFetch } from "@/lib/api-client";
import { getPermissionLevel, type UserPermissions } from "@/lib/permissions-shared";

interface ProjectPermissions {
  permissions: Record<string, string[]>;
  userType: string | null;
  isAppAdmin: boolean;
  isLoading: boolean;
}

type ProjectPermissionsResult = Omit<ProjectPermissions, "isLoading">;

type ProjectPermissionsResponse = {
  data: UserPermissions;
  userType: string | null;
};

const PROJECT_PERMISSIONS_CACHE_TTL_MS = 30_000;
const projectPermissionsCache = new Map<
  number,
  {
    result: ProjectPermissionsResult;
    expiresAt: number;
  }
>();
const projectPermissionsInFlight = new Map<number, Promise<ProjectPermissionsResult>>();

const ADMIN_PERMISSIONS: Record<string, string[]> = {
  directory: ["read", "write", "admin"],
  budget: ["read", "write", "admin"],
  contracts: ["read", "write", "admin"],
  documents: ["read", "write", "admin"],
  schedule: ["read", "write", "admin"],
  submittals: ["read", "write", "admin"],
  rfis: ["read", "write", "admin"],
  change_orders: ["read", "write", "admin"],
};

async function loadProjectPermissions(
  projectId: number,
): Promise<ProjectPermissionsResult> {
  const cached = projectPermissionsCache.get(projectId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const inFlight = projectPermissionsInFlight.get(projectId);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    const response = await apiFetch<ProjectPermissionsResponse>(
      `/api/projects/${projectId}/permissions`,
    );
    const userPermissions = response.data;

    if (userPermissions.isAdmin) {
      return {
        permissions: ADMIN_PERMISSIONS,
        userType: response.userType ?? "developer",
        isAppAdmin: true,
      };
    }

    return {
      permissions: Object.fromEntries(
        ([
          "directory",
          "budget",
          "contracts",
          "documents",
          "schedule",
          "submittals",
          "rfis",
          "change_orders",
        ] as PermissionModule[]).map((module) => [
          module,
          getPermissionLevel(userPermissions, module) === "none"
            ? []
            : [getPermissionLevel(userPermissions, module)],
        ]),
      ),
      userType: response.userType || "employee",
      isAppAdmin: false,
    };
  })();

  projectPermissionsInFlight.set(projectId, promise);

  try {
    const result = await promise;
    projectPermissionsCache.set(projectId, {
      result,
      expiresAt: Date.now() + PROJECT_PERMISSIONS_CACHE_TTL_MS,
    });
    return result;
  } finally {
    projectPermissionsInFlight.delete(projectId);
  }
}

/**
 * Fetches the current user's module permissions and user_type for a project.
 * Returns empty permissions when no projectId is provided.
 */
export function useProjectPermissions(
  projectId: number | null
): ProjectPermissions {
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [userType, setUserType] = useState<string | null>(null);
  const [isAppAdmin, setIsAppAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const currentProjectId = projectId;

    async function fetchPermissions() {
      setIsLoading(true);
      try {
        if (!currentProjectId) {
          setPermissions({});
          setUserType(null);
          setIsAppAdmin(false);
          return;
        }

        const result = await loadProjectPermissions(currentProjectId);
        if (cancelled) return;

        setPermissions(result.permissions);
        setUserType(result.userType);
        setIsAppAdmin(result.isAppAdmin);
      } catch (error) {
        console.error("Failed to load project permissions", error);
        setPermissions({});
        setUserType(null);
        setIsAppAdmin(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchPermissions();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return { permissions, userType, isAppAdmin, isLoading };
}

/**
 * Check if the user has at least the given permission level for a module.
 * admin > write > read (hierarchical).
 */
export function hasModulePermission(
  permissions: Record<string, string[]>,
  module: PermissionModule,
  level: "read" | "write" | "admin" = "read"
): boolean {
  const modulePerms = permissions[module] || [];

  if (modulePerms.includes("admin")) return true;
  if (level === "read" && modulePerms.includes("write")) return true;
  return modulePerms.includes(level);
}
