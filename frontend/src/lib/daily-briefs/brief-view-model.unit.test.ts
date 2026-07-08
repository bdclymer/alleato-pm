import type { CanonicalDailyBriefPacket } from "./canonical-packets";
import { splitDailyBriefMarkdown } from "./canonical-packets";
import {
  buildExecutiveBriefViewModel,
  classifySeverity,
  detectDate,
  detectMoney,
  parseInline,
  plainText,
  segmentsToText,
  splitLeadRest,
  stripCitations,
  topLevelBullets,
} from "./brief-view-model";

describe("brief-view-model parsing primitives", () => {
  it("strips citation tokens but keeps prose", () => {
    expect(
      stripCitations("Solar decision due by 7/8 [01KWC3EJZ9ZMX80Y9VF96RX90R]."),
    ).toBe("Solar decision due by 7/8.");
    expect(stripCitations("A [outlook_abc, teamsdm_x] B")).toBe("A B");
  });

  it("parses **bold** into inline segments", () => {
    const segments = parseInline("Two items need **action now** before **7/8**.");
    expect(segments.filter((s) => s.bold).map((s) => s.text)).toEqual([
      "action now",
      "7/8",
    ]);
    expect(segmentsToText(segments)).toBe("Two items need action now before 7/8.");
  });

  it("splits a bold lead sentence from the rest", () => {
    const { lead, rest } = splitLeadRest(
      "**Make the solar decision by 7/8.** This gates electrical design.",
    );
    expect(lead).toBe("Make the solar decision by 7/8");
    expect(rest).toBe("This gates electrical design.");
  });

  it("returns null lead when a bullet has no bold prefix", () => {
    const { lead, rest } = splitLeadRest("Cost exposure may add $10k.");
    expect(lead).toBeNull();
    expect(rest).toBe("Cost exposure may add $10k.");
  });

  it("classifies severity from keywords and dates", () => {
    expect(classifySeverity("escalate now, in failure mode")).toBe("critical");
    expect(classifySeverity("pending approval, due 7/10")).toBe("amber");
    expect(classifySeverity("decision due by 7/8")).toBe("amber");
    expect(classifySeverity("bids improving and awarded")).toBe("positive");
    expect(classifySeverity("general status note")).toBe("info");
  });

  it("detects the first M/D date", () => {
    expect(detectDate("start slipped to 7/13 pending permits")).toBe("7/13");
    expect(detectDate("no date here")).toBeNull();
  });

  it("detects money figures including ranges", () => {
    expect(detectMoney("adds $10k–$12k exposure")).toEqual(["$10k–$12k"]);
    expect(detectMoney("$9,620.20 permit fee and $100 registration")).toEqual([
      "$9,620.20",
      "$100",
    ]);
    expect(detectMoney("no money")).toEqual([]);
  });

  it("extracts only top-level bullets", () => {
    const body = "- First\n  - nested\n- Second";
    expect(topLevelBullets(body)).toEqual(["First", "Second"]);
  });

  it("plainText removes both citations and bold markers", () => {
    expect(plainText("Cost may add **$10k–$12k** [01KWC].")).toBe(
      "Cost may add $10k–$12k.",
    );
  });
});

const SAMPLE_MARKDOWN = `## Executive Brief
Two owner-level items need action now: **Union Collective solar selection by 7/8** or design slips [01KWC3EJZ9ZMX80Y9VF96RX90R]. Separately, **McLean sprinkler execution is in failure mode** [01KWVKBKFGZWJFQT45FJHRBATQ].

Cash/watch items: **$16k Washington contingency** awaits approval [01KWSKJ5WQQQQWKGVRG2NFATZ7].

## Highest-Leverage Owner Decisions
- **Make the Union Collective solar decision by 7/8.** This gates electrical and permit-set completion [01KWC3EJZ9ZMX80Y9VF96RX90R].
- **Confirm remedy posture on McLean now.** Team is preparing to enforce remedies [01KWVKBKFGZWJFQT45FJHRBATQ].

## Project Intelligence Updates
- **Union Collective**
  - Solar decision due now; permit target **7/28** [01KWC3EJZ9ZMX80Y9VF96RX90R].
  - Cost exposure may add **$10k–$12k** [01KWC3EJZ9ZMX80Y9VF96RX90R].
- **Superior Beverage**
  - Permit fee **$9,620.20** now visible; start slipped to **7/13** [outlook_x].

## Risk Candidates
- **Brooksville still on permit hold.** City comment remains vague [01KWC3EJZ130Q2KHS9RXWCB9D1].
- Bid coverage is thin in electrical and steel [teamsdm_x].

## Source Coverage
\`\`\`json
{ "note": "ignored" }
\`\`\`
`;

