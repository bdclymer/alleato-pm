import { withApiGuardrails } from "@/lib/guardrails/api";
import { handleChatV2 } from "./handler-v2";

export const maxDuration = 120;

export const POST = withApiGuardrails(
  "ai-assistant/chat#POST",
  async ({ request }) => handleChatV2({ request }),
);
