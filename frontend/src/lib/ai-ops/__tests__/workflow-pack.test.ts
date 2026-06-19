import { workflowDefinitionSchema } from "../contracts";
import {
  EXECUTIVE_DAILY_BRIEF_WORKFLOW,
  EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID,
  executiveDailyBriefSourcePolicyMetadata,
} from "../executive-daily-brief-workflow";
import {
  EXECUTIVE_DAILY_BRIEF_SOURCE_ADAPTERS,
  requiredExecutiveBriefSourceFamilies,
} from "../source-adapters";
import {
  createExecutiveDailyBriefToolPolicy,
  EXECUTIVE_DAILY_BRIEF_TOOL_REGISTRY,
  executiveDailyBriefToolScope,
  visibleToolsForPolicy,
} from "../tool-registry";

describe("Executive Daily Brief workflow pack", () => {
  it("declares the workflow pack, evidence policy, delivery policy, and runtime budget", () => {
    const parsed = workflowDefinitionSchema.parse(
      EXECUTIVE_DAILY_BRIEF_WORKFLOW,
    );

    expect(parsed.workflowId).toBe(EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID);
    expect(parsed.evidencePolicy.requireSourceRefs).toBe(true);
    expect(parsed.evidencePolicy.allowSyntheticEvidence).toBe(false);
    expect(parsed.deliveryPolicy.requireDeliveryAttemptRecord).toBe(true);
    expect(parsed.runtimeBudget.maxToolCalls).toBeGreaterThan(0);
    expect(parsed.failureModes).toContain("delivery_disabled");
  });

  it("centralizes every source adapter required by the brief", () => {
    const adapterIds = EXECUTIVE_DAILY_BRIEF_SOURCE_ADAPTERS.map(
      (adapter) => adapter.adapterId,
    );

    expect(adapterIds).toEqual(
      expect.arrayContaining([
        "fireflies_meetings",
        "outlook_email",
        "teams_messages",
        "documents_rag",
        "acumatica_financials",
        "project_intelligence_packets",
      ]),
    );
    for (const adapter of EXECUTIVE_DAILY_BRIEF_SOURCE_ADAPTERS) {
      expect(adapter.outputRecordType).toBe("evidence_ref");
      expect(adapter.healthRecordType).toBe("source_health_snapshot");
      expect(adapter.supportedHealthStates).toEqual(
        expect.arrayContaining([
          "loaded",
          "stale",
          "missing",
          "degraded",
          "failed",
          "skipped",
        ]),
      );
    }
  });

  it("exports source policy metadata used by run construction", () => {
    const metadata = executiveDailyBriefSourcePolicyMetadata();

    expect(metadata.workflowId).toBe(EXECUTIVE_DAILY_BRIEF_WORKFLOW_ID);
    expect(metadata.minimumEvidenceRefsPerClaim).toBe(1);
    expect(metadata.requiredSourceFamilies).toEqual(
      requiredExecutiveBriefSourceFamilies(),
    );
    expect(metadata.requiredSourceFamilies).toEqual(
      expect.arrayContaining([
        "meeting",
        "email",
        "teams",
        "document",
        "rag",
        "acumatica",
        "project_intelligence",
      ]),
    );
  });

  it("filters tools by workflow policy before runtime use", () => {
    const policy = createExecutiveDailyBriefToolPolicy({
      allowDelivery: true,
      allowWrites: true,
      allowedChannels: ["teams"],
    });

    const visibleToolNames = visibleToolsForPolicy(
      EXECUTIVE_DAILY_BRIEF_TOOL_REGISTRY,
      policy,
    ).map((toolDefinition) => toolDefinition.name);

    expect(visibleToolNames).toContain("send-teams-daily-brief");
    expect(visibleToolNames).not.toContain("send-email-daily-brief");
  });

  it("hides send tools when delivery is disabled or dry-run only", () => {
    const scope = executiveDailyBriefToolScope({
      allowDelivery: false,
      allowWrites: true,
      allowedChannels: ["teams"],
    });

    expect(scope.visibleToolNames).toContain("build-teams-daily-brief-payload");
    expect(scope.visibleToolNames).not.toContain("send-teams-daily-brief");
    expect(scope.hiddenToolNames).toEqual(
      expect.arrayContaining([
        "send-teams-daily-brief",
        "send-email-daily-brief",
      ]),
    );
  });
});
