import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getReviewerAccessForProject,
  isReviewerAccessError,
} from "@/lib/change-orders/reviewer-access";
import type { Json } from "@/types/database.types";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

const updateReviewerSchema = z.object({
  person_id: z.string().uuid(),
  is_reviewer: z.boolean(),
});

function isRecord(value: Json | null): value is Record<string, Json> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readReviewerFlag(metadata: Json | null): boolean {
  if (!isRecord(metadata)) {
    return false;
  }
  return metadata.change_orders_reviewer === true;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const numericProjectId = Number(projectId);

    if (!Number.isFinite(numericProjectId)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }

    const access = await getReviewerAccessForProject(numericProjectId);
    if (isReviewerAccessError(access)) {
      return access;
    }

    if (!access.isAppAdmin && !access.isProjectAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can manage reviewers" },
        { status: 403 },
      );
    }

    const { data: memberships, error } = await access.serviceClient
      .from("project_directory_memberships")
      .select(
        `
        id,
        person_id,
        role,
        metadata,
        permission_template_id,
        person:people (
          id,
          first_name,
          last_name,
          email
        ),
        permission_template:permission_templates (
          id,
          rules_json
        )
      `,
      )
      .eq("project_id", numericProjectId)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const data = (memberships ?? [])
      .filter((membership) => membership.person)
      .map((membership) => {
        const role = (membership.role ?? "").toLowerCase();
        const isRoleAdmin = role.includes("admin");
        const templateRules =
          membership.permission_template &&
          typeof membership.permission_template.rules_json === "object"
            ? (membership.permission_template.rules_json as Record<
                string,
                unknown
              >)
            : null;
        const changeOrdersRules = templateRules?.change_orders;
        const hasChangeOrdersAdminPermission =
          Array.isArray(changeOrdersRules) &&
          changeOrdersRules.some((rule) => rule === "admin");
        const isAdmin = isRoleAdmin || hasChangeOrdersAdminPermission;
        const reviewerFlag = readReviewerFlag(membership.metadata);

        return {
          person_id: membership.person_id,
          full_name: `${membership.person?.first_name ?? ""} ${
            membership.person?.last_name ?? ""
          }`.trim(),
          email: membership.person?.email ?? null,
          role: membership.role,
          is_admin: isAdmin,
          is_reviewer: isAdmin || reviewerFlag,
          reviewer_source: isAdmin
            ? "admin"
            : reviewerFlag
              ? "manual"
              : "none",
        };
      });

    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const numericProjectId = Number(projectId);

    if (!Number.isFinite(numericProjectId)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }

    const access = await getReviewerAccessForProject(numericProjectId);
    if (isReviewerAccessError(access)) {
      return access;
    }

    if (!access.isAppAdmin && !access.isProjectAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can manage reviewers" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = updateReviewerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { person_id, is_reviewer } = parsed.data;

    const { data: membership, error: membershipError } = await access.serviceClient
      .from("project_directory_memberships")
      .select("id, role, metadata, permission_template_id")
      .eq("project_id", numericProjectId)
      .eq("person_id", person_id)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const role = (membership.role ?? "").toLowerCase();
    const isRoleAdmin = role.includes("admin");

    let hasChangeOrdersAdminPermission = false;
    if (membership.permission_template_id) {
      const { data: template } = await access.serviceClient
        .from("permission_templates")
        .select("rules_json")
        .eq("id", membership.permission_template_id)
        .maybeSingle();

      const templateRules =
        template?.rules_json && typeof template.rules_json === "object"
          ? (template.rules_json as Record<string, unknown>)
          : null;
      const changeOrdersRules = templateRules?.change_orders;
      hasChangeOrdersAdminPermission =
        Array.isArray(changeOrdersRules) &&
        changeOrdersRules.some((rule) => rule === "admin");
    }

    if ((isRoleAdmin || hasChangeOrdersAdminPermission) && !is_reviewer) {
      return NextResponse.json(
        { error: "Project admins are automatically reviewers and cannot be removed" },
        { status: 400 },
      );
    }

    const existingMetadata = isRecord(membership.metadata)
      ? { ...membership.metadata }
      : {};

    const nextMetadata: Record<string, Json> = {
      ...existingMetadata,
      change_orders_reviewer: is_reviewer,
    };

    const { error: updateError } = await access.serviceClient
      .from("project_directory_memberships")
      .update({
        metadata: nextMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", membership.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        person_id,
        is_reviewer,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
