import type { CanonicalDailyBriefPacket } from "@/lib/daily-briefs/canonical-packets";
import type { BriefV3 } from "@/lib/daily-briefs/brief-v3-types";

import { buildMorningBriefModel } from "../morning-brief-view-model";

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
