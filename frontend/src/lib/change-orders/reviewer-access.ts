import { isAuthError, verifyProjectAccess } from "@/lib/supabase/auth-guard";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import type { Json } from "@/types/database.types";

export interface ReviewerAccessResult {
  authUserId: string;
  personId: string;
  isAppAdmin: boolean;
  isProjectAdmin: boolean;
  isReviewer: boolean;
  serviceClient: ReturnType<typeof createServiceClient>;
}

export type ReviewerAccessResponse = ReviewerAccessResult | NextResponse;

interface MembershipMetadata {
  change_orders_reviewer?: boolean;
}

function isRecord(value: Json | null): value is Record<string, Json> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function metadataHasReviewerFlag(metadata: Json | null): boolean {
  if (!isRecord(metadata)) {
    return false;
  }

  const flag = (metadata as MembershipMetadata).change_orders_reviewer;
  return flag === true;
}

export async function getReviewerAccessForProject(
  projectId: number,
): Promise<ReviewerAccessResponse> {
  const accessResult = await verifyProjectAccess(projectId);
  if (isAuthError(accessResult)) {
    return accessResult;
  }

  const { membership, serviceClient } = accessResult;

  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("is_admin")
    .eq("id", membership.authUserId)
    .maybeSingle();

  const isAppAdmin = profile?.is_admin === true;
  if (isAppAdmin) {
    return {
      authUserId: membership.authUserId,
      personId: membership.personId,
      isAppAdmin: true,
      isProjectAdmin: true,
      isReviewer: true,
      serviceClient,
    };
  }

  const { data: membershipRow } = await serviceClient
    .from("project_directory_memberships")
    .select("role, metadata, permission_template_id")
    .eq("project_id", projectId)
    .eq("person_id", membership.personId)
    .eq("status", "active")
    .maybeSingle();

  if (!membershipRow) {
    return NextResponse.json(
      { error: "You do not have access to this project" },
      { status: 403 },
    );
  }

  const role = (membershipRow.role ?? "").toLowerCase();
  const isRoleAdmin = role.includes("admin");

  let hasChangeOrdersAdminPermission = false;
  if (membershipRow.permission_template_id) {
    const { data: template } = await serviceClient
      .from("permission_templates")
      .select("rules_json")
      .eq("id", membershipRow.permission_template_id)
      .maybeSingle();

    const rulesJson =
      template?.rules_json && typeof template.rules_json === "object"
        ? (template.rules_json as Record<string, unknown>)
        : null;

    const changeOrdersRules = rulesJson?.change_orders;
    hasChangeOrdersAdminPermission =
      Array.isArray(changeOrdersRules) &&
      changeOrdersRules.some((rule) => rule === "admin");
  }

  const isProjectAdmin = isRoleAdmin || hasChangeOrdersAdminPermission;
  const hasReviewerFlag = metadataHasReviewerFlag(membershipRow.metadata);

  return {
    authUserId: membership.authUserId,
    personId: membership.personId,
    isAppAdmin,
    isProjectAdmin,
    isReviewer: isProjectAdmin || hasReviewerFlag,
    serviceClient,
  };
}

export function isReviewerAccessError(
  result: ReviewerAccessResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

export function canReviewGeneralChangeOrder(
  access: ReviewerAccessResult,
  designatedReviewerId: string | null,
): boolean {
  if (access.isAppAdmin || access.isProjectAdmin) {
    return true;
  }

  if (designatedReviewerId) {
    return designatedReviewerId === access.personId;
  }

  return access.isReviewer;
}

export function canReviewContractChangeOrder(access: ReviewerAccessResult): boolean {
  return access.isAppAdmin || access.isProjectAdmin || access.isReviewer;
}
