import { NextResponse } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { reconcilePermissionUserLinks } from "@/lib/permissions/user-link-reconciliation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireAdmin(where: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where, message: "Authentication required." });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    throw new GuardrailError({ code: "AUTH_FORBIDDEN", where, message: "Access denied." });
  }

  return user;
}

export const POST = withApiGuardrails(
  "permissions/users/reconcile-links#POST",
  async () => {
    await requireAdmin("permissions/users/reconcile-links#POST");

    const result = await reconcilePermissionUserLinks(createServiceClient());

    if (result.unresolved.length > 0) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "permissions/users/reconcile-links#POST",
        message: "Some user auth links need manual review before they can be repaired.",
        details: result,
      });
    }

    return NextResponse.json({ success: true, data: result });
  },
);
