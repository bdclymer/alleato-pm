import { NextRequest, NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isBackendOfflineError } from "../../rag-chatkit/utils";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

interface SendMessageBody {
  session_id: string;
  message: string;
}

/**
 * POST /api/ai-assistant/messages
 * Send a message: persist user message, call RAG backend, persist response.
 */
export async function POST(request: NextRequest) {
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SendMessageBody;

  if (!body.session_id || !body.message?.trim()) {
    return NextResponse.json(
      { error: "session_id and message are required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // 1. Persist the user message
  const { error: userMsgError } = await supabase
    .from("chat_history")
    .insert({
      session_id: body.session_id,
      user_id: user.id,
      role: "user",
      content: body.message,
    });

  if (userMsgError) {
    return NextResponse.json(
      { error: "Failed to save message", details: userMsgError.message },
      { status: 500 },
    );
  }

  // 2. Call the RAG backend
  let ragResponse: string;
  let ragSources: unknown[] = [];

  try {
    const backendRes = await fetch(`${PYTHON_BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: body.message,
        limit: 5,
      }),
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text();
      console.error("[AI-Assistant] Backend error:", backendRes.status, errText);
      ragResponse =
        "I'm having trouble connecting to the knowledge base. Please try again.";
    } else {
      const data = await backendRes.json();
      ragResponse = data.reply || data.response || "No response generated.";
      ragSources = data.sources || data.retrieved || [];
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorCode =
      err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code
        : null;

    if (isBackendOfflineError({ code: errorCode, message: errorMessage })) {
      ragResponse =
        "The AI backend is currently offline. Please start it with `npm run dev:backend`.";
    } else {
      ragResponse = "An unexpected error occurred. Please try again.";
    }
    console.error("[AI-Assistant] RAG call failed:", errorMessage);
  }

  // 3. Persist the assistant response
  const { error: assistantMsgError } = await supabase
    .from("chat_history")
    .insert({
      session_id: body.session_id,
      user_id: user.id,
      role: "assistant",
      content: ragResponse,
      sources: JSON.parse(JSON.stringify(ragSources)),
    });

  if (assistantMsgError) {
    console.error(
      "[AI-Assistant] Failed to save assistant message:",
      assistantMsgError.message,
    );
  }

  // 4. Update conversation timestamp
  await supabase
    .from("conversations")
    .update({ last_message_at: now })
    .eq("session_id", body.session_id);

  return NextResponse.json({
    response: ragResponse,
    sources: ragSources,
  });
}
