import type { DrawingLogTableRow } from "@/types/drawings.types";

export function getDrawingReviewQueueRows(
  rows: DrawingLogTableRow[],
): DrawingLogTableRow[] {
  return rows.filter((row) => !row.isPublished && !row.isObsolete);
}
