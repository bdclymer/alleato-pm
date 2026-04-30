import {
  AI_TOOL_CALLING_PROVIDER_MATRIX_ARTIFACT,
  getAssistantToolCallingDecision,
  shouldEnableStreamingModelTools,
} from "../provider-routing";

describe("provider routing", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AI_ASSISTANT_TOOL_PROVIDER_PATH;
    delete process.env.AI_ASSISTANT_ENABLE_STREAMING_MODEL_TOOLS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("keeps streaming model tools disabled by default because the matrix found the empty stream failure", () => {
    const decision = getAssistantToolCallingDecision({
      modelId: "openai/gpt-5.4",
    });

    expect(decision.providerPath).toBe("ai_sdk_gateway_openai");
    expect(decision.supportsToolCalling).toBe(false);
    expect(decision.reason).toContain("streamText tool calling returns finishReason other");
    expect(decision.diagnosticsArtifactPath).toBe(
      AI_TOOL_CALLING_PROVIDER_MATRIX_ARTIFACT,
    );
    expect(shouldEnableStreamingModelTools(decision)).toBe(false);
  });

  it("requires an explicit environment override to re-enable streaming model tools", () => {
    process.env.AI_ASSISTANT_TOOL_PROVIDER_PATH = "ai_sdk_direct_openai";
    process.env.AI_ASSISTANT_ENABLE_STREAMING_MODEL_TOOLS = "true";

    const decision = getAssistantToolCallingDecision({
      modelId: "openai/gpt-5.4",
    });

    expect(decision.providerPath).toBe("ai_sdk_direct_openai");
    expect(decision.supportsToolCalling).toBe(true);
    expect(shouldEnableStreamingModelTools(decision)).toBe(true);
  });
});
