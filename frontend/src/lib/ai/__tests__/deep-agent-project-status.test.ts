import {
  buildDeepAgentExecutiveEvidenceWidget,
  buildDeepAgentSourceEvidenceWidget,
  fetchDeepAgentExecutiveBriefing,
  fetchDeepAgentProjectStatus,
  formatDeepAgentExecutiveDirectResponse,
  formatDeepAgentExecutiveBriefingContext,
  formatDeepAgentProjectStatusContext,
  shouldUseDeepAgentExecutiveDirectResponse,
  shouldUseDeepAgentExecutiveBridge,
  shouldUseDeepAgentProjectStatusBridge,
  type DeepExecutiveIntelligenceResponse,
  type DeepProjectIntelligenceResponse,
} from "../deep-agent-project-status";

const originalEnv = process.env;

const packet: DeepProjectIntelligenceResponse = {
  answer: "Owner decisions are pending and schedule source coverage is missing.",
  confidence: "medium",
  intent: "project_status_risk",
  project: {
    id: 43,
    name: "Westfield Collective",
  },
  sourcesChecked: [
    {
      sourceType: "packet",
      status: "checked",
      recordCount: 1,
      latestSourceAt: "2026-05-11T00:00:00Z",
      notes: "Current packet found.",
    },
    {
      sourceType: "schedule",
      status: "missing",
      recordCount: 0,
      latestSourceAt: null,
      notes: "No schedule rows found.",
    },
  ],
  evidence: [
    {
      sourceType: "packet",
      sourceId: "packet-1",
      title: "Project status packet",
      excerpt: "Packet says owner decisions are pending.",
      occurredAt: "2026-05-11T00:00:00Z",
      confidence: "medium",
    },
  ],
  recommendedActions: [
    {
      label: "Assign owner decision follow-up",
      ownerRole: "Project Manager",
      reason: "Owner decisions are blocking the next project readout.",
      sourceId: "packet-1",
    },
  ],
  toolTrace: [
    {
      agent: "project-intelligence-orchestrator",
      tool: "deepagents_runtime",
      status: "success",
      durationMs: 42,
      detail: "Deep Agents runtime produced a synthesis from checked source coverage.",
    },
  ],
  memoryCandidates: [],
  orchestrator: "deep_project_intelligence_v1",
  mode: "deep_agents",
};

const executivePacket: DeepExecutiveIntelligenceResponse = {
  answer:
    "The business has two urgent follow-ups and one process risk. Prioritize the owner follow-up first, then close the process gap with a named accountable owner.",
  confidence: "medium",
  intent: "business_briefing",
  organization: {
    name: "Alleato",
  },
  sourcesChecked: [
    {
      sourceType: "executive_briefing",
      status: "checked",
      recordCount: 1,
      latestSourceAt: "2026-05-14T12:00:00Z",
      notes: "Executive briefing packet found.",
    },
    {
      sourceType: "emails",
      status: "missing",
      recordCount: 0,
      latestSourceAt: null,
      notes: "No recent email rows found.",
    },
  ],
  evidence: [
    {
      sourceType: "tasks",
      sourceId: "task-1",
      title: "Follow up with Megan",
      excerpt: "Megan is waiting on an update.",
      occurredAt: "2026-05-14T12:00:00Z",
      confidence: "medium",
    },
  ],
  recommendedActions: [
    {
      label: "Clarify ownership for urgent follow-ups",
      ownerRole: "Operations",
      reason: "The executive packet found open items without a clear owner.",
      sourceId: "task-1",
    },
  ],
  toolTrace: [
    {
      agent: "executive-intelligence-orchestrator",
      tool: "deepagents_runtime",
      status: "success",
      durationMs: 42,
      detail: "Deep Agents runtime produced an executive synthesis from checked source coverage.",
    },
  ],
  memoryCandidates: [],
  orchestrator: "deep-agents-executive-intelligence",
  mode: "deep_agents",
};

