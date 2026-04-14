import { NextRequest, NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { isBackendOfflineError } from "../utils";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export const GET = withApiGuardrails("/api/rag-chatkit/state#GET", async ({ request }) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/rag-chatkit/state#GET",
      message: "Unauthorized RAG state request.",
      status: 401,
      severity: "medium",
      details: authError ? { reason: authError.message } : undefined,
      cause: authError ?? undefined,
    });
  }

  const url = new URL(request.url);
  const threadId = url.searchParams.get("thread_id");

  if (!threadId) {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where: "/api/rag-chatkit/state#GET",
      message: "thread_id is required.",
      status: 400,
      severity: "low",
    });
  }

  try {
    const response = await fetch(
      `${PYTHON_BACKEND_URL}/rag-chatkit/state?thread_id=${threadId}`,
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "/api/rag-chatkit/state#GET",
        message: "RAG backend state fetch failed.",
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
        where: "/api/rag-chatkit/state#GET",
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
      where: "/api/rag-chatkit/state#GET",
      message: "Unexpected RAG state error.",
      details: { reason: error instanceof Error ? error.message : "Unknown error" },
    });
  }
});
