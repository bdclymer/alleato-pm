import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function requireAdmin(where: string): Promise<void> {
  // Use the user client only for the auth check (proves the session is valid).
  // Use the service client for the profile lookup so RLS on user_profiles
  // cannot block the check itself.
  const user = await getApiRouteUser();
  const userError = null as Error | null;

  if (userError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where,
      message: "Sign in before accessing admin controls.",
      status: 401,
      details: userError?.message,
    });
  }

  const serviceClient = createServiceClient();
  const { data: profile, error: profileError } = await serviceClient
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    throw new GuardrailError({
      code: "FORBIDDEN",
      where,
      message: "Admin access is required.",
      status: 403,
      details: profileError?.message,
    });
  }
}

/**
 * API-route guard for developer-only endpoints. Mirrors `requireAdmin` (throws a
 * GuardrailError with the caller's WHERE label) but checks `is_developer`, so it
 * fits the `withApiGuardrails` throw-pattern instead of the page-level redirect
 * guard in `@/lib/auth/require-developer`.
 */
export async function requireDeveloper(where: string): Promise<void> {
  const user = await getApiRouteUser();

  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where,
      message: "Sign in before accessing developer controls.",
      status: 401,
    });
  }

  const serviceClient = createServiceClient();
  const { data: profile, error: profileError } = await serviceClient
    .from("user_profiles")
    .select("is_developer")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_developer) {
    throw new GuardrailError({
      code: "FORBIDDEN",
      where,
      message: "Developer access is required.",
      status: 403,
      details: profileError?.message,
    });
  }
}
