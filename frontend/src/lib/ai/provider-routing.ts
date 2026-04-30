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
  const forceTools =
    process.env.AI_ASSISTANT_ENABLE_STREAMING_MODEL_TOOLS === "true";

  if (forcedProviderPath && forceTools) {
    return {
      providerPath: forcedProviderPath,
      modelId: input.modelId,
      reason:
        "Streaming model tools are enabled by explicit environment override. Verify with the provider matrix before using this outside a controlled test.",
      validatedAt: VALIDATED_AT,
      supportsToolCalling: true,
      diagnosticsArtifactPath: AI_TOOL_CALLING_PROVIDER_MATRIX_ARTIFACT,
    };
  }

  return {
    providerPath: "ai_sdk_gateway_openai",
    modelId: input.modelId,
    reason:
      "Provider matrix showed AI SDK Gateway generateText tool calling works, but streamText tool calling returns finishReason other with empty text and no tool results. Keep streaming assistant tools disabled until that failure is resolved.",
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
