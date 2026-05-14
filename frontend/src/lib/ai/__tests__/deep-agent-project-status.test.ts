import {
  buildDeepAgentSourceEvidenceWidget,
  fetchDeepAgentProjectStatus,
  formatDeepAgentProjectStatusContext,
  shouldUseDeepAgentProjectStatusBridge,
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
});
