/**
 * Canonical helpers for the structured v3 Daily Executive Brief, shared by the
 * generator (daily-executive-brief.mjs) and the learning-loop consumer
 * (daily-deep-read-consumers.mjs).
 *
 * The structured object (`packet_json.brief`) is the source of truth. This
 * module renders it to markdown, validates it, and derives next moves — nothing
 * parses section headings.
 *
 * Schema and format contract:
 *   docs/ops/evidence/2026-07-07-manual-daily-executive-brief/BRIEF-FORMAT-SPEC.md
 * The TypeScript mirror used by the reader page is
 *   frontend/src/lib/daily-briefs/{brief-v3-types.ts,render-brief-v3.ts}
 * Keep the two renderers in sync.
 */

const HR = "---";

function sourceRefs(ids) {
  const clean = (Array.isArray(ids) ? ids : []).filter(Boolean);
  return clean.length ? ` ${clean.map((id) => `[${id}]`).join(" ")}` : "";
}

function actionSuffix(item) {
  if (item.due) return ` Due ${item.due}.`;
  if (item.urgency) return ` ${item.urgency}`;
  return "";
}

function renderActionItem(item) {
  const owner = item.ownerIsBrandon ? "You" : item.owner;
  const optional = item.optional ? " *(optional)*" : "";
  return `- **${owner}${optional} — ${item.text}**${actionSuffix(item)}${sourceRefs(item.sourceIds)}`;
}

function renderCall(call) {
  const optional = call.optional ? " *(optional)*" : "";
  return `- **${call.project}**${optional} — ${call.question}${sourceRefs(call.sourceIds)}`;
}

function renderProject(project, headingLevel) {
  const lines = [`${headingLevel} ${project.name}`, ""];
  const items = Array.isArray(project.actionItems) ? project.actionItems : [];
  if (project.resolvedToday && items.length === 0) {
    lines.push("**Action Items** — nothing, resolved today.", "");
  } else {
    lines.push("**Action Items**");
    for (const item of items) lines.push(renderActionItem(item));
    lines.push("");
  }
  if (project.context && project.context.trim()) lines.push(project.context.trim(), "");
  return lines.join("\n").trimEnd();
}

function renderSourceDefinitions(sources) {
  return Object.entries(sources || {})
    .filter(([, meta]) => Boolean(meta && meta.url))
    .sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)))
    .map(([id, meta]) => `[${id}]: ${meta.url}`)
    .join("\n");
}

/** Structured brief → canonical markdown. Pure. Mirrors render-brief-v3.ts. */
export function renderBriefMarkdownV3(brief) {
  const blocks = [];
  blocks.push(`# Daily Executive Brief — ${brief.businessDate}`);

  const calls = Array.isArray(brief.callsToday) ? brief.callsToday : [];
  if (calls.length) {
    blocks.push([HR, "", "## Your calls today", "", ...calls.map(renderCall)].join("\n"));
  }

  const projects = Array.isArray(brief.projects) ? brief.projects : [];
  const ordered = [...projects].sort((a, b) => (a.urgencyRank ?? 99) - (b.urgencyRank ?? 99));
  const mainStream = ordered.filter((p) => p.hasOwnerDecision);
  const collapsed = ordered.filter((p) => !p.hasOwnerDecision);

  for (const project of mainStream) {
    blocks.push([HR, "", renderProject(project, "##")].join("\n"));
  }

  if (collapsed.length) {
    const inner = [
      HR,
      "",
      "## Also moving — nothing needed from you",
      "",
      "<details>",
      `<summary><strong>Show ${collapsed.length} project${collapsed.length === 1 ? "" : "s"} on track</strong></summary>`,
      "",
    ];
    inner.push(collapsed.map((p) => renderProject(p, "###")).join(`\n\n${HR}\n\n`));
    inner.push("", "</details>");
    blocks.push(inner.join("\n"));
  }

  const looseEnds = Array.isArray(brief.looseEnds) ? brief.looseEnds : [];
  if (looseEnds.length) {
    const loose = [HR, "", "## Loose ends — yours to chase", ""];
    for (const end of looseEnds) loose.push(`- **${end.text}**${sourceRefs(end.sourceIds)}`);
    blocks.push(loose.join("\n"));
  }

  const note = brief.sourceCoverage && brief.sourceCoverage.note ? String(brief.sourceCoverage.note).trim() : "";
  const defs = renderSourceDefinitions(brief.sources);
  const footer = [HR];
  if (note) footer.push("", `*${note}*`);
  if (defs) footer.push("", defs);
  if (footer.length > 1) blocks.push(footer.join("\n"));

  return `${blocks.join("\n\n")}\n`;
}

/**
 * Validate a structured brief. Throws (fail loudly) on a malformed shape so the
 * generator never writes an incomplete packet.
 */
export function validateBriefV3(brief) {
  const errors = [];
  if (!brief || typeof brief !== "object") throw new Error("brief_v3 is not an object");
  if (brief.version !== "v3") errors.push(`version must be "v3" (got ${JSON.stringify(brief.version)})`);
  if (!brief.businessDate) errors.push("businessDate is required");
  if (!Array.isArray(brief.projects) || brief.projects.length === 0) {
    errors.push("projects[] must be a non-empty array");
  }
  if (!Array.isArray(brief.callsToday)) errors.push("callsToday[] must be an array");
  if (!brief.sources || typeof brief.sources !== "object") errors.push("sources map is required");

  for (const [i, p] of (brief.projects || []).entries()) {
    if (!p || !p.name) errors.push(`projects[${i}] missing name`);
    if (typeof p?.hasOwnerDecision !== "boolean") errors.push(`projects[${i}] hasOwnerDecision must be boolean`);
    if (!Array.isArray(p?.actionItems)) errors.push(`projects[${i}] actionItems must be an array`);
    for (const [j, a] of (p?.actionItems || []).entries()) {
      if (!a?.text) errors.push(`projects[${i}].actionItems[${j}] missing text`);
      if (typeof a?.ownerIsBrandon !== "boolean") errors.push(`projects[${i}].actionItems[${j}] ownerIsBrandon must be boolean`);
      if (!a?.ownerIsBrandon && !a?.owner) errors.push(`projects[${i}].actionItems[${j}] non-owner item missing owner`);
    }
  }
  // Every calls-today entry must correspond to a project that has a Brandon decision.
  const decisionProjects = new Set((brief.projects || []).filter((p) => p?.hasOwnerDecision).map((p) => p.name));
  for (const [i, c] of (brief.callsToday || []).entries()) {
    if (!c?.project || !c?.question) errors.push(`callsToday[${i}] missing project or question`);
    else if (!decisionProjects.has(c.project)) {
      errors.push(`callsToday[${i}] references "${c.project}" which has no owner-decision project block`);
    }
  }
  if (errors.length) throw new Error(`Invalid brief_v3:\n- ${errors.join("\n- ")}`);
  return brief;
}

/** Owner-facing next moves for the packet's recommended_next_moves column. */
export function nextMovesFromBriefV3(brief, limit = 8) {
  const moves = [];
  for (const project of brief?.projects || []) {
    for (const item of project.actionItems || []) {
      const owner = item.ownerIsBrandon ? "You" : item.owner;
      const due = item.due ? ` (due ${item.due})` : "";
      moves.push(`${owner}: ${item.text}${due}`);
    }
  }
  return moves.slice(0, limit);
}
