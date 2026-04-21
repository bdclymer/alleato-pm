import { NextRequest, NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { logger } from "@/lib/logger";

// This route proxies requests to the Python backend RAG ChatKit endpoint
// NOTE: This is NOT a ChatKit-compatible API - it's a generic proxy to /rag-chatkit
// For ChatKit integration, use the separate /api/chatkit route with getClientSecret

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

type JsonRecord = Record<string, unknown>;

function getErrorDetails(error: unknown): {
  code?: string;
  message: string;
  name?: string;
} {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }

  if (typeof error === "object" && error !== null) {
    const maybeError = error as Record<string, unknown>;
    return {
      code: typeof maybeError.code === "string" ? maybeError.code : undefined,
      message:
        typeof maybeError.message === "string"
          ? maybeError.message
          : "Unknown error",
      name: typeof maybeError.name === "string" ? maybeError.name : undefined,
    };
  }

  return { message: String(error) };
}

export const POST = withApiGuardrails(
  "rag-chatkit#POST",
  async ({ request }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "rag-chatkit#POST",
        message: "Unauthorized",
        status: 401,
      });
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid Request",
          message: "Request body must be valid JSON.",
        },
        { status: 400 },
      );
    }

    // Forward to Python backend — keep inner try/catch for connection-refused recovery
    try {
      const response = await fetch(`${PYTHON_BACKEND_URL}/rag-chatkit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get("content-type") || "";

      // Stream Server-Sent Events directly back to the client
      if (contentType.includes("text/event-stream")) {
        const headers = new Headers();
        response.headers.forEach((value, key) => headers.set(key, value));
        return new NextResponse(response.body, {
          status: response.status,
          headers,
        });
      }

      // Safely parse JSON responses
      let data: JsonRecord | null = null;
      const jsonResponse = response.clone();
      try {
        data = await jsonResponse.json();
      } catch (error) {
        const text = await response.text();
        logger.error({
          msg: "[RAG-ChatKit API] Failed to parse JSON response",
          error: (error as Error).message,
          rawResponse: text.substring(0, 200),
        });
        return NextResponse.json(
          {
            error: "Invalid Backend Response",
            message: "Backend returned non-JSON response",
            details:
              process.env.NODE_ENV === "development"
                ? { responseText: text.substring(0, 500) }
                : undefined,
          },
          { status: 502 },
        );
      }

      if (!response.ok) {
        logger.error({ msg: "[RAG-ChatKit API] Backend error", data });
        const backendMessage =
          typeof data?.message === "string"
            ? data.message
            : "The AI backend returned an error";

        return NextResponse.json(
          {
            error: "Backend Error",
            message: backendMessage,
            details: data,
          },
          { status: response.status },
        );
      }

      return NextResponse.json(data);
    } catch (error: unknown) {
      const errorDetails = getErrorDetails(error);
      logger.error({ msg: "[RAG-ChatKit API] Error", error: errorDetails.message });

      // Check if it's a connection error (backend not running)
      if (
        errorDetails.code === "ECONNREFUSED" ||
        errorDetails.message.includes("fetch failed")
      ) {
        logger.error({ msg: "[RAG-ChatKit API] Connection refused - Python backend is not running" });

        return NextResponse.json(
          {
            error: "Backend Not Running",
            message:
              "The Python AI backend is not running. Please start it with: cd python-backend && ./start-backend.sh",
            details: {
              backendUrl: `${PYTHON_BACKEND_URL}/rag-chatkit`,
              errorType: "ECONNREFUSED",
              solution: "Start the Python backend server",
            },
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        {
          error: "Internal Server Error",
          message: "An unexpected error occurred while processing your request",
            details:
            process.env.NODE_ENV === "development"
              ? {
                  errorMessage: errorDetails.message,
                  errorType: errorDetails.name,
                }
              : undefined,
        },
        { status: 500 },
      );
    }
  },
);

// Also handle GET for bootstrap and state endpoints
export const GET = withApiGuardrails(
  "rag-chatkit#GET",
  async ({ request }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "rag-chatkit#GET",
        message: "Unauthorized",
        status: 401,
      });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace("/api/rag-chatkit", "");

    try {
      const response = await fetch(
        `${PYTHON_BACKEND_URL}/rag-chatkit${path}${url.search}`,
      );

      // Safely parse response
      const text = await response.text();
      let data: JsonRecord | null = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        logger.error({
          msg: "[RAG-ChatKit API] GET response is not JSON",
          rawResponse: text.substring(0, 200),
        });
        return NextResponse.json(
          {
            error: "Invalid Backend Response",
            message: "Backend returned non-JSON response",
          },
          { status: 502 },
        );
      }

      return NextResponse.json(data);
    } catch (error: unknown) {
      const errorDetails = getErrorDetails(error);
      logger.error({ msg: "[RAG-ChatKit API] GET Error", error: errorDetails.message });

      if (
        errorDetails.code === "ECONNREFUSED" ||
        errorDetails.message.includes("fetch failed")
      ) {
        return NextResponse.json(
          {
            error: "Backend Not Running",
            message:
              "Python backend is not running. Start it with: cd python-backend && ./start-backend.sh",
          },
          { status: 503 },
        );
      }

      // Re-throw so the wrapper's structured error logging fires
      throw error;
    }
  },
);
