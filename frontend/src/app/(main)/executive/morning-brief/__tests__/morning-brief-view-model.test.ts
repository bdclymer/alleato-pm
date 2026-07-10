import { describe, expect, it } from "vitest";

import type { CanonicalDailyBriefPacket } from "@/lib/daily-briefs/canonical-packets";
import type { BriefV3 } from "@/lib/daily-briefs/brief-v3-types";

import { briefV3IssueKey, buildMorningBriefModel } from "../morning-brief-view-model";

// briefV3IssueKey implementation (for reference):
//   `${project.trim().toLowerCase()}::${text.trim().toLowerCase().slice(0, 100)}`

describe("briefV3IssueKey", () => {
  it("is stable — same inputs produce the same key", () => {
    const keyA = briefV3IssueKey("Approve the paving change order", "Vermillion Rise");
    const keyB = briefV3IssueKey("Approve the paving change order", "Vermillion Rise");
    expect(keyA).toBe(keyB);
  });

  it("is project-scoped — same text in different projects produces different keys", () => {
    const keyA = briefV3IssueKey("Call Andrew today", "Vermillion Rise");
    const keyB = briefV3IssueKey("Call Andrew today", "Exol Morrisville");
    expect(keyA).not.toBe(keyB);
  });

  it("normalizes whitespace", () => {
    const canonical = briefV3IssueKey("Approve the paving change", "Vermillion Rise");
    expect(briefV3IssueKey("  Approve the paving change  ", "  Vermillion Rise  ")).toBe(canonical);
  });

  it("normalizes case", () => {
    const canonical = briefV3IssueKey("approve the paving change", "vermillion rise");
    expect(briefV3IssueKey("APPROVE THE PAVING CHANGE", "VERMILLION RISE")).toBe(canonical);
  });

  it("produces a non-empty string for typical inputs", () => {
    const key = briefV3IssueKey("Approve CO #12", "Morrisville");
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  it("truncates text to 100 characters so long items still match their truncated form", () => {
    const longText = "a".repeat(150);
    const key = briefV3IssueKey(longText, "Project A");
    // The key's text portion should be capped at 100 chars
    const [, textPart] = key.split("::");
    expect(textPart?.length).toBe(100);
  });

  it("uses '::' as a project–text separator so a project suffix cannot collide with a text prefix", () => {
    // "foo" project + "bar text" must differ from "foobar" project + "text" even after
    // normalization — the separator prevents naive concatenation collisions.
    const keyA = briefV3IssueKey("bar text", "foo");
    const keyB = briefV3IssueKey("text", "foobar");
    expect(keyA).not.toBe(keyB);
  });
});

// Regression guard: the Morning Brief page must render `looseEnds`. A day with
// zero `callsToday` and every project on-track (`hasOwnerDecision: false`) used
// to render an empty page because the view model dropped `looseEnds` entirely —
// silently losing the owner-grade items the brief hands Brandon to chase.

function makeBrief(overrides: Partial<BriefV3> = {}): BriefV3 {
  return {
    version: "v3",
    businessDate: "2026-07-09",
    callsToday: [],
    projects: [
      {
        name: "Goodwill Noblesville",
        urgencyRank: 1,
        hasOwnerDecision: false,
        resolvedToday: false,
        actionItems: [],
        context: "Framing is on schedule and inspections passed.",
      },
    ],
    looseEnds: [
      {
        text: "The July 9 check batch totaled **$287,799.13** for printing and mailing [S76].",
        sourceIds: ["S76"],
      },
      {
        text: "A family-office capital raise inquiry came in from Wealth Insight Associates [S67].",
        sourceIds: ["S67"],
      },
    ],
    sourceCoverage: { meetings: 1, emails: 2, teams: 0, documents: 0, thinLanes: [], note: null },
    sources: {},
    ...overrides,
  };
}

function makePacket(brief: BriefV3 | null): CanonicalDailyBriefPacket {
  return {
    id: "packet-1",
    targetId: "target-1",
    packetType: "current",
    generatedAt: "2026-07-10T11:11:27Z",
    coveredStartAt: null,
    coveredEndAt: null,
    freshnessStatus: "fresh",
    businessDate: "2026-07-09",
    title: "Daily executive brief",
    executiveSummary: null,
    currentStatus: null,
    strategicRead: null,
    whyItMatters: null,
    recommendedNextMoves: [],
    confidenceSummary: {},
    sourceCoverage: {},
    sourceCounts: {},
    sourceIds: [],
    sourceCount: 0,
    sources: [],
    briefMarkdown: "",
    sections: [],
    brief,
    compilerVersion: "manual_daily_executive_brief_v1",
  };
}

describe("buildMorningBriefModel — loose ends", () => {
  it("renders every loose end from the structured brief", () => {
    const model = buildMorningBriefModel(makePacket(makeBrief()));

    expect(model.empty).toBe(false);
    expect(model.looseEnds).toHaveLength(2);
    expect(model.looseEnds[0].plain).toContain("$287,799.13");
    expect(model.looseEnds[0].sources).toEqual(["S76"]);
    // Citation tokens are stripped from the rendered runs.
    expect(model.looseEnds[0].plain).not.toContain("[S76]");
  });

  it("does not claim 'nothing needs a decision' when loose ends exist", () => {
    const model = buildMorningBriefModel(makePacket(makeBrief()));
    const read = model.read
      .map((run) => ("text" in run ? run.text : ""))
      .join(" ");

    expect(read.toLowerCase()).toContain("loose end");
    expect(read.toLowerCase()).not.toContain("nothing needs a decision");
  });

  it("keeps the 'nothing needs a decision' read when there are no calls and no loose ends", () => {
    const model = buildMorningBriefModel(makePacket(makeBrief({ looseEnds: [] })));
    const read = model.read
      .map((run) => ("text" in run ? run.text : ""))
      .join(" ");

    expect(model.looseEnds).toHaveLength(0);
    expect(read.toLowerCase()).toContain("nothing needs a decision");
  });
});
