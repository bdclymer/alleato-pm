import { after } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { flushLangfuse } from "@/instrumentation";
import { handleChatV2 } from "./handler-v2";

export const maxDuration = 120;

export const POST = withApiGuardrails(
  "ai-assistant/chat#POST",
  async ({ request }) => {
    // Ship buffered Langfuse spans after the response resolves so traces are
    // not dropped when the serverless function suspends.
    after(() => flushLangfuse());
    return handleChatV2({ request });
  },
);
