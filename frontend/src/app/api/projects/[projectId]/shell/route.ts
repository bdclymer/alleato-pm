import { NextResponse } from "next/server";

import { validateResponseContract, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { loadUserPermissions } from "@/lib/permissions";
import type { UserPermissions } from "@/lib/permissions-shared";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";
import { getApiRouteUser } from "@/lib/supabase/server";
import { loadCurrentUserProfilePayload } from "@/lib/users/current-user-profile-server";
import { z } from "zod";

const ProjectShellSchema = z.object({
  project: z.object({
    id: z.number(),
    name: z.string(),
    number: z.string().optional(),
    status: z.string().optional(),
    client: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  }),
  permissions: z.unknown(),
  userType: z.string().nullable(),
  profile: z.object({
    id: z.string(),
    fullName: z.string(),
    email: z.string(),
    avatarUrl: z.string().optional(),
    company: z.string().optional(),
    title: z.string().optional(),
    role: z.string().optional(),
    phone: z.string().optional(),
    profileCompleteness: z.number(),
    isAdmin: z.boolean(),
    onboardingCompletedAt: z.string().nullable(),
  }),
});

function buildAdminPermissions({
  authUserId,
  personId,
  projectId,
}: {
  authUserId: string;
  personId: string;
  projectId: number;
}): UserPermissions {
  return {
    userId: authUserId,
    personId,
    projectId,
    overrides: {
      directory: "admin",
      budget: "admin",
      contracts: "admin",
      documents: "admin",
      schedule: "admin",
      submittals: "admin",
      rfis: "admin",
      change_orders: "admin",
    },
    granularOverrides: {},
    isAdmin: true,
  };
}

export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/shell#GET",
  async ({ params }) => {
    const { projectId } = await params;
    const projectIdNum = Number(projectId);

    if (!Number.isInteger(projectIdNum)) {
      throw new GuardrailError({
        code: "VALIDATION_ERROR",
        where: "projects/[projectId]/shell#GET",
        message: "Project id must be a whole number.",
        status: 400,
      });
    }

    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/shell#GET",
        message: "Authentication required.",
        status: 401,
      });
    }

    const authResult = await verifyProjectAccess(projectIdNum);
    if (isAuthError(authResult)) return authResult;

    const isAppAdmin = authResult.membership.membershipId.startsWith("super-admin:");
    const permissionsPromise = isAppAdmin
      ? Promise.resolve(
          buildAdminPermissions({
            authUserId: authResult.membership.authUserId,
            personId: authResult.membership.personId,
            projectId: projectIdNum,
          }),
        )
      : loadUserPermissions(projectIdNum, authResult.membership.authUserId);

    const [{ data: projectRow, error: projectError }, permissions, profile] =
      await Promise.all([
        authResult.serviceClient
          .from("projects")
          .select("*")
          .eq("id", projectIdNum)
          .single(),
        permissionsPromise,
        loadCurrentUserProfilePayload({
          serviceClient: authResult.serviceClient,
          user,
          where: "projects/[projectId]/shell#GET",
        }),
      ]);

    if (projectError || !projectRow) {
      throw new GuardrailError({
        code: "NOT_FOUND",
        where: "projects/[projectId]/shell#GET",
        message: projectError?.message || "Project not found.",
        status: 404,
      });
    }

    const projectRecord = projectRow as Record<string, unknown>;
    const project = {
      id: Number(projectRecord.id),
      name: String(projectRecord.name ?? `Project ${projectIdNum}`),
      number:
        typeof projectRecord["job number"] === "string"
          ? projectRecord["job number"]
          : undefined,
      status:
        typeof projectRecord.phase === "string"
          ? projectRecord.phase
          : undefined,
      client:
        typeof projectRecord.client === "string"
          ? projectRecord.client
          : undefined,
      start_date:
        typeof projectRecord["start date"] === "string"
          ? projectRecord["start date"]
          : undefined,
      end_date:
        typeof projectRecord["est completion"] === "string"
          ? projectRecord["est completion"]
          : undefined,
    };

    if (!permissions) {
      throw new GuardrailError({
        code: "AUTH_FORBIDDEN",
        where: "projects/[projectId]/shell#GET",
        message: "No permissions found for this project.",
        status: 403,
      });
    }

    const payload = validateResponseContract(
      ProjectShellSchema,
      {
        project,
        permissions,
        userType: authResult.membership.userType,
        profile,
      },
      "projects/[projectId]/shell#GET",
    );

    return NextResponse.json(payload);
  },
);
