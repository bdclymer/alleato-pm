// Node built-in test runner: `node --test scripts/intelligence/__tests__/`
// Covers the v3 brief renderer/validator and the learning-loop consumer's
// structured extractors — no DB, pure functions only.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderBriefMarkdownV3, validateBriefV3, nextMovesFromBriefV3 } from "../lib/brief-v3.mjs";
import {
  candidatesFromPacket,
  projectCurrentStateFromPacket,
} from "../daily-deep-read-consumers.mjs";

function sampleBrief() {
  return {
    version: "v3",
    businessDate: "2026-07-08",
    callsToday: [
      { project: "Union Collective", question: "decide on battery storage.", optional: false, sourceIds: ["S247"] },
      { project: "Goodwill Brookville", question: "escalate the signature?", optional: true, sourceIds: ["S126"] },
    ],
    projects: [
      {
        name: "Union Collective",
        urgencyRank: 1,
        hasOwnerDecision: true,
        resolvedToday: false,
        actionItems: [
          { ownerIsBrandon: true, owner: "You", text: "decide on battery storage", due: null, dueIso: null, urgency: null, optional: false, sourceIds: ["S247"] },
          { ownerIsBrandon: false, owner: "Andrew Cannon", text: "email Viox", due: "July 14", dueIso: "2026-07-14", urgency: null, optional: false, sourceIds: ["S247"] },
        ],
        context: "Union is losing money this week. [S247]",
      },
      {
        name: "Goodwill Brookville",
        urgencyRank: 2,
        hasOwnerDecision: true,
        resolvedToday: false,
        actionItems: [
          { ownerIsBrandon: false, owner: "Tony Courtney", text: "get the signed subcontract", due: null, dueIso: null, urgency: "Blocking; ASAP", optional: false, sourceIds: ["S126"] },
        ],
        context: "Blocked on a signature. [S126]",
      },
      {
        name: "McLane Jazz, Utah",
        urgencyRank: 9,
        hasOwnerDecision: false,
        resolvedToday: true,
        actionItems: [],
        context: "Resolved today. [S259]",
      },
    ],
    looseEnds: [{ text: "Confirm the $160,000 wire cleared.", sourceIds: [] }],
    sourceCoverage: { meetings: 1, emails: 2, teams: 1, documents: 0, thinLanes: [], note: "S260 and S307 are the same email." },
    sources: {
      S247: { title: "Teams", type: "teams", url: null, project: "Union Collective" },
      S126: { title: "Koontz email", type: "email", url: "https://x/126", project: "Goodwill Brookville Road" },
      S259: { title: "McLane email", type: "email", url: "https://x/259", project: "McLane Jazz - UT" },
    },
  };
}

function samplePacket() {
  return {
    id: "pkt-1",
    generated_at: "2026-07-08T20:00:00Z",
    covered_end_at: "2026-07-09T04:00:00Z",
    covered_start_at: { toISOString: () => "2026-07-08T04:00:00.000Z" },
    packet_json: {
      businessDate: "2026-07-08",
      sourceSet: { sources: [
        { id: "teamsdm_abc", alias: "S247", projectId: 1 },
        { id: "outlook_x", alias: "S126", projectId: 2 },
      ] },
      brief: sampleBrief(),
    },
  };
}

const PROJECT_ROWS = [
  { id: 1, name: "Union Collective", projectNumber: null, normalizedName: "union collective", tokens: ["union", "collective"], distinctiveTokens: ["collective"] },
  { id: 2, name: "Goodwill Brookville", projectNumber: null, normalizedName: "goodwill brookville", tokens: ["goodwill", "brookville"], distinctiveTokens: ["brookville"] },
];

