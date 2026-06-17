import {
  latestMessageOnly,
  stripLeadingPseudoHeader,
  stripQuotedReplyHistory,
} from "../email-thread";

describe("stripLeadingPseudoHeader", () => {
  it("removes a leading Subject/Date/From/To block and its trailing blank line", () => {
    const raw = [
      "Subject: Re: Exol Morrisville PA",
      "Date: 2026-06-12T14:49:19Z",
      "From: Brandon Clymer <bclymer@alleatogroup.com>",
      "To: Steve Fischer <steve.fischer@exol.com>",
      "",
      "Yes we will get it added.",
    ].join("\n");

    expect(stripLeadingPseudoHeader(raw)).toBe("Yes we will get it added.");
  });

  it("leaves a body with no leading header untouched", () => {
    const raw = "Hello team, here is the update.";
    expect(stripLeadingPseudoHeader(raw)).toBe(raw);
  });
});

describe("stripQuotedReplyHistory", () => {
  it("cuts at the first Outlook 'From: … Sent:' quote header", () => {
    const raw =
      "Yes we will get it added. Thank You Brandon Clymer CEO at Alleato Group " +
      "From: Steve Fischer <steve.fischer@exol.com> Sent: Friday, June 12, 2026 10:43 AM " +
      "To: Brandon Clymer Subject: Re: Exol Morrisville PA Can you include a joint fill price";

    expect(stripQuotedReplyHistory(raw)).toBe(
      "Yes we will get it added. Thank You Brandon Clymer CEO at Alleato Group",
    );
  });

  it("cuts at '-----Original Message-----'", () => {
    const raw = "Latest reply here.\n-----Original Message-----\nold stuff";
    expect(stripQuotedReplyHistory(raw)).toBe("Latest reply here.");
  });

  it("cuts at a Gmail-style 'On … wrote:' marker", () => {
    const raw = "Sounds good.\nOn Tue, Jun 11, 2026 at 9:00 AM Steve wrote:\nquoted";
    expect(stripQuotedReplyHistory(raw)).toBe("Sounds good.");
  });

  it("cuts at an injected external-sender banner", () => {
    const raw = "My message. NkdkJdXPPEBannerStart External Sender ... banner junk";
    expect(stripQuotedReplyHistory(raw)).toBe("My message.");
  });

  it("does not cut a simple message with no quoted history", () => {
    const raw = "Just a short note with no reply chain.";
    expect(stripQuotedReplyHistory(raw)).toBe(raw);
  });

  it("does not mistake a leading metadata 'From:'+'To:' for a quote header", () => {
    // The leading block uses From: ... To: (with Date:, not Sent:), so the
    // first real quote boundary is the inline 'From: … Sent:' further down.
    const raw =
      "From: Brandon Clymer <bclymer@alleatogroup.com>\n" +
      "To: Steve Fischer <steve.fischer@exol.com>\n\n" +
      "Real body. From: Steve Fischer <s@exol.com> Sent: Friday To: x quoted";

    expect(stripQuotedReplyHistory(raw)).toBe(
      "From: Brandon Clymer <bclymer@alleatogroup.com>\n" +
        "To: Steve Fischer <steve.fischer@exol.com>\n\n" +
        "Real body.",
    );
  });
});

describe("latestMessageOnly", () => {
  it("reduces a full stored thread to just the latest message (Brandon, not Bob)", () => {
    // Mirrors the real project_emails.body_text shape that surfaced the bug.
    const raw = [
      "Subject: Re: Exol Morrisville PA",
      "Date: 2026-06-11T15:14:41Z",
      "From: Brandon Clymer <bclymer@alleatogroup.com>",
      "To: Steve Fischer <steve.fischer@exol.com>",
      "",
      "Steve, Here is the updated number to include all the gear as well. " +
        "Thank You Brandon Clymer CEO at Alleato Group " +
        "From: Bob Wright <bwright@alleatogroup.com> Sent: Wednesday, June 10, 2026 " +
        "To: Steve Subject: Re: Exol regards, Bob Wright Senior Project Manager",
    ].join("\n");

    const result = latestMessageOnly(raw);
    expect(result).toContain("Steve, Here is the updated number");
    expect(result).toContain("Thank You Brandon Clymer CEO at Alleato Group");
    expect(result).not.toContain("Bob Wright");
    expect(result).not.toMatch(/Subject:|Date:|^From:/m);
  });
});
