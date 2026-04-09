import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  updatePermissionTemplate,
  deletePermissionTemplate,
} from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ templateId: string }>;
}

async function requireAdmin(): Promise<{ ok: true } | { error: string; status: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) return { error: "Forbidden", status: 403 };
  return { ok: true };
}

/**
 * PUT /api/permissions/templates/[templateId]
 * Update an existing permission template (admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { templateId } = await params;
    const body = await request.json();
    const { name, description, rules_json, granular_flags } = body;

    const result = await updatePermissionTemplate(templateId, {
      name,
      description,
      rules_json,
      ...(Array.isArray(granular_flags) ? { granular_flags } : {}),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating permission template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/permissions/templates/[templateId]
 * Delete a permission template (admin only)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { templateId } = await params;
    const result = await deletePermissionTemplate(templateId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting permission template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
