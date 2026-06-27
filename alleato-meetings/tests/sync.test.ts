import { describe, it, expect } from "vitest";
import { meetingDocKey } from "@/lib/sync";

describe("meetingDocKey", () => {
  it("is deterministic for the same Graph meeting id", () => {
    expect(meetingDocKey("MSPdummyMeetingId==")).toBe(meetingDocKey("MSPdummyMeetingId=="));
  });

  it("is namespaced with the teamsmtg_ prefix", () => {
    expect(meetingDocKey("abc")).toMatch(/^teamsmtg_[0-9a-f]{16}$/);
  });

  it("differs across distinct meeting ids", () => {
    expect(meetingDocKey("abc")).not.toBe(meetingDocKey("def"));
  });
});
