import {
  AI_ASSISTANT_CHAT_WORKFLOW_ID,
  assistantToolsForWorkflow,
  assertUniqueAssistantToolNames,
  filterRegisteredToolSet,
  GLOBAL_ASSISTANT_TOOL_REGISTRY,
  toolDefinitionsForWorkflow,
  validateAssistantToolRegistry,
  type AssistantToolRegistryEntry,
} from "../tool-registry";
import type { ToolSet } from "ai";
import {
  EXECUTIVE_DAILY_BRIEF_ALLOWED_TOOLS,
  EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID,
} from "@/lib/ai-ops/executive-daily-brief-workflow";

function registryEntry(
  overrides: Partial<AssistantToolRegistryEntry> = {},
): AssistantToolRegistryEntry {
  return {
    name: "test-tool",
    description: "Test tool.",
    owningAdapter: "test_adapter",
    inputSchemaName: "TestInput",
    outputSchemaName: "TestOutput",
    failureShape: "throws",
    metadata: {},
    owner: "test",
    category: "project",
    capabilities: ["read"],
    workflows: ["test_workflow"],
    actorModes: ["service"],
    requiresProjectScope: false,
    requiresWritePermission: false,
    requiresDeliveryPermission: false,
    evidencePolicy: {
      sourceBearing: false,
      requiresSourceRefs: false,
      ledgerRequired: false,
    },
    factory: null,
    ...overrides,
  };
}

function testToolSet(names: string[]): ToolSet {
  return Object.fromEntries(
    names.map((name) => [
      name,
      {
        execute: jest.fn(),
      },
    ]),
  ) as ToolSet;
}

