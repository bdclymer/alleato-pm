import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function GET(req: NextRequest) {
  try {
    // Check backend connectivity
    const backendResponse = await fetch(`${BACKEND_URL}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!backendResponse.ok) {
      throw new Error("Backend health check failed");
    }

    const healthData = await backendResponse.json();

    return NextResponse.json({
      status: "healthy",
      backend: true,
      openai_configured: healthData.openai_configured || false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check backend status";

    return NextResponse.json(
      {
        status: "error",
        backend: false,
        openai_configured: false,
        timestamp: new Date().toISOString(),
        error: message,
      },
      { status: 503 },
    );
  }
}
