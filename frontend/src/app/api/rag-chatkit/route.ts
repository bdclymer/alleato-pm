import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// This route proxies requests to the Python backend RAG ChatKit endpoint
// NOTE: This is NOT a ChatKit-compatible API - it's a generic proxy to /rag-chatkit
// For ChatKit integration, use the separate /api/chatkit route with getClientSecret

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

// Log the backend URL on startup for debugging
if (process.env.NODE_ENV === "development") {
  console.log("[RAG-ChatKit API] Backend URL:", PYTHON_BACKEND_URL);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Log incoming request
    const body = await request.json();
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(
      "[RAG-ChatKit API] 📨 Incoming request at",
      new Date().toISOString(),
    );
    console.log("[RAG-ChatKit API] 📝 Message:", body.message);
    console.log(
      "[RAG-ChatKit API] 📚 History length:",
      body.history?.length || 0,
    );
    console.log(
      "[RAG-ChatKit API] 🎯 Target:",
      `${PYTHON_BACKEND_URL}/rag-chatkit`,
    );

    // Forward to Python backend
    console.log("[RAG-ChatKit API] 🚀 Forwarding to Python backend...");
    const response = await fetch(`${PYTHON_BACKEND_URL}/rag-chatkit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const elapsed = Date.now() - startTime;
    console.log(`[RAG-ChatKit API] ⏱️  Response received in ${elapsed}ms`);
    console.log(
      "[RAG-ChatKit API] 📊 Status:",
      response.status,
      response.statusText,
    );

    const contentType = response.headers.get("content-type") || "";

    // Stream Server-Sent Events directly back to the client
    if (contentType.includes("text/event-stream")) {
      console.log("[RAG-ChatKit API] 🔁 Streaming SSE response to client");
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
        "[RAG-ChatKit API] ⚠️  Failed to parse JSON response:",
        (error as Error).message,
      );
      console.error(
        "[RAG-ChatKit API] ⚠️  Raw response:",
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
      console.error("[RAG-ChatKit API] ❌ Backend error:", data);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      return NextResponse.json(
        {
          error: "Backend Error",
          message: data?.message || "The AI backend returned an error",
          details: data,
        },
        { status: response.status },
      );
    }

    console.log("[RAG-ChatKit API] ✅ Success! Response:", {
      responseLength: data?.response?.length || 0,
      hasRetrieved: !!data?.retrieved,
      retrievedCount: data?.retrieved?.length || 0,
    });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return NextResponse.json(data);
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("[RAG-ChatKit API] ❌ ERROR after", elapsed, "ms");
    console.error("[RAG-ChatKit API] 🔥 Error type:", error.name);
    console.error("[RAG-ChatKit API] 💥 Error message:", error.message);

    // Check if it's a connection error (backend not running)
    if (
      error.code === "ECONNREFUSED" ||
      error.message.includes("fetch failed")
    ) {
      console.error(
        "[RAG-ChatKit API] 🔌 Connection refused - Python backend is not running!",
      );
      console.error(
        "[RAG-ChatKit API] 💡 Solution: Run `cd python-backend && ./start-backend.sh`",
      );
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      return NextResponse.json(
        {
          error: "Backend Not Running",
          message:
            "🔌 The Python AI backend is not running. Please start it with: cd python-backend && ./start-backend.sh",
          details: {
            backendUrl: `${PYTHON_BACKEND_URL}/rag-chatkit`,
            errorType: "ECONNREFUSED",
            solution: "Start the Python backend server",
          },
        },
        { status: 503 }, // Service Unavailable
      );
    }

    // Other errors
    console.error("[RAG-ChatKit API] 📋 Full error:", error);
    console.error("[RAG-ChatKit API] 🔍 Stack trace:", error.stack);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

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
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[RAG-ChatKit API] 📨 GET request to:", path);
    console.log(
      "[RAG-ChatKit API] 🎯 Target:",
      `${PYTHON_BACKEND_URL}/rag-chatkit${path}${url.search}`,
    );

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
        "[RAG-ChatKit API] ⚠️  GET response is not JSON:",
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

    console.log("[RAG-ChatKit API] 📊 Status:", response.status);
    console.log("[RAG-ChatKit API] ✅ Response received");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[RAG-ChatKit API] ❌ GET Error:", error.message);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

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
