import { withApiGuardrails } from "@/lib/guardrails/api";
import { handleChatLegacy } from "@/lib/ai/chat-handler";

export const maxDuration = 120;

export const POST = withApiGuardrails(
  "ai-assistant/chat#POST",
  async ({ request }) => handleChatLegacy({ request }),
);
