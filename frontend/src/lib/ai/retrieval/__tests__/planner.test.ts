// frontend/src/lib/ai/retrieval/__tests__/planner.test.ts
import type { UIMessage } from "ai";
import { planRetrieval } from "../planner";

function userMsg(text: string): UIMessage {
  return { id: "u1", role: "user", parts: [{ type: "text", text }] } as never;
}
function assistantMsg(text: string): UIMessage {
  return { id: "a1", role: "assistant", parts: [{ type: "text", text }] } as never;
}

describe("planRetrieval", () => {
  it("status question with selected project → packet + snapshot, no external sources", () => {
    const message = "What's the status of the Vermillion Rise Warehouse project?";
    const plan = planRetrieval({
      message,
      selectedProjectId: 67,
      messages: [userMsg(message)],
    });
    expect(plan.responseFormat).toBe("briefing_template");
    expect(plan.sources.intelligencePacket).toBeDefined();
    expect(plan.sources.projectSnapshot).toBeDefined();
    expect(plan.sources.externalSources).toBeUndefined();
  });

  it("source lookup question → source_lookup format with vector search only", () => {
    const message = "Show me the meeting where we discussed the slab pour timeline";
    const plan = planRetrieval({ message, messages: [userMsg(message)] });
    expect(plan.responseFormat).toBe("source_lookup");
    expect(plan.sources.semanticVectorSearch).toBeDefined();
    expect(plan.sources.intelligencePacket).toBeUndefined();
  });

  it("app help question → app_help format with no retrieval", () => {
    const message = "How do I create a change order in the app?";
    const plan = planRetrieval({ message, messages: [userMsg(message)] });
    expect(plan.responseFormat).toBe("app_help");
    expect(Object.keys(plan.sources).length).toBe(0);
  });

  it("brandon daily update request → brandon_daily format", () => {
    const message = "give me the brandon daily update";
    const plan = planRetrieval({ message, messages: [userMsg(message)] });
    expect(plan.responseFormat).toBe("brandon_daily");
    expect(plan.sources.brandonDailyUpdate).toBe(true);
  });

  it("financial question → preconsult includes CFO", () => {
    const message = "What's our exposure on pending change orders across all projects?";
    const plan = planRetrieval({ message, messages: [userMsg(message)] });
    expect(plan.preconsult).toContain("cfo");
  });

  it("follow-up question reuses prior briefing context", () => {
    const message = "what's the source for the slab pour update?";
    const plan = planRetrieval({
      message,
      messages: [
        userMsg("give me a briefing on Vermillion Rise"),
        assistantMsg("**Hard Facts**\n- Project: Vermillion Rise..."),
        userMsg(message),
      ],
    });
    expect(plan.sources.reusePriorBriefing).toBe(true);
  });
});
