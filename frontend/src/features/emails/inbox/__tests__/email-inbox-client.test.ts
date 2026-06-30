import { EMAIL_INBOX_SPLIT_VIEW_CLASSNAME } from "../email-inbox-client";

describe("EmailInboxClient layout", () => {
  it("keeps the inbox split view on a viewport-height layout contract", () => {
    expect(EMAIL_INBOX_SPLIT_VIEW_CLASSNAME).toContain("h-[calc(100dvh-6rem)]");
    expect(EMAIL_INBOX_SPLIT_VIEW_CLASSNAME).toContain(
      "min-h-[calc(100dvh-6rem)]",
    );
    expect(EMAIL_INBOX_SPLIT_VIEW_CLASSNAME).toContain("overflow-hidden");
    expect(EMAIL_INBOX_SPLIT_VIEW_CLASSNAME).toContain("w-full");
  });
});
