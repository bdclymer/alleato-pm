import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isBackendOfflineError } from "../utils";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const threadId = url.searchParams.get("thread_id");

  if (!threadId) {
    return NextResponse.json(
      { error: "thread_id is required" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `${PYTHON_BACKEND_URL}/rag-chatkit/state?thread_id=${threadId}`,
    );
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "RAG Backend Error",
          message: "RAG backend state fetch failed.",
          details:
            process.env.NODE_ENV === "development"
              ? errorText.substring(0, 500)
              : undefined,
        },
        { status: response.status },
      );
    }
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    const err = error as Error;
    if (isBackendOfflineError(error)) {
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
        message: err.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
