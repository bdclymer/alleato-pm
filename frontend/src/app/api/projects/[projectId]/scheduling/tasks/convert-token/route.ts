import { createHmac, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function normalizeBackendUrl(): string {
  const backendUrl = (process.env.BACKEND_URL || process.env.PYTHON_BACKEND_URL || "").trim();
  if (!backendUrl) {
    throw new GuardrailError({
      code: "CONFIGURATION_ERROR",
      where: "projects/[projectId]/scheduling/tasks/convert-token#POST",
      message: "Missing backend URL. Set BACKEND_URL or PYTHON_BACKEND_URL.",
      status: 503,
      severity: "high",
    });
  }
  return backendUrl.replace(/\/+$/, "");
}

function base64url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

function signScheduleConvertToken(projectId: number): string {
  const adminKey = process.env.ADMIN_API_KEY?.trim();
  if (!adminKey) {
    throw new GuardrailError({
      code: "CONFIGURATION_ERROR",
      where: "projects/[projectId]/scheduling/tasks/convert-token#POST",
      message: "ADMIN_API_KEY is not configured.",
      status: 503,
      severity: "high",
    });
  }

  const payload = base64url(JSON.stringify({
    project_id: projectId,
    exp: Math.floor(Date.now() / 1000) + 5 * 60,
    nonce: randomUUID(),
  }));
  const signature = createHmac("sha256", adminKey)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/scheduling/tasks/convert-token#POST",
  async ({ params }) => {
    const { projectId } = await params;
    const parsedProjectId = Number.parseInt(projectId, 10);
    if (!Number.isFinite(parsedProjectId) || parsedProjectId <= 0) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/scheduling/tasks/convert-token#POST",
        message: "Project ID must be a positive number.",
        status: 400,
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/scheduling/tasks/convert-token#POST",
        message: "Authentication required.",
      });
    }

    const convertUrl = new URL("/api/scheduling/microsoft-project/convert", normalizeBackendUrl());
    convertUrl.searchParams.set("project_id", String(parsedProjectId));
    convertUrl.searchParams.set("token", signScheduleConvertToken(parsedProjectId));

    return NextResponse.json({
      convertUrl: convertUrl.toString(),
      expiresInSeconds: 300,
    });
  },
);
