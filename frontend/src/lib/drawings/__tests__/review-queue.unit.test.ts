import { getDrawingReviewQueueRows } from "../review-queue";
import {
  mapDrawingLogRow,
  type DrawingLogTableRow,
  type DrawingLogViewRow,
} from "@/types/drawings.types";

function drawingRow(
  id: string,
  overrides: Partial<DrawingLogTableRow>,
): DrawingLogTableRow {
  return {
    id,
    projectId: 1009,
    drawingNumber: id,
    title: `Drawing ${id}`,
    discipline: null,
    drawingType: null,
    drawingCreatedAt: "2026-06-23T00:00:00.000Z",
    drawingUpdatedAt: "2026-06-23T00:00:00.000Z",
    areaId: null,
    areaName: null,
    revisionId: `${id}-revision`,
    revisionNumber: "0",
    drawingDate: null,
    receivedDate: null,
    status: "under_review",
    fileUrl: null,
    fileName: null,
    fileSize: null,
    fileType: null,
    revisionDescription: null,
    uploadedBy: null,
    revisionCreatedAt: null,
    setName: null,
    uploadedByEmail: null,
    isPublished: true,
    isObsolete: false,
    ...overrides,
  };
}

describe("getDrawingReviewQueueRows", () => {
  it("returns only unpublished non-obsolete review revisions", () => {
    const rows = [
      drawingRow("published-current", { isPublished: true }),
      drawingRow("queued-revision", { isPublished: false }),
      drawingRow("obsolete-unpublished", {
        isPublished: false,
        isObsolete: true,
      }),
    ];

    expect(getDrawingReviewQueueRows(rows).map((row) => row.id)).toEqual([
      "queued-revision",
    ]);
  });

  it("uses revision publication state when mapping review-log rows", () => {
    const row: DrawingLogViewRow = {
      area_id: null,
      area_name: null,
      deleted_at: null,
      deleted_by: null,
      discipline: "Architectural",
      drawing_created_at: "2026-06-23T00:00:00.000Z",
      drawing_date: null,
      drawing_number: "A101",
      drawing_type: "Plan",
      drawing_updated_at: "2026-06-23T00:00:00.000Z",
      file_name: "A101.pdf",
      file_size: 1000,
      file_type: "application/pdf",
      file_url: "https://example.com/A101.pdf",
      id: "drawing-id",
      is_obsolete: false,
      is_published: true,
      project_id: 1009,
      published_at: null,
      published_by: null,
      received_date: null,
      review_revision_id: "review-revision-id",
      revision_created_at: null,
      revision_description: null,
      revision_id: "review-revision-id",
      revision_is_published: false,
      revision_number: "1",
      set_name: null,
      status: "under_review",
      title: "First Floor Plan",
      uploaded_by: null,
      uploaded_by_email: null,
    };

    expect(mapDrawingLogRow(row).isPublished).toBe(false);
  });
});
