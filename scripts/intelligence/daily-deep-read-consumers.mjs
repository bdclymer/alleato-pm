#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  buildAppDatabaseConnectionString,
  getAppDatabaseUrl,
  getRagDatabaseUrl,
} from "../verify/app-db-connection.mjs";

dotenv.config({ path: path.join(process.cwd(), ".env"), quiet: true });
dotenv.config({ path: path.join(process.cwd(), "frontend/.env.local"), quiet: true });

const COMPILER_VERSION = "daily_deep_read_consumers_v1";
const DAILY_TARGET_SLUG = "daily-executive-brief";
const args = parseArgs(process.argv.slice(2));
const packetIdArg = typeof args.packetId === "string" ? args.packetId : null;
const shouldWrite = !args["no-write"] && !args["dry-run"];

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith("--") ? next : true;
    if (parsed[key] === next) index += 1;
  }
  return parsed;
}

async function withPg(rawUrl, options, callback) {
  const pool = new pg.Pool({
    connectionString: await buildAppDatabaseConnectionString(rawUrl, options),
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  const client = await pool.connect();
  try {
    await client.query("set statement_timeout = '45000ms'");
    return await callback(client);
  } finally {
    client.release();
    await pool.end();
  }
}

async function loadDailyDeepReadPacket() {
  return withPg(getAppDatabaseUrl(), { includeSslMode: false }, async (client) => {
    const params = [];
    const packetFilter = packetIdArg ? "and p.id = $1::uuid" : "and p.packet_type = 'current'";
    if (packetIdArg) params.push(packetIdArg);
    const { rows } = await client.query(
      `
        select
          p.id,
          p.target_id,
          p.generated_at,
          p.covered_start_at,
          p.covered_end_at,
          p.source_coverage,
          p.packet_json,
          t.slug
        from public.intelligence_packets p
        join public.intelligence_targets t on t.id = p.target_id
        where t.slug = '${DAILY_TARGET_SLUG}'
          ${packetFilter}
        order by p.generated_at desc
        limit 1
      `,
      params,
    );
    const packet = rows[0];
    if (!packet) {
      throw new Error(
        packetIdArg
          ? `Daily Deep Read packet not found: ${packetIdArg}`
          : "No current Daily Deep Read packet found.",
      );
    }
    if (packet.packet_json?.kind !== "daily_deep_read") {
      throw new Error(`Current packet ${packet.id} is not kind=daily_deep_read.`);
    }
    return packet;
  });
}

const ELLIPSIS_SPLIT = /…|\.{3,}/;

/**
 * Map each citation token the brief cited to its full, durable source id using
 * the packet's `sourceSet` manifest, so candidates store real ids (not the
 * short `S12` alias, which is only meaningful inside one packet, and not a
 * truncated Outlook prefix). Resolution mirrors the frontend resolver
 * (`buildSourceIndex`): exact alias/id match first, then a UNIQUE trailing/
 * interior-ellipsis prefix match for pre-alias packets. Alias-shaped tokens
 * that don't map are dropped (a bare `S12` is meaningless downstream); other
 * unresolved tokens are kept verbatim for provenance/back-compat.
 */
function canonicalizeSourceIds(tokens, sourceSet) {
  const sources = sourceSet?.sources || [];
  const byKey = new Map();
  const ids = [];
  for (const source of sources) {
    if (!source?.id) continue;
    if (!byKey.has(source.id)) {
      byKey.set(source.id, source.id);
      ids.push(source.id);
    }
    if (source.alias && !byKey.has(source.alias)) byKey.set(source.alias, source.id);
  }
  const out = [];
  const seen = new Set();
  const push = (id) => {
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  };
  for (const token of tokens) {
    const exact = byKey.get(token);
    if (exact) {
      push(exact);
      continue;
    }
    if (ELLIPSIS_SPLIT.test(token)) {
      const [prefix, suffix = ""] = token.split(ELLIPSIS_SPLIT).map((part) => part.trim());
      if (prefix.length >= 6) {
        const matches = ids.filter(
          (id) => id.startsWith(prefix) && (suffix === "" || id.endsWith(suffix)),
        );
        if (matches.length === 1) {
          push(matches[0]);
          continue;
        }
      }
    }
    if (/^S\d+$/.test(token)) continue; // unresolved alias — meaningless, drop it
    push(token); // pre-alias full id we couldn't disambiguate; keep for provenance
  }
  return out;
}

function stableKey(packetId, signalType, title) {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
  const suffix = crypto.createHash("sha1").update(`${packetId}:${signalType}:${title}`).digest("hex").slice(0, 10);
  return `daily-deep-read:${packetId}:${signalType}:${normalized}:${suffix}`;
}

function duplicateCandidateKey(candidate) {
  return [
    candidate.project_id ?? "unassigned",
    candidate.title,
    candidate.summary,
    (candidate.extraction_json?.source_ids || []).join("|"),
  ]
    .join("\n")
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function signalTypePriority(signalType) {
  switch (signalType) {
    case "project_update":
      return 50;
    case "risk":
      return 40;
    case "decision":
      return 30;
    case "task":
      return 20;
    case "process_issue":
      return 10;
    default:
      return 0;
  }
}

function isBetterDuplicateCandidate(next, current) {
  if (!current) return true;
  if (next.confidence_score !== current.confidence_score) {
    return next.confidence_score > current.confidence_score;
  }
  return signalTypePriority(next.signal_type) > signalTypePriority(current.signal_type);
}

function dedupeCandidates(candidates) {
  const selected = new Map();
  const duplicateSections = new Map();
  for (const candidate of candidates) {
    const key = duplicateCandidateKey(candidate);
    if (!key) continue;
    const section = candidate.extraction_json?.section;
    if (section) {
      duplicateSections.set(key, [...(duplicateSections.get(key) || []), section]);
    }
    const current = selected.get(key);
    if (isBetterDuplicateCandidate(candidate, current)) {
      selected.set(key, candidate);
    }
  }
  return [...selected.entries()].map(([key, candidate]) => ({
    ...candidate,
    extraction_json: {
      ...candidate.extraction_json,
      duplicate_sections_collapsed: [...new Set(duplicateSections.get(key) || [])],
    },
  }));
}

function confidenceForSignal(signalType) {
  if (signalType === "decision") return { score: 0.86, label: "high" };
  if (signalType === "task") return { score: 0.74, label: "medium" };
  return { score: 0.8, label: "medium" };
}

function projectIdForSourceIds(sourceIds, sourceSet) {
  const byId = new Map((sourceSet?.sources || []).map((source) => [source.id, source.projectId]));
  const values = sourceIds.map((id) => byId.get(id)).filter((value) => Number.isInteger(value));
  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] : null;
}

function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return normalizeForMatch(value)
    .split(" ")
    .filter(
      (token) =>
        token.length >= 3 &&
        ![
          "the",
          "and",
          "road",
          "phase",
          "project",
          "permit",
          "budget",
          "audit",
          "seed",
          "internal",
          "ops",
          "outreach",
          "sprinkler",
          "electrical",
        ].includes(token),
    );
}

async function loadProjectRows() {
  return withPg(getAppDatabaseUrl(), { includeSslMode: false }, async (client) => {
    const { rows } = await client.query(
      "select id, name, project_number, type from public.projects where name is not null order by id",
    );
    const projects = rows
      .filter((row) => {
        const name = String(row.name || "");
        return (
          !/^temporary project code/i.test(name) &&
          !/^budget audit seed/i.test(name) &&
          row.type !== "Internal"
        );
      })
      .map((row) => ({
      id: Number(row.id),
      name: row.name,
      projectNumber: row.project_number,
      normalizedName: normalizeForMatch(row.name),
      tokens: tokens(`${row.name} ${row.project_number || ""}`),
    }));
    const tokenFrequency = new Map();
    for (const project of projects) {
      for (const token of new Set(project.tokens)) {
        tokenFrequency.set(token, (tokenFrequency.get(token) || 0) + 1);
      }
    }
    return projects.map((project) => ({
      ...project,
      distinctiveTokens: project.tokens.filter((token) => token.length >= 6 && tokenFrequency.get(token) === 1),
    }));
  });
}

function projectIdForText(text, projectRows) {
  const normalized = normalizeForMatch(text);
  if (normalized.includes("superior beverage")) {
    const superior = projectRows.find((project) => project.normalizedName.includes("superior"));
    if (superior) return superior.id;
  }
  const explicitProject = normalized.match(/\bproject\s+(\d{2,6})\b/)?.[1];
  if (explicitProject) {
    const byId = projectRows.find((project) => String(project.id) === explicitProject);
    if (byId) return byId.id;
  }
  const exact = projectRows.find(
    (project) =>
      (project.normalizedName && normalized.includes(project.normalizedName)) ||
      (project.projectNumber && normalized.includes(normalizeForMatch(project.projectNumber))),
  );
  if (exact) return exact.id;

  const distinctiveMatches = projectRows
    .map((project) => ({
      id: project.id,
      score: project.distinctiveTokens.filter((token) => normalized.includes(token)).length,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  if (distinctiveMatches.length === 1 || distinctiveMatches[0]?.score > distinctiveMatches[1]?.score) {
    return distinctiveMatches[0].id;
  }

  const scored = projectRows
    .map((project) => {
      const overlap = project.tokens.filter((token) => normalized.includes(token)).length;
      return {
        id: project.id,
        score: overlap,
      };
    })
    .filter((item) => item.score >= 2)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  if (scored.length > 1 && scored[0].score === scored[1].score) return null;
  return scored[0].id;
}

// Candidates come straight from the STRUCTURED v3 brief: owner decisions from
// `brief.callsToday`, tasks from each project's `actionItems`. No markdown/section
// parsing — the structure already carries owner, due date, and source aliases.
function candidatesFromPacket(packet, projectRows) {
  const brief = packet.packet_json?.brief;
  const sourceSet = packet.packet_json?.sourceSet || {};
  const businessDate = packet.packet_json?.businessDate || packet.covered_start_at?.toISOString?.()?.slice(0, 10);
  if (!brief || typeof brief !== "object") return [];
  const candidates = [];

  const push = ({ signalType, project, title, summary, sourceIdsRaw, origin, extraction = {} }) => {
    const cleanTitle = String(title || "").trim();
    if (!cleanTitle) return;
    const cleanSummary = String(summary || cleanTitle).trim();
    const sourceIds = canonicalizeSourceIds(sourceIdsRaw || [], sourceSet);
    const primarySourceId = sourceIds[0] || `daily_packet:${packet.id}`;
    const { score, label } = confidenceForSignal(signalType);
    const sourceProjectId = projectIdForSourceIds(sourceIds, sourceSet);
    const textProjectId = projectIdForText(`${project || ""}\n${cleanTitle}\n${cleanSummary}`, projectRows);
    candidates.push({
      source_document_id: primarySourceId,
      source_chunk_id: null,
      target_id: null,
      project_id: sourceProjectId || textProjectId,
      signal_type: signalType,
      title: cleanTitle,
      summary: cleanSummary,
      // No real "why" is extracted; the review workflow owns interpretation. Never
      // store placeholder prose — it gets woven into /daily-brief and /executive.
      why_it_matters: null,
      current_status: "open",
      confidence_score: score,
      confidence: label,
      status: "needs_review",
      suggested_owner_person_id: null,
      suggested_owner_label: extraction.owner ?? null,
      next_action: null,
      stale_after: null,
      source_occurred_at: packet.covered_end_at,
      excerpt: cleanSummary.slice(0, 2000),
      normalized_signal_key: stableKey(packet.id, signalType, cleanTitle),
      extraction_json: {
        daily_packet_id: packet.id,
        daily_packet_generated_at: packet.generated_at,
        business_date: businessDate,
        source_ids: sourceIds,
        origin,
        consumer_compiler_version: COMPILER_VERSION,
        candidate_policy: "review_gated_not_auto_promoted",
        source_policy: "Derived from daily_deep_read structured brief (v3); no direct chunk synthesis.",
        project_assignment_method: sourceProjectId
          ? "source_set_single_project"
          : textProjectId
            ? "project_name_or_number_match"
            : "unassigned_company_wide",
        ...extraction,
      },
      compiler_version: COMPILER_VERSION,
    });
  };

  // Owner decisions → decision candidates.
  for (const call of brief.callsToday || []) {
    if (!call?.project || !call?.question) continue;
    push({
      signalType: "decision",
      project: call.project,
      title: `${call.project}: ${call.question}`,
      summary: call.question,
      sourceIdsRaw: call.sourceIds,
      origin: "calls_today",
      extraction: { optional: Boolean(call.optional) },
    });
  }

  // Action items → task candidates (owner and due date carried through).
  for (const project of brief.projects || []) {
    for (const item of project.actionItems || []) {
      if (!item?.text) continue;
      const owner = item.ownerIsBrandon ? "Brandon" : item.owner || null;
      const due = item.due ? ` (due ${item.due})` : "";
      push({
        signalType: "task",
        project: project.name,
        title: `${project.name}: ${item.text}`,
        summary: `${item.text}${due}`,
        sourceIdsRaw: item.sourceIds,
        origin: "action_item",
        extraction: { owner, due: item.due ?? null, due_iso: item.dueIso ?? null, project: project.name },
      });
    }
  }

  return dedupeCandidates(candidates);
}

// Guardrail: candidate prose fields must never carry derived placeholder
// boilerplate. Those strings get woven into /daily-brief and /executive
// narrative (PR #801 had to strip them defensively at render time). Fail the
// run loudly at the source rather than persist polluted rows.
const BANNED_PLACEHOLDER_PATTERNS = [
  /Derived from Daily Deep Read section/i,
  /Review candidate and decide/i,
  /Review and either assign as a task or reject/i,
];

function assertNoPlaceholderProse(candidates) {
  const proseFields = ["why_it_matters", "next_action"];
  const offenders = [];
  for (const candidate of candidates) {
    for (const field of proseFields) {
      const value = candidate[field];
      if (typeof value === "string" && BANNED_PLACEHOLDER_PATTERNS.some((re) => re.test(value))) {
        offenders.push(`${candidate.normalized_signal_key} → ${field}: ${JSON.stringify(value)}`);
      }
    }
  }
  if (offenders.length) {
    throw new Error(
      `Refusing to write ${offenders.length} candidate(s) with placeholder prose in ` +
        `why_it_matters/next_action. Set these fields to null or derive real values.\n` +
        offenders.join("\n"),
    );
  }
}

async function writeCandidates(candidates, packet) {
  return withPg(
    getRagDatabaseUrl(),
    { includeSslMode: false, rewriteSupabaseDirectHost: false },
    async (client) => {
      await client.query("begin");
      try {
        const deleted = await client.query(
          `
            delete from public.source_signal_candidates
            where compiler_version = $1
              and extraction_json->>'daily_packet_id' = $2
          `,
          [COMPILER_VERSION, packet.id],
        );
        let inserted = 0;
        for (const candidate of candidates) {
          await client.query(
            `
              insert into public.source_signal_candidates (
                source_document_id,
                source_chunk_id,
                target_id,
                project_id,
                signal_type,
                title,
                summary,
                why_it_matters,
                current_status,
                confidence_score,
                confidence,
                status,
                suggested_owner_person_id,
                suggested_owner_label,
                next_action,
                stale_after,
                source_occurred_at,
                excerpt,
                normalized_signal_key,
                extraction_json,
                compiler_version
              )
              values (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb,$21
              )
            `,
            [
              candidate.source_document_id,
              candidate.source_chunk_id,
              candidate.target_id,
              candidate.project_id,
              candidate.signal_type,
              candidate.title,
              candidate.summary,
              candidate.why_it_matters,
              candidate.current_status,
              candidate.confidence_score,
              candidate.confidence,
              candidate.status,
              candidate.suggested_owner_person_id,
              candidate.suggested_owner_label,
              candidate.next_action,
              candidate.stale_after,
              candidate.source_occurred_at,
              candidate.excerpt,
              candidate.normalized_signal_key,
              JSON.stringify(candidate.extraction_json),
              candidate.compiler_version,
            ],
          );
          inserted += 1;
        }
        await client.query("commit");
        return { deleted: deleted.rowCount, inserted };
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    },
  );
}

async function readBack(packet) {
  return withPg(
    getRagDatabaseUrl(),
    { includeSslMode: false, rewriteSupabaseDirectHost: false },
    async (client) => {
      const { rows } = await client.query(
        `
          select signal_type, status, count(*)::int as count
          from public.source_signal_candidates
          where compiler_version = $1
            and extraction_json->>'daily_packet_id' = $2
          group by signal_type, status
          order by signal_type, status
        `,
        [COMPILER_VERSION, packet.id],
      );
      return rows;
    },
  );
}

// --- Slice A: project intelligence stems from the packet (ungated) ---------
// Each v3 project block carries a per-project narrative (`context`) synthesized
// from the day's FULL transcripts / emails / Teams. Roll it straight into
// project_current_state.current_summary — the exact field the /[projectId]/intelligence
// page reads — so project intelligence is a CONSUMER of the one packet spine, not a
// parallel synthesizer. No review gate: the packet is the source of truth.
// Corrections happen via downstream feedback (remove/learn), never a pre-approval hold.

function stripPacketCitations(text) {
  return String(text || "")
    .replace(/`S\d+`/g, "") // legacy backtick aliases
    .replace(/\[S\d+\]/g, "") // v3 bracket aliases don't resolve outside the packet
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

// current_summary from the v3 brief's per-project context (owner-grade narrative).
function summariesFromBrief(packet, projectRows) {
  const projects = Array.isArray(packet.packet_json?.brief?.projects)
    ? packet.packet_json.brief.projects
    : [];
  const map = new Map();
  for (const project of projects) {
    const name = String(project?.name || "").trim();
    const context = String(project?.context || "").trim();
    if (!name || !context) continue;
    const projectId = projectIdForText(`${name}\n${context}`, projectRows);
    if (!projectId || map.has(projectId)) continue; // one row per project per run
    const currentSummary = stripPacketCitations(`${name}: ${context}`);
    if (!currentSummary) continue;
    map.set(projectId, { name, currentSummary });
  }
  return map;
}

// The page renders these arrays as objects (record.title || record.summary),
// so each signal is stored as { title } — a plain string renders as nothing.
function toTitleItems(list) {
  return (Array.isArray(list) ? list : [])
    .map((item) => stripPacketCitations(item))
    .filter(Boolean)
    .map((title) => ({ title }));
}

function resolveRecordProjectId(record, projectRows) {
  const claimed = Number(record?.projectId);
  if (Number.isInteger(claimed) && claimed > 0 && projectRows.some((p) => p.id === claimed)) {
    return claimed;
  }
  // Fall back to name match if the compiler's id is stale/absent.
  return record?.projectName ? projectIdForText(record.projectName, projectRows) : null;
}

// Candidate B: structured per-project rich fields (health/risks/decisions/etc)
// straight from packet_json.projectRecords — no markdown parsing.
function richFromRecords(packet, projectRows) {
  const list = packet.packet_json?.projectRecords;
  const map = new Map();
  if (!Array.isArray(list)) return map;
  for (const record of list) {
    const projectId = resolveRecordProjectId(record, projectRows);
    if (!projectId || map.has(projectId)) continue;
    map.set(projectId, {
      healthStatus: record.healthStatus,
      activeRisks: toTitleItems(record.activeRisks),
      openDecisions: toTitleItems(record.openDecisions),
      needsAttention: toTitleItems(record.needsAttention),
      whatChanged: record.whatChanged ? toTitleItems([record.whatChanged]) : [],
      financialRead: stripPacketCitations(record.financialRead),
      scheduleRead: stripPacketCitations(record.scheduleRead),
      fieldRead: stripPacketCitations(record.fieldRead),
      confidence:
        typeof record.confidence === "number" ? { overall: record.confidence } : null,
    });
  }
  return map;
}

// Merge: current_summary from the v3 brief's per-project context + rich fields
// from the structured records, keyed by project. Either source alone is valid.
function projectCurrentStateFromPacket(packet, projectRows) {
  const summaries = summariesFromBrief(packet, projectRows);
  const rich = richFromRecords(packet, projectRows);
  const projectIds = new Set([...summaries.keys(), ...rich.keys()]);
  const records = [];
  for (const projectId of projectIds) {
    const summary = summaries.get(projectId) ?? null;
    const r = rich.get(projectId) ?? null;
    records.push({
      project_id: projectId,
      project_name: summary?.name ?? null,
      current_summary: summary?.currentSummary ?? null,
      rich: r,
    });
  }
  return records;
}

async function writeProjectCurrentState(records) {
  if (!records.length) return { updated: 0, richUpdated: 0, unmatchedRowMissing: 0 };
  return withPg(getAppDatabaseUrl(), { includeSslMode: false }, async (client) => {
    let updated = 0;
    let richUpdated = 0;
    let unmatchedRowMissing = 0;
    for (const rec of records) {
      // Build the SET clause from only the fields we actually have fresh signal
      // for. Never overwrite a prior health/risk read with an empty/unknown —
      // the daily read UPGRADES freshness where it has evidence, never wipes it.
      const sets = ["updated_at = now()"];
      const params = [rec.project_id];
      const add = (sql, value) => {
        params.push(value);
        sets.push(sql.replace("$$", `$${params.length}`));
      };
      if (rec.current_summary) add("current_summary = $$", rec.current_summary);
      const r = rec.rich;
      let wroteRich = false;
      if (r) {
        if (r.healthStatus && r.healthStatus !== "unknown") {
          add("health_status = $$", r.healthStatus);
          wroteRich = true;
        }
        if (r.activeRisks.length) { add("active_risks = $$::jsonb", JSON.stringify(r.activeRisks)); wroteRich = true; }
        if (r.openDecisions.length) { add("open_decisions = $$::jsonb", JSON.stringify(r.openDecisions)); wroteRich = true; }
        if (r.needsAttention.length) { add("needs_attention = $$::jsonb", JSON.stringify(r.needsAttention)); wroteRich = true; }
        if (r.whatChanged.length) { add("what_changed_since_last_update = $$::jsonb", JSON.stringify(r.whatChanged)); wroteRich = true; }
        if (r.financialRead) { add("financial_read = $$", r.financialRead); wroteRich = true; }
        if (r.scheduleRead) { add("schedule_read = $$", r.scheduleRead); wroteRich = true; }
        if (r.fieldRead) { add("field_read = $$", r.fieldRead); wroteRich = true; }
        if (r.confidence) { add("source_confidence = $$::jsonb", JSON.stringify(r.confidence)); wroteRich = true; }
      }
      if (sets.length === 1) continue; // nothing but updated_at — skip
      // UPDATE-only: every live project already has a project_current_state row.
      const res = await client.query(
        `update public.project_current_state set ${sets.join(", ")} where project_id = $1`,
        params,
      );
      if (res.rowCount > 0) {
        updated += 1;
        if (wroteRich) richUpdated += 1;
      } else {
        unmatchedRowMissing += 1;
      }
    }
    return { updated, richUpdated, unmatchedRowMissing };
  });
}

async function main() {
  const packet = await loadDailyDeepReadPacket();
  const projectRows = await loadProjectRows();
  const candidates = candidatesFromPacket(packet, projectRows);
  if (!candidates.length) {
    throw new Error(`No candidates parsed from Daily Deep Read packet ${packet.id}.`);
  }
  assertNoPlaceholderProse(candidates);
  const evidenceDir = path.join(
    process.cwd(),
    "docs/ops/evidence/2026-07-07-daily-deep-read-consumers",
    packet.packet_json?.businessDate || String(packet.id),
  );
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(
    path.join(evidenceDir, "candidate-preview.json"),
    JSON.stringify({ packetId: packet.id, shouldWrite, candidates }, null, 2),
  );

  const writeResult = shouldWrite ? await writeCandidates(candidates, packet) : { deleted: 0, inserted: 0 };
  const readBackRows = shouldWrite ? await readBack(packet) : [];

  // Slice A: project intelligence stems from this same packet (ungated).
  const projectStateRecords = projectCurrentStateFromPacket(packet, projectRows);
  await fs.writeFile(
    path.join(evidenceDir, "project-current-state-preview.json"),
    JSON.stringify({ packetId: packet.id, shouldWrite, records: projectStateRecords }, null, 2),
  );
  const projectStateResult = shouldWrite
    ? await writeProjectCurrentState(projectStateRecords)
    : { updated: 0, unmatchedRowMissing: 0 };

  const summary = {
    ok: true,
    packetId: packet.id,
    compilerVersion: COMPILER_VERSION,
    shouldWrite,
    candidateCount: candidates.length,
    writeResult,
    projectIntelligence: {
      projectsInPacket: projectStateRecords.length,
      ...projectStateResult,
    },
    readBack: readBackRows,
    evidenceDir,
  };
  await fs.writeFile(path.join(evidenceDir, "consumer-run-summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

// Pure extractors exported for unit testing (no DB). The CLI entry point below
// only runs when this file is executed directly, not when imported.
export { candidatesFromPacket, projectCurrentStateFromPacket };

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
