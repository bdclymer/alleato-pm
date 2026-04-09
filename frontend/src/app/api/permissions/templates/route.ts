import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPermissionTemplates,
  createPermissionTemplate,
} from "@/lib/permissions";

/**
 * GET /api/permissions/templates
 * Get all available permission templates
 */
export async function GET(request: NextRequest) {
  try {
    const scopeParam = request.nextUrl.searchParams.get("scope");
    const scope =
      scopeParam === "project" || scopeParam === "company" || scopeParam === "global"
        ? scopeParam
        : undefined;

    const templates = await getPermissionTemplates(scope);
    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("Error loading permission templates:", error);
    return NextResponse.json(
      { error: "Failed to load permission templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/permissions/templates
 * Create a new permission template (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  } catch (error) {
    console.error("Error creating permission template:", error);
    return NextResponse.json(
      { error: "Failed to create permission template" },
      { status: 500 }
    );
  }
}