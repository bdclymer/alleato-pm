import type { ProjectEmail } from "@/hooks/use-emails";
import {
  matchesEmailImportanceVisibility,
  getEmailsRefreshInterval,
  normalizeEmailImportanceVisibilityFilter,
  reconcileSelectedEmail,
} from "@/app/(main)/[projectId]/emails/emails-client.helpers";
import {
  buildMailboxWorkflowTabs,
  countMailboxEmailsByWorkflow,
  isArchivedMailboxEmail,
  isDraftMailboxEmail,
  matchesMailboxWorkflowFilter,
  normalizeMailboxWorkflowFilter,
} from "@/features/emails/mailbox-workflow-tabs";

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

describe("normalizeMailboxWorkflowFilter", () => {
  it("falls back invalid values to inbox", () => {
    expect(normalizeMailboxWorkflowFilter("drafts")).toBe("drafts");
    expect(normalizeMailboxWorkflowFilter("invalid")).toBe("inbox");
    expect(normalizeMailboxWorkflowFilter(null)).toBe("inbox");
  });
});

describe("mailbox workflow classification", () => {
  it("separates inbox, drafts, archived, and feedback-submitted emails from the shared dataset", () => {
    const inboxEmail = buildEmail("high", { id: 1, assistant_action: "reply" });
    const draftEmail = buildEmail("normal", {
      id: 2,
      assistant_action: "reply",
      assistant_review: {
        reviewId: "review-2",
        reviewOutcome: "draft_edited",
        reviewerNote: null,
        draftBody: "Draft response",
        assistantCategory: "Client Follow-up",
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
    const archivedEmail = buildEmail("low", {
      id: 3,
      assistant_action: "ignore",
      assistant_review: {
        reviewId: "review-3",
        reviewOutcome: "marked_no_action",
        reviewerNote: null,
        draftBody: null,
        assistantCategory: "No Action",
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
    const feedbackSubmittedEmail = buildEmail("normal", {
      id: 4,
      assistant_action: "watch",
      assistant_review: {
        reviewId: "review-4",
        reviewOutcome: "watched",
        reviewerNote: "This was corrected already.",
        draftBody: null,
        assistantCategory: "Accounting",
        feedbackProvidedAt: "2026-07-06T13:00:00.000Z",
        fieldFeedback: {
          action: "correct",
          priority: "incorrect",
          category: "correct",
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

    const counts = countMailboxEmailsByWorkflow([
      inboxEmail,
      draftEmail,
      archivedEmail,
      feedbackSubmittedEmail,
    ]);

    expect(counts).toEqual({
      inbox: 3,
      drafts: 1,
      archived: 1,
      feedback_submitted: 1,
    });
    expect(isDraftMailboxEmail(draftEmail)).toBe(true);
    expect(isArchivedMailboxEmail(archivedEmail)).toBe(true);
    expect(matchesMailboxWorkflowFilter(inboxEmail, "inbox")).toBe(true);
    expect(matchesMailboxWorkflowFilter(archivedEmail, "inbox")).toBe(false);
    expect(
      matchesMailboxWorkflowFilter(
        feedbackSubmittedEmail,
        "feedback_submitted",
      ),
    ).toBe(true);
  });
});

describe("buildMailboxWorkflowTabs", () => {
  it("preserves existing query state while swapping the workflow filter", () => {
    const tabs = buildMailboxWorkflowTabs({
      pathname: "/outlook-draft-feedback",
      searchParams: new URLSearchParams(
        "view=mail&search=invoice&page=3&priority=high",
      ),
      counts: {
        inbox: 8,
        drafts: 2,
        archived: 3,
        feedback_submitted: 5,
      },
      activeWorkflow: "drafts",
    });

    expect(tabs.map((tab) => tab.label)).toEqual([
      "Inbox",
      "Drafts",
      "Archived",
      "Feedback Submitted",
    ]);
    expect(tabs[0]).toMatchObject({
      href: "/outlook-draft-feedback?view=mail&search=invoice&page=1&workflow=inbox",
      count: 8,
      isActive: false,
      compact: true,
    });
    expect(tabs[1]).toMatchObject({
      href: "/outlook-draft-feedback?view=mail&search=invoice&page=1&workflow=drafts",
      count: 2,
      isActive: true,
      compact: true,
    });
    expect(tabs[3]).toMatchObject({
      href: "/outlook-draft-feedback?view=mail&search=invoice&page=1&workflow=feedback_submitted",
      count: 5,
      isActive: false,
      compact: true,
    });
    expect(tabs[1]?.href.includes("priority=")).toBe(false);
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