describe("Deep Agents project-status bridge", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("enables the backend bridge for project-scoped read-heavy intents", () => {
    process.env.AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED = "true";

    const deepAgentIntents = [
      "latest_status",
      "risk_review",
      "financial_analysis",
      "change_management_review",
      "decision_lookup",
      "task_followup",
      "implementation_planning",
    ] as const;

    for (const intent of deepAgentIntents) {
      expect(
        shouldUseDeepAgentProjectStatusBridge({
          intent,
          selectedProjectId: 43,
        }),
      ).toBe(true);
    }

    expect(
      shouldUseDeepAgentProjectStatusBridge({
        intent: "latest_status",
        selectedProjectId: null,
      }),
    ).toBe(false);

    expect(
      shouldUseDeepAgentProjectStatusBridge({
        intent: "email_action",
        selectedProjectId: 43,
      }),
    ).toBe(false);

    expect(
      shouldUseDeepAgentProjectStatusBridge({
        intent: "latest_status",
        projectId: 43,
      }),
    ).toBe(true);

    process.env.AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED = "false";
    expect(
      shouldUseDeepAgentProjectStatusBridge({
        intent: "latest_status",
        selectedProjectId: 43,
      }),
    ).toBe(false);
  });

  it("enables the executive bridge for broad read-heavy intents without project context", () => {
    process.env.AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED = "true";

    expect(
      shouldUseDeepAgentExecutiveBridge({
        intent: "task_followup",
        selectedProjectId: null,
      }),
    ).toBe(true);
    expect(
      shouldUseDeepAgentExecutiveBridge({
        intent: "implementation_planning",
      }),
    ).toBe(true);
    expect(
      shouldUseDeepAgentExecutiveBridge({
        intent: "task_followup",
        projectId: 43,
      }),
    ).toBe(false);
    expect(
      shouldUseDeepAgentExecutiveBridge({
        intent: "calendar_action",
      }),
    ).toBe(false);
  });

  it("formats backend packet coverage as additive AI SDK context", () => {
    const context = formatDeepAgentProjectStatusContext(packet);

    expect(context).toContain("Backend Deep Agents Project Status Packet");
    expect(context).toContain("Mode: deep_agents");
    expect(context).toContain("- schedule: missing, records=0.");
    expect(context).toContain("Do not claim missing or failed source categories were available.");
  });

  it("turns backend packet evidence into an existing source evidence widget", () => {
    const widget = buildDeepAgentSourceEvidenceWidget(packet);

    expect(widget).toMatchObject({
      type: "source_evidence_drawer",
      id: "deep-agent-project-status-evidence",
      title: "Westfield Collective source coverage",
      sources: [
        {
          id: "packet-1",
          title: "Project status packet",
          sourceType: "project_record",
          snippet: "Packet says owner decisions are pending.",
          confidence: "medium",
        },
      ],
    });
  });

  it("formats executive backend packet coverage as additive AI SDK context", () => {
    const context = formatDeepAgentExecutiveBriefingContext(executivePacket);

    expect(context).toContain("Backend Deep Agents Executive Briefing Packet");
    expect(context).toContain("Mode: deep_agents");
    expect(context).toContain("- emails: missing, records=0.");
    expect(context).toContain("Do not claim email, calendar, task, or project writes were completed");
  });

  it("turns executive backend packet evidence into an existing source evidence widget", () => {
    const widget = buildDeepAgentExecutiveEvidenceWidget(executivePacket);

    expect(widget).toMatchObject({
      type: "source_evidence_drawer",
      id: "deep-agent-executive-briefing-evidence",
      title: "Alleato source coverage",
      sources: [
        {
          id: "task-1",
          title: "Follow up with Megan",
          sourceType: "project_record",
          snippet: "Megan is waiting on an update.",
          confidence: "medium",
        },
      ],
    });
  });

  it("allows direct executive responses only for successful Deep Agents runtime packets", () => {
    expect(shouldUseDeepAgentExecutiveDirectResponse(executivePacket)).toBe(true);

    expect(
      shouldUseDeepAgentExecutiveDirectResponse({
        ...executivePacket,
        mode: "contract_spike",
      }),
    ).toBe(false);

    expect(
      shouldUseDeepAgentExecutiveDirectResponse({
        ...executivePacket,
        toolTrace: [
          {
            agent: "executive-intelligence-orchestrator",
            tool: "deepagents_runtime",
            status: "failed",
            durationMs: 42,
            detail: "Runtime failed.",
          },
        ],
      }),
    ).toBe(false);
  });

  it("keeps direct executive responses source-gap aware", () => {
    const content = formatDeepAgentExecutiveDirectResponse(executivePacket);

    expect(content).toContain("The business has two urgent follow-ups");
    expect(content).toContain("Source coverage note: emails: missing");
    expect(content).toContain("I did not use unavailable or stale source categories");
  });

  it("posts the typed request to the backend Deep Agents endpoint", async () => {
    process.env.BACKEND_URL = "http://127.0.0.1:8000";
    process.env.ADMIN_API_KEY = "admin-test-key";
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(packet), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchMock;

    const response = await fetchDeepAgentProjectStatus({
      userId: "user-1",
      projectId: 43,
      sessionId: "session-1",
      question: "What is the current project status?",
    });

    expect(response.mode).toBe("deep_agents");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/intelligence/deep-agent/project-status",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          projectId: 43,
          sessionId: "session-1",
          question: "What is the current project status?",
          mode: "project_status_risk",
        }),
      }),
    );
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("X-Admin-Api-Key")).toBe("admin-test-key");
    expect(headers.get("x-request-id")).toBe("session-1");
  });

  it("posts the typed request to the backend executive Deep Agents endpoint", async () => {
    process.env.BACKEND_URL = "http://127.0.0.1:8000";
    process.env.ADMIN_API_KEY = "admin-test-key";
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(executivePacket), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    global.fetch = fetchMock;

    const response = await fetchDeepAgentExecutiveBriefing({
      userId: "user-1",
      sessionId: "session-1",
      question: "What business risks need attention?",
    });

    expect(response.mode).toBe("deep_agents");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/intelligence/deep-agent/executive-briefing",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          sessionId: "session-1",
          question: "What business risks need attention?",
          mode: "business_briefing",
        }),
      }),
    );
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("X-Admin-Api-Key")).toBe("admin-test-key");
    expect(headers.get("x-request-id")).toBe("session-1");
  });
});