function makePacket(): CanonicalDailyBriefPacket {
  return {
    id: "packet-1",
    targetId: "target-1",
    packetType: "current",
    generatedAt: "2026-07-07T23:02:18.929Z",
    coveredStartAt: "2026-07-07T10:00:00Z",
    coveredEndAt: "2026-07-07T22:00:00Z",
    freshnessStatus: "fresh",
    businessDate: "2026-07-07",
    title: "Daily Executive Brief - 2026-07-07",
    executiveSummary: null,
    currentStatus: null,
    strategicRead: null,
    whyItMatters: null,
    recommendedNextMoves: [],
    confidenceSummary: {},
    sourceCoverage: {
      included: { meetings: 11, emails: 98, teams: 15, documents: 20 },
      skipped: 485,
    },
    sourceCounts: { meetings: 11, emails: 98, teams: 15, documents: 20 },
    sourceIds: [],
    sourceCount: 144,
    briefMarkdown: SAMPLE_MARKDOWN,
    sections: splitDailyBriefMarkdown(SAMPLE_MARKDOWN),
    compilerVersion: "daily_deep_read",
  };
}

describe("buildExecutiveBriefViewModel", () => {
  const model = buildExecutiveBriefViewModel(makePacket());

  it("formats the masthead date and coverage counts", () => {
    expect(model.weekday).toBe("Tuesday");
    expect(model.dateLabel).toBe("July 7, 2026");
    expect(model.preparedFor).toBe("Brandon");
    expect(model.counts).toEqual({ meetings: 11, emails: 98, teams: 15, documents: 20 });
    expect(model.filteredCount).toBe(485);
  });

  it("derives a thesis from the first Executive Brief sentence without markup", () => {
    expect(model.thesis).toMatch(/^Two owner-level items need action now/);
    expect(model.thesis).not.toContain("**");
    expect(model.thesis).not.toContain("[");
  });

  it("builds decisions with severity, badge, and reference", () => {
    const solar = model.decisions.find((d) => d.title.includes("solar decision"));
    expect(solar).toBeDefined();
    expect(solar?.severity).toBe("amber");
    expect(solar?.reference).toBe("Union Collective");
    expect(solar?.due?.value).toBe("7/8");

    const mclean = model.decisions.find((d) => d.title.includes("remedy posture"));
    expect(mclean?.severity).toBe("critical");
    expect(mclean?.badge).toBe("Escalate today");
  });

  it("does not duplicate a decision that appears in two source sections", () => {
    const titles = model.decisions.map((d) => d.title.toLowerCase());
    const unique = new Set(titles);
    expect(unique.size).toBe(titles.length);
  });

  it("builds money stats from dollar figures across sections", () => {
    const figures = model.money.map((m) => m.figure);
    expect(figures).toContain("$16k");
    expect(figures).toContain("$9,620.20");
    // no fabricated cash-flow hero — just real figures
    expect(model.money.length).toBeGreaterThan(0);
  });

  it("maps risk candidates into operations rows with severity", () => {
    const brooksville = model.operations.find((o) => o.title.includes("Brooksville"));
    expect(brooksville).toBeDefined();
    expect(brooksville?.severity).toBe("amber");
    // no raw markdown markers leak into plain-text titles
    expect(model.operations.every((o) => !o.title.includes("**"))).toBe(true);
    expect(model.decisions.every((d) => !d.title.includes("**"))).toBe(true);
  });

  it("parses project cards with names, figures, and pills", () => {
    const union = model.projects.find((p) => p.name === "Union Collective");
    expect(union).toBeDefined();
    const figureText = union?.figures.map((f) => f.label.map((s) => s.text).join("")) ?? [];
    expect(figureText.join(" ")).toContain("$10k–$12k");

    const superior = model.projects.find((p) => p.name === "Superior Beverage");
    expect(superior).toBeDefined();
  });

  it("produces a data-driven temperature strip", () => {
    const labels = model.temperature.map((t) => t.label);
    expect(labels).toContain("decisions needed");
    expect(labels).toContain("schedule risks");
    expect(labels).toContain("cash items");
  });

  it("uses top decisions as the 'today's read' highlights", () => {
    expect(model.read.lead.length).toBeGreaterThan(0);
    expect(model.read.items.length).toBeGreaterThan(0);
    expect(model.read.items.length).toBeLessThanOrEqual(3);
  });
});
