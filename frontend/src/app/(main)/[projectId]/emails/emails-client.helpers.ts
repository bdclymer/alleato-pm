import type { ProjectEmail } from "@/hooks/use-emails";

export const MAILBOX_REVIEW_REFETCH_INTERVAL_MS = 15_000;

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
