import {
  applyProjectNumbers,
  buildExecutiveOperatingBrief,
  type BrandonBriefItem,
  bucketInsightCardBriefSections,
  executiveBriefSourceDescriptors,
  executiveBriefSourceSelectionSummary,
  getHitDateAnchor,
  getRecencyAnchor,
  ensureExecutiveBriefSourceBreadth,
  hydrateExecutiveOperatingBrief,
  loadLiveBrandonSourceCoverage,
  shouldSuppressDailyBriefAccountingItem,
  shouldSuppressDailyBriefGenericItem,
  shouldSuppressDailyBriefSolicitationItem,
} from "../brandon-daily-update";
import type {
  OwnerBriefingCardItem,
  OwnerBriefingProject,
} from "../owner-briefing-builder";

const mockCreateServiceClient = jest.fn();

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => mockCreateServiceClient(),
}));

jest.mock("@/lib/ai/providers", () => ({
  getLanguageModel: jest.fn(),
}));

jest.mock("@/lib/ai/tools/tool-utils", () => ({
  EMBEDDING: "mock-embedding",
  generateEmbedding: jest.fn(),
  getOpenAI: jest.fn(),
}));

function traceBriefItem(
  overrides: Partial<BrandonBriefItem> = {},
): BrandonBriefItem {
  return {
    title: "Permit setback decision",
    summary: "The project needs a permit setback decision.",
    bullets: ["Duke needs to confirm the setback."],
    source: "Meeting",
    sourceDetail: "Owner coordination meeting",
    sourceId: "source-1",
    evidence:
      "Long source evidence that should not be copied into source-selection trace summaries.",
    date: "2026-06-24",
    citations: [
      {
        source: "Meeting",
        sourceDetail: "Owner coordination meeting",
        sourceId: "source-1",
        evidence:
          "Long citation evidence that should not be copied into source-selection trace summaries.",
        date: "2026-06-24",
      },
    ],
    project: "25-126 Vermillion Rise Warehouse",
    retrieval: "RAG: search_document_chunks(meeting_transcript), sim 0.612",
    ...overrides,
  };
}

describe("executive brief source-selection trace summaries", () => {
  it("summarizes selected sources without copying source evidence", () => {
    const summary = executiveBriefSourceSelectionSummary(
      {
        needsBrandon: [traceBriefItem()],
        waitingOnOthers: [],
        importantUpdates: [
          traceBriefItem({
            title: "Pricing quote is waiting on vendor",
            source: "Email",
            sourceDetail: "Vendor quote email",
            sourceId: "source-2",
            retrieval: "Recent communication signal: pricing_wait",
          }),
        ],
      },
      ["Suppressed one unsupported item."],
    );

    expect(summary.sectionCounts).toEqual({
      needsBrandon: 1,
      waitingOnOthers: 0,
      importantUpdates: 1,
      total: 2,
    });
    expect(summary.warningCount).toBe(1);
    expect(summary.selectedSources).toEqual([
      expect.objectContaining({
        section: "needsBrandon",
        title: "Permit setback decision",
        source: "Meeting",
        sourceId: "source-1",
        citationCount: 1,
      }),
      expect.objectContaining({
        section: "importantUpdates",
        title: "Pricing quote is waiting on vendor",
        source: "Email",
        sourceId: "source-2",
      }),
    ]);
    expect(JSON.stringify(summary)).not.toContain("Long source evidence");
    expect(JSON.stringify(summary)).not.toContain("Long citation evidence");
  });

  it("caps selected source descriptors to keep Langfuse payloads readable", () => {
    const descriptors = executiveBriefSourceDescriptors(
      {
        needsBrandon: Array.from({ length: 25 }, (_, index) =>
          traceBriefItem({ title: `Item ${index}` }),
        ),
        waitingOnOthers: [],
        importantUpdates: [],
      },
      3,
    );

    expect(descriptors).toHaveLength(3);
  });
});

