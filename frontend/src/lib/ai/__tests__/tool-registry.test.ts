import {
  assistantToolsForWorkflow,
  assertUniqueAssistantToolNames,
  GLOBAL_ASSISTANT_TOOL_REGISTRY,
  toolDefinitionsForWorkflow,
  validateAssistantToolRegistry,
  type AssistantToolRegistryEntry,
} from "../tool-registry";
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
