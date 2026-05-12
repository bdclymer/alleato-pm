"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBrowserUser } from "@/lib/supabase/current-user";
import type { PermissionModule } from "@/lib/navigation-config";

interface ProjectPermissions {
  permissions: Record<string, string[]>;
  userType: string | null;
  isAppAdmin: boolean;
  isLoading: boolean;
}

type PermissionTemplateRecord = {
  rules_json?: Record<string, string[]> | null;
};

type PermissionTemplateJoin = PermissionTemplateRecord | PermissionTemplateRecord[] | null;

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
    const supabase = createClient();
    const currentProjectId = projectId;

    async function fetchPermissions() {
      setIsLoading(true);
      try {
        const user = await getCurrentBrowserUser(supabase);
        if (!user || cancelled) return;

        // Run profile check and auth link lookup in parallel — saves one round trip
        const [{ data: profile }, { data: authLink }] = await Promise.all([
          supabase
            .from("user_profiles")
            .select("is_admin")
            .eq("id", user.id)
            .maybeSingle(),
          currentProjectId
            ? supabase
                .from("users_auth")
                .select("person_id")
                .eq("auth_user_id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (cancelled) return;
        const admin = profile?.is_admin === true;
        setIsAppAdmin(admin);

        if (admin) {
          // Admins have all permissions
          setPermissions({
            directory: ["read", "write", "admin"],
            budget: ["read", "write", "admin"],
            contracts: ["read", "write", "admin"],
            documents: ["read", "write", "admin"],
            schedule: ["read", "write", "admin"],
            submittals: ["read", "write", "admin"],
            rfis: ["read", "write", "admin"],
            change_orders: ["read", "write", "admin"],
          });
          setUserType("developer");
          setIsLoading(false);
          return;
        }

        if (!currentProjectId || !authLink) {
          setPermissions({});
          setUserType(null);
          setIsLoading(false);
          return;
        }

        // Get membership with template
        const { data: membership } = await supabase
          .from("project_directory_memberships")
          .select(
            `
            user_type,
            permission_template:permission_templates(rules_json)
          `
          )
          .eq("person_id", authLink.person_id)
          .eq("project_id", currentProjectId!)
          .eq("status", "active")
          .maybeSingle();

        if (cancelled) return;

        if (!membership) {
          setPermissions({});
          setUserType(null);
        } else {
          setUserType(membership.user_type || "employee");
           
          const template = membership.permission_template as PermissionTemplateJoin;
          const rulesJson = Array.isArray(template)
            ? template[0]?.rules_json
            : template?.rules_json;
          const rules = (rulesJson as Record<string, string[]>) || {};
          setPermissions(rules);
        }
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
