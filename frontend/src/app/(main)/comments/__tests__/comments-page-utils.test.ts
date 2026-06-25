import type { AllCommentItem } from "@/app/api/comments/all/route";
import {
  documentLabel,
  filterComments,
  relativeTimeLabel,
  sortComments,
  statusLabel,
} from "../comments-page-utils";

function comment(overrides: Partial<AllCommentItem>): AllCommentItem {
  return {
    documentId: "/25125/submittals",
    annotationId: "comment-1",
    annotationNumber: null,
    authorName: "Megan Harrison",
    preview: "Submittal needs review",
    statusName: null,
    replyCount: 0,
    lastUpdated: Date.UTC(2026, 5, 25, 12, 0, 0),
    ...overrides,
  };
}

describe("comments page utilities", () => {
  it("turns Velt route ids into readable source labels", () => {
    expect(documentLabel("/25125/submittals/new")).toBe("25125 / submittals / new");
    expect(documentLabel("/")).toBe("Home");
  });

  it("keeps active comments ahead of resolved comments, then sorts by recency", () => {
    const rows = [
      comment({
        annotationId: "resolved-new",
        statusName: "Resolved",
        lastUpdated: Date.UTC(2026, 5, 25, 13, 0, 0),
      }),
      comment({
        annotationId: "active-old",
        statusName: "Open",
        lastUpdated: Date.UTC(2026, 5, 24, 12, 0, 0),
      }),
      comment({
        annotationId: "active-new",
        statusName: null,
        lastUpdated: Date.UTC(2026, 5, 25, 12, 0, 0),
      }),
    ];

    expect([...rows].sort(sortComments).map((row) => row.annotationId)).toEqual([
      "active-new",
      "active-old",
      "resolved-new",
    ]);
  });

  it("filters by active, resolved, all, and source text search", () => {
    const rows = [
      comment({ annotationId: "open", preview: "KPI cards should link to home" }),
      comment({
        annotationId: "resolved",
        preview: "Old thread",
        statusName: "Closed",
        documentId: "/67/submittals",
      }),
    ];

    expect(filterComments(rows, "active", "").map((row) => row.annotationId)).toEqual(["open"]);
    expect(filterComments(rows, "resolved", "").map((row) => row.annotationId)).toEqual([
      "resolved",
    ]);
    expect(filterComments(rows, "all", "67 / submittals").map((row) => row.annotationId)).toEqual([
      "resolved",
    ]);
  });

  it("falls back to actionable status and time labels", () => {
    const now = Date.UTC(2026, 5, 25, 12, 10, 0);

    expect(statusLabel(comment({ statusName: null }))).toBe("Open");
    expect(relativeTimeLabel(Date.UTC(2026, 5, 25, 12, 5, 0), now)).toBe("5m ago");
    expect(relativeTimeLabel(null, now)).toBe("Unknown");
  });
});
