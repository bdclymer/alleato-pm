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

const VALIDATED_AT = "2026-05-01T21:48:00.000Z";

export function getAssistantToolCallingDecision(input: {
  modelId: string;
}): AssistantToolCallingDecision {
  const forcedProviderPath = process.env
    .AI_ASSISTANT_TOOL_PROVIDER_PATH as AssistantProviderPath | undefined;
  const disableStreamingTools =
    process.env.AI_ASSISTANT_DISABLE_STREAMING_MODEL_TOOLS === "true";

  if (disableStreamingTools) {
    return {
      providerPath: "ai_sdk_gateway_openai",
      modelId: input.modelId,
      reason:
        "Streaming model tools disabled by AI_ASSISTANT_DISABLE_STREAMING_MODEL_TOOLS env override. Re-enable by unsetting the variable after verifying the provider matrix passes.",
      validatedAt: new Date().toISOString(),
      supportsToolCalling: false,
      diagnosticsArtifactPath: AI_TOOL_CALLING_PROVIDER_MATRIX_ARTIFACT,
    };
  }

  if (forcedProviderPath) {
    return {
      providerPath: forcedProviderPath,
      modelId: input.modelId,
      reason: `Streaming model tools enabled with explicit provider override AI_ASSISTANT_TOOL_PROVIDER_PATH=${forcedProviderPath}.`,
      validatedAt: new Date().toISOString(),
      supportsToolCalling: true,
      diagnosticsArtifactPath: AI_TOOL_CALLING_PROVIDER_MATRIX_ARTIFACT,
    };
  }

  return {
    providerPath: "ai_sdk_gateway_openai",
    modelId: input.modelId,
    reason:
      "Streaming model tools enabled. Provider matrix 2026-05-01 confirmed AI SDK Gateway and direct OpenAI both pass generateText + streamText with tool calls (finishReason=stop, 1 tool call, non-empty text). Disable by setting AI_ASSISTANT_DISABLE_STREAMING_MODEL_TOOLS=true.",
    validatedAt: VALIDATED_AT,
    supportsToolCalling: true,
    diagnosticsArtifactPath: AI_TOOL_CALLING_PROVIDER_MATRIX_ARTIFACT,
  };
}

export function shouldEnableStreamingModelTools(
  decision: AssistantToolCallingDecision,
): boolean {
  return decision.supportsToolCalling;
}