describe("teams recency anchoring", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("uses the source date for teams rows even when ingestion happened later", () => {
    const anchor = getRecencyAnchor({
      category: "teams_message",
      created_at: "2026-05-08T12:00:00.000Z",
      date: "2026-03-23T00:00:00.000Z",
      captured_at: "2026-05-07T23:50:00.000Z",
    });

    expect(anchor).toBe("2026-03-23T00:00:00.000Z");
  });

  it("falls back to captured_at and created_at only when the source date is missing", () => {
    const anchor = getRecencyAnchor({
      category: "teams_message",
      captured_at: "2026-05-08T11:00:00.000Z",
      created_at: "2026-05-08T12:00:00.000Z",
    });

    expect(anchor).toBe("2026-05-08T11:00:00.000Z");
  });

  it("uses doc_date before doc_created_at for ranked Teams hits", () => {
    const anchor = getHitDateAnchor({
      id: "hit-1",
      spec: {
        section: "needsBrandon",
        title: "Finance thread",
        query: "teams finance",
      },
      sourceGroup: {
        label: "Teams",
        sourceTypes: ["teams_dm", "teams_channel"],
        detail: "Team channels + DMs",
      },
      row: {
        doc_category: "teams_message",
        doc_date: "2026-03-23T00:00:00.000Z",
        doc_created_at: "2026-05-08T09:00:00.000Z",
      },
    } as const);

    expect(anchor).toBe("2026-03-23T00:00:00.000Z");
  });

  it("uses the freshest timestamp for document rows so newly ingested files are not marked stale", () => {
    const anchor = getRecencyAnchor({
      category: "document",
      type: "document",
      date: "2025-05-16T00:00:00.000Z",
      created_at: "2026-06-17T08:54:09.313Z",
      captured_at: null,
    });

    expect(anchor).toBe("2026-06-17T08:54:09.313Z");
  });

  it("uses the freshest timestamp for ranked document hits", () => {
    const anchor = getHitDateAnchor({
      id: "hit-1",
      spec: {
        section: "importantUpdates",
        title: "New document",
        query: "document update",
      },
      sourceGroup: {
        label: "Document",
        sourceTypes: ["onedrive_document"],
        detail: "Documents",
      },
      metadata: {
        category: "document",
        captured_at: null,
      },
      row: {
        doc_category: "document",
        doc_date: "2025-05-16T00:00:00.000Z",
        doc_created_at: "2026-06-17T08:54:09.313Z",
      },
    } as const);

    expect(anchor).toBe("2026-06-17T08:54:09.313Z");
  });

  it("does not count stale Teams source coverage just because it was ingested recently", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-08T16:00:00.000Z"));
    const coverageFilters: string[] = [];

    mockCreateServiceClient.mockReturnValue({
      from: jest.fn(() => {
        let category: string | null = null;
        let type: string | null = null;
        const query = {
          select: jest.fn(() => query),
          or: jest.fn((filter: string) => {
            coverageFilters.push(filter);
            return query;
          }),
          eq: jest.fn((column: string, value: string) => {
            if (column === "category") category = value;
            if (column === "type") type = value;
            return query;
          }),
          limit: jest.fn(() => {
            if (category === "teams_message") {
              return Promise.resolve({
                data: [
                  {
                    category: "teams_message",
                    type: "teams_dm_conversation",
                    date: "2026-03-23T00:00:00.000Z",
                    created_at: "2026-05-06T21:21:31.964Z",
                    captured_at: null,
                  },
                ],
                error: null,
              });
            }

            return Promise.resolve({
              data: [],
              error: null,
            });
          }),
        };
        return query;
      }),
    });

    const coverage = await loadLiveBrandonSourceCoverage(3);
    const teams = coverage.find((source) => source.label === "Teams");

    expect(teams).toMatchObject({
      count: 0,
      status: "empty",
    });
    expect(coverageFilters).toContain(
      "date.gte.2026-05-06T00:00:00.000Z,created_at.gte.2026-05-06T00:00:00.000Z,captured_at.gte.2026-05-06T00:00:00.000Z",
    );
  });
});

