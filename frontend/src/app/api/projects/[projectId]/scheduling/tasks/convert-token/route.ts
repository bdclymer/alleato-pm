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

function getAdminApiKey(): string {
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

  return adminKey;
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

    const tokenUrl = new URL("/api/scheduling/microsoft-project/convert-token", normalizeBackendUrl());
    tokenUrl.searchParams.set("project_id", String(parsedProjectId));
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "x-admin-api-key": getAdminApiKey(),
      },
    });

    const payload = await response.json().catch(() => ({})) as {
      convert_url?: string;
      expires_in_seconds?: number;
      detail?: string;
    };

    if (!response.ok || !payload.convert_url) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "projects/[projectId]/scheduling/tasks/convert-token#POST",
        message:
          payload.detail ||
          `Microsoft Project conversion token request failed (HTTP ${response.status}).`,
        status: response.ok ? 502 : response.status,
        severity: "high",
      });
    }

    return NextResponse.json({
      convertUrl: payload.convert_url,
      expiresInSeconds: payload.expires_in_seconds ?? 300,
    });
  },
);
