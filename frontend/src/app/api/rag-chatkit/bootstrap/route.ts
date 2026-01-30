import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildOfflineBootstrapState } from "@/lib/rag-chatkit/offline-data";
import { isBackendOfflineError, respondWithOfflinePayload } from "../utils";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = await fetch(`${PYTHON_BACKEND_URL}/rag-chatkit/bootstrap`);
    if (!response.ok) {
      return respondWithOfflinePayload(
        buildOfflineBootstrapState(),
        `backend-status-${response.status}`,
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    const err = error as Error;
    if (isBackendOfflineError(error)) {
      return respondWithOfflinePayload(
        buildOfflineBootstrapState(),
        "backend-offline",
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
