import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { isBackendOfflineError } from "../utils";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export const GET = withApiGuardrails("/api/rag-chatkit/bootstrap#GET", async () => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/rag-chatkit/bootstrap#GET",
      message: "Unauthorized RAG bootstrap request.",
      status: 401,
      severity: "medium",
    });
  }

  try {
    const response = await fetch(`${PYTHON_BACKEND_URL}/rag-chatkit/bootstrap`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "/api/rag-chatkit/bootstrap#GET",
        message: "RAG backend bootstrap failed.",
        status: response.status,
        details:
          process.env.NODE_ENV === "development"
            ? { reason: errorText.substring(0, 500) }
            : undefined,
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof GuardrailError) throw error;
    if (isBackendOfflineError(error)) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "/api/rag-chatkit/bootstrap#GET",
        message: "The RAG backend is unavailable. Fix backend connectivity before retrying.",
        status: 503,
        details: {
          reason: error instanceof Error ? error.message : "Unknown error",
        },
        severity: "high",
      });
    }

    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/rag-chatkit/bootstrap#GET",
      message: "Unexpected RAG bootstrap error.",
      details: { reason: error instanceof Error ? error.message : "Unknown error" },
    });
  }
});
