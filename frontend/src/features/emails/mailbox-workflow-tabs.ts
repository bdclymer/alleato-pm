import type { ProjectEmail } from "@/hooks/use-emails";
import type { EmailImportanceFeedbackState } from "@/lib/ai/email-importance-feedback-types";

export const MAILBOX_WORKFLOW_FILTERS = [
  "inbox",
  "drafts",
  "archived",
  "feedback_submitted",
] as const;

export type MailboxWorkflowFilter =
  (typeof MAILBOX_WORKFLOW_FILTERS)[number];

function isMailboxWorkflowFilter(
  value: string | null | undefined,
): value is MailboxWorkflowFilter {
  return MAILBOX_WORKFLOW_FILTERS.includes(
    (value ?? "") as MailboxWorkflowFilter,
  );
}

export function normalizeMailboxWorkflowFilter(
  value: string | null | undefined,
): MailboxWorkflowFilter {
  return isMailboxWorkflowFilter(value) ? value : "inbox";
}

function mailboxWorkflowLabel(filter: MailboxWorkflowFilter): string {
  switch (filter) {
    case "drafts":
      return "Drafts";
    case "archived":
      return "Archived";
    case "feedback_submitted":
      return "Feedback Submitted";
    default:
      return "Inbox";
  }
}

export interface MailboxWorkflowTab {
  label: string;
  href: string;
  count: number;
  isActive: boolean;
  compact: true;
}

export function hasMailboxDraft(email: ProjectEmail): boolean {
  return Boolean(email.assistant_review?.draftBody?.trim());
}

export function hasMailboxFeedbackSubmitted(
  email: ProjectEmail,
  importanceFeedbackByEmailId?: Record<string, EmailImportanceFeedbackState>,
): boolean {
  return Boolean(
    email.assistant_review?.feedbackProvidedAt ||
      importanceFeedbackByEmailId?.[String(email.id)],
  );
}

export function isArchivedMailboxEmail(email: ProjectEmail): boolean {
  return (
    email.assistant_action === "ignore" ||
    email.assistant_review?.reviewOutcome === "marked_no_action"
  );
}

export function isDraftMailboxEmail(email: ProjectEmail): boolean {
  return (
    hasMailboxDraft(email) ||
    email.assistant_review?.reviewOutcome === "draft_copied" ||
    email.assistant_review?.reviewOutcome === "draft_edited"
  );
}

export function matchesMailboxWorkflowFilter(
  email: ProjectEmail,
  filter: MailboxWorkflowFilter,
  importanceFeedbackByEmailId?: Record<string, EmailImportanceFeedbackState>,
): boolean {
  switch (filter) {
    case "drafts":
      return isDraftMailboxEmail(email);
    case "archived":
      return isArchivedMailboxEmail(email);
    case "feedback_submitted":
      return hasMailboxFeedbackSubmitted(email, importanceFeedbackByEmailId);
    case "inbox":
    default:
      return !isArchivedMailboxEmail(email);
  }
}

export function countMailboxEmailsByWorkflow(
  emails: ProjectEmail[],
  importanceFeedbackByEmailId?: Record<string, EmailImportanceFeedbackState>,
): Record<MailboxWorkflowFilter, number> {
  const counts: Record<MailboxWorkflowFilter, number> = {
    inbox: 0,
    drafts: 0,
    archived: 0,
    feedback_submitted: 0,
  };

  for (const email of emails) {
    if (matchesMailboxWorkflowFilter(email, "inbox", importanceFeedbackByEmailId)) {
      counts.inbox += 1;
    }
    if (matchesMailboxWorkflowFilter(email, "drafts", importanceFeedbackByEmailId)) {
      counts.drafts += 1;
    }
    if (matchesMailboxWorkflowFilter(email, "archived", importanceFeedbackByEmailId)) {
      counts.archived += 1;
    }
    if (
      matchesMailboxWorkflowFilter(
        email,
        "feedback_submitted",
        importanceFeedbackByEmailId,
      )
    ) {
      counts.feedback_submitted += 1;
    }
  }

  return counts;
}

export function buildMailboxWorkflowTabs({
  pathname,
  searchParams,
  counts,
  activeWorkflow,
}: {
  pathname: string;
  searchParams: URLSearchParams;
  counts: Record<MailboxWorkflowFilter, number>;
  activeWorkflow: MailboxWorkflowFilter;
}): MailboxWorkflowTab[] {
  return MAILBOX_WORKFLOW_FILTERS.map((workflow) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("priority");
    nextParams.set("workflow", workflow);
    nextParams.set("page", "1");
    const query = nextParams.toString();

    return {
      label: mailboxWorkflowLabel(workflow),
      href: query ? `${pathname}?${query}` : pathname,
      count: counts[workflow],
      isActive: activeWorkflow === workflow,
      compact: true,
    };
  });
}
