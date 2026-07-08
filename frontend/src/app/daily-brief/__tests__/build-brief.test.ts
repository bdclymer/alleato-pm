import { buildBriefBody, buildEmptyBody, itemKey } from "../build-brief";
import type {
  BrandonBriefItem,
  BrandonDailyUpdatePacket,
  ExecutiveOperatingBrief,
} from "@/lib/executive/brandon-daily-update";

function makeItem(overrides: Partial<BrandonBriefItem>): BrandonBriefItem {
  return {
    title: "An item",
    summary: "A summary.",
    bullets: [],
    source: "Meeting",
    sourceDetail: "Some meeting",
    date: "2026-07-07",
    citations: [],
    project: "Some Project",
    projectInternalId: 1,
    ...overrides,
  };
}

function emptyOperatingBrief(): ExecutiveOperatingBrief {
  return {
    startHere: [],
    hasUnusualExecutiveLoad: false,
    topExecutiveFocus: [],
    additionalMaterialItems: {
      cashMargin: [],
      scheduleField: [],
      customerOwner: [],
      subcontractorVendor: [],
      designPreconstruction: [],
      internalAccountability: [],
    },
    projectRiskRadar: [],
    cashAndMarginWatch: [],
    waitingOn: { brandonWaitingOn: [], othersWaitingOnBrandon: [] },
    peopleAndAccountability: [],
    importantBusinessSignals: [],
    recommendedMoves: [],
    lowerPriorityMomentum: [],
  };
}

function makePacket(
  needsBrandon: BrandonBriefItem[],
): BrandonDailyUpdatePacket {
  return {
    generatedAt: "2026-07-07T18:00:00-04:00",
    windowDays: 3,
    retrievalOrder: [],
    retrievalNotes: [],
    sections: { needsBrandon, waitingOnOthers: [], importantUpdates: [] },
    sourceCoverage: [
      { label: "Meeting", detail: "", count: 3, latest: "2026-07-07" },
    ],
  };
}

describe("buildBriefBody — output safety", () => {
  it("HTML-escapes untrusted text so it cannot inject markup", () => {
    const packet = makePacket([
      makeItem({
        title: '<script>alert("xss")</script>',
        summary: "Contains <b>markup</b> & an ampersand",
        project: "Acme <img src=x onerror=alert(1)>",
      }),
    ]);

    const html = buildBriefBody({
      packet,
      operatingBrief: emptyOperatingBrief(),
      meetings: [],
    });

    // The raw tags must never appear — only their escaped form.
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
  });

  it("never emits a non-http(s) scheme as an href (no javascript: links)", () => {
    const packet = makePacket([
      makeItem({
        title: "Malicious source url",
        citations: [
          {
            source: "Email",
            sourceDetail: "Evil link",
            sourceUrl: "javascript:alert(document.cookie)",
            date: "2026-07-07",
          },
        ],
      }),
    ]);

    const html = buildBriefBody({
      packet,
      operatingBrief: emptyOperatingBrief(),
      meetings: [],
    });

    expect(html).not.toContain("javascript:");
    expect(html).not.toContain('href="javascript');
  });

  it("renders http(s) citation urls as real external links", () => {
    const packet = makePacket([
      makeItem({
        title: "Good source",
        citations: [
          {
            source: "Meeting",
            sourceDetail: "Planning sync",
            sourceUrl: "https://app.fireflies.ai/view/abc",
            date: "2026-07-07",
          },
        ],
      }),
    ]);

    const html = buildBriefBody({
      packet,
      operatingBrief: emptyOperatingBrief(),
      meetings: [],
    });

    expect(html).toContain('href="https://app.fireflies.ai/view/abc"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("shows the Decision-open badge for a cross-project decision (no project, no id)", () => {
    // Regression: the group-key and decision-key fallbacks must agree, or a
    // decision with no project/id never matches its rendered group and loses
    // its badge.
    const packet = makePacket([
      makeItem({
        title: "Cross-project decision",
        project: "",
        projectInternalId: null,
      }),
    ]);

    const html = buildBriefBody({
      packet,
      operatingBrief: emptyOperatingBrief(),
      meetings: [],
    });

    expect(html).toContain("Decision open");
  });

  it("falls back to a clear state when there is nothing to show", () => {
    const html = buildBriefBody({
      packet: makePacket([]),
      operatingBrief: emptyOperatingBrief(),
      meetings: [],
    });
    expect(html).toContain("brief-empty");
  });
});

describe("buildEmptyBody", () => {
  it("escapes its title", () => {
    expect(buildEmptyBody("<b>x</b>")).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});

describe("itemKey", () => {
  const base = {
    title: "Force the solar decision",
    project: "Union Collective",
    projectInternalId: 141,
    sourceId: "m-1",
  };

  it("is stable for the same logical item", () => {
    expect(itemKey(base)).toBe(itemKey({ ...base }));
  });

  it("ignores case and surrounding whitespace in the title", () => {
    expect(itemKey(base)).toBe(
      itemKey({ ...base, title: "  FORCE THE SOLAR DECISION  " }),
    );
  });

  it("differs when the title differs", () => {
    expect(itemKey(base)).not.toBe(
      itemKey({ ...base, title: "A different decision" }),
    );
  });

  it("keys off the internal project id when present", () => {
    expect(itemKey(base)).not.toBe(itemKey({ ...base, projectInternalId: 999 }));
  });
});
