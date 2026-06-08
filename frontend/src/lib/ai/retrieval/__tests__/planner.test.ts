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

  it("status question without selected project still emits packet retrieval", () => {
    const message = "What's the status of the Vermillion Rise Warehouse project?";
    const plan = planRetrieval({
      message,
      messages: [userMsg(message)],
    });
    expect(plan.responseFormat).toBe("briefing_template");
    expect(plan.sources.intelligencePacket).toBeDefined();
    expect(plan.sources.projectSnapshot).toBeDefined();
    expect(plan.selectedProjectId).toBeUndefined();
    expect(plan.reason).toBe("packet_first_resolve_from_text");
  });

  it("source lookup question → source_lookup format with vector search only", () => {
    const message = "Show me the meeting where we discussed the slab pour timeline";
    const plan = planRetrieval({ message, messages: [userMsg(message)] });
    expect(plan.responseFormat).toBe("source_lookup");
    expect(plan.sources.semanticVectorSearch).toBeDefined();
    expect(plan.sources.intelligencePacket).toBeUndefined();
  });

  it("source lookup with selected project preloads the project operating context before vector drilldown", () => {
    const message = "Show me the meeting where we discussed the slab pour timeline";
    const plan = planRetrieval({
      message,
      selectedProjectId: 67,
      messages: [userMsg(message)],
    });
    expect(plan.responseFormat).toBe("source_lookup");
    expect(plan.selectedProjectId).toBe(67);
    expect(plan.sources.intelligencePacket).toBeDefined();
    expect(plan.sources.projectSnapshot).toBeDefined();
    expect(plan.sources.semanticVectorSearch).toBeDefined();
    expect(plan.reason).toBe("project_context_source_lookup_intent");
  });

  it("source-specific RAG with selected project keeps the project operating context loaded", () => {
    const message = "What did recent Teams discussions say about Vermillion Rise?";
    const plan = planRetrieval({
      message,
      selectedProjectId: 67,
      messages: [userMsg(message)],
    });
    expect(plan.responseFormat).toBe("source_specific_rag");
    expect(plan.selectedProjectId).toBe(67);
    expect(plan.sources.intelligencePacket).toBeDefined();
    expect(plan.sources.projectSnapshot).toBeDefined();
    expect(plan.sources.sourceSpecificRag).toBeDefined();
    expect(plan.reason).toContain("project_context_source_specific_rag");
  });

  it("routes selected-project source-health wording to packet and snapshot checks", () => {
    const message =
      "Before I trust the AI readout, tell me whether the project packet, snapshot, and document sources look stale, missing, thin, or current enough.";
    const plan = planRetrieval({
      message,
      selectedProjectId: 67,
      messages: [userMsg(message)],
    });
    expect(plan.intent).toBe("source_health");
    expect(plan.reason).toBe("project_context_source_health");
    expect(plan.sources.intelligencePacket).toBeDefined();
    expect(plan.sources.projectSnapshot).toBeDefined();
    expect(plan.sources.semanticVectorSearch).toBeUndefined();
  });

  it("does not let source-health wording steal exact selected-project document lookup", () => {
    const message =
      "Find the exact spec or document evidence behind any current closeout obligation. Start with the project operating context, then drill into the source.";
    const plan = planRetrieval({
      message,
      selectedProjectId: 67,
      messages: [userMsg(message)],
    });
    expect(plan.reason).toBe("project_context_source_lookup_intent");
    expect(plan.sources.intelligencePacket).toBeDefined();
    expect(plan.sources.projectSnapshot).toBeDefined();
    expect(plan.sources.semanticVectorSearch).toBeDefined();
  });

  it.each([
    "What is the highest priority Brandon should focus on right now across the business?",
    "What are Brandon's must-do items today?",
    "How does the pipeline look right now?",
    "Find important insights from today's meetings.",
    "Are any clients upset or showing relationship risk? Use recent meetings, email, and Teams evidence.",
  ])("delegates broad operator question to executive Deep Agents workflow: %s", (message) => {
    const plan = planRetrieval({ message, messages: [userMsg(message)] });
    expect(plan.responseFormat).toBe("briefing_template");
    expect(plan.reason).toBe("executive_deep_agent_broad_operator_question");
    expect(plan.sources.semanticVectorSearch).toBeUndefined();
    expect(plan.sources.sourceSpecificRag).toBeUndefined();
  });

  it("app help question → app_help format with App Expert retrieval", () => {
    const message = "How do I create a change order in the app?";
    const plan = planRetrieval({ message, messages: [userMsg(message)] });
    expect(plan.responseFormat).toBe("app_help");
    expect(plan.sources.appExpert).toEqual({ question: message });
  });

  it("brandon daily update request → brandon_daily format", () => {
    const message = "give me the brandon daily update";
    const plan = planRetrieval({ message, messages: [userMsg(message)] });
    expect(plan.responseFormat).toBe("brandon_daily");
    expect(plan.sources.brandonDailyUpdate).toBe(true);
  });

  it.each([
    "what important emails have I received this morning?",
    "anything urgent in my inbox today?",
    "show me emails that need a reply",
    "what came in through Outlook this morning",
    "what mail arrived today",
    "any important messages I got today?",
    "what are the priority emails from today",
  ])("routes inbox triage wording to Microsoft specialist delegation: %s", (message) => {
    const plan = planRetrieval({ message, messages: [userMsg(message)] });
    expect(plan.responseFormat).toBe("conversational");
    expect(plan.reason).toContain("microsoft_specialist_delegation");
    expect(plan.sources.recentEmails).toBeUndefined();
    expect(plan.sources.sourceSpecificRag).toBeUndefined();
    expect(plan.sources.semanticVectorSearch).toBeUndefined();
  });

  it.each([
    "what important emails have I received this morning?",
    "show me today's inbox",
    "what came in through Outlook today",
  ])("uses today's business window for same-day email wording: %s", (message) => {
    const plan = planRetrieval({ message, messages: [userMsg(message)] });
    expect(plan.reason).toContain("microsoft_specialist_delegation");
    expect(plan.sources.recentEmails).toBeUndefined();
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
