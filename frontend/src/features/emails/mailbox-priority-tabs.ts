import type { ProjectEmail } from "@/hooks/use-emails";

export const MAILBOX_PRIORITY_FILTERS = [
  "all",
  "urgent",
  "high",
  "normal",
  "low",
] as const;

export type MailboxPriorityFilter = (typeof MAILBOX_PRIORITY_FILTERS)[number];

function isMailboxPriorityFilter(
  value: string | null | undefined,
): value is MailboxPriorityFilter {
  return MAILBOX_PRIORITY_FILTERS.includes(
    (value ?? "") as MailboxPriorityFilter,
  );
}

export function normalizeMailboxPriorityFilter(
  value: string | null | undefined,
): MailboxPriorityFilter {
  return isMailboxPriorityFilter(value) ? value : "all";
}

function mailboxPriorityLabel(priority: MailboxPriorityFilter): string {
  switch (priority) {
    case "urgent":
      return "Urgent";
    case "high":
      return "High";
    case "normal":
      return "Normal";
    case "low":
      return "Low";
    default:
      return "All";
  }
}

export interface MailboxPriorityTab {
  label: string;
  href: string;
  count: number;
  isActive: boolean;
  compact: true;
}

export function countMailboxEmailsByPriority(
  emails: ProjectEmail[],
): Record<MailboxPriorityFilter, number> {
  const counts: Record<MailboxPriorityFilter, number> = {
    all: emails.length,
    urgent: 0,
    high: 0,
    normal: 0,
    low: 0,
  };

  for (const email of emails) {
    if (email.assistant_priority && email.assistant_priority in counts) {
      counts[email.assistant_priority] += 1;
    }
  }

  return counts;
}

export function buildMailboxPriorityTabs({
  pathname,
  searchParams,
  counts,
  activePriority,
}: {
  pathname: string;
  searchParams: URLSearchParams;
  counts: Record<MailboxPriorityFilter, number>;
  activePriority: MailboxPriorityFilter;
}): MailboxPriorityTab[] {
  return MAILBOX_PRIORITY_FILTERS.map((priority) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (priority === "all") {
      nextParams.delete("priority");
    } else {
      nextParams.set("priority", priority);
    }
    nextParams.set("page", "1");
    const query = nextParams.toString();

    return {
      label: mailboxPriorityLabel(priority),
      href: query ? `${pathname}?${query}` : pathname,
      count: counts[priority],
      isActive: activePriority === priority,
      compact: true,
    };
  });
}
