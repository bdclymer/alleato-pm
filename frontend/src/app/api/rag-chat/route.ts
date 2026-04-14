import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { isBackendOfflineError } from "../rag-chatkit/utils";

/**
 * Simple RAG Chat API Route
 *
 * This route proxies chat requests to the Python backend's /api/chat endpoint.
 * Unlike the ChatKit endpoint, this returns JSON directly (not streaming SSE).
 *
 * Used by the SimpleRagChat component when ChatKit is unavailable.
 */

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

interface ChatRequestBody {
  message: string;
  thread_id?: string | null;
  history?: Array<{ role: string; text: string }>;
}

const ChatRequestSchema = z.object({
  message: z.string().min(1),
  thread_id: z.string().nullable().optional(),
  history: z.array(z.object({ role: z.string(), text: z.string() })).optional(),
});

export const POST = withApiGuardrails("/api/rag-chat#POST", async ({ request }) => {
  const startTime = Date.now();
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/rag-chat#POST",
      message: "Unauthorized RAG chat request.",
      status: 401,
      severity: "medium",
    });
  }

  const body = await parseJsonBody(request, ChatRequestSchema, "/api/rag-chat#POST");
  const validBody: ChatRequestBody = body;

  // Log incoming request for debugging
  console.warn("[RAG-Chat API] Incoming request:", {
    message: validBody.message.substring(0, 100),
    hasHistory: !!(validBody.history && validBody.history.length > 0),
  });

  try {
    // Call the simple backend chat endpoint (non-streaming)
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: validBody.message,
        limit: 5,
      }),
    });

    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[RAG-Chat API] Backend error:",
        response.status,
        errorText,
      );
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "/api/rag-chat#POST",
        message: "RAG backend returned an error response.",
        status: response.status,
        details:
          process.env.NODE_ENV === "development"
            ? { reason: errorText.substring(0, 500) }
            : undefined,
      });
    }

    const data = await response.json();

    console.warn("[RAG-Chat API] Success in", elapsed, "ms");

    return NextResponse.json({
      response: data.response || data.reply || "",
      retrieved: data.retrieved || [],
      thread_id: validBody.thread_id || null,
    });
  } catch (error: unknown) {
    normalizeRagTransportError(error);
  }
});

// Normalize transport-level backend failures so clients get retry-safe 503 envelopes.
export function normalizeRagTransportError(error: unknown): never {
  if (error instanceof GuardrailError) {
    throw error;
  }

  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  const errorCode =
    error && typeof error === "object" && "code" in error
      ? (error as { code: string }).code
      : null;

  if (isBackendOfflineError({ code: errorCode, message: errorMessage })) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: "/api/rag-chat#POST",
      message: "The RAG backend is unavailable. Fix backend connectivity before retrying.",
      status: 503,
      details: { reason: errorMessage },
      severity: "high",
    });
  }

  throw new GuardrailError({
    code: "INTERNAL_ERROR",
    where: "/api/rag-chat#POST",
    message: "An unexpected RAG chat error occurred.",
    details: { reason: errorMessage },
  });
}
