/**
 * Server-only auth helpers using React cache() for per-request deduplication.
 *
 * These helpers ensure that multiple server components within the same request
 * render only call supabase.auth.getUser() once. The result is memoized for the
 * lifetime of the request (not across requests).
 *
 * Usage:
 *   import { getCurrentUser, getIsAdmin } from "@/lib/auth/current-user";
 *
 *   const user = await getCurrentUser();
 *   const isAdmin = await getIsAdmin();
 *
 * DO NOT import these in 'use client' components — React cache() is server-only.
 * Client components that need admin status should read from the session's JWT
 * via supabase.auth.getSession() or a dedicated API route.
 */

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the current authenticated user, or null if not logged in.
 * Deduplicated per request via React cache().
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Returns true if the current user has is_admin=true in their JWT.
 *
 * The value comes from the custom_access_token_hook which embeds is_admin
 * from user_profiles at token issuance time — no extra DB round-trip.
 *
 * NOTE: requires the custom_access_token_hook to be registered in Supabase
 * Dashboard → Auth → Hooks. See docs/deployment/AUTH-JWT-HOOK-RUNBOOK.md.
 * Until the hook is registered, this always returns false.
 */
export const getIsAdmin = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  // is_admin is embedded by the custom_access_token_hook into app_metadata
  // (accessible via user.app_metadata) or directly in the JWT claims.
  // @supabase/ssr surfaces JWT custom claims via user.app_metadata for
  // claims set in the hook's event->claims object.
  return Boolean(
    (user.app_metadata as Record<string, unknown> | undefined)?.is_admin
  );
});
