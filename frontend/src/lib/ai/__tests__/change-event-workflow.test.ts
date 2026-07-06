import { buildChangeEventWorkflowDraft } from "../change-event-workflow";

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
});