function briefItem(
  title: string,
  overrides: Partial<BrandonBriefItem> = {},
): BrandonBriefItem {
  return {
    title,
    summary: `${title} summary`,
    evidenceFacts: [],
    bullets: [],
    recommendedAction: `Confirm next move for ${title}`,
    whyItMatters: `${title} affects execution.`,
    source: "Email",
    sourceDetail: `${title} source`,
    sourceId: `${title}-source`,
    evidence: `${title} evidence`,
    date: "May 11, 2026",
    citations: [
      {
        source: "Email",
        sourceDetail: `${title} source`,
        sourceId: `${title}-source`,
        evidence: `${title} evidence`,
        date: "May 11, 2026",
      },
    ],
    project: "100 Test Project",
    owner: "PM",
    status: "Open",
    tone: "watch",
    ...overrides,
  };
}

describe("executive operating brief priority lanes", () => {
  it("suppresses Acumatica money-due items from the Daily Brief", () => {
    const suppressed = shouldSuppressDailyBriefAccountingItem(
      briefItem("Overdue AR collections", {
        summary: "$490K AR with $413K overdue and 74 days past due.",
        sourceDetail: "Acumatica ERP - AR Aging Report",
        retrieval: "Financial pulse: acumatica_ar_invoices",
      }),
    );

    const allowed = shouldSuppressDailyBriefAccountingItem(
      briefItem("Permit deadline follow-up", {
        summary: "Permit package is still waiting on city review comments.",
        sourceDetail: "Weekly design coordination Exol PA",
        retrieval: "semantic search",
      }),
    );

    expect(suppressed).toBe(true);
    expect(allowed).toBe(false);
  });

  it("suppresses cold opportunity solicitations from the Daily Brief", () => {
    const suppressed = shouldSuppressDailyBriefSolicitationItem(
      briefItem("Childcare portfolio follow-up", {
        summary:
          "Rory Underwood sent Brandon information on a childcare portfolio and said the next project is in New Palestine.",
        recommendedAction:
          "Brandon should tell Rory whether Alleato wants a follow-up call and who should review the materials.",
        whyItMatters:
          "If Brandon wants the New Palestine opportunity, he needs to decide whether to review it before the equity slot is filled.",
        evidence:
          "You don't often get email from rory@ru2.com. Brandon thanks for your call and interest in the Childcare portfolio we are building. I will bury you with some information to start. Attached is the S/U and box link below for our next project out of the ground in New Palestine. We have not yet committed to an equity investor on the project which we want to close around the first of August so wanted to provide that to you as an immediate opportunity. RU2 Marketing provide some background on us.",
      }),
    );

    const allowed = shouldSuppressDailyBriefSolicitationItem(
      briefItem("Permit response needed", {
        summary:
          "The project manager needs Brandon to approve the client response on a permit blocker.",
        recommendedAction:
          "Brandon should approve the client response before the permit deadline.",
        evidence:
          "The permit response is tied to an active Alleato project obligation and owner approval.",
      }),
    );

    expect(suppressed).toBe(true);
    expect(allowed).toBe(false);
  });

  it("suppresses generic insight-card headings from the Daily Brief", () => {
    expect(
      shouldSuppressDailyBriefGenericItem(
        briefItem("Risks and exposure", {
          summary:
            "Track every remaining submittal, warranty letter, and closeout package to completion.",
        }),
      ),
    ).toBe(true);

    expect(
      shouldSuppressDailyBriefGenericItem(
        briefItem("Goodwill closeout documents are still missing", {
          summary:
            "The turnover checklist is missing warranty letters and final submittals.",
        }),
      ),
    ).toBe(false);
  });

  it("keeps more than three owner decisions instead of suppressing them", () => {
    const brief = buildExecutiveOperatingBrief({
      needsBrandon: Array.from({ length: 4 }, (_, index) =>
        briefItem(`Owner decision ${index + 1}`, {
          summary: `$${(index + 1) * 10000} approval decision is due today.`,
          recommendedAction: `Approve or reject owner decision ${index + 1} today.`,
          tone: "risk",
        }),
      ),
      waitingOnOthers: [],
      importantUpdates: [],
    });

    expect(brief.waitingOn.othersWaitingOnBrandon).toHaveLength(4);
    expect(brief.recommendedMoves).toHaveLength(4);
  });

  it("keeps more than five risks on the project risk radar", () => {
    const brief = buildExecutiveOperatingBrief({
      needsBrandon: [],
      waitingOnOthers: [],
      importantUpdates: Array.from({ length: 6 }, (_, index) =>
        briefItem(`Schedule risk ${index + 1}`, {
          summary: `Schedule delay risk ${index + 1} is blocked by material shortage.`,
          recommendedAction: `Escalate recovery plan ${index + 1}.`,
          tone: "risk",
        }),
      ),
    });

    expect(brief.projectRiskRadar).toHaveLength(6);
  });

  it("flows material overflow into additional material items", () => {
    const brief = buildExecutiveOperatingBrief({
      needsBrandon: [
        briefItem("Critical cash approval", {
          summary: "$250,000 invoice approval is due today.",
          recommendedAction: "Approve the invoice path today.",
          tone: "risk",
        }),
        briefItem("Schedule recovery decision", {
          summary: "Schedule recovery is blocked and needs a decision today.",
          recommendedAction: "Decide the recovery path today.",
          tone: "risk",
        }),
        briefItem("Customer escalation", {
          summary: "Owner relationship risk needs executive escalation today.",
          recommendedAction: "Call the customer today.",
          tone: "risk",
        }),
      ],
      waitingOnOthers: [],
      importantUpdates: [
        briefItem("Customer approval schedule risk", {
          summary: "Schedule delay is tied to client input.",
          recommendedAction: "Assign PM to secure the client input.",
          tone: "watch",
        }),
      ],
    });

    expect(brief.topExecutiveFocus.map((entry) => entry.item.title)).toContain(
      "Critical cash approval",
    );
    expect(
      brief.additionalMaterialItems.scheduleField.map(
        (entry) => entry.item.title,
      ),
    ).toContain("Customer approval schedule risk");
  });

  it("ranks top executive focus by materiality", () => {
    const low = briefItem("Routine project update", {
      summary: "Routine update was completed.",
      recommendedAction: "No executive action unless it stalls.",
      tone: "neutral",
    });
    const high = briefItem("Cash collection blocker", {
      summary:
        "$500,000 payment is blocked, schedule recovery depends on approval today.",
      recommendedAction: "Call the owner and approve the recovery path today.",
      tone: "risk",
    });

    const brief = buildExecutiveOperatingBrief({
      needsBrandon: [low, high],
      waitingOnOthers: [],
      importantUpdates: [],
    });

    expect(brief.topExecutiveFocus[0]?.item.title).toBe(
      "Cash collection blocker",
    );
  });

  it("always generates recommended moves for surfaced items", () => {
    const brief = buildExecutiveOperatingBrief({
      needsBrandon: [
        briefItem("Decision without explicit action", {
          recommendedAction: undefined,
        }),
      ],
      waitingOnOthers: [],
      importantUpdates: [],
    });

    expect(brief.recommendedMoves.length).toBeGreaterThan(0);
    expect(brief.recommendedMoves[0]).toMatch(/Confirm the owner/);
  });

  // Regression: the internal scoring dimensions ("Financial impact, Schedule
  // impact, …") are bookkeeping, not prose. They must never reach the rendered
  // whyItMatters or START HERE lines, where they read as garbled filler.
  it("never leaks raw materiality scoring labels into the brief text", () => {
    const item = briefItem("Permit blocker", {
      // No whyItMatters → previously fell back to the materiality label join.
      whyItMatters: null,
      summary: "City review comments are still outstanding.",
    });

    const brief = buildExecutiveOperatingBrief({
      needsBrandon: [item],
      waitingOnOthers: [],
      importantUpdates: [],
    });

    const LEAK =
      /Financial impact|Schedule impact|Customer relationship impact|Brandon uniquely needed|Blocking other people|Material business signal/;
    expect(brief.topExecutiveFocus[0]?.whyItMatters).not.toMatch(LEAK);
    for (const line of brief.startHere) {
      expect(line).not.toMatch(LEAK);
    }
  });

  it("builds chief-of-staff sections from cross-meeting signals", () => {
    const sections = {
      needsBrandon: [
        briefItem("VP onboarding decisions are still open", {
          summary:
            "The team needs reporting structure, office assignment, equipment, and org chart placement before onboarding.",
          recommendedAction:
            "Finalize the VP reporting structure and office plan before July 8.",
          whyItMatters:
            "Unclear onboarding decisions are already creating internal speculation before the new VP starts.",
          tone: "watch",
          project: "Company operations",
        }),
      ],
      waitingOnOthers: [
        briefItem("Utility confirmation is still pending", {
          summary:
            "Telephone utility removal depends on owner IT confirmation before field work proceeds.",
          recommendedAction:
            "Get written owner IT confirmation on the abandoned telephone utilities.",
          whyItMatters:
            "If the utility status is wrong, the field team can run into a preventable removal issue.",
          tone: "risk",
          project: "Ace Hardware Champaign",
        }),
        briefItem("Sprinkler material delivery is not confirmed", {
          summary:
            "The rack installation sequence depends on subcontractor material delivery and permit approval.",
          recommendedAction:
            "Confirm permit timing and sprinkler material delivery before the next coordination call.",
          whyItMatters:
            "External partner timing can slip the rack install even if Alleato is ready.",
          tone: "risk",
          project: "Superior Beverage",
        }),
      ],
      importantUpdates: [
        briefItem("Building Connected workflow is becoming standard", {
          summary:
            "Estimating is standardizing bid package creation, proposal storage, and bidder follow-up.",
          recommendedAction:
            "Document the Building Connected workflow so another estimator can run it without tribal knowledge.",
          whyItMatters:
            "A repeatable estimating workflow reduces missed scope before construction begins.",
          tone: "good",
          project: "Union Collective",
        }),
        briefItem("Accounting WIP workflow is being standardized", {
          summary:
            "Accounting is standardizing WIP reviews, reconciliation, payroll import, and reporting cadence.",
          recommendedAction:
            "Turn the WIP workflow into a monthly close checklist.",
          whyItMatters:
            "Repeatable financial reporting reduces the amount Brandon has to personally interpret each month.",
          tone: "good",
          project: "Company finance",
        }),
      ],
    };
    const brief = buildExecutiveOperatingBrief(sections);

    expect(brief.businessHealth?.map((item) => item.area)).toEqual([
      "Projects",
      "Finance",
      "Operations",
      "People",
      "Technology",
    ]);
    expect(brief.emergingPatterns?.map((pattern) => pattern.title)).toEqual(
      expect.arrayContaining([
        "External dependency management is the main execution risk",
        "Alleato is standardizing its operating system",
      ]),
    );
    expect(brief.strategicRisks?.[0]).toEqual(
      expect.objectContaining({
        likelihood: expect.stringMatching(/low|medium|high/),
        nextAction: expect.any(String),
      }),
    );
    expect(brief.opportunities).toEqual(
      expect.arrayContaining([
        expect.stringContaining("written operating standard"),
      ]),
    );
    expect(brief.leadershipWatchlist?.length).toBeGreaterThan(0);
    expect(brief.chiefOfStaffInsights?.join(" ")).toMatch(
      /pattern-level|system design|external dependency/i,
    );
  });

  it("hydrates stale stored operating briefs with missing chief-of-staff fields", () => {
    const sections = {
      needsBrandon: [
        briefItem("VP onboarding decisions are still open", {
          summary:
            "The team needs reporting structure, office assignment, equipment, and org chart placement before onboarding.",
          recommendedAction:
            "Finalize the VP reporting structure and office plan before July 8.",
          project: "Company operations",
        }),
      ],
      waitingOnOthers: [
        briefItem("Utility confirmation is still pending", {
          summary:
            "Telephone utility removal depends on owner IT confirmation before field work proceeds.",
          recommendedAction:
            "Get written owner IT confirmation on the abandoned telephone utilities.",
          tone: "risk",
          project: "Ace Hardware Champaign",
        }),
        briefItem("Sprinkler material delivery is not confirmed", {
          summary:
            "The rack installation sequence depends on subcontractor material delivery and permit approval.",
          recommendedAction:
            "Confirm permit timing and sprinkler material delivery before the next coordination call.",
          tone: "risk",
          project: "Superior Beverage",
        }),
      ],
      importantUpdates: [
        briefItem("Accounting WIP workflow is being standardized", {
          summary:
            "Accounting is standardizing WIP reviews, reconciliation, payroll import, and reporting cadence.",
          recommendedAction:
            "Turn the WIP workflow into a monthly close checklist.",
          tone: "good",
          project: "Company finance",
        }),
      ],
    };
    const fullBrief = buildExecutiveOperatingBrief(sections);
    const {
      businessHealth: _businessHealth,
      emergingPatterns: _emergingPatterns,
      strategicRisks: _strategicRisks,
      opportunities: _opportunities,
      leadershipWatchlist: _leadershipWatchlist,
      chiefOfStaffInsights: _chiefOfStaffInsights,
      ...staleStoredBrief
    } = fullBrief;

    const hydrated = hydrateExecutiveOperatingBrief({
      sections,
      operatingBrief: staleStoredBrief,
    });

    expect(hydrated.startHere).toEqual(staleStoredBrief.startHere);
    expect(hydrated.businessHealth?.length).toBeGreaterThan(0);
    expect(hydrated.emergingPatterns?.length).toBeGreaterThan(0);
    expect(hydrated.strategicRisks?.length).toBeGreaterThan(0);
    expect(hydrated.chiefOfStaffInsights?.join(" ")).toMatch(
      /pattern-level|external dependency/i,
    );
  });

  it("keeps an emerging pattern for mixed project and finance signals", () => {
    const brief = buildExecutiveOperatingBrief({
      needsBrandon: [],
      waitingOnOthers: [
        briefItem("Goodwill added work still needs approval clarity", {
          summary:
            "Door swaps, asphalt work, drywall repairs, and an electrical panel move need contract scope and approval clarity.",
          recommendedAction:
            "Send Goodwill one list that marks each item as approved, pending, or covered by contract.",
          whyItMatters:
            "Without owner approval clarity, the project team cannot create the right change event or close the scope risk.",
          project: "26-105 Goodwill Pioneer PKWY",
          tone: "risk",
        }),
      ],
      importantUpdates: [
        briefItem("$422K in pending COs on hold", {
          summary:
            "Nine projects have on-hold change orders totaling $422K in pending revenue.",
          recommendedAction:
            "Review the on-hold change orders and assign a next step for each one.",
          whyItMatters:
            "The pending revenue remains exposed until accounting and project managers close the approval loop.",
          project: "Multiple (9 projects)",
          tone: "watch",
        }),
      ],
    });

    expect(brief.emergingPatterns?.[0]).toEqual(
      expect.objectContaining({
        title:
          "Approval and revenue follow-through are the current operating constraint",
        evidence: expect.arrayContaining([
          expect.stringContaining("Goodwill added work"),
          expect.stringContaining("$422K in pending COs"),
        ]),
      }),
    );
  });

  it("supplements low-count synthesis output from source-backed candidates", () => {
    const synthesized = {
      needsBrandon: [],
      waitingOnOthers: [
        briefItem("Goodwill added work still needs approval clarity", {
          project: "26-105 Goodwill Pioneer PKWY",
        }),
      ],
      importantUpdates: [
        briefItem("$422K in pending COs on hold", {
          project: "Multiple (9 projects)",
        }),
      ],
    };
    const sourceCandidates = {
      needsBrandon: [
        briefItem("Union Collective owner decision is due", {
          project: "26-119 Union Collective",
          tone: "risk",
        }),
      ],
      waitingOnOthers: [
        briefItem("Exol Morrisville permit response is waiting", {
          project: "26-116 Exol Morrisville",
        }),
        ...synthesized.waitingOnOthers,
      ],
      importantUpdates: [
        briefItem("Goodwill Washington closeout is progressing", {
          project: "26-106 Goodwill Washington",
        }),
        briefItem("Alleato finance WIP review needs a checklist", {
          project: "Alleato Finance",
        }),
        ...synthesized.importantUpdates,
      ],
    };

    const broadened = ensureExecutiveBriefSourceBreadth(
      synthesized,
      sourceCandidates,
      { minItems: 5, minProjectLabels: 4 },
    );

    expect(
      new Set(
        [
          ...broadened.needsBrandon,
          ...broadened.waitingOnOthers,
          ...broadened.importantUpdates,
        ].map((item) => item.project),
      ).size,
    ).toBeGreaterThanOrEqual(4);
    expect(
      [
        ...broadened.needsBrandon,
        ...broadened.waitingOnOthers,
        ...broadened.importantUpdates,
      ],
    ).toHaveLength(5);
  });

  it("keeps finance aggregates out of non-finance derived sections", () => {
    const brief = buildExecutiveOperatingBrief({
      needsBrandon: [],
      waitingOnOthers: [
        briefItem("Goodwill added work still needs approval clarity", {
          summary:
            "Owner approval is still needed before the team can close the change-event scope.",
          project: "26-105 Goodwill Pioneer PKWY",
          tone: "risk",
        }),
      ],
      importantUpdates: [
        briefItem("$422K in pending COs on hold", {
          summary:
            "Nine projects have on-hold change orders totaling $422K in pending revenue.",
          sourceDetail: "Acumatica ERP - Change Order Report",
          project: "Multiple (9 projects)",
          tone: "watch",
        }),
      ],
    });

    expect(
      brief.projectRiskRadar.map((entry) => entry.item.title),
    ).not.toContain("$422K in pending COs on hold");
    expect(
      brief.peopleAndAccountability.map((entry) => entry.item.title),
    ).not.toContain("$422K in pending COs on hold");
    expect(brief.cashAndMarginWatch.map((entry) => entry.item.title)).toContain(
      "$422K in pending COs on hold",
    );
  });
});

