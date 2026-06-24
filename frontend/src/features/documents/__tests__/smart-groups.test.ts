import { SMART_GROUPS } from "@/features/documents/smart-groups";

describe("smart-groups", () => {
  it("includes an All group with no filter and no reclassify", () => {
    const all = SMART_GROUPS.find((g) => g.id === "all");
    expect(all).toBeDefined();
    expect(all!.filter).toEqual({});
    expect(all!.reclassifyTo).toBeNull();
  });

  it("maps Drawings to the drawing document_type and is a drop target", () => {
    const drawings = SMART_GROUPS.find((g) => g.id === "drawings");
    expect(drawings!.filter.document_type).toBe("drawing");
    expect(drawings!.reclassifyTo).toBe("drawing");
  });

  it("Photos group filters by document_type photo", () => {
    const photos = SMART_GROUPS.find((g) => g.id === "photos");
    expect(photos!.filter.document_type).toBe("photo");
  });

  it("every group has a unique id", () => {
    const ids = SMART_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
