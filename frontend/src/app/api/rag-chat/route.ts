import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let body: ChatRequestBody | null = null;

  try {
    const user = await getApiRouteUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    body = rawBody as ChatRequestBody;

    if (!body || !body.message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const validBody = body as ChatRequestBody;

    // Log incoming request for debugging
    console.warn("[RAG-Chat API] Incoming request:", {
      message: validBody.message.substring(0, 100),
      hasHistory: !!(validBody.history && validBody.history.length > 0),
    });

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
      return NextResponse.json(
        {
          error: "RAG Backend Error",
          message: "RAG backend returned an error response.",
          details:
            process.env.NODE_ENV === "development"
              ? errorText.substring(0, 500)
              : undefined,
        },
        { status: response.status },
      );
    }

    const data = await response.json();

    console.warn("[RAG-Chat API] Success in", elapsed, "ms");

    return NextResponse.json({
      response: data.response || data.reply || "",
      retrieved: data.retrieved || [],
      thread_id: validBody.thread_id || null,
    });
  } catch (error: unknown) {
    const elapsed = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? (error as { code: string }).code
        : null;

    console.error("[RAG-Chat API] Error after", elapsed, "ms:", errorMessage);

    if (isBackendOfflineError({ code: errorCode, message: errorMessage })) {
      return NextResponse.json(
        {
          error: "RAG Backend Unavailable",
          message:
            "The RAG backend is unavailable. Fix backend connectivity before retrying.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      },
      { status: 500 },
    );
  }
}
