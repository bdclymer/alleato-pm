import { getCollaborationNotificationHref } from "../notification-links";

describe("collaboration notification links", () => {
  it("routes submittal notifications to the submittals detail page", () => {
    expect(
      getCollaborationNotificationHref({
        projectId: 25125,
        entityType: "submittal",
        entityId: "sub-1",
      }),
    ).toBe("/25125/submittals/sub-1");
  });

  it("preserves known plural entity routes", () => {
    expect(
      getCollaborationNotificationHref({
        projectId: 25125,
        entityType: "rfis",
        entityId: "rfi-1",
      }),
    ).toBe("/25125/rfis/rfi-1");
  });

  it("falls back to the raw entity type for unknown routes", () => {
    expect(
      getCollaborationNotificationHref({
        projectId: 25125,
        entityType: "custom-tool",
        entityId: "item-1",
      }),
    ).toBe("/25125/custom-tool/item-1");
  });

  it("falls back to team chat without project or entity context", () => {
    expect(
      getCollaborationNotificationHref({
        projectId: null,
        entityType: "submittal",
        entityId: "sub-1",
      }),
    ).toBe("/team-chat");
  });
});
