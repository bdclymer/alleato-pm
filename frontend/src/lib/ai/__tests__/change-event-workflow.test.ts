import {
  buildChangeEventWorkflowDraft,
  buildChangeEventWorkflowMetadata,
  isChangeEventFinalPreviewRequest,
} from "../change-event-workflow";

describe("change event workflow draft", () => {
  it("infers a guided draft from a field-style owner change prompt", () => {
    const draft = buildChangeEventWorkflowDraft({
      selectedProjectId: 25125,
      prompt:
        "Create a change event because the owner requested relocated plumbing in the lobby. We have photos and drawings. It is a $12,500 cost impact with no schedule impact.",
    });

    expect(draft.projectId).toBe(25125);
    expect(draft.cause).toBe("Owner Requested");
    expect(draft.scope).toBe("Out of Scope");
    expect(draft.costImpact).toBe("$12,500");
    expect(draft.scheduleImpact).toBe("No schedule impact expected");
    expect(draft.supportingDocs).toEqual(["Photos", "Drawings"]);
    expect(draft.readyForPreview).toBe(true);
    expect(draft.confirmPrompt).toContain("confirmed=false");
  });

  it("keeps missing workflow state explicit for vague change-event requests", () => {
    const draft = buildChangeEventWorkflowDraft({
      prompt: "Can you help me create a new change event?",
    });

    expect(draft.projectId).toBeNull();
    expect(draft.readyForPreview).toBe(false);
    expect(draft.nextQuestion).toBe("What project is this change event for?");
    expect(draft.checklist.find((item) => item.key === "project")?.status).toBe("active");
    expect(draft.missingRisks).toContain("Cost exposure is not documented.");
  });

  it("merges follow-up answers into the prior live draft", () => {
    const firstDraft = buildChangeEventWorkflowDraft({
      selectedProjectId: 25125,
      prompt:
        "Create a change event because the owner requested relocated plumbing in the lobby.",
    });

    const updated = buildChangeEventWorkflowDraft({
      selectedProjectId: 25125,
      previousDraft: firstDraft,
      prompt: "It is a $12,500 cost impact with no schedule impact. Owner was notified.",
    });

    expect(updated.title).toBe(firstDraft.title);
    expect(updated.cause).toBe("Owner Requested");
    expect(updated.costImpact).toBe("$12,500");
    expect(updated.scheduleImpact).toBe("No schedule impact expected");
    expect(updated.ownerNotified).toBe("yes");
    expect(updated.readyForPreview).toBe(true);
    expect(updated.narrative).toContain("Follow-up:");
  });

  it("builds persisted metadata with readiness and write ownership", () => {
    const metadata = buildChangeEventWorkflowMetadata({
      updatedAt: "2026-07-06T05:00:00.000Z",
      selectedProjectId: 25125,
      prompt: "Can you help me create a new change event?",
    });

    expect(metadata).toMatchObject({
      version: 1,
      workflowKey: "change_event",
      widgetType: "change_event_workflow",
      expectedNativeTool: "createChangeEvent",
      writeOwner: "createChangeEvent",
      updatedAt: "2026-07-06T05:00:00.000Z",
      readiness: {
        readyForPreview: false,
        activeChecklistKey: "cause_identified",
      },
    });
    expect(metadata.readiness.missingChecklistKeys).toContain("cost_impact");
  });

  it("lets final preview requests continue to the write tool loop", () => {
    expect(
      isChangeEventFinalPreviewRequest(
        "Prepare the final createChangeEvent preview from this live intake draft.",
      ),
    ).toBe(true);
    expect(isChangeEventFinalPreviewRequest("Create a change event for owner work")).toBe(
      false,
    );
  });
});
