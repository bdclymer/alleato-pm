import { formatStructuredMeetingList } from "../chat-formatting";

describe("formatStructuredMeetingList", () => {
  it("preserves sections after numbered action lists", () => {
    const text = [
      "**Hard Facts**",
      "Budget status is unknown.",
      "",
      "**Recommended Actions**",
      "1. **Escalate for Owner Direction** - Confirm scope this week.",
      "2. **Resolve Pending Change Order** - Approve or reject CO-003.",
      "",
      "**Next Step**",
      "Schedule the owner decision meeting by Friday.",
    ].join("\n");

    const formatted = formatStructuredMeetingList(text);

    expect(formatted).toContain("**Hard Facts**");
    expect(formatted).toContain("### 1. Escalate for Owner Direction");
    expect(formatted).toContain("### 2. Resolve Pending Change Order");
    expect(formatted).toContain("**Next Step**");
    expect(formatted).toContain("Schedule the owner decision meeting by Friday.");
  });
});
