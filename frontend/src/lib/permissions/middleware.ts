/**
 * Permission Middleware for API Routes
 *
 * This module provides middleware functions to check permissions in API routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  loadUserPermissions,
  hasPermission,
  type PermissionModule,
  type PermissionLevel
} from "../permissions";

export interface PermissionCheckResult {
  allowed: boolean;
  permissions?: any;
  error?: string;
}

/**
 * Check if the current user has the required permission for a project
 */
export async function checkProjectPermission(
  projectId: number,
  module: PermissionModule,
  level: PermissionLevel,
  request?: NextRequest
): Promise<PermissionCheckResult> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        allowed: false,
        error: "Authentication required"
      };
    }

    // Load user permissions for this project
    const permissions = await loadUserPermissions(projectId, user.id);
    if (!permissions) {
      return {
        allowed: false,
        error: "No access to this project"
      };
    }

    // Check the specific permission
    const allowed = hasPermission(permissions, module, level);

    return {
      allowed,
      permissions,
      error: allowed ? undefined : `Insufficient permissions. Required: ${level} access to ${module}`
    };
  } catch (error) {
    console.error("Permission check failed:", error);
    return {
      allowed: false,
      error: "Permission check failed"
    };
  }
}

/**
 * Middleware function that can be used in API routes
 */
export function requirePermission(
  module: PermissionModule,
  level: PermissionLevel
) {
  return async function permissionMiddleware(
    request: NextRequest,
    projectId: number
  ): Promise<NextResponse | null> {
    const result = await checkProjectPermission(projectId, module, level, request);

    if (!result.allowed) {
      return NextResponse.json(
        { error: result.error || "Access denied" },
        { status: result.error?.includes("Authentication") ? 401 : 403 }
      );
    }

    // Permission granted, return null to continue
    return null;
  };
}

/**
 * Higher-order function for wrapping API route handlers with permission checks
 */
export function withPermission<T extends any[]>(
  module: PermissionModule,
  level: PermissionLevel,
  handler: (...args: T) => Promise<NextResponse>
) {
  return async function permissionWrappedHandler(...args: T): Promise<NextResponse> {
    // Extract projectId from the first argument (usually params)
    const [firstArg] = args;
    let projectId: number;

    if (firstArg && typeof firstArg === 'object' && 'params' in firstArg) {
      const params = await (firstArg as any).params;
      projectId = parseInt(params.projectId || params.id, 10);
    } else {
      return NextResponse.json(
        { error: "Project ID not found" },
        { status: 400 }
      );
    }

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Check permissions
    const result = await checkProjectPermission(projectId, module, level);
    if (!result.allowed) {
      return NextResponse.json(
        { error: result.error || "Access denied" },
        { status: result.error?.includes("Authentication") ? 401 : 403 }
      );
    }

    // Call the original handler
    return handler(...args);
  };
}

/**
 * Convenience functions for common permission levels
 */
export const requireRead = (module: PermissionModule) => requirePermission(module, "read");
export const requireWrite = (module: PermissionModule) => requirePermission(module, "write");
export const requireAdmin = (module: PermissionModule) => requirePermission(module, "admin");

/**
 * Convenience wrappers for handlers
 */
export const withRead = <T extends any[]>(module: PermissionModule, handler: (...args: T) => Promise<NextResponse>) =>
  withPermission(module, "read", handler);

export const withWrite = <T extends any[]>(module: PermissionModule, handler: (...args: T) => Promise<NextResponse>) =>
  withPermission(module, "write", handler);

export const withAdmin = <T extends any[]>(module: PermissionModule, handler: (...args: T) => Promise<NextResponse>) =>
  withPermission(module, "admin", handler);