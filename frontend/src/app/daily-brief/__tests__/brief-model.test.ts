import { describe, expect, it } from "@jest/globals";

import type {
  BrandonBriefItem,
  BrandonDailyUpdatePacket,
  ExecutiveOperatingBrief,
} from "@/lib/executive/brandon-daily-update";
import { cleanProse, itemKey, resolveSourceDocumentId } from "../brief-format";
import { buildBriefModel } from "../brief-model";

const UUID = "11111111-2222-3333-4444-555555555555";

function item(overrides: Partial<BrandonBriefItem> = {}): BrandonBriefItem {
  return {
    title: "Approve the paving change",
    summary: "GC needs a call on the ~$11k paving change.",
    bullets: [],
    source: "Meeting",
    sourceDetail: "Weekly OAC",
    date: "2026-07-08",
    citations: [
      { source: "Meeting", sourceDetail: "Weekly OAC", sourceId: UUID, date: "2026-07-08" },
    ],
    project: "Vermillion Rise",
    projectInternalId: 42,
    ...overrides,
  };
}

function emptyOperatingBrief(
  overrides: Partial<ExecutiveOperatingBrief> = {},
): ExecutiveOperatingBrief {
  return {
    startHere: ["Five jobs need a call from you today."],
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
    ...overrides,
  };
}

function packet(
  sections: Partial<BrandonDailyUpdatePacket["sections"]> = {},
): BrandonDailyUpdatePacket {
  return {
    generatedAt: "2026-07-09",
    windowDays: 3,
    retrievalOrder: [],
    sections: {
      needsBrandon: [],
      waitingOnOthers: [],
      importantUpdates: [],
      ...sections,
    },
    sourceCoverage: [
      { label: "Meeting", detail: "", count: 3, latest: "2026-07-08" },
      { label: "Email", detail: "", count: 2, latest: "2026-07-08" },
    ],
    retrievalNotes: [],
  };
}

describe("buildBriefModel", () => {
  it("maps decisions from needsBrandon and counts them in the masthead", () => {
    const model = buildBriefModel({
      packet: packet({ needsBrandon: [item(), item({ title: "Lock solar direction" })] }),
      operatingBrief: emptyOperatingBrief(),
    });
    expect(model.decisions).toHaveLength(2);
    expect(model.masthead.decisionsCount).toBe(2);
    // The hero headline is the edition date; the brief name lives in the eyebrow.
    expect(model.masthead.eyebrow).toContain("The Morning Brief");
    expect(model.masthead.dateLabel).toContain("2026");
    expect(model.read.thesis).toContain("Five jobs");
  });

  it("splits your vs team action items by owner", () => {
    const model = buildBriefModel({
      packet: packet({
        needsBrandon: [
          item({ title: "Decide battery storage", recommendedAction: "Call Andrew today." }),
        ],
        waitingOnOthers: [
          item({
            title: "Send the 70% set",
            owner: "Andrew Cannon",
            status: "Due Jul 14",
            project: "Union Collective",
            projectInternalId: 7,
          }),
        ],
      }),
      operatingBrief: emptyOperatingBrief(),
      preparedFor: "Brandon",
    });
    // The decision's recommended action becomes one of Brandon's actions.
    expect(model.yourActions.map((a) => a.title)).toContain("Call Andrew today.");
    // The waiting-on-others item becomes a team action, carrying owner + due.
    expect(model.teamActions).toHaveLength(1);
    expect(model.teamActions[0].owner).toBe("Andrew Cannon");
    expect(model.teamActions[0].due).toBe("Due Jul 14");
  });

  it("routes a decision-bearing project to project detail and an on-track one to also-moving", () => {
    const model = buildBriefModel({
      packet: packet({
        needsBrandon: [item({ project: "Vermillion Rise", projectInternalId: 42 })],
        importantUpdates: [
          item({
            title: "Fiber going in",
            summary: "Healthy project, crew mobilized.",
            tone: "neutral",
            status: "Update",
            project: "Exol Morrisville",
            projectInternalId: 99,
          }),
        ],
      }),
      operatingBrief: emptyOperatingBrief(),
    });
    expect(model.projects.map((p) => p.label)).toContain("Vermillion Rise");
    expect(model.projects[0].statusLabel).toBe("Needs your decision");
    expect(model.alsoMoving.map((p) => p.label)).toContain("Exol Morrisville");
  });

  it("passes resolved keys through for client-side hiding", () => {
    const decision = item();
    const key = itemKey(decision);
    const model = buildBriefModel({
      packet: packet({ needsBrandon: [decision] }),
      operatingBrief: emptyOperatingBrief(),
      resolvedKeys: new Set([key]),
      resolvedSeed: [{ key, title: decision.title, project: decision.project, summary: "" }],
    });
    expect(model.resolvedKeys).toContain(key);
    expect(model.resolvedSeed).toHaveLength(1);
  });

  it("marks carried items", () => {
    const decision = item();
    const key = itemKey(decision);
    const model = buildBriefModel({
      packet: packet({ needsBrandon: [decision] }),
      operatingBrief: emptyOperatingBrief(),
      carriedKeys: new Set([key]),
    });
    expect(model.decisions[0].carried).toBe(true);
  });
});

describe("brief-format", () => {
  it("itemKey is stable and identity-based, not position-based", () => {
    const a = item();
    const b = item();
    expect(itemKey(a)).toBe(itemKey(b));
    expect(itemKey(item({ title: "different" }))).not.toBe(itemKey(a));
  });

  it("resolveSourceDocumentId returns a document uuid, not a channel id", () => {
    expect(resolveSourceDocumentId(item())).toBe(UUID);
    expect(
      resolveSourceDocumentId(
        item({ sourceId: "outlook_abc123", citations: [], sourceRefs: [] }),
      ),
    ).toBeNull();
  });

  it("cleanProse strips inline source tokens and pipeline placeholders", () => {
    expect(cleanProse("Approve the change `S12`.")).toBe("Approve the change.");
    expect(cleanProse("Derived from Daily Deep Read section: foo. Real text.")).toBe(
      "Real text.",
    );
  });
});
