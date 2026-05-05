export const ADMIN_FEEDBACK_BUCKET = "admin-feedback";

export const ADMIN_FEEDBACK_ATTRIBUTE = "data-feedback-id";
export const ADMIN_FEEDBACK_FALLBACK_ATTRIBUTE = "data-ai-target";
export const ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE = "data-admin-feedback-root";
export const OPEN_ADMIN_FEEDBACK_COMPOSER_EVENT =
  "admin-feedback:open-composer";
export const FEEDBACK_LAUNCHER_POSITION_CLASS =
  "fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 sm:bottom-8 sm:right-8";

export const ADMIN_FEEDBACK_REQUEST_TYPES = [
  "bug",
  "change_request",
  "copy",
  "question",
  "feature_request",
] as const;

export const BOARD_STATUSES = [
  "submitted",
  "in_review",
  "planned",
  "in_progress",
  "shipped",
] as const;

export type BoardStatus = (typeof BOARD_STATUSES)[number];

export const BOARD_STATUS_LABELS: Record<BoardStatus, string> = {
  submitted: "Submitted",
  in_review: "In Review",
  planned: "Planned",
  in_progress: "In Progress",
  shipped: "Shipped",
};

export const ADMIN_FEEDBACK_SEVERITIES = ["low", "medium", "high"] as const;

export type AdminFeedbackRequestType =
  (typeof ADMIN_FEEDBACK_REQUEST_TYPES)[number];

export type AdminFeedbackSeverity = (typeof ADMIN_FEEDBACK_SEVERITIES)[number];

export function feedbackTargetProps(id: string) {
  return {
    [ADMIN_FEEDBACK_ATTRIBUTE]: id,
  } as const;
}