describe("global AI assistant tool registry", () => {
  it("validates the checked-in registry", () => {
    const validation = validateAssistantToolRegistry(
      GLOBAL_ASSISTANT_TOOL_REGISTRY,
    );

    expect(validation).toEqual({
      ok: true,
      duplicateNames: [],
      missingPolicyMetadata: [],
    });
  });

  it("fails loudly on duplicate tool names", () => {
    expect(() =>
      assertUniqueAssistantToolNames([
        registryEntry({ name: "duplicate-tool" }),
        registryEntry({ name: "duplicate-tool" }),
      ]),
    ).toThrow("Duplicate AI assistant tool registry names: duplicate-tool");
  });

  it("flags source-bearing tools without source family metadata", () => {
    const validation = validateAssistantToolRegistry([
      registryEntry({
        name: "source-tool",
        capabilities: ["read", "source"],
        evidencePolicy: {
          sourceBearing: true,
          requiresSourceRefs: true,
          ledgerRequired: true,
        },
      }),
    ]);

    expect(validation.ok).toBe(false);
    expect(validation.missingPolicyMetadata).toContain(
      "source-tool: sourceFamilies",
    );
  });

  it("flags delivery tools without channel metadata", () => {
    const validation = validateAssistantToolRegistry([
      registryEntry({
        name: "send-tool",
        capabilities: ["write", "delivery"],
        requiresWritePermission: true,
        requiresDeliveryPermission: true,
      }),
    ]);

    expect(validation.ok).toBe(false);
    expect(validation.missingPolicyMetadata).toContain(
      "send-tool: allowedChannels",
    );
  });

  it("exposes Executive Daily Brief as a filtered subset of the global registry", () => {
    const tools = assistantToolsForWorkflow({
      workflowId: EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID,
      allowedToolNames: EXECUTIVE_DAILY_BRIEF_ALLOWED_TOOLS,
    });

    expect(tools.map((tool) => tool.name).sort()).toEqual(
      [...EXECUTIVE_DAILY_BRIEF_ALLOWED_TOOLS].sort(),
    );
    expect(
      tools
        .filter((tool) => tool.requiresDeliveryPermission)
        .map((tool) => tool.name),
    ).toEqual(
      expect.arrayContaining([
        "send-teams-daily-brief",
        "send-email-daily-brief",
      ]),
    );
  });

  it("exposes project and action factories to the assistant chat workflow", () => {
    const tools = assistantToolsForWorkflow({
      workflowId: AI_ASSISTANT_CHAT_WORKFLOW_ID,
    });
    const names = tools.map((tool) => tool.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "getProjectBriefingSnapshot",
        "getCommitmentsOverview",
        "getAPAgingReport",
        "semanticSearch",
        "getSopBacklog",
        "createTask",
        "draftOutlookEmail",
        "sendTeamsMessage",
        "searchWeb",
        "captureFeatureRequestPacket",
        "createWeeklyProgressReportDraft",
        "saveWorkspaceArtifact",
        "extractStructuredActionBrief",
        "getSpecRequirements",
        "getDomainIntelligence",
        "generateExecutiveDailyBrief",
        "createMarketingContentAsset",
      ]),
    );
    expect(
      tools.find((tool) => tool.name === "sendTeamsMessage"),
    ).toMatchObject({
      requiresWritePermission: true,
      requiresDeliveryPermission: true,
      allowedChannels: expect.arrayContaining(["email", "teams"]),
    });
  });

  it("filters runtime tool sets through registered factory metadata", () => {
    const registry = [
      registryEntry({
        name: "registeredRuntimeTool",
        workflows: [AI_ASSISTANT_CHAT_WORKFLOW_ID],
        factory: {
          modulePath: "frontend/src/lib/ai/tools/test-tools.ts",
          exportName: "createTestTools",
        },
      }),
    ];
    const registeredTool = { execute: jest.fn() };

    expect(
      Object.keys(
        filterRegisteredToolSet({
          registry,
          workflowId: AI_ASSISTANT_CHAT_WORKFLOW_ID,
          factoryModulePath: "frontend/src/lib/ai/tools/test-tools.ts",
          tools: { registeredRuntimeTool: registeredTool } as ToolSet,
        }),
      ),
    ).toEqual(["registeredRuntimeTool"]);
  });

  it("fails loudly when a runtime factory exposes an unregistered tool", () => {
    const registry = [
      registryEntry({
        name: "registeredRuntimeTool",
        workflows: [AI_ASSISTANT_CHAT_WORKFLOW_ID],
        factory: {
          modulePath: "frontend/src/lib/ai/tools/test-tools.ts",
          exportName: "createTestTools",
        },
      }),
    ];

    expect(() =>
      filterRegisteredToolSet({
        registry,
        workflowId: AI_ASSISTANT_CHAT_WORKFLOW_ID,
        factoryModulePath: "frontend/src/lib/ai/tools/test-tools.ts",
        tools: testToolSet([
          "registeredRuntimeTool",
          "unregisteredRuntimeTool",
        ]),
      }),
    ).toThrow(
      "Invalid AI assistant tool factory registration for frontend/src/lib/ai/tools/test-tools.ts: unregistered factory tools: unregisteredRuntimeTool",
    );
  });

  it("hides write tools when the runtime policy does not allow writes", () => {
    const registry = [
      registryEntry({
        name: "readRuntimeTool",
        workflows: [AI_ASSISTANT_CHAT_WORKFLOW_ID],
        actorModes: ["user_delegated"],
        factory: {
          modulePath: "frontend/src/lib/ai/tools/test-tools.ts",
          exportName: "createTestTools",
        },
      }),
      registryEntry({
        name: "writeRuntimeTool",
        workflows: [AI_ASSISTANT_CHAT_WORKFLOW_ID],
        actorModes: ["user_delegated"],
        capabilities: ["write"],
        requiresWritePermission: true,
        factory: {
          modulePath: "frontend/src/lib/ai/tools/test-tools.ts",
          exportName: "createTestTools",
        },
      }),
    ];

    expect(
      Object.keys(
        filterRegisteredToolSet({
          registry,
          workflowId: AI_ASSISTANT_CHAT_WORKFLOW_ID,
          factoryModulePath: "frontend/src/lib/ai/tools/test-tools.ts",
          tools: testToolSet(["readRuntimeTool", "writeRuntimeTool"]),
          policy: {
            actorMode: "user_delegated",
            allowWrites: false,
            allowDelivery: false,
          },
        }),
      ),
    ).toEqual(["readRuntimeTool"]);
  });

  it("returns AI Ops tool definitions for workflow consumers", () => {
    const definitions = toolDefinitionsForWorkflow({
      workflowId: EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID,
      allowedToolNames: EXECUTIVE_DAILY_BRIEF_ALLOWED_TOOLS,
    });

    expect(definitions.map((tool) => tool.name)).toEqual(
      EXECUTIVE_DAILY_BRIEF_ALLOWED_TOOLS,
    );
    expect(definitions[0]?.metadata).toMatchObject({
      owner: "executive_daily_brief",
      workflows: [EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID],
    });
  });
});
