import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// This route proxies requests to the Python backend RAG ChatKit endpoint
// NOTE: This is NOT a ChatKit-compatible API - it's a generic proxy to /rag-chatkit
// For ChatKit integration, use the separate /api/chatkit route with getClientSecret

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Forward to Python backend
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
    let data: Record<string, any> | null = null;
    const jsonResponse = response.clone();
    try {
      data = await jsonResponse.json();
    } catch (error) {
      const text = await response.text();
      console.error(
        "[RAG-ChatKit API] Failed to parse JSON response:",
        (error as Error).message,
      );
      console.error(
        "[RAG-ChatKit API] Raw response:",
        text.substring(0, 200),
      );
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
      console.error("[RAG-ChatKit API] Backend error:", data);
      return NextResponse.json(
        {
          error: "Backend Error",
          message: data?.message || "The AI backend returned an error",
          details: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[RAG-ChatKit API] Error:", error.message);

    // Check if it's a connection error (backend not running)
    if (
      error.code === "ECONNREFUSED" ||
      error.message.includes("fetch failed")
    ) {
      console.error(
        "[RAG-ChatKit API] Connection refused - Python backend is not running",
      );

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
                errorMessage: error.message,
                errorType: error.name,
              }
            : undefined,
      },
      { status: 500 },
    );
  }
}

// Also handle GET for bootstrap and state endpoints
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace("/api/rag-chatkit", "");

  try {
    const response = await fetch(
      `${PYTHON_BACKEND_URL}/rag-chatkit${path}${url.search}`,
    );

    // Safely parse response
    const text = await response.text();
    let data: Record<string, any> | null = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      console.error(
        "[RAG-ChatKit API] GET response is not JSON:",
        text.substring(0, 200),
      );
      return NextResponse.json(
        {
          error: "Invalid Backend Response",
          message: "Backend returned non-JSON response",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[RAG-ChatKit API] GET Error:", error.message);

    if (
      error.code === "ECONNREFUSED" ||
      error.message.includes("fetch failed")
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

    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
  }
}
