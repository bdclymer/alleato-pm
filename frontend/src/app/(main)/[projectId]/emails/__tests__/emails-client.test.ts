import type { ProjectEmail } from "@/hooks/use-emails";
import {
  buildMailboxPriorityTabs,
  countMailboxEmailsByPriority,
  normalizeMailboxPriorityFilter,
} from "@/features/emails/mailbox-priority-tabs";

function buildEmail(
  priority: ProjectEmail["assistant_priority"],
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
