/**
 * Directory Permission System
 *
 * This module provides utilities for working with the permission system.
 * The system uses permission templates with optional per-user overrides.
 */

import { createClient } from "@/lib/supabase/server";

export type PermissionLevel = "none" | "read" | "write" | "admin";
export type PermissionModule = "directory" | "budget" | "contracts" | "documents" | "schedule" | "submittals" | "rfis" | "change_orders";

export interface UserPermissions {
  userId: string;
  personId: string;
  projectId: number;
  template?: {
    id: string;
    name: string;
    rules: Record<PermissionModule, PermissionLevel[]>;
  };
  overrides: Record<PermissionModule, PermissionLevel>;
  isAdmin: boolean;
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  rules_json: Record<PermissionModule, PermissionLevel[]>;
  is_system: boolean;
  scope?: string;
}

/**
 * Check if a user has a specific permission level for a module
 */
export function hasPermission(
  permissions: UserPermissions,
  module: PermissionModule,
  level: PermissionLevel
): boolean {
  // Admins bypass all checks
  if (permissions.isAdmin) return true;

  // Check explicit override first
  if (permissions.overrides[module]) {
    const userLevel = permissions.overrides[module];
    return checkPermissionLevel(userLevel, level);
  }

  // Fall back to template permission
  if (permissions.template?.rules[module]) {
    const templateLevels = permissions.template.rules[module];
    return templateLevels.some(templateLevel =>
      checkPermissionLevel(templateLevel, level)
    );
  }

  // Default to no permission
  return false;
}

/**
 * Check if a permission level satisfies the required level
 * Hierarchy: admin > write > read > none
 */
function checkPermissionLevel(userLevel: PermissionLevel, requiredLevel: PermissionLevel): boolean {
  const levels: PermissionLevel[] = ["none", "read", "write", "admin"];
  const userIndex = levels.indexOf(userLevel);
  const requiredIndex = levels.indexOf(requiredLevel);

  return userIndex >= requiredIndex;
}

/**
 * Get the highest permission level for a module
 */
export function getPermissionLevel(
  permissions: UserPermissions,
  module: PermissionModule
): PermissionLevel {
  // Admins have admin level for everything
  if (permissions.isAdmin) return "admin";

  // Check explicit override first
  if (permissions.overrides[module]) {
    return permissions.overrides[module];
  }

  // Fall back to template permission
  if (permissions.template?.rules[module]) {
    const templateLevels = permissions.template.rules[module];
    // Return the highest level from template
    if (templateLevels.includes("admin")) return "admin";
    if (templateLevels.includes("write")) return "write";
    if (templateLevels.includes("read")) return "read";
  }

  return "none";
}

/**
 * Load user permissions for a specific project
 */
export async function loadUserPermissions(
  projectId: number,
  userId?: string
): Promise<UserPermissions | null> {
  const supabase = await createClient();

  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    userId = user.id;
  }

  // Get user profile for admin check
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  // Get person_id from users_auth
  const { data: userAuth } = await supabase
    .from("users_auth")
    .select("person_id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (!userAuth) return null;

  const personId = userAuth.person_id;

  // Get membership and template
  const { data: membership } = await supabase
    .from("project_directory_memberships")
    .select(`
      permission_template_id,
      permission_template:permission_templates (
        id,
        name,
        rules_json
      )
    `)
    .eq("project_id", projectId)
    .eq("person_id", personId)
    .eq("status", "active")
    .maybeSingle();

  // Get any explicit permission overrides
  const { data: overrides } = await supabase
    .from("user_directory_permissions")
    .select("permission_level")
    .eq("project_id", projectId)
    .eq("person_id", personId)
    .maybeSingle();

  const rawTemplate = Array.isArray(membership?.permission_template)
    ? membership.permission_template[0]
    : membership?.permission_template;
  const template = rawTemplate ? {
    id: rawTemplate.id,
    name: rawTemplate.name,
    rules: rawTemplate.rules_json as Record<PermissionModule, PermissionLevel[]>
  } : undefined;

  return {
    userId: userId!,
    personId,
    projectId,
    template,
    overrides: {
      directory: overrides?.permission_level || "none",
      budget: "none",
      contracts: "none",
      documents: "none",
      schedule: "none",
      submittals: "none",
      rfis: "none",
      change_orders: "none"
    },
    isAdmin: profile?.is_admin || false
  };
}

/**
 * Get all available permission templates
 */
export async function getPermissionTemplates(): Promise<PermissionTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("permission_templates")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name");

  if (error) {
    console.error("Error loading permission templates:", error);
    return [];
  }

  return data || [];
}

/**
 * Assign a permission template to a user
 */
export async function assignPermissionTemplate(
  projectId: number,
  personId: string,
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_directory_memberships")
    .update({
      permission_template_id: templateId,
      updated_at: new Date().toISOString()
    })
    .eq("project_id", projectId)
    .eq("person_id", personId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Set an explicit permission override for a user and module
 */
export async function setPermissionOverride(
  projectId: number,
  personId: string,
  module: PermissionModule,
  level: PermissionLevel
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // For directory permissions, use the existing user_directory_permissions table
  if (module === "directory") {
    const { error } = await supabase
      .from("user_directory_permissions")
      .upsert({
        project_id: projectId,
        person_id: personId,
        permission_level: level,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "project_id,person_id"
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  // For other modules, we'd need additional tables or extend the current design
  // For now, return success but note this is not implemented
  console.warn(`Permission overrides for module '${module}' not yet implemented`);
  return { success: true };
}

/**
 * Remove a permission override (falls back to template)
 */
export async function removePermissionOverride(
  projectId: number,
  personId: string,
  module: PermissionModule
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  if (module === "directory") {
    const { error } = await supabase
      .from("user_directory_permissions")
      .delete()
      .eq("project_id", projectId)
      .eq("person_id", personId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  return { success: true };
}