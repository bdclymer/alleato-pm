import { buildBriefBody, buildEmptyBody, cleanProse, itemKey } from "../build-brief";
import type {
  BrandonBriefItem,
  BrandonDailyUpdatePacket,
  ExecutiveOperatingBrief,
} from "@/lib/executive/brandon-daily-update";

describe("cleanProse", () => {
  it("strips raw source tokens (alias, channel-prefixed, ULID)", () => {
    expect(cleanProse("Approve the panel `S260` before Friday.")).toBe(
      "Approve the panel before Friday.",
    );
    expect(
      cleanProse("Blocked until executed (`outlook_AAMkAD/I0=Zj+Ez`)."),
    ).toBe("Blocked until executed.");
    expect(
      cleanProse("Confirm scope [`teamsdm_240a50c23fbd2bca_2026-07-08`]."),
    ).toBe("Confirm scope.");
  });

  it("removes bracket/paren residue left after token removal", () => {
    expect(cleanProse("The sequence (`S1`, `S2`).")).toBe("The sequence.");
    expect(cleanProse("Options `S1` and `S2` both apply.")).toBe(
      "Options and both apply.",
    );
  });

  it("strips the deep-read consumer's placeholder prose (even mid-sentence)", () => {
    expect(cleanProse("Derived from Daily Deep Read section: Decision Candidates")).toBe("");
    expect(
      cleanProse(
        "Uniqlo approval risk. Review candidate and decide whether to promote into project intelligence.",
      ),
    ).toBe("Uniqlo approval risk.");
    expect(cleanProse("Review and either assign as a task or reject.")).toBe("");
  });

  it("trims trailing separator punctuation from titles", () => {
    expect(cleanProse("Union Collective:")).toBe("Union Collective");
  });
});

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

  describe("citation date rendering (timezone offset regression)", () => {
    // Production (Vercel) runs in UTC. Packet citations store dates as human
    // strings like "Jul 8, 2026" with no time. The renderer must anchor those
    // to noon UTC before formatting in Eastern time — otherwise a genuine Jul 8
    // source renders as "Jul 7" (off by one day). Force UTC so the assertion
    // catches the bug on any developer machine, not just UTC-or-ahead ones.
    const originalTz = process.env.TZ;
    beforeAll(() => {
      process.env.TZ = "UTC";
    });
    afterAll(() => {
      process.env.TZ = originalTz;
    });

    it("renders a human-formatted citation date on its own calendar day", () => {
      const packet = makePacket([
        makeItem({
          title: "Superior Beverage permit",
          citations: [
            {
              source: "Email",
              sourceDetail: "RE: Superior beverage",
              date: "Jul 8, 2026",
            },
          ],
        }),
      ]);

      const html = buildBriefBody({
        packet,
        operatingBrief: emptyOperatingBrief(),
        meetings: [],
      });

      expect(html).toContain("RE: Superior beverage · Jul 8");
      expect(html).not.toContain("RE: Superior beverage · Jul 7");
    });
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
