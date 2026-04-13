import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPermissionTemplates,
  createPermissionTemplate,
} from "@/lib/permissions";

/**
 * GET /api/permissions/templates
 * Get all available permission templates
 */
export const GET = withApiGuardrails(
  "permissions/templates#GET",
  async ({ request }) => {
  
    const scopeParam = request.nextUrl.searchParams.get("scope");
    const scope =
      scopeParam === "project" || scopeParam === "company" || scopeParam === "global"
        ? scopeParam
        : undefined;

    const templates = await getPermissionTemplates(scope);
    return NextResponse.json({ data: templates });
    },
);

/**
 * POST /api/permissions/templates
 * Create a new permission template (admin only)
 */
export const POST = withApiGuardrails(
  "permissions/templates#POST",
  async ({ request }) => {
  
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "permissions/templates#POST", message: "Authentication required." });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      throw new GuardrailError({ code: "FORBIDDEN", where: "permissions/templates#POST", message: "Access denied." });
    }

    const body = await request.json();
    const { name, description, rules_json, granular_flags, scope } = body;

    if (!name || !rules_json) {
      return NextResponse.json(
        { error: "name and rules_json are required" },
        { status: 400 }
      );
    }

    const normalizedScope =
      scope === "company" || scope === "project" || scope === "global"
        ? scope
        : "project";

    const result = await createPermissionTemplate({
      name,
      description,
      rules_json,
      granular_flags: Array.isArray(granular_flags) ? granular_flags : [],
      scope: normalizedScope,
      is_system: false,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
    },
);