import { NextResponse } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
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
    throw new GuardrailError({ code: "FORBIDDEN", where, message: "Access denied." });
  }

  return user;
}

export const DELETE = withApiGuardrails(
  "permissions/users/[personId]#DELETE",
  async ({ params }) => {
    await requireAdmin("permissions/users/[personId]#DELETE");
    const { personId } = await params;
    const service = createServiceClient();

    const { data: person, error: personError } = await service
      .from("people")
      .select("id, auth_user_id")
      .eq("id", personId)
      .maybeSingle();

    if (personError) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "permissions/users/[personId]#DELETE",
        message: "Failed to load user.",
        details: personError,
      });
    }

    if (!person) {
      throw new GuardrailError({
        code: "NOT_FOUND",
        where: "permissions/users/[personId]#DELETE",
        message: "User not found.",
        status: 404,
      });
    }

    const { error: companyTemplateError } = await service
      .from("person_company_templates")
      .delete()
      .eq("person_id", personId);

    if (companyTemplateError) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "permissions/users/[personId]#DELETE:company-template",
        message: "Failed to remove company-wide access.",
        details: companyTemplateError,
      });
    }

    const { error: companyOverrideError } = await service
      .from("user_granular_permission_overrides")
      .delete()
      .eq("person_id", personId)
      .is("project_id", null);

    if (companyOverrideError) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "permissions/users/[personId]#DELETE:company-overrides",
        message: "Failed to remove company-wide permission exceptions.",
        details: companyOverrideError,
      });
    }

    if (person.auth_user_id) {
      const { error: profileError } = await service
        .from("user_profiles")
        .update({ is_admin: false, updated_at: new Date().toISOString() })
        .eq("id", person.auth_user_id);

      if (profileError) {
        throw new GuardrailError({
          code: "UPSTREAM_FAILURE",
          where: "permissions/users/[personId]#DELETE:user-profile",
          message: "Failed to remove admin access.",
          details: profileError,
        });
      }
    }

    return NextResponse.json({ success: true });
  },
);
