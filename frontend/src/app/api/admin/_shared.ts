import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function requireAdmin(where: string): Promise<void> {
  // Use the user client only for the auth check (proves the session is valid).
  // Use the service client for the profile lookup so RLS on user_profiles
  // cannot block the check itself.
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

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
