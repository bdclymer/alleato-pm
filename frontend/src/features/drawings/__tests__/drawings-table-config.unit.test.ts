import {
  getDrawingPublishState,
  matchesDrawingPublishState,
} from "@/features/drawings/drawings-table-config";

describe("drawing publish state helpers", () => {
  it("derives Draft, Published, and Obsolete from revision visibility fields", () => {
    expect(
      getDrawingPublishState({ isPublished: false, isObsolete: false }),
    ).toBe("draft");
    expect(
      getDrawingPublishState({ isPublished: true, isObsolete: false }),
    ).toBe("published");
    expect(
      getDrawingPublishState({ isPublished: true, isObsolete: true }),
    ).toBe("obsolete");
  });

  it("matches the same publish state used by the Drawings toolbar filter", () => {
    const draftDrawing = { isPublished: false, isObsolete: false };

    expect(matchesDrawingPublishState(draftDrawing, undefined)).toBe(true);
    expect(matchesDrawingPublishState(draftDrawing, "draft")).toBe(true);
    expect(matchesDrawingPublishState(draftDrawing, "published")).toBe(false);
  });
});