describe("applyProjectNumbers", () => {
  function packetSection(item: BrandonBriefItem) {
    return {
      needsBrandon: [item],
      waitingOnOthers: [],
      importantUpdates: [],
    };
  }

  // Regression: projectDisplayName emits a dashed number ("25-126 Vermillion
  // Rise Warehouse"). The old /^\d+\s*/ strip kept "-126", producing the garbled
  // "25-126 -126 Vermillion Rise Warehouse". The token strip must remove the
  // whole dashed number before re-prefixing.
  it("does not double-prefix a name that already carries a dashed project number", () => {
    const sections = applyProjectNumbers(
      packetSection(
        briefItem("CO template issue", {
          project: "25-126 Vermillion Rise Warehouse",
          projectInternalId: 67,
        }),
      ),
      new Map([[67, "25-126"]]),
    );

    expect(sections.needsBrandon[0]?.project).toBe(
      "25-126 Vermillion Rise Warehouse",
    );
  });

  it("strips a bare legacy numeric prefix before applying the project number", () => {
    const sections = applyProjectNumbers(
      packetSection(
        briefItem("Legacy", {
          project: "67 Vermillion Rise Warehouse",
          projectInternalId: 67,
        }),
      ),
      new Map([[67, "25-126"]]),
    );

    expect(sections.needsBrandon[0]?.project).toBe(
      "25-126 Vermillion Rise Warehouse",
    );
  });

  it("prefixes a name that has no number yet", () => {
    const sections = applyProjectNumbers(
      packetSection(
        briefItem("Clean name", {
          project: "Vermillion Rise Warehouse",
          projectInternalId: 67,
        }),
      ),
      new Map([[67, "25-126"]]),
    );

    expect(sections.needsBrandon[0]?.project).toBe(
      "25-126 Vermillion Rise Warehouse",
    );
  });

  it("falls back to the number alone when the value is just the number", () => {
    const sections = applyProjectNumbers(
      packetSection(
        briefItem("Number only", {
          project: "25-126",
          projectInternalId: 67,
        }),
      ),
      new Map([[67, "25-126"]]),
    );

    expect(sections.needsBrandon[0]?.project).toBe("25-126");
  });
});

