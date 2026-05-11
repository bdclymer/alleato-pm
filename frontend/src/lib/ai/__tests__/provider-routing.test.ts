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
    delete process.env.AI_ASSISTANT_DISABLE_STREAMING_MODEL_TOOLS;
    delete process.env.AI_PROVIDER_PATH;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("enables streaming model tools on direct OpenAI when explicitly selected", () => {
    process.env.AI_PROVIDER_PATH = "openai";

    const decision = getAssistantToolCallingDecision({
      modelId: "openai/gpt-4.1",
    });

    expect(decision.providerPath).toBe("ai_sdk_direct_openai");
    expect(decision.supportsToolCalling).toBe(true);
    expect(shouldEnableStreamingModelTools(decision)).toBe(true);
    expect(decision.diagnosticsArtifactPath).toBe(
      AI_TOOL_CALLING_PROVIDER_MATRIX_ARTIFACT,
    );
    expect(decision.reason).toContain("direct OpenAI requires AI_PROVIDER_PATH=openai");
  });

  it("routes through AI Gateway when AI_GATEWAY_API_KEY is configured", () => {
    process.env.AI_GATEWAY_API_KEY = "test-gateway-key";

    const decision = getAssistantToolCallingDecision({
      modelId: "openai/gpt-4.1",
    });

    expect(decision.providerPath).toBe("ai_sdk_gateway_openai");
    expect(decision.supportsToolCalling).toBe(true);
  });

  it("disables streaming model tools when AI_ASSISTANT_DISABLE_STREAMING_MODEL_TOOLS=true", () => {
    process.env.AI_ASSISTANT_DISABLE_STREAMING_MODEL_TOOLS = "true";

    const decision = getAssistantToolCallingDecision({
      modelId: "openai/gpt-4.1",
    });

    expect(decision.providerPath).toBe("ai_sdk_direct_openai");
    expect(decision.supportsToolCalling).toBe(false);
    expect(shouldEnableStreamingModelTools(decision)).toBe(false);
    expect(decision.reason).toContain("disabled by");
  });

  it("honors explicit provider path override while keeping tools enabled", () => {
    process.env.AI_ASSISTANT_TOOL_PROVIDER_PATH = "ai_sdk_direct_openai";

    const decision = getAssistantToolCallingDecision({
      modelId: "openai/gpt-4.1",
    });

    expect(decision.providerPath).toBe("ai_sdk_direct_openai");
    expect(decision.supportsToolCalling).toBe(true);
    expect(shouldEnableStreamingModelTools(decision)).toBe(true);
    expect(decision.reason).toContain("override");
  });
});
