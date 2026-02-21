import { NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { isBackendOfflineError } from "../utils";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const user = await getApiRouteUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = await fetch(`${PYTHON_BACKEND_URL}/rag-chatkit/bootstrap`);
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "RAG Backend Error",
          message: "RAG backend bootstrap failed.",
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
