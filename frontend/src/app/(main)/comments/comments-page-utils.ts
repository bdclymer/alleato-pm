import type { AllCommentItem } from "@/app/api/comments/all/route";

export type CommentScope = "active" | "resolved" | "all";

export const scopeLabels: Record<CommentScope, string> = {
  active: "Active",
  resolved: "Resolved",
  all: "All",
};

export function documentLabel(documentId: string): string {
  if (!documentId || documentId === "/") return "Home";
  return documentId.replace(/^\//, "").replace(/\//g, " / ");
}

export function timeLabel(ms: number | null): string {
  if (!ms) return "";
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function relativeTimeLabel(ms: number | null, now = Date.now()): string {
  if (!ms) return "Unknown";
  const diff = now - ms;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return timeLabel(ms);
}

export function isResolved(comment: AllCommentItem): boolean {
  return /resolved|closed|done/i.test(comment.statusName ?? "");
}

export function statusLabel(comment: AllCommentItem): string {
  return comment.statusName || "Open";
}

export function matchesSearch(comment: AllCommentItem, query: string): boolean {
  if (!query) return true;
  const haystack = [
    comment.authorName,
    comment.preview,
    comment.statusName,
    comment.documentId,
    documentLabel(comment.documentId),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function commentPriority(comment: AllCommentItem): number {
  return isResolved(comment) ? 1 : 0;
}

export function sortComments(a: AllCommentItem, b: AllCommentItem): number {
  return (
    commentPriority(a) - commentPriority(b) ||
    (b.lastUpdated ?? 0) - (a.lastUpdated ?? 0) ||
    documentLabel(a.documentId).localeCompare(documentLabel(b.documentId))
  );
}

export function filterComments(
  comments: AllCommentItem[],
  scope: CommentScope,
  query: string,
): AllCommentItem[] {
  return comments.filter((comment) => {
    if (scope === "active" && isResolved(comment)) return false;
    if (scope === "resolved" && !isResolved(comment)) return false;
    return matchesSearch(comment, query.trim());
  });
}
