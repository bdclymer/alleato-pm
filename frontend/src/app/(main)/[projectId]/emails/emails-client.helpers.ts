import type { ProjectEmail } from "@/hooks/use-emails";
import type { EmailImportanceFeedbackState } from "@/lib/ai/email-importance-feedback-types";

export const MAILBOX_REVIEW_REFETCH_INTERVAL_MS = 60 * 60 * 1000;
export const EMAIL_IMPORTANCE_DEFAULT_FILTER = "default" as const;

export type EmailImportanceVisibilityFilter =
  | typeof EMAIL_IMPORTANCE_DEFAULT_FILTER
  | "all"
  | "important"
  | "not_important";

export function getEmailsRefreshInterval(
  isMailboxReviewMode: boolean,
): number | false {
  return isMailboxReviewMode ? MAILBOX_REVIEW_REFETCH_INTERVAL_MS : false;
}

export function reconcileSelectedEmail(
  emails: ProjectEmail[],
  selectedEmail: ProjectEmail | null,
): ProjectEmail | null {
  if (!selectedEmail) return null;
  return emails.find((email) => email.id === selectedEmail.id) ?? null;
}

export function normalizeEmailImportanceVisibilityFilter(
  value: string | null | undefined,
): EmailImportanceVisibilityFilter {
  return value === "all" || value === "important" || value === "not_important"
    ? value
    : EMAIL_IMPORTANCE_DEFAULT_FILTER;
}

export function matchesEmailImportanceVisibility(
  email: Pick<ProjectEmail, "id">,
  feedbackByEmailId: Record<string, EmailImportanceFeedbackState>,
  filter: EmailImportanceVisibilityFilter,
): boolean {
  const feedback = feedbackByEmailId[String(email.id)] ?? null;

  if (filter === "all") return true;
  if (filter === "important") return feedback?.signal === "important";
  if (filter === "not_important") {
    return feedback?.signal === "not_important";
  }

  return feedback?.signal !== "not_important";
}
