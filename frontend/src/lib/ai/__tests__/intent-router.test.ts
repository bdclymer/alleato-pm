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

  it("routes owner-style risk prompts to packet-first risk handling", () => {
    const prompts = [
      "What could bite us on Westfield right now?",
      "Rank the risks and tell me what I should do first.",
      "Anything on this job making you nervous?",
    ];

    for (const prompt of prompts) {
      const intent = classifyAssistantIntent(prompt);
      expect(intent).toBe("risk_review");
      expect(shouldUsePacketFirstIntent(intent)).toBe(true);
    }
  });

  it("preserves exact source lookup prompts", () => {
    const intent = classifyAssistantIntent("What source evidence supports that?");

    expect(intent).toBe("source_lookup");
    expect(shouldUsePacketFirstIntent(intent)).toBe(false);
  });

  it("keeps project-selected status prompts on latest_status when they mention evidence or next actions", () => {
    const prompts = [
      "What is the latest status for this project? Give me the owner-facing risks and next actions.",
      "Latest project status briefing for the selected project. Include source evidence, what changed, and current risks.",
    ];

    for (const prompt of prompts) {
      const intent = classifyAssistantIntent(prompt, { selectedProjectId: 1033 });
      expect(intent).toBe("latest_status");
      expect(shouldUsePacketFirstIntent(intent)).toBe(true);
    }
  });

  it("does not convert exact source lookup prompts to status just because a project is selected", () => {
    const intent = classifyAssistantIntent("What source evidence supports that?", {
      selectedProjectId: 1033,
    });

    expect(intent).toBe("source_lookup");
    expect(shouldUsePacketFirstIntent(intent)).toBe(false);
  });

  it("routes explicit web-search source prompts away from internal source lookup", () => {
    const prompts = [
      "Branding question: What are the PUD requirements for Carmel, Indiana planned unit developments? Use web search and cite the sources you use.",
      "Search the web for current zoning requirements and cite sources.",
      "Use online sources to find the latest municipal ordinance requirements.",
    ];

    for (const prompt of prompts) {
      const intent = classifyAssistantIntent(prompt);
      expect(intent).toBe("external_research");
      expect(shouldUsePacketFirstIntent(intent)).toBe(false);
    }
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

  it("routes calendar invite prompts to the calendar action path before source lookup", () => {
    const prompts = [
      "Schedule a meeting with Brandon tomorrow at 2 and send an Outlook invite",
      "Create a Teams invite for the owner review",
      "Put the OAC meeting on my Outlook calendar",
    ];

    for (const prompt of prompts) {
      const intent = classifyAssistantIntent(prompt);
      expect(intent).toBe("calendar_action");
      expect(shouldUsePacketFirstIntent(intent)).toBe(false);
    }
  });

  describe("task_write intent routing", () => {
    const WRITE_CASES = [
      "Remind me to call the owner about the permit by Friday",
      "remind me about the concrete pour inspection",
      "Add a task for the PM to confirm the AC1 solar approval owner",
      "add task: follow up with the subcontractor on steel delivery",
      "Create a task for Mike to review the updated submittal log",
      "Note for myself to check on the permit status Monday morning",
      "Flag this for follow-up with the owner",
      "Flag it for follow-up",
      "Throw this on my list to review later",
      "Put this on my list",
      "Get someone on the concrete curing delay",
      "Assign this to Sarah before end of week",
      "action item: confirm RFI response deadline with design team",
      "Generate a task from this meeting note",
      "Make a task to revisit the budget next week",
    ];

    it.each(WRITE_CASES)(
      'classifies "%s" as task_write (not task_followup)',
      (message) => {
        const intent = classifyAssistantIntent(message);
        expect(intent).toBe("task_write");
      },
    );

    it("does not trigger packet-first retrieval for task_write", () => {
      expect(shouldUsePacketFirstIntent("task_write")).toBe(false);
    });

    it("does not reclassify plain task-list read requests as task_write", () => {
      // These should remain task_followup — they are reads, not writes
      expect(classifyAssistantIntent("What are my open tasks?")).toBe("task_followup");
      expect(classifyAssistantIntent("Show me my action items")).toBe("task_followup");
      expect(classifyAssistantIntent("What's on my plate this week?")).toBe("task_followup");
    });
  });
});