describe("renderBriefMarkdownV3", () => {
  const md = renderBriefMarkdownV3(sampleBrief());

  it("opens at the title with no format-explainer line, straight into the calls index", () => {
    assert.ok(md.startsWith("# Daily Executive Brief — 2026-07-08\n"));
    assert.doesNotMatch(md, /Projects are ordered most urgent first/i);
    const firstContent = md.split("\n").slice(1).find((l) => l.trim() && l.trim() !== "---");
    assert.equal(firstContent, "## Your calls today");
  });

  it("renders action-first blocks, You/owner, real due dates, and the collapsed group", () => {
    assert.match(md, /- \*\*Union Collective\*\* — decide on battery storage\./);
    assert.match(md, /- \*\*Goodwill Brookville\*\* \*\(optional\)\* — escalate/);
    assert.match(md, /- \*\*You — decide on battery storage\*\* \[S247\]/);
    assert.match(md, /- \*\*Andrew Cannon — email Viox\*\* Due July 14\. \[S247\]/);
    assert.match(md, /## Also moving — nothing needed from you/);
    assert.match(md, /<summary><strong>Show 1 project on track<\/strong><\/summary>/);
    assert.match(md, /### McLane Jazz, Utah/);
    assert.doesNotMatch(md, /^## McLane Jazz, Utah$/m);
    assert.match(md, /\[S126\]: https:\/\/x\/126/);
    assert.ok(!md.includes("[S247]: "));
  });

  it("validates a good brief and throws on a malformed one", () => {
    assert.doesNotThrow(() => validateBriefV3(sampleBrief()));
    assert.throws(() => validateBriefV3({ version: "v2", projects: [] }));
    assert.equal(nextMovesFromBriefV3(sampleBrief())[0], "You: decide on battery storage");
  });
});

describe("consumer extractors (structured brief → candidates + project_current_state)", () => {
  const cands = candidatesFromPacket(samplePacket(), PROJECT_ROWS);
  const decisions = cands.filter((c) => c.signal_type === "decision");
  const tasks = cands.filter((c) => c.signal_type === "task");

  it("derives decision candidates from callsToday and task candidates from action items", () => {
    assert.equal(decisions.length, 2);
    assert.equal(tasks.length, 2); // battery item deduped into the decision
    assert.ok(decisions.some((c) => c.title.includes("battery")));
    assert.ok(!tasks.some((c) => c.title.includes("battery")));
  });

  it("canonicalizes source aliases, assigns projects, and carries owner + due", () => {
    assert.equal(decisions.find((c) => c.title.startsWith("Union")).source_document_id, "teamsdm_abc");
    assert.equal(decisions.find((c) => c.title.startsWith("Union")).project_id, 1);
    const viox = tasks.find((c) => c.title.includes("Viox"));
    assert.equal(viox.suggested_owner_label, "Andrew Cannon");
    assert.equal(viox.extraction_json.due, "July 14");
    assert.equal(viox.project_id, 1);
  });

  it("never stores placeholder prose in why_it_matters / next_action", () => {
    assert.ok(cands.every((c) => c.why_it_matters === null && c.next_action === null));
  });

  it("rolls each project's context into project_current_state, stripping citations", () => {
    const pcs = projectCurrentStateFromPacket(samplePacket(), PROJECT_ROWS);
    assert.equal(pcs.length, 2);
    assert.ok(pcs.every((r) => !/\[S\d+\]/.test(r.current_summary)));
    assert.ok(pcs.find((r) => r.project_id === 1).current_summary.startsWith("Union Collective: Union is losing money"));
  });
});

// Guardrail: import the generator's pure helpers. If a used helper is ever
// deleted (as parseModelJson was, only caught by a live run), these fail to
// import / resolve — catching it in unit tests, not in production.
import {
  parseModelJson,
  buildSourcesMap,
  collectCitedAliases,
} from "../daily-executive-brief.mjs";

describe("generator pure helpers", () => {
  it("parseModelJson parses fenced and prose-wrapped JSON, null on garbage", () => {
    assert.deepEqual(parseModelJson('```json\n{"a":1}\n```'), { a: 1 });
    assert.deepEqual(parseModelJson('here you go: {"b":2} thanks'), { b: 2 });
    assert.equal(parseModelJson("not json at all"), null);
  });

  it("collectCitedAliases gathers aliases from calls, items, and context", () => {
    const cited = collectCitedAliases({
      callsToday: [{ sourceIds: ["S1"] }],
      looseEnds: [{ sourceIds: ["S2"] }],
      projects: [{ actionItems: [{ sourceIds: ["S3"] }], context: "text with [S4] and [S5]" }],
    });
    assert.deepEqual([...cited].sort(), ["S1", "S2", "S3", "S4", "S5"]);
  });

  it("buildSourcesMap keeps only cited sources and maps lane -> type", () => {
    const sources = [
      { alias: "S1", title: "Mtg", lane: "meetings", url: "https://m", projectName: "P" },
      { alias: "S2", title: "Doc", lane: "documents", url: null, projectName: null },
      { alias: "S9", title: "Uncited", lane: "emails", url: "https://x", projectName: null },
    ];
    const map = buildSourcesMap(sources, new Set(["S1", "S2"]));
    assert.deepEqual(Object.keys(map).sort(), ["S1", "S2"]);
    assert.equal(map.S1.type, "meeting");
    assert.equal(map.S2.type, "document");
    assert.equal(map.S2.url, null);
  });
});
