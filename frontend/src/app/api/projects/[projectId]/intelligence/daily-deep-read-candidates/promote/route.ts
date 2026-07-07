import { NextResponse } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { promoteAcceptedDailyDeepReadCandidates } from "@/lib/daily-briefs/daily-deep-read-promotion";
import { isAuthError, verifyProjectAccess } from "@/lib/supabase/auth-guard";

function parseProjectId(value: string, where: string): number {
  const projectId = Number(value);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where,
      message: "Project id must be a positive integer.",
      status: 400,
      details: { projectId: value },
    });
  }
  return projectId;
}

async function throwAuthGuardrail(response: NextResponse, where: string): Promise<never> {
  const payload = await response.json().catch(() => null);
  const message =
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
      ? payload.error
      : "Project access denied.";

  throw new GuardrailError({
    code: response.status === 401 ? "UNAUTHORIZED" : "AUTH_FORBIDDEN",
    where,
    message,
    status: response.status,
  });
}

export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/intelligence/daily-deep-read-candidates/promote#POST",
  async ({ params }) => {
    const where = "projects/[projectId]/intelligence/daily-deep-read-candidates/promote#POST";
    const { projectId } = await params;
    const numericProjectId = parseProjectId(projectId, where);
    const auth = await verifyProjectAccess(numericProjectId);
    if (isAuthError(auth)) await throwAuthGuardrail(auth, where);

    const result = await promoteAcceptedDailyDeepReadCandidates({
      projectId: numericProjectId,
      reviewedBy: auth.membership.authUserId,
    });

    return NextResponse.json(result);
  },
);
