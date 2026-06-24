import {
  SMART_GROUPS,
  applySmartGroupFilter,
  smartGroupCountKey,
} from "@/features/documents/smart-groups";
import { EMPTY_DOCUMENT_FILTERS } from "@/features/documents/documents-table-definition";

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

  it("applySmartGroupFilter overlays group filter onto base, clearing others", () => {
    const base = { ...EMPTY_DOCUMENT_FILTERS, category: "contract" };
    const drawings = SMART_GROUPS.find((g) => g.id === "drawings")!;
    const result = applySmartGroupFilter(base, drawings);
    expect(result.document_type).toBe("drawing");
    expect(result.category).toBeUndefined();
  });

  it("applySmartGroupFilter for All resets to empty filters", () => {
    const base = { ...EMPTY_DOCUMENT_FILTERS, document_type: "drawing" };
    const all = SMART_GROUPS.find((g) => g.id === "all")!;
    expect(applySmartGroupFilter(base, all)).toEqual(EMPTY_DOCUMENT_FILTERS);
  });

  it("count key is stable and unique per group", () => {
    const keys = SMART_GROUPS.map(smartGroupCountKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
