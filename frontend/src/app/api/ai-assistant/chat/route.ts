import { after } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { flushLangfuse } from "@/instrumentation";
import { handleChatV2 } from "./handler-v2";

// Fluid Compute allows up to 300s. Deep-agent + Microsoft-specialist paths call
// the Render backend (40–60s) on top of retrieval and an 8–12k-token generation,
// which can exceed 120s and get killed mid-stream — the client then renders
// "network error". 300s gives those paths headroom to finish.
export const maxDuration = 300;

export const POST = withApiGuardrails(
  "ai-assistant/chat#POST",
  async ({ request }) => {
    // Ship buffered Langfuse spans after the response resolves so traces are
    // not dropped when the serverless function suspends.
    after(() => flushLangfuse());
    return handleChatV2({ request });
  },
);
