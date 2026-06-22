import {
  buildDeepAgentResearchEvidenceWidget,
  formatDeepAgentAppExpertContext,
  formatDeepAgentResearchContext,
  shouldUseDeepAgentAppExpertBridge,
  shouldUseDeepAgentResearchBridge,
  shouldUseDeepAgentResearchDirectResponse,
  type DeepAppExpertResponse,
  type DeepResearchResponse,
} from "../deep-agent-bridge";

const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED: "true",
  };
});

afterEach(() => {
  process.env = originalEnv;
});

const researchPacket: DeepResearchResponse = {
  answer:
    "Research is available with cited web context and enough detail for a direct answer.",
  mode: "deep_agents",
  sources: [
    {
      title: "Example source",
      url: "https://example.com/source",
      sourceType: "web",
    },
  ],
  toolTrace: [
    {
      agent: "research",
      tool: "deepagents_research_runtime",
      status: "success",
      durationMs: 120,
    },
  ],
  skillsLoaded: ["deep-agents-core"],
  orchestrator: "research",
};

const appExpertPacket: DeepAppExpertResponse = {
  answer: "Use the project intelligence page for the current project brief.",
  mode: "deep_agents",
  sources: [
    {
      title: "Project intelligence route",
      sourceType: "sitemap",
      route: "/:projectId/intelligence",
      filePath: "frontend/src/app/(main)/[projectId]/intelligence/page.tsx",
      detail: "Current project intelligence surface.",
    },
  ],
  toolTrace: [
    {
      agent: "app-expert",
      tool: "feature_registry",
      status: "success",
      durationMs: 44,
    },
  ],
  skillsLoaded: ["app-expert"],
  approvedSkillContext: null,
  orchestrator: "app-expert",
};

describe("Deep Agents live bridge", () => {
  it("routes only live research and app-help bridge intents", () => {
    expect(shouldUseDeepAgentResearchBridge({ intent: "external_research" })).toBe(true);
    expect(shouldUseDeepAgentResearchBridge({ intent: "latest_status" })).toBe(false);
    expect(shouldUseDeepAgentAppExpertBridge({ intent: "app_help" })).toBe(true);
    expect(shouldUseDeepAgentAppExpertBridge({ intent: "latest_status" })).toBe(false);
  });

  it("formats research context and evidence widgets", () => {
    expect(formatDeepAgentResearchContext(researchPacket)).toContain(
      "Backend research synthesis",
    );
    expect(shouldUseDeepAgentResearchDirectResponse(researchPacket)).toBe(true);
    expect(buildDeepAgentResearchEvidenceWidget(researchPacket)).toMatchObject({
      id: "deep-agent-research-evidence",
      sources: [{ href: "https://example.com/source" }],
    });
  });

  it("formats app expert context without project-status bridge wiring", () => {
    expect(formatDeepAgentAppExpertContext(appExpertPacket)).toContain(
      "Backend app answer",
    );
    expect(formatDeepAgentAppExpertContext(appExpertPacket)).toContain(
      "/:projectId/intelligence",
    );
  });
});
