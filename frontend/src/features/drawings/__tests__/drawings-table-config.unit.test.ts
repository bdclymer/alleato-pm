import {
  buildDrawingTableColumns,
  getDrawingPublishState,
  matchesDrawingPublishState,
} from "@/features/drawings/drawings-table-config";
import type { DrawingLogTableRow } from "@/types/drawings.types";

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

  it("allows inline editing of the title column when inline handlers are provided", async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    const titleColumn = buildDrawingTableColumns({
      disciplines: [],
      onUpdate,
    })[1];
    const drawing = {
      id: "drawing-1",
      title: "Floor Plan",
    } as unknown as DrawingLogTableRow;

    expect(titleColumn.editable).toBe(true);
    expect(titleColumn.editType).toBe("text");
    expect(titleColumn.editValue?.(drawing)).toBe("Floor Plan");

    await titleColumn.onEdit?.(drawing, "Updated Title");

    expect(onUpdate).toHaveBeenCalledWith("drawing-1", {
      title: "Updated Title",
    });
  });
});
