jest.mock("@/lib/ai/orchestrator", () => ({
  buildCouncilModePromptInjection: jest.fn(() => "\n\n## Council Mode"),
  createStrategistTools: jest.fn(),
  getStrategistSystemPrompt: jest.fn(() => "BASE STRATEGIST PROMPT"),
  STRATEGIST_MODEL: "test-model",
}));

jest.mock("@/lib/ai/providers", () => ({
  getLanguageModel: jest.fn(),
}));

import { assembleSystemPrompt } from "../bot-core";

describe("bot-core prompt assembly", () => {
  it("injects registry-owned tool routing guidance into the runtime prompt", async () => {
    const prompt = await assembleSystemPrompt({
      userId: "user-1",
      messageText: "",
    });

    expect(prompt).toContain("BASE STRATEGIST PROMPT");
    expect(prompt).toContain("## Tool Routing Policy");
    expect(prompt).toContain("searchTeamsMessages (teams)");
    expect(prompt).toContain("do not substitute meetings");
  });
});
