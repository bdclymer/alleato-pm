export type AssistantProviderPath =
  | "ai_sdk_gateway_openai"
  | "ai_sdk_direct_openai"
  | "raw_openai";

export type AssistantToolCallingDecision = {
  providerPath: AssistantProviderPath;
  modelId: string;
  reason: string;
  validatedAt: string;
  supportsToolCalling: boolean;
  diagnosticsArtifactPath: string;
};

export const AI_TOOL_CALLING_PROVIDER_MATRIX_ARTIFACT =
  "docs/ai-plan/evals/ai-tool-calling-provider-matrix-2026-04-30.json";

const VALIDATED_AT = "2026-04-30T09:51:48.408Z";

export function getAssistantToolCallingDecision(input: {
  modelId: string;
}): AssistantToolCallingDecision {
  const forcedProviderPath = process.env
    .AI_ASSISTANT_TOOL_PROVIDER_PATH as AssistantProviderPath | undefined;
  const forceStreamingTools =
    process.env.AI_ASSISTANT_ENABLE_STREAMING_MODEL_TOOLS === "true";

  if (forcedProviderPath && forceStreamingTools) {
    return {
      providerPath: forcedProviderPath,
      modelId: input.modelId,
      reason:
        "Streaming model tools explicitly enabled by environment override. Use only after provider matrix verification passes.",
      validatedAt: new Date().toISOString(),
      supportsToolCalling: true,
      diagnosticsArtifactPath: AI_TOOL_CALLING_PROVIDER_MATRIX_ARTIFACT,
    };
  }

  return {
    providerPath: "ai_sdk_gateway_openai",
    modelId: input.modelId,
    reason:
      "Streaming model tools disabled: provider matrix showed AI SDK Gateway generateText tool calling works, but streamText returned finishReason=other with empty text/no tool results.",
    validatedAt: VALIDATED_AT,
    supportsToolCalling: false,
    diagnosticsArtifactPath: AI_TOOL_CALLING_PROVIDER_MATRIX_ARTIFACT,
  };
}

export function shouldEnableStreamingModelTools(
  decision: AssistantToolCallingDecision,
): boolean {
  return decision.supportsToolCalling;
}
