import { generateText } from "ai";

import { getLanguageModel } from "@/lib/ai/providers";
import { aiTelemetry } from "@/lib/ai/ai-telemetry";
import { createStrategistFailureResponse } from "@/lib/ai/strategist-failure-response";

export async function generateRecoveryResponse(params: {
  userMessage: string;
  cause: string;
  selectedProjectId?: number;
  modelId: string;
  toolTrace: Array<Record<string, unknown>>;
}): Promise<string> {
  const fallback = createStrategistFailureResponse(params);
  const traceSummary = params.toolTrace
    .slice(-12)
    .map((trace) => ({
      tool: trace.tool,
      hasOutput: Boolean(trace.output),
      error: trace.error,
    }));

  try {
    const result = await generateText({
      // Always gpt-4.1 here — the active model may be the same one that just produced empty text.
      model: getLanguageModel("openai/gpt-4.1"),
      system:
        "You are Alleato's Chief Strategist. The primary tool-enabled run failed to produce final text. " +
        "Write a concise, natural recovery response to the user. Do not pretend data was retrieved. " +
        "Do not say 'as an AI' or 'please try again'. Explain what failed, what was and was not checked, " +
        "and the best next move. If there is partial tool trace, use it. If there is no trace, say retrieval did not start.",
      messages: [
        {
          role: "user",
          content: [
            `Original user message: ${params.userMessage}`,
            `Failure cause: ${params.cause}`,
            `Pinned project id: ${params.selectedProjectId ?? "none"}`,
            `Tool trace summary: ${JSON.stringify(traceSummary)}`,
            `Baseline fallback to improve:\n${fallback}`,
          ].join("\n\n"),
        },
      ],
      experimental_telemetry: aiTelemetry({
        functionId: "recovery-response",
        metadata: { modelId: "openai/gpt-4.1" },
      }),
    });

    return result.text.trim() || fallback;
  } catch (recoveryError) {
    params.toolTrace.push({
      tool: "recoveryResponseFailed",
      error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
      timestamp: new Date().toISOString(),
    });
    return fallback;
  }
}
