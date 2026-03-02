import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getLanguageModel } from "@/lib/ai/providers";
import { ragAssistantSystemPrompt } from "@/lib/ai/rag-assistant-prompt";
import { createProjectTools } from "@/lib/ai/tools/project-tools";

export const maxDuration = 120;

const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

function extractTextFromParts(parts: UIMessage["parts"]): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function POST(request: Request) {
  const user = await getApiRouteUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { id: sessionId, messages } = body as {
    id: string;
    messages: UIMessage[];
  };

  if (!sessionId || !messages?.length) {
    return new Response("session id and messages are required", {
      status: 400,
    });
  }

  const supabase = createServiceClient();

  // Persist the latest user message
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (lastUserMessage) {
    const content = extractTextFromParts(lastUserMessage.parts);
    if (content.trim()) {
      await supabase.from("chat_history").insert({
        session_id: sessionId,
        user_id: user.id,
        role: "user",
        content,
      });
    }
  }

  const modelMessages = await convertToModelMessages(messages);
  const tools = createProjectTools(user.id);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: getLanguageModel(DEFAULT_MODEL),
        system: ragAssistantSystemPrompt,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(7),
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async ({ messages: finishedMessages }) => {
      // Persist assistant messages
      for (const msg of finishedMessages) {
        if (msg.role === "assistant") {
          const content = extractTextFromParts(msg.parts);
          if (content.trim()) {
            await supabase.from("chat_history").insert({
              session_id: sessionId,
              user_id: user.id,
              role: "assistant",
              content,
            });
          }
        }
      }

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("session_id", sessionId);
    },
    onError: () => "An error occurred while generating a response. Please try again.",
  });

  return createUIMessageStreamResponse({ stream });
}
