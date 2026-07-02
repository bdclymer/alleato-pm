import type { ProjectEmail } from "@/hooks/use-emails";
import {
  matchesEmailImportanceVisibility,
  getEmailsRefreshInterval,
  normalizeEmailImportanceVisibilityFilter,
  reconcileSelectedEmail,
} from "@/app/(main)/[projectId]/emails/emails-client.helpers";
import {
  buildMailboxPriorityTabs,
  countMailboxEmailsByPriority,
  normalizeMailboxPriorityFilter,
} from "@/features/emails/mailbox-priority-tabs";

function buildEmail(
  priority: ProjectEmail["assistant_priority"],
  overrides: Partial<ProjectEmail> = {},
): ProjectEmail {
  return {
    id: 1,
    project_id: 876,
    project: null,
    subject: "Subject",
    body: null,
    body_html: null,
    body_text: null,
    from_name: "Brandon Clymer",
    from_email: "bclymer@alleatogroup.com",
    to_list: [],
    cc_list: [],
    bcc_list: [],
    status: "Received",
    sent_at: null,
    received_at: null,
    is_private: false,
    is_starred: false,
    has_attachments: false,
    related_tool: null,
    related_id: null,
    distribution_group: null,
    thread_id: null,
    created_by: null,
    created_at: null,
    updated_at: null,
    deleted_at: null,
    assistant_priority: priority,
    ...overrides,
  };
}

describe("normalizeMailboxPriorityFilter", () => {
  it("falls back invalid values to all", () => {
    expect(normalizeMailboxPriorityFilter("urgent")).toBe("urgent");
    expect(normalizeMailboxPriorityFilter("invalid")).toBe("all");
    expect(normalizeMailboxPriorityFilter(null)).toBe("all");
  });
});

describe("countMailboxEmailsByPriority", () => {
  it("counts assistant-priority buckets from the shared email dataset", () => {
    const counts = countMailboxEmailsByPriority([
      buildEmail("urgent"),
      buildEmail("high"),
      buildEmail("high"),
      buildEmail("low"),
      buildEmail(null),
    ]);

    expect(counts).toEqual({
      all: 5,
      urgent: 1,
      high: 2,
      normal: 0,
      low: 1,
    });
  });
});

describe("buildMailboxPriorityTabs", () => {
  it("preserves existing query state while swapping the priority filter", () => {
    const tabs = buildMailboxPriorityTabs({
      pathname: "/outlook-draft-feedback",
      searchParams: new URLSearchParams("view=mail&search=invoice&page=3"),
      counts: {
        all: 8,
        urgent: 1,
        high: 2,
        normal: 3,
        low: 2,
      },
      activePriority: "high",
    });

    expect(tabs.map((tab) => tab.label)).toEqual([
      "All",
      "Urgent",
      "High",
      "Normal",
      "Low",
    ]);
    expect(tabs[0]).toMatchObject({
      href: "/outlook-draft-feedback?view=mail&search=invoice&page=1",
      count: 8,
      isActive: false,
      compact: true,
    });
    expect(tabs[2]).toMatchObject({
      href: "/outlook-draft-feedback?view=mail&search=invoice&page=1&priority=high",
      count: 2,
      isActive: true,
      compact: true,
    });
  });
});

describe("getEmailsRefreshInterval", () => {
  it("polls only for mailbox review mode", () => {
    expect(getEmailsRefreshInterval(true)).toBe(60 * 60 * 1000);
    expect(getEmailsRefreshInterval(false)).toBe(false);
  });
});

describe("email importance visibility", () => {
  it("normalizes unsupported relevance filters to the default inbox", () => {
    expect(normalizeEmailImportanceVisibilityFilter("not_important")).toBe(
      "not_important",
    );
    expect(normalizeEmailImportanceVisibilityFilter("all")).toBe("all");
    expect(normalizeEmailImportanceVisibilityFilter("bad")).toBe("default");
    expect(normalizeEmailImportanceVisibilityFilter(null)).toBe("default");
  });

  it("hides not-important emails from the default inbox and exposes filter views", () => {
    const important = buildEmail("normal", { id: 1 });
    const notImportant = buildEmail("low", { id: 2 });
    const unmarked = buildEmail("normal", { id: 3 });
    const feedback = {
      "1": {
        signal: "important",
        reasonCategory: "decision_needed",
        reason: "Needs a response",
        createdAt: "2026-07-02T12:00:00.000Z",
      },
      "2": {
        signal: "not_important",
        reasonCategory: "marketing_noise",
        reason: "Vendor blast",
        createdAt: "2026-07-02T12:01:00.000Z",
      },
    } as const;

    expect(
      [important, notImportant, unmarked].filter((email) =>
        matchesEmailImportanceVisibility(email, feedback, "default"),
      ),
    ).toEqual([important, unmarked]);
    expect(
      [important, notImportant, unmarked].filter((email) =>
        matchesEmailImportanceVisibility(email, feedback, "not_important"),
      ),
    ).toEqual([notImportant]);
    expect(
      [important, notImportant, unmarked].filter((email) =>
        matchesEmailImportanceVisibility(email, feedback, "all"),
      ),
    ).toEqual([important, notImportant, unmarked]);
  });
});

describe("reconcileSelectedEmail", () => {
  it("replaces the selected row with the refreshed query copy", () => {
    const stale = buildEmail("high", {
      id: 42,
      assistant_review: {
        reviewId: "review-1",
        reviewOutcome: "skipped",
        reviewerNote: null,
        draftBody: null,
        assistantCategory: null,
        feedbackProvidedAt: null,
        fieldFeedback: {
          action: "unreviewed",
          priority: "unreviewed",
          category: "unreviewed",
          draft: "unreviewed",
          project: "unreviewed",
          owner: "unreviewed",
          reason: "unreviewed",
          score: "unreviewed",
        },
        projectAssignmentFeedback: {
          status: "unreviewed",
          correctedProjectId: null,
          reasonSignals: [],
          reasonNote: null,
        },
      },
    });
    const refreshed = buildEmail("urgent", {
      id: 42,
      assistant_review: {
        reviewId: "review-1",
        reviewOutcome: "draft_edited",
        reviewerNote: "Saved",
        draftBody: "Updated draft",
        assistantCategory: "Reply Needed",
        feedbackProvidedAt: "2026-06-30T12:00:00.000Z",
        fieldFeedback: {
          action: "correct",
          priority: "correct",
          category: "correct",
          draft: "correct",
          project: "unreviewed",
          owner: "unreviewed",
          reason: "unreviewed",
          score: "unreviewed",
        },
        projectAssignmentFeedback: {
          status: "unreviewed",
          correctedProjectId: null,
          reasonSignals: [],
          reasonNote: null,
        },
      },
    });

    expect(reconcileSelectedEmail([refreshed], stale)).toEqual(refreshed);
  });

  it("clears the selection when the row no longer exists", () => {
    const selected = buildEmail("normal", { id: 99 });
    expect(reconcileSelectedEmail([], selected)).toBeNull();
  });
});
