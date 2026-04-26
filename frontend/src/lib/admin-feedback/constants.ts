export const ADMIN_FEEDBACK_BUCKET = "admin-feedback";

export const ADMIN_FEEDBACK_ATTRIBUTE = "data-feedback-id";
export const ADMIN_FEEDBACK_FALLBACK_ATTRIBUTE = "data-ai-target";
export const ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE = "data-admin-feedback-root";
export const OPEN_ADMIN_FEEDBACK_COMPOSER_EVENT =
  "admin-feedback:open-composer";

export const ADMIN_FEEDBACK_REQUEST_TYPES = [
  "bug",
  "change_request",
  "copy",
  "question",
] as const;

export const ADMIN_FEEDBACK_SEVERITIES = ["low", "medium", "high"] as const;

export type AdminFeedbackRequestType =
  (typeof ADMIN_FEEDBACK_REQUEST_TYPES)[number];

export type AdminFeedbackSeverity = (typeof ADMIN_FEEDBACK_SEVERITIES)[number];

export function feedbackTargetProps(id: string) {
  return {
    [ADMIN_FEEDBACK_ATTRIBUTE]: id,
  } as const;
}
