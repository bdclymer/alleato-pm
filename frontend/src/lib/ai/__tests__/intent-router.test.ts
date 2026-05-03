import {
  classifyAssistantIntent,
  shouldUsePacketFirstIntent,
} from "../intent-router";

describe("intent router", () => {
  it("routes latest project status prompts to packet-first handling", () => {
    const intent = classifyAssistantIntent("What's the latest on Westfield Collective?");

    expect(intent).toBe("latest_status");
    expect(shouldUsePacketFirstIntent(intent)).toBe(true);
  });

  it("preserves exact source lookup prompts", () => {
    const intent = classifyAssistantIntent("What source evidence supports that?");

    expect(intent).toBe("source_lookup");
    expect(shouldUsePacketFirstIntent(intent)).toBe(false);
  });

  it("routes employee message diagnosis prompts to source lookup even without the Teams keyword", () => {
    const intent = classifyAssistantIntent(
      "Based on all the employees' messages, where is the biggest source of confusion?",
    );

    expect(intent).toBe("source_lookup");
    expect(shouldUsePacketFirstIntent(intent)).toBe(false);
  });

  it("keeps app-help prompts out of project intelligence", () => {
    const intent = classifyAssistantIntent("How do I create a change order in the app?");

    expect(intent).toBe("app_help");
    expect(shouldUsePacketFirstIntent(intent)).toBe(false);
  });
});
