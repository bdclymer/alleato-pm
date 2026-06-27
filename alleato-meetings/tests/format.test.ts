import { describe, it, expect } from "vitest";
import { initials, dueState, monthDay } from "@/lib/format";

describe("initials", () => {
  it("uses first + last initial for multi-word names", () => {
    expect(initials("Brandon Clymer")).toBe("BC");
  });
  it("uses first two letters for single names", () => {
    expect(initials("Madonna")).toBe("MA");
  });
  it("strips angle-bracket wrappers (e.g. emails)", () => {
    expect(initials("Jane Dawson <jane@x.com>")).toBe("JD");
  });
  it("returns ? for empty input", () => {
    expect(initials("")).toBe("?");
  });
});

describe("dueState", () => {
  it("returns 'none' when no date", () => {
    expect(dueState(null)).toBe("none");
  });
  it("flags past dates as overdue", () => {
    expect(dueState("2000-01-01")).toBe("overdue");
  });
  it("flags far-future dates as later", () => {
    expect(dueState("2999-01-01")).toBe("later");
  });
});

describe("monthDay", () => {
  it("returns uppercase month and numeric day", () => {
    const { month, day } = monthDay("2026-06-22T18:30:00Z");
    expect(month).toMatch(/^[A-Z]{3}$/);
    expect(day).toBe(String(new Date("2026-06-22T18:30:00Z").getDate()));
  });
  it("returns placeholders for null", () => {
    expect(monthDay(null)).toEqual({ month: "—", day: "—" });
  });
});