describe("bucketInsightCardBriefSections (Phase 3 insight-cards source)", () => {
  function makeCard(
    cardId: string,
    cardType: OwnerBriefingCardItem["cardType"],
    title: string,
    extra: Partial<OwnerBriefingCardItem> = {},
  ): OwnerBriefingCardItem {
    return {
      cardId,
      cardType,
      title,
      summary: null,
      whyItMatters: null,
      nextAction: null,
      confidence: "high",
      firstSeenAt: null,
      lastSeenAt: "2026-06-09T00:00:00.000Z",
      ageHours: 1,
      isNewSinceYesterday: true,
      suggestedOwnerLabel: null,
      sourceCount: 1,
      ...extra,
    };
  }

  function makeProject(
    over: Partial<OwnerBriefingProject>,
  ): OwnerBriefingProject {
    return {
      targetId: "target-1",
      projectId: 42,
      projectName: "Union Collective",
      packetId: null,
      packetGeneratedAt: null,
      packetIsStale: false,
      packetAgeHours: 1,
      urgencyScore: 10,
      decisionsNeeded: [],
      actionsRequired: [],
      ...over,
    };
  }

  it("routes decisions/risks to needsBrandon and owned actions to waitingOnOthers", () => {
    const project = makeProject({
      decisionsNeeded: [
        makeCard("c1", "risk", "Permit slips 4-6 weeks", {
          whyItMatters: "Fire marshal rejected the design twice",
          summary: "June permit target at risk",
        }),
        makeCard("c2", "decision", "Approve revised parking layout"),
      ],
      actionsRequired: [
        makeCard("c3", "task", "Send CAD files", {
          nextAction: "Send CAD files",
          suggestedOwnerLabel: "Andrew",
        }),
        makeCard("c4", "open_question", "Confirm second-floor scope", {
          nextAction: "Confirm scope",
        }),
      ],
    });

    const sections = bucketInsightCardBriefSections([project]);

    // Decisions + unowned action go to needsBrandon; owned action waits on others.
    expect(sections.needsBrandon.map((i) => i.sourceId)).toEqual([
      "c1",
      "c2",
      "c4",
    ]);
    expect(sections.waitingOnOthers.map((i) => i.sourceId)).toEqual(["c3"]);
    expect(sections.importantUpdates).toHaveLength(0);

    // Card content is preserved verbatim — no LLM re-summarization.
    const risk = sections.needsBrandon.find((i) => i.sourceId === "c1");
    expect(risk?.title).toBe("Permit slips 4-6 weeks");
    expect(risk?.whyItMatters).toBe("Fire marshal rejected the design twice");
    expect(risk?.tone).toBe("risk");
    expect(risk?.project).toBe("Union Collective");
    expect(risk?.projectInternalId).toBe(42);
    expect(risk?.citations).toHaveLength(1);
    expect(risk?.owner).toBeUndefined();

    expect(sections.waitingOnOthers[0]?.owner).toBe("Andrew");
    expect(sections.waitingOnOthers[0]?.recommendedAction).toBe(
      "Send CAD files",
    );
  });

  it("returns empty sections when there are no projects", () => {
    const sections = bucketInsightCardBriefSections([]);
    expect(sections.needsBrandon).toHaveLength(0);
    expect(sections.waitingOnOthers).toHaveLength(0);
    expect(sections.importantUpdates).toHaveLength(0);
  });

  it("annotates recurring cards (source_count > 1) with a cross-time recurrence fact", () => {
    const project = makeProject({
      decisionsNeeded: [
        makeCard(
          "recurring",
          "schedule_risk",
          "Hy-Tek submittal still outstanding",
          {
            sourceCount: 3,
            firstSeenAt: "2026-06-02T00:00:00.000Z",
          },
        ),
        makeCard("one-off", "risk", "New scope question", { sourceCount: 1 }),
      ],
    });

    const sections = bucketInsightCardBriefSections([project]);
    const recurring = sections.needsBrandon.find(
      (i) => i.sourceId === "recurring",
    );
    const oneOff = sections.needsBrandon.find((i) => i.sourceId === "one-off");

    expect(recurring?.evidenceFacts?.[0]).toMatch(
      /Recurring: surfaced in 3 updates since/,
    );
    // A single-source card carries no recurrence note.
    expect(oneOff?.evidenceFacts).toBeUndefined();
  });
});
