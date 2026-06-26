import {
  buildChangeRequestPreviewFields,
  CHANGE_REQUEST_WORKFLOW,
  getAssistantCreateWorkflow,
  normalizeChangeRequestDraft,
} from "../workflow-registry";

describe("assistant create workflow registry", () => {
  it("defines the change request pilot workflow metadata", () => {
    expect(CHANGE_REQUEST_WORKFLOW).toMatchObject({
      workflowKey: "change_event",
      objectLabel: "Change Request",
      route: "/:projectId/change-events/new",
      chatSupported: true,
      backingTool: "createChangeEvent",
      confirmationRequired: true,
      launchScope: "pilot",
      requiredFields: ["projectId", "title"],
      fallbackPage: "/:projectId/change-events/new",
    });
    expect(
      CHANGE_REQUEST_WORKFLOW.fields.map((field) => [
        field.name,
        field.type,
        field.promptOrder,
        field.mapsTo,
      ]),
    ).toEqual([
      ["projectId", "number", 1, "change_events.project_id"],
      ["title", "text", 2, "change_events.title"],
      ["description", "textarea", 3, "change_events.description"],
      ["type", "select", 4, "change_events.type"],
      ["scope", "select", 5, "change_events.scope"],
      ["status", "select", 6, "change_events.status"],
      ["reason", "select", 7, "change_events.reason"],
      ["origin", "select", 8, "change_events.origin"],
      ["expectingRevenue", "boolean", 9, "change_events.expecting_revenue"],
      [
        "lineItemRevenueSource",
        "select",
        10,
        "change_events.line_item_revenue_source",
      ],
    ]);
    expect(getAssistantCreateWorkflow("change_event")).toBe(
      CHANGE_REQUEST_WORKFLOW,
    );
  });

  it("normalizes legacy AI values to DB-compatible change_events values", () => {
    const result = normalizeChangeRequestDraft({
      projectId: 43,
      title: "Owner-requested lobby finish change",
      description: " Owner asked to upgrade the lobby finish package. ",
      scope: "owner_change",
      type: "potential_change",
      status: "open",
      reason: "backcharge",
      origin: "rfis",
    });

    expect(result).toMatchObject({
      ok: true,
      draft: {
        projectId: 43,
        title: "Owner-requested lobby finish change",
        description: "Owner asked to upgrade the lobby finish package.",
        type: "Owner Change",
        scope: "TBD",
        status: "Open",
        reason: "Back Charge",
        origin: "RFI's",
        expectingRevenue: true,
        lineItemRevenueSource: null,
      },
    });
  });

  it("fails loudly for values the native change_events table cannot accept", () => {
    expect(
      normalizeChangeRequestDraft({
        projectId: 43,
        title: "Void status should not pass",
        status: "void",
      }),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining('Invalid change request status "void"'),
    });
  });

  it("builds the preview/write field payload from the normalized draft", () => {
    const result = normalizeChangeRequestDraft({
      projectId: 43,
      title: "Allowance change",
      type: "Allowance",
      scope: "Allowance",
      status: "Pending Approval",
      expectingRevenue: false,
      lineItemRevenueSource: "Enter manually",
    });

    if (!result.ok) throw new Error(result.error);

    expect(buildChangeRequestPreviewFields(result.draft)).toEqual({
      project_id: 43,
      title: "Allowance change",
      description: null,
      type: "Allowance",
      scope: "Allowance",
      status: "Pending Approval",
      reason: null,
      origin: "Internal",
      expecting_revenue: false,
      line_item_revenue_source: "Enter manually",
    });
  });
});
