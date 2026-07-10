#!/usr/bin/env node

import { spawnSync } from "node:child_process";
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
import {
  nextMovesFromBriefV3,
  renderBriefMarkdownV3,
  validateBriefV3,
} from "./lib/brief-v3.mjs";

dotenv.config({ path: path.join(process.cwd(), ".env"), quiet: true });
dotenv.config({ path: path.join(process.cwd(), "frontend/.env.local"), quiet: true });

const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";
const COMPILER_VERSION = "manual_daily_executive_brief_v1";
const TIME_ZONE = "America/New_York";
const MAX_MODEL_CHARS_PER_ITEM = 12_000;
const MODEL_TIMEOUT_MS = 180_000;

const args = parseArgs(process.argv.slice(2));
const businessDate = args.date ?? previousBusinessDateInNewYork();
const shouldWrite = !args["no-write"] && !args["dry-run"];
const model = args.model ?? "openai/gpt-5.5";
const packetType = args.packetType ?? "current";
if (!["current", "snapshot"].includes(packetType)) {
  throw new Error(`--packetType must be current or snapshot, received: ${packetType}`);
}

const windowBounds = resolveWindowBounds(businessDate, args);
const evidenceRoot =
  (typeof args.evidenceDir === "string" && args.evidenceDir) ||
  (typeof args["evidence-dir"] === "string" && args["evidence-dir"]) ||
  "docs/ops/evidence/2026-07-07-manual-daily-executive-brief";
const evidenceDir = path.join(process.cwd(), evidenceRoot, businessDate);

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

function previousBusinessDateInNewYork(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const todayUtc = new Date(`${values.year}-${values.month}-${values.day}T12:00:00.000Z`);
  todayUtc.setUTCDate(todayUtc.getUTCDate() - 1);
  return todayUtc.toISOString().slice(0, 10);
}

function businessDayBoundsUtc(date) {
  // The source day is the completed New York business day. EDT is fixed for July
  // 2026; this runner is intentionally date-scoped for the current emergency path.
  const start = new Date(`${date}T00:00:00.000-04:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end, startIso: start.toISOString(), endIso: end.toISOString() };
}

function parseRequiredDateArg(value, flagName) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${flagName} must be an ISO timestamp, received: ${value}`);
  }
  return parsed;
}

function resolveWindowBounds(date, parsedArgs) {
  const defaultBounds = businessDayBoundsUtc(date);
  const start =
    parseRequiredDateArg(parsedArgs.coveredStartAt, "--coveredStartAt") ??
    parseRequiredDateArg(parsedArgs["covered-start-at"], "--covered-start-at") ??
    defaultBounds.start;
  const end =
    parseRequiredDateArg(parsedArgs.coveredEndAt, "--coveredEndAt") ??
    parseRequiredDateArg(parsedArgs["covered-end-at"], "--covered-end-at") ??
    defaultBounds.end;
  if (end <= start) {
    throw new Error(`Covered end must be after covered start: ${start.toISOString()} >= ${end.toISOString()}`);
  }
  return { start, end, startIso: start.toISOString(), endIso: end.toISOString() };
}

function parseDateFromText(text) {
  if (!text) return null;
  const rawDate =
    text.match(/\*\*Date:\*\*\s*([^\n]+)/i)?.[1]?.trim() ??
    text.match(/^Date:\s*([^\n]+)/im)?.[1]?.trim();
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return {
      date: parsed,
      // "Date: 2026-07-07" is a day label, not an event time. Time-of-day is the
      // signal that the header carries a real timestamp.
      dateOnly: !/\d{1,2}:\d{2}/.test(rawDate),
      dateString: rawDate.match(/(20\d{2}-\d{2}-\d{2})/)?.[1] ?? null,
    };
  }
  const bracketDate = text.match(/\[(20\d{2}-\d{2}-\d{2})[^\]]*\]/)?.[1];
  if (bracketDate) {
    return {
      date: new Date(`${bracketDate}T12:00:00.000-04:00`),
      dateOnly: true,
      dateString: bracketDate,
    };
  }
  return null;
}

// Teams ingestion (backend/src/services/integrations/microsoft_graph/teams.py) writes
// message markers as `[{createdDateTime[:19] with T→space}]` from Microsoft Graph,
// so these per-message timestamps are UTC.
const TEAMS_MESSAGE_TIMESTAMP_PATTERN = /\[(20\d{2}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\]/g;

function parseTeamsMessageTimestamps(text) {
  const timestamps = [];
  for (const match of String(text ?? "").matchAll(TEAMS_MESSAGE_TIMESTAMP_PATTERN)) {
    const parsed = new Date(`${match[1]}T${match[2]}.000Z`);
    if (!Number.isNaN(parsed.getTime())) timestamps.push(parsed);
  }
  return timestamps;
}

function rowFallbackTimestamp(row) {
  const fallback =
    row.source_at ??
    row.last_content_loaded_at ??
    row.last_indexed_at ??
    row.last_synced_at ??
    row.updated_at ??
    row.created_at;
  const parsed = fallback ? new Date(fallback) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r\n/g, "\n")
    .trim();
}

function truncate(value, maxLength) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n\n[TRUNCATED after ${maxLength} chars for model context; full text is in source-corpus.md]`;
}

function classifyLane(row) {
  const type = String(row.type ?? "").toLowerCase();
  const source = String(row.source ?? "").toLowerCase();
  if (source === "fireflies" || type === "meeting") return "meetings";
  if (type.includes("team") || type.includes("teams")) return "teams";
  if (type.includes("email") || row.source_system === "outlook_email") return "emails";
  if (source === "ai_memory") return "ignored";
  return "documents";
}

const FULL_DAY_MS = 24 * 60 * 60 * 1000;
const windowIsFullDayOrLonger =
  windowBounds.end.getTime() - windowBounds.start.getTime() >= FULL_DAY_MS;

function isInWindow(timeMs) {
  return timeMs >= windowBounds.start.getTime() && timeMs < windowBounds.end.getTime();
}

function includeByRowFallback(row, basis) {
  const fallbackDate = rowFallbackTimestamp(row);
  return {
    include: fallbackDate !== null && isInWindow(fallbackDate.getTime()),
    basis,
    sourceAt: fallbackDate ? fallbackDate.toISOString() : null,
  };
}

function isIncludedForBusinessDate(row, text, lane) {
  if (lane === "teams") {
    // Teams content headers carry a date-only day label; the real event times are
    // the per-message UTC timestamps. Include the conversation row if any message
    // falls inside the covered window.
    const messageTimes = parseTeamsMessageTimestamps(text);
    if (messageTimes.length > 0) {
      const inWindowTimes = messageTimes.filter((time) => isInWindow(time.getTime()));
      const anchor = inWindowTimes[inWindowTimes.length - 1] ?? messageTimes[messageTimes.length - 1];
      return {
        include: inWindowTimes.length > 0,
        basis: "teams-message-timestamps-utc",
        sourceAt: anchor.toISOString(),
        inWindowMessageCount: inWindowTimes.length,
        messageCount: messageTimes.length,
      };
    }
    return includeByRowFallback(row, "loaded-or-row-timestamp");
  }

  const parsed = parseDateFromText(text);
  if (parsed && !parsed.dateOnly) {
    return {
      include: isInWindow(parsed.date.getTime()),
      basis: "parsed-source-timestamp",
      sourceAt: parsed.date.toISOString(),
    };
  }
  if (parsed?.dateOnly) {
    // A date-only header is day evidence: it may include a row on a full-day run,
    // but it must never exclude a row from a sub-day window — midnight coercion is
    // what silently dropped every Teams row from the July 7 workday packet.
    if (windowIsFullDayOrLonger && parsed.dateString === businessDate) {
      return {
        include: true,
        basis: "date-only-source-day",
        sourceAt: parsed.date.toISOString(),
      };
    }
    return includeByRowFallback(row, "row-timestamp-with-date-only-header");
  }
  return includeByRowFallback(row, "loaded-or-row-timestamp");
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

async function fetchRows() {
  return withPg(
    getRagDatabaseUrl(),
    { includeSslMode: false, rewriteSupabaseDirectHost: false },
    async (client) => {
      const { rows } = await client.query(
        `
          select
            id,
            app_document_id,
            project_id,
            source,
            source_system,
            source_item_id,
            fireflies_id,
            title,
            type,
            category,
            source_web_url,
            url,
            storage_bucket,
            storage_path,
            file_name,
            content,
            raw_text,
            summary,
            overview,
            parsing_status,
            embedding_status,
            last_synced_at,
            last_content_loaded_at,
            last_indexed_at,
            created_at,
            updated_at,
            coalesce(last_content_loaded_at, last_indexed_at, last_synced_at, updated_at, created_at) as source_at
          from public.rag_document_metadata
          where coalesce(last_content_loaded_at, last_indexed_at, last_synced_at, updated_at, created_at)
            >= ($1::timestamptz - interval '36 hours')
            and coalesce(last_content_loaded_at, last_indexed_at, last_synced_at, updated_at, created_at)
            < ($2::timestamptz + interval '12 hours')
            and source is distinct from 'ai_memory'
          order by coalesce(last_content_loaded_at, last_indexed_at, last_synced_at, updated_at, created_at) asc
          limit 1500
        `,
        [windowBounds.startIso, windowBounds.endIso],
      );
      return rows;
    },
  );
}

// Project names live in the PM APP `projects` table, not the RAG DB the corpus
// is drawn from. Resolve id -> name so the brief never surfaces a bare numeric
// project id (e.g. "Project 67") to the owner — always a real name.
async function fetchProjectNames(projectIds) {
  const ids = [
    ...new Set(
      projectIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    ),
  ];
  if (ids.length === 0) return new Map();
  return withPg(
    getAppDatabaseUrl(),
    { includeSslMode: false, rewriteSupabaseDirectHost: false },
    async (client) => {
      const { rows } = await client.query(
        `select id, name, project_number
           from public.projects
          where id = any($1::int[])`,
        [ids],
      );
      const map = new Map();
      for (const row of rows) {
        // `projects.id` is int8, which node-pg returns as a string — coerce to
        // Number so the key matches the numeric lookup below.
        const id = Number(row.id);
        const label =
          (typeof row.name === "string" && row.name.trim()) ||
          (typeof row.project_number === "string" && row.project_number.trim()) ||
          null;
        if (Number.isFinite(id) && label) map.set(id, label);
      }
      return map;
    },
  );
}

// --- #807: attribution backstop -----------------------------------------------
// The upstream classifier that stamps rag_document_metadata.project_id sometimes
// gets it wrong (e.g. a "Shawnee Collective Reconnect" email labeled Westfield
// Collective). Fixing the classifier is the real fix; here we backstop it, but
// CONSERVATIVELY: only when a source's title contains the FULL, specific name of
// exactly one real project that differs from the assigned one. Matching on loose
// tokens ("sprinkler", "alleato") over-corrects and corrupts attribution, so we
// deliberately don't — a false correction is worse than a missed one.

function normalizeForMatch(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

// All real (non-internal) projects with their normalized names for exact matching.
async function fetchAllProjects() {
  return withPg(
    getAppDatabaseUrl(),
    { includeSslMode: false, rewriteSupabaseDirectHost: false },
    async (client) => {
      const { rows } = await client.query(
        "select id, name, type from public.projects where name is not null",
      );
      return rows
        .filter((row) => {
          const name = String(row.name || "");
          return (
            !/^temporary project code/i.test(name) &&
            !/^budget audit seed/i.test(name) &&
            row.type !== "Internal"
          );
        })
        .map((row) => ({ id: Number(row.id), name: row.name, normalizedName: normalizeForMatch(row.name) }));
    },
  );
}

// The single project whose FULL name appears as a whole phrase in the title, or
// null. Requires a name specific enough to be an identifier (>= 8 chars) matched
// on word boundaries. Ambiguous (0 or >1 matches) → null. Never a guess.
function projectIdFromTitle(title, projects) {
  const norm = ` ${normalizeForMatch(title)} `;
  if (norm.trim().length === 0) return null;
  const matches = projects.filter(
    (project) =>
      project.normalizedName &&
      project.normalizedName.length >= 8 &&
      norm.includes(` ${project.normalizedName} `),
  );
  return matches.length === 1 ? matches[0].id : null;
}

// Words that are a shared project-naming suffix — the last token of 2+ real
// project names (e.g. "collective" from Union/Westfield Collective). A one-off
// place name like "morrisville" (only Exol Morrisville) is NOT a category, so we
// won't treat "erw01 morrisville" as a sibling of "exol morrisville".
function categorySuffixWords(projects) {
  const counts = new Map();
  for (const project of projects) {
    const parts = (project.normalizedName || "").split(" ");
    const last = parts[parts.length - 1];
    if (last && last.length >= 6) counts.set(last, (counts.get(last) || 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, n]) => n >= 2).map(([word]) => word));
}

// True when the title names a same-category SIBLING of the assigned project —
// e.g. assigned "Westfield Collective" but the title says "Shawnee Collective".
// Requires: assigned name absent from the title; the shared last word is a real
// category suffix (2+ projects); and the differing prefix is a plain word (not a
// code like "erw01"). Signals the source is about a different entity.
function titleNamesDifferentSibling(source, assignedNorm, categoryWords) {
  if (!assignedNorm) return false;
  const titleNorm = ` ${normalizeForMatch(source.title)} `;
  if (titleNorm.includes(` ${assignedNorm} `)) return false; // title names the assigned project → trust it
  const parts = assignedNorm.split(" ");
  if (parts.length < 2) return false;
  const category = parts[parts.length - 1];
  const assignedPrefix = parts[parts.length - 2];
  if (!categoryWords.has(category)) return false; // not a project-naming convention
  const re = new RegExp(`\\b([a-z]{4,})\\s+${category}\\b`, "g");
  for (const match of titleNorm.matchAll(re)) {
    if (match[1] !== assignedPrefix && match[1] !== category) return true;
  }
  return false;
}

// Backstop the upstream project classifier. Two conservative moves, both keyed
// on the source title. Mutates sources; returns corrections for the manifest/log.
function correctAttribution(sources, projects) {
  const byId = new Map(projects.map((project) => [project.id, project]));
  const categoryWords = categorySuffixWords(projects);
  const corrections = [];
  for (const source of sources) {
    const assignedNorm = source.projectName ? normalizeForMatch(source.projectName) : "";
    const titleNamesAssigned = assignedNorm && ` ${normalizeForMatch(source.title)} `.includes(` ${assignedNorm} `);
    if (titleNamesAssigned) continue; // title confirms the assignment — leave it

    // 1. Title names the full name of a different REAL project → re-attribute to it.
    const titleProjectId = projectIdFromTitle(source.title, projects);
    if (titleProjectId && titleProjectId !== Number(source.projectId)) {
      const to = byId.get(titleProjectId);
      corrections.push({
        alias: source.alias,
        title: source.title,
        from: { projectId: source.projectId ?? null, projectName: source.projectName ?? null },
        to: { projectId: titleProjectId, projectName: to?.name ?? null },
      });
      source.projectId = titleProjectId;
      source.projectName = to?.name ?? null;
      source.attributionCorrected = true;
      continue;
    }

    // 2. Title names a same-category SIBLING that isn't a project (e.g. "Shawnee
    //    Collective" when only "Westfield Collective" exists) → de-attribute, so
    //    the brief doesn't confidently assert the wrong project.
    if (source.projectId != null && titleNamesDifferentSibling(source, assignedNorm, categoryWords)) {
      corrections.push({
        alias: source.alias,
        title: source.title,
        from: { projectId: source.projectId, projectName: source.projectName ?? null },
        to: { projectId: null, projectName: null },
        reason: "title names a different same-category entity than the assigned project",
      });
      source.projectId = null;
      source.projectName = null;
      source.attributionCorrected = true;
    }
  }
  return corrections;
}

function transcriptUrl(row) {
  const url = row.url || row.source_web_url;
  if (typeof url === "string" && url.includes("/storage/v1/object/public/transcripts/")) return url;
  return null;
}

async function downloadTranscriptMarkdown(row) {
  const url = transcriptUrl(row);
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Transcript download failed ${response.status} for ${row.id}`);
  }
  const text = await response.text();
  return cleanText(text);
}

// Content signature for dedup: same title + same normalized body = the same
// message ingested twice (e.g. one email delivered to two mailboxes → two
// rag_document_metadata rows with different ids but identical content). Collapsing
// them stops the brief from citing / counting the same source twice (#806).
function contentSignature(title, text) {
  const normTitle = String(title || "").toLowerCase().replace(/\s+/g, " ").trim();
  const normText = String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
  const hash = crypto.createHash("sha1").update(normText).digest("hex").slice(0, 20);
  return `${normTitle}::${hash}`;
}

async function materializeSources(rows) {
  const sources = [];
  const skipped = [];
  const seenSignatures = new Map(); // content signature -> alias of the kept source
  for (const row of rows) {
    const lane = classifyLane(row);
    if (lane === "ignored") continue;
    let text = cleanText(row.content || row.raw_text || row.summary || row.overview);
    let usedStorage = false;
    if (lane === "meetings") {
      const markdown = await downloadTranscriptMarkdown(row).catch((error) => {
        skipped.push({ id: row.id, title: row.title, lane, reason: error.message });
        return null;
      });
      if (markdown) {
        text = markdown;
        usedStorage = true;
      }
    }
    const inclusion = isIncludedForBusinessDate(row, text, lane);
    if (!inclusion.include) {
      skipped.push({
        id: row.id,
        title: row.title,
        lane,
        reason: `not in ${businessDate} by ${inclusion.basis}`,
        sourceAt: inclusion.sourceAt,
      });
      continue;
    }
    const hasTranscriptMarker = lane !== "meetings" || /##\s*Transcript/i.test(text);
    if (lane === "meetings" && !hasTranscriptMarker) {
      skipped.push({ id: row.id, title: row.title, lane, reason: "meeting source lacks ## Transcript marker" });
      continue;
    }
    // #806 — deduplicate identical content before it gets an alias, so aliases
    // stay sequential and gap-free and the source counts are honest.
    const signature = contentSignature(row.title, text);
    const duplicateOf = seenSignatures.get(signature);
    if (duplicateOf) {
      skipped.push({ id: row.id, title: row.title, lane, reason: `duplicate content of ${duplicateOf}` });
      continue;
    }
    const alias = `S${sources.length + 1}`;
    seenSignatures.set(signature, alias);
    sources.push({
      id: row.id,
      // Short, stable, mangle-proof citation token. The model is only ever
      // shown this alias (never the raw id), so it cannot truncate a long
      // Outlook id into an ambiguous prefix. The packet manifest maps the alias
      // back to `id`, and the review-page/consumer resolvers do the same.
      alias,
      appDocumentId: row.app_document_id,
      title: row.title || row.file_name || row.id,
      lane,
      projectId: row.project_id,
      source: row.source,
      sourceSystem: row.source_system,
      type: row.type,
      category: row.category,
      storageBucket: row.storage_bucket,
      storagePath: row.storage_path,
      url: row.url || row.source_web_url,
      sourceAt: inclusion.sourceAt,
      inclusionBasis: inclusion.basis,
      usedStorage,
      hasTranscriptMarker,
      charCount: text.length,
      text,
    });
  }
  return { sources, skipped };
}

function groupByLane(sources) {
  const grouped = { meetings: [], emails: [], teams: [], documents: [] };
  for (const source of sources) grouped[source.lane]?.push(source);
  return grouped;
}

function assertLaneCoverage(rows, sources) {
  const included = groupByLane(sources);
  const gaps = [];
  for (const lane of ["meetings", "emails", "teams", "documents"]) {
    if (included[lane].length > 0) continue;
    const inWindowRows = rows.filter((row) => {
      if (classifyLane(row) !== lane) return false;
      const fallback = rowFallbackTimestamp(row);
      return fallback !== null && isInWindow(fallback.getTime());
    });
    if (inWindowRows.length > 0) {
      gaps.push({ lane, inWindowRowCount: inWindowRows.length });
    }
  }
  if (gaps.length === 0) return;
  const message =
    `Lane coverage failure for ${businessDate}: rows exist inside the covered window ` +
    `but zero were included: ${JSON.stringify(gaps)}.`;
  if (shouldWrite && !args["allow-empty-lanes"]) {
    throw new Error(`${message} Fix source inclusion or pass --allow-empty-lanes to override.`);
  }
  console.warn(`[warn] ${message}`);
}

function renderCorpus(sources, skipped) {
  const lines = [
    `# Daily Executive Brief Source Corpus - ${businessDate}`,
    "",
    `Window: ${windowBounds.startIso} to ${windowBounds.endIso} (${TIME_ZONE} business day)`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Included Sources",
    "",
  ];
  const grouped = groupByLane(sources);
  for (const lane of ["meetings", "emails", "teams", "documents"]) {
    lines.push(`### ${lane}`, "");
    if (!grouped[lane].length) {
      lines.push("_No included sources._", "");
      continue;
    }
    for (const source of grouped[lane]) {
      lines.push(
        `- ${source.alias} = ${source.id} | ${source.title} | project=${source.projectName ?? "unassigned"} | sourceAt=${source.sourceAt ?? "unknown"} | chars=${source.charCount} | basis=${source.inclusionBasis} | storage=${source.usedStorage ? "yes" : "no"}`,
      );
    }
    lines.push("");
  }
  lines.push("## Full Source Text", "");
  for (const source of sources) {
    lines.push(
      `### ${source.lane.toUpperCase()} | ${source.title}`,
      "",
      `Source ID: ${source.alias} = ${source.id}`,
      `Project: ${source.projectName ?? "Unassigned"}`,
      `Source at: ${source.sourceAt ?? "unknown"}`,
      `URL: ${source.url ?? "none"}`,
      "",
      "```text",
      cleanText(source.text),
      "```",
      "",
    );
  }
  lines.push("## Skipped Candidates", "", "```json", JSON.stringify(skipped, null, 2), "```", "");
  return lines.join("\n");
}

function sourceForModel(source) {
  return {
    // The model cites this short alias, NOT the raw id — see the alias comment
    // in materializeSources. Keeping the raw id out of the model's context is
    // what makes citations unmangleable.
    id: source.alias,
    lane: source.lane,
    title: source.title,
    project: source.projectName ?? "Unassigned",
    sourceAt: source.sourceAt,
    text: truncate(source.text, MAX_MODEL_CHARS_PER_ITEM),
  };
}

function getProviderConfig() {
  if (process.env.AI_GATEWAY_API_KEY?.trim()) {
    return {
      apiKey: process.env.AI_GATEWAY_API_KEY.trim(),
      baseUrl: AI_GATEWAY_BASE_URL,
      model: model.startsWith("openai/") ? model : `openai/${model}`,
    };
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    return {
      apiKey: process.env.OPENAI_API_KEY.trim(),
      baseUrl: "https://api.openai.com/v1",
      model: model.replace(/^openai[/:]/, ""),
    };
  }
  throw new Error("AI_GATEWAY_API_KEY or OPENAI_API_KEY is required to draft the brief.");
}

async function callModel(messages, maxCompletionTokens = 2200) {
  const provider = getProviderConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${provider.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        max_completion_tokens: maxCompletionTokens,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Daily executive brief model request timed out after ${MODEL_TIMEOUT_MS}ms (${provider.model}).`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload.raw || `Model HTTP ${response.status}`);
  }
  return payload.choices?.[0]?.message?.content?.trim() ?? "";
}

async function summarizeLane(lane, items) {
  if (!items.length) return `No ${lane} sources were found for ${businessDate}.`;
  const chunks = [];
  const batchSize = lane === "emails" ? 20 : 8;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize).map(sourceForModel);
    const content = await callModel(
      [
        {
          role: "system",
          content:
            "You are preparing source notes for an owner-grade construction executive brief. Extract only concrete decisions, risks, money, schedule movement, commitments, blockers, and owner-relevant context. Each source's `id` field is a short citation tag like `S12`; cite it verbatim in backticks (e.g. `S12`) for every fact and NEVER alter, lengthen, shorten, merge, or invent a tag. Always refer to a project by its name (the `project` field) — never by a numeric id, and never write 'Project <number>'. If a source's project is 'Unassigned', say 'an unassigned project'. Do not write generic summaries.",
        },
        {
          role: "user",
          content: JSON.stringify({ businessDate, lane, sources: batch }, null, 2),
        },
      ],
      1800,
    );
    chunks.push(content);
  }
  return chunks.join("\n\n");
}

const LANE_TO_TYPE = { meetings: "meeting", emails: "email", teams: "teams", documents: "document" };

// Which source aliases the model actually cited — from sourceIds arrays and any
// [S12] tags inline in prose — so we only emit link definitions for cited sources.
function collectCitedAliases(structured) {
  const cited = new Set();
  const add = (ids) => {
    for (const id of ids || []) if (id) cited.add(String(id).trim());
  };
  for (const call of structured.callsToday || []) add(call.sourceIds);
  for (const end of structured.looseEnds || []) add(end.sourceIds);
  for (const project of structured.projects || []) {
    for (const item of project.actionItems || []) add(item.sourceIds);
    for (const tag of String(project.context || "").match(/\[(S\d+)\]/g) || []) {
      cited.add(tag.slice(1, -1));
    }
  }
  return cited;
}

function buildSourcesMap(sources, citedAliases) {
  const map = {};
  for (const source of sources) {
    if (!citedAliases.has(source.alias)) continue;
    map[source.alias] = {
      title: source.title,
      type: LANE_TO_TYPE[source.lane] ?? "document",
      url: source.url || null,
      project: source.projectName ?? null,
    };
  }
  return map;
}

const BRIEF_V3_SYSTEM_PROMPT = [
  "You are the strategic advisor to Brandon Clymer, CEO of Alleato Group, a construction general contractor.",
  "From the day's source notes, produce his Daily Executive Brief as STRUCTURED JSON. Write to him in the second person ('you').",
  "",
  "Return ONLY a JSON object of exactly this shape:",
  '{"callsToday":[{"project":"<name>","question":"<the decision as a question/call>","optional":false,"sourceIds":["S12"]}],',
  '"projects":[{"name":"<project name>","urgencyRank":<1 = most urgent>,"hasOwnerDecision":<true if Brandon has a decision/approval here>,"resolvedToday":<true if the only news is that something resolved today>,',
  '"actionItems":[{"ownerIsBrandon":<bool>,"owner":"<person name, or \'You\' if Brandon>","text":"<the action, plain sentence>","due":"<human date like \'July 14\', or null>","dueIso":"<ISO date or null>","urgency":"<honest urgency phrase if no due date, else null>","optional":<bool>,"sourceIds":["S12"]}],',
  '"context":"<advisor-voice prose>"}],',
  '"looseEnds":[{"text":"<item not tied to any project>","sourceIds":["S12"]}],',
  '"sourceCoverage":{"note":"<coverage caveats, or null>","thinLanes":["<lane>"]}}',
  "",
  "Rules:",
  "- Order projects most urgent first. Projects with hasOwnerDecision=true are the priority and come first.",
  "- callsToday lists ONLY Brandon's own decisions — one per decision, phrased as the question, with NO status or context. Every callsToday.project MUST be a project whose hasOwnerDecision is true.",
  "- actionItems ARE the real, trackable tasks that come out of today. Each must be a single concrete piece of work a named person can start and finish — start every `text` with an imperative verb (Send, Confirm, Rebuild, Return, Obtain, Submit, Price, Schedule, Assign, Approve). NEVER an observation, status, restatement, or 'monitor/keep an eye on/stay aligned' filler. If it isn't a doable, checkable action, it is not an actionItem.",
  "- COMBINE related work into ONE task. If two steps would be done together as a single piece of work, merge them into one actionItem (e.g. 'Obtain Uniqlo's written approval on the $35,100 panel and give them the drop-dead decision date' is ONE task, not two). Never emit two near-duplicate items for the same work. Keep only the tasks that actually matter — at most 3 per project; if there are more, keep the highest-leverage ones and drop the rest.",
  "- actionItems hold the WORK; callsToday holds Brandon's open DECISIONS. Do not repeat a callsToday decision as an actionItem. Set ownerIsBrandon=true only when Brandon must personally DO the work (approve, sign, assign an owner) — not when he merely needs to decide. Otherwise owner is the responsible person's name.",
  "- Every actionItem MUST be trackable, which means it MUST have a due date: set both `dueIso` (ISO date) and `due` (human date like 'July 14') on every one. Use a date stated in the sources when one exists. When none is stated, set a realistic TARGET from the urgency — near-term blockers within 2-3 days, routine follow-ups within about a week — and put a short honest note in `urgency` such as 'target — no hard deadline stated'. Never leave dueIso null, and never present an inferred target as a hard external commitment.",
  "- context is plain, complete sentences. Spell out abbreviations ('Uniqlo' not 'UQ', 'certificate of insurance' not 'COI'). Write dates as words ('July 14'). Quote other people verbatim when decision-grade; render Brandon's own directives as his calls, not quotes at him. Do NOT write a how-to-read line.",
  "- Citations: every fact carries its source alias. Put aliases (e.g. S12) in the relevant sourceIds arrays AND inline in context prose wrapped in square brackets like [S12]. NEVER alter, lengthen, shorten, merge, or invent an alias.",
  "- Always refer to a project by its name — never a numeric id, never 'Project <number>'. If a source is 'Unassigned', omit it or fold it into an unassigned note.",
  "- If a source lane is thin, name it in sourceCoverage.",
].join("\n");

function parseModelJson(text) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Best-effort: pull the outermost JSON object if the model added prose.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function draftExecutiveBrief(sources) {
  const grouped = groupByLane(sources);
  const laneNotes = {};
  for (const lane of ["meetings", "emails", "teams", "documents"]) {
    laneNotes[lane] = await summarizeLane(lane, grouped[lane]);
  }

  const userMessage = {
    role: "user",
    content: JSON.stringify(
      {
        businessDate,
        sourceCounts: Object.fromEntries(Object.entries(grouped).map(([key, value]) => [key, value.length])),
        laneNotes,
      },
      null,
      2,
    ),
  };

  // The structured brief is a single JSON generation with no schema enforcement,
  // so an occasional non-JSON reply would otherwise fail the WHOLE brief (and
  // every task/candidate/record downstream). Retry a few times with a corrective
  // nudge before giving up — a transient bad reply must not sink the daily run.
  let parsed = null;
  for (let attempt = 1; attempt <= 3 && !parsed; attempt += 1) {
    const messages = [
      { role: "system", content: BRIEF_V3_SYSTEM_PROMPT },
      userMessage,
    ];
    if (attempt > 1) {
      messages.push({
        role: "system",
        content:
          "Your previous reply was not valid JSON. Return ONLY the single JSON object described above — no prose, no explanation, no markdown code fences.",
      });
    }
    const raw = await callModel(messages, 9000);
    const candidate = parseModelJson(raw);
    if (candidate && typeof candidate === "object") parsed = candidate;
  }
  if (!parsed) {
    throw new Error("Brief model did not return parseable JSON for the structured brief after 3 attempts.");
  }

  const structured = {
    version: "v3",
    businessDate,
    callsToday: Array.isArray(parsed.callsToday) ? parsed.callsToday : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    looseEnds: Array.isArray(parsed.looseEnds) ? parsed.looseEnds : [],
    sourceCoverage: {
      ...Object.fromEntries(
        Object.entries(groupByLane(sources)).map(([key, value]) => [key, value.length]),
      ),
      thinLanes: Array.isArray(parsed.sourceCoverage?.thinLanes) ? parsed.sourceCoverage.thinLanes : [],
      note: parsed.sourceCoverage?.note ? String(parsed.sourceCoverage.note) : null,
    },
    sources: buildSourcesMap(sources, collectCitedAliases({
      callsToday: parsed.callsToday,
      looseEnds: parsed.looseEnds,
      projects: parsed.projects,
    })),
  };

  validateBriefV3(structured);
  return { structured, laneNotes };
}


// --- Candidate B: structured per-project operating records --------------------
// The compiler ALSO emits a structured record per project (from the same full
// transcripts), so every project that gets a fresh summary also gets a fresh
// health read. Shape mirrors project_current_state's columns; the consumer maps
// it straight to the table with no markdown parsing.

const ALLOWED_HEALTH = new Set(["on_track", "watch", "at_risk", "critical", "unknown"]);
const MAX_RECORD_CHARS_PER_SOURCE = 4_000;
const PROJECT_RECORD_BATCH = 5;

function groupSourcesByProject(sources) {
  const byProject = new Map();
  for (const source of sources) {
    const projectId = Number(source.projectId);
    if (!Number.isInteger(projectId) || projectId <= 0) continue; // 0 = unassigned
    if (!source.projectName) continue;
    if (!byProject.has(projectId)) {
      byProject.set(projectId, { projectId, projectName: source.projectName, sources: [] });
    }
    byProject.get(projectId).sources.push({
      id: source.alias,
      title: source.title,
      sourceAt: source.sourceAt,
      text: truncate(source.text, MAX_RECORD_CHARS_PER_SOURCE),
    });
  }
  return Array.from(byProject.values());
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter((item) => item.length > 0).slice(0, 8);
}

function normalizeRecord(raw, projectId, projectName) {
  const health = String(raw?.healthStatus ?? "unknown").toLowerCase().trim();
  return {
    projectId,
    projectName,
    healthStatus: ALLOWED_HEALTH.has(health) ? health : "unknown",
    whatChanged: String(raw?.whatChanged ?? "").trim(),
    needsAttention: normalizeStringArray(raw?.needsAttention),
    openDecisions: normalizeStringArray(raw?.openDecisions),
    activeRisks: normalizeStringArray(raw?.activeRisks),
    financialRead: String(raw?.financialRead ?? "").trim(),
    scheduleRead: String(raw?.scheduleRead ?? "").trim(),
    fieldRead: String(raw?.fieldRead ?? "").trim(),
    confidence:
      typeof raw?.confidence === "number" && raw.confidence >= 0 && raw.confidence <= 1
        ? raw.confidence
        : null,
  };
}

// Emit one structured operating record per project that appears in today's
// sources. Batched to bound context; the model must name a project we asked
// about or its record is dropped.
async function extractProjectRecords(sources) {
  const grouped = groupSourcesByProject(sources);
  if (!grouped.length) return [];
  const records = [];
  for (let i = 0; i < grouped.length; i += PROJECT_RECORD_BATCH) {
    const batch = grouped.slice(i, i + PROJECT_RECORD_BATCH);
    const byName = new Map(batch.map((p) => [p.projectName.toLowerCase(), p]));
    const content = await callModel(
      [
        {
          role: "system",
          content:
            "You assess construction project operating health from source notes and return STRUCTURED JSON. Return ONLY a JSON object of the form " +
            '{"records":[{"projectName":"...","healthStatus":"on_track|watch|at_risk|critical|unknown","whatChanged":"...","needsAttention":["..."],"openDecisions":["..."],"activeRisks":["..."],"financialRead":"...","scheduleRead":"...","fieldRead":"...","confidence":0.0}]} ' +
            "— one record per project in the input, using the project's EXACT projectName. Ground every field in the provided sources; NEVER invent, and NEVER paste raw email/transcript text — write concise owner-grade phrases. If a dimension has no evidence use an empty string or empty array. Use healthStatus 'unknown' when evidence is too thin to judge. Keep each list item to one short clause.",
        },
        { role: "user", content: JSON.stringify({ businessDate, projects: batch }, null, 2) },
      ],
      2600,
    );
    const parsed = parseModelJson(content);
    const rawRecords = Array.isArray(parsed?.records) ? parsed.records : [];
    for (const raw of rawRecords) {
      const match = byName.get(String(raw?.projectName ?? "").toLowerCase().trim());
      if (!match) continue; // model must name a project we asked about
      records.push(normalizeRecord(raw, match.projectId, match.projectName));
    }
  }
  return records;
}

async function writePacket({ sources, structured, briefMarkdown, laneNotes, projectRecords = [] }) {
  return withPg(getAppDatabaseUrl(), { includeSslMode: false }, async (client) => {
    await client.query("begin");
    try {
      const targetResult = await client.query(
        `
          insert into public.intelligence_targets (target_type, name, slug, description, status, priority, metadata, last_signal_at)
          values (
            'company_process',
            'Daily Executive Brief',
            'daily-executive-brief',
            'Manual source-of-truth daily executive brief built from transcripts, emails, Teams messages, and documents.',
            'active',
            'high',
            $1::jsonb,
            $2::timestamptz
          )
          on conflict (slug) do update
            set description = excluded.description,
                status = 'active',
                priority = 'high',
                metadata = public.intelligence_targets.metadata || excluded.metadata,
                last_signal_at = excluded.last_signal_at,
                updated_at = now()
          returning id
        `,
        [
          JSON.stringify({ created_by: COMPILER_VERSION, source_of_truth: "manual_daily_source_bundle" }),
          windowBounds.endIso,
        ],
      );
      const targetId = targetResult.rows[0].id;
      if (packetType === "current") {
        await client.query(
          `
            update public.intelligence_packets
            set packet_type = 'snapshot'
            where target_id = $1::uuid and packet_type = 'current'
          `,
          [targetId],
        );
      }
      const sourceCoverage = {
        businessDate,
        window: windowBounds,
        sourceCounts: Object.fromEntries(
          Object.entries(groupByLane(sources)).map(([key, value]) => [key, value.length]),
        ),
        sourceIds: sources.map((source) => source.id),
      };
      const packetJson = {
        kind: "daily_deep_read",
        businessDate,
        generatedAt: new Date().toISOString(),
        // Structured v3 brief is the source of truth; consumers read this, not
        // markdown section headings. briefMarkdown is one rendered view of it.
        brief: structured,
        briefMarkdown,
        laneNotes,
        sourceSet: {
          sources: sources.map((source) => ({
            id: source.id,
            alias: source.alias,
            title: source.title,
            lane: source.lane,
            projectId: source.projectId,
            projectName: source.projectName ?? null,
            sourceAt: source.sourceAt,
            url: source.url,
          })),
        },
        // Candidate B: structured per-project operating records the consumer
        // maps straight into project_current_state (health/risks/financials),
        // so those fields refresh with the summary instead of going stale.
        projectRecords,
      };
      const packetResult = await client.query(
        `
          insert into public.intelligence_packets (
            target_id,
            packet_type,
            packet_version,
            generated_at,
            covered_start_at,
            covered_end_at,
            freshness_status,
            executive_summary,
            current_status,
            strategic_read,
            why_it_matters,
            recommended_next_moves,
            confidence_summary,
            source_coverage,
            review_queue_count,
            stale_item_count,
            packet_json,
            compiler_version
          )
          values (
            $1::uuid,
            $13::text,
            'v1',
            now(),
            $2::timestamptz,
            $3::timestamptz,
            'fresh',
            $4::text,
            $5::text,
            $6::text,
            $7::text,
            $8::text[],
            $9::jsonb,
            $10::jsonb,
            0,
            0,
            $11::jsonb,
            $12::text
          )
          returning id, generated_at
        `,
        [
          targetId,
          windowBounds.startIso,
          windowBounds.endIso,
          briefMarkdown.slice(0, 4000),
          `Daily executive brief for ${businessDate}`,
          briefMarkdown,
          "Manual source-of-truth packet built from the raw daily source bundle.",
          nextMovesFromBriefV3(structured),
          JSON.stringify({
            confidence: "medium",
            basis: "Manual full-source bundle with source lane counts; model drafted from assembled source notes.",
          }),
          JSON.stringify(sourceCoverage),
          JSON.stringify(packetJson),
          COMPILER_VERSION,
          packetType,
        ],
      );
      await client.query("commit");
      return { targetId, packetId: packetResult.rows[0].id, generatedAt: packetResult.rows[0].generated_at };
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

function runConsumersForPacket(packetId) {
  const scriptArgs = ["scripts/intelligence/daily-deep-read-consumers.mjs", "--packetId", packetId];
  const result = spawnSync(process.execPath, scriptArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  let parsed = null;
  const stdout = String(result.stdout || "").trim();
  const jsonStart = stdout.lastIndexOf("\n{");
  try {
    parsed = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart + 1) : stdout);
  } catch {
    parsed = null;
  }
  if (result.status !== 0) {
    throw new Error(
      `Daily Deep Read packet ${packetId} was written, but the consumer run failed ` +
        `(exit ${result.status}). Rerun: node ${scriptArgs.join(" ")}\n${String(result.stderr || "").slice(0, 4000)}`,
    );
  }
  return parsed ?? { ok: true, packetId, note: "consumer output was not parseable JSON" };
}

async function main() {
  await fs.mkdir(evidenceDir, { recursive: true });
  const rows = await fetchRows();
  const { sources, skipped } = await materializeSources(rows);
  const projectNames = await fetchProjectNames(sources.map((s) => s.projectId));
  for (const source of sources) {
    const key = Number(source.projectId);
    source.projectName = Number.isFinite(key)
      ? (projectNames.get(key) ?? null)
      : null;
  }
  // #807: backstop the upstream project classifier against each source's title.
  const allProjects = await fetchAllProjects();
  const attributionCorrections = correctAttribution(sources, allProjects);
  if (attributionCorrections.length) {
    console.error(`[attribution] re-attributed ${attributionCorrections.length} source(s) from title mismatch:`);
    for (const correction of attributionCorrections) {
      console.error(
        `  ${correction.alias} "${correction.title}": ${correction.from.projectName ?? "unassigned"} -> ${correction.to.projectName}`,
      );
    }
  }
  assertLaneCoverage(rows, sources);
  const corpusMarkdown = renderCorpus(sources, skipped);
  await fs.writeFile(path.join(evidenceDir, "source-corpus.md"), corpusMarkdown);
  await fs.writeFile(
    path.join(evidenceDir, "source-manifest.json"),
    JSON.stringify(
      {
        businessDate,
        window: windowBounds,
        generatedAt: new Date().toISOString(),
        shouldWrite,
        rowsConsidered: rows.length,
        attributionCorrections,
        sources: sources.map(({ text, ...source }) => source),
        skipped,
      },
      null,
      2,
    ),
  );

  if (args["sources-only"]) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: "sources-only",
          businessDate,
          evidenceDir,
          rowsConsidered: rows.length,
          included: Object.fromEntries(
            Object.entries(groupByLane(sources)).map(([key, value]) => [key, value.length]),
          ),
          skipped: skipped.length,
        },
        null,
        2,
      ),
    );
    return;
  }

  const { structured, laneNotes } = await draftExecutiveBrief(sources);
  const briefMarkdown = renderBriefMarkdownV3(structured);
  await fs.writeFile(path.join(evidenceDir, "brief.md"), briefMarkdown);
  await fs.writeFile(path.join(evidenceDir, "brief.json"), JSON.stringify(structured, null, 2));

  // Candidate B: structured per-project operating records (health/risks/etc).
  // Written to evidence ALWAYS (incl. --dry-run) so quality is inspectable
  // without a production packet write.
  const projectRecords = await extractProjectRecords(sources);
  await fs.writeFile(
    path.join(evidenceDir, "project-records.json"),
    JSON.stringify({ businessDate, count: projectRecords.length, projectRecords }, null, 2),
  );

  let packet = null;
  let consumers = null;
  if (shouldWrite) {
    packet = await writePacket({ sources, structured, briefMarkdown, laneNotes, projectRecords });
    await fs.writeFile(path.join(evidenceDir, "packet-write.json"), JSON.stringify(packet, null, 2));
    if (!args["skip-consumers"]) {
      consumers = runConsumersForPacket(packet.packetId);
      await fs.writeFile(path.join(evidenceDir, "consumer-run.json"), JSON.stringify(consumers, null, 2));
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        businessDate,
        evidenceDir,
        rowsConsidered: rows.length,
        included: Object.fromEntries(Object.entries(groupByLane(sources)).map(([key, value]) => [key, value.length])),
        skipped: skipped.length,
        packet,
        consumers,
      },
      null,
      2,
    ),
  );
}

// Pure helpers exported for unit testing (no DB, no model). The CLI entry point
// only runs when this file is executed directly, not when imported.
export {
  parseModelJson,
  buildSourcesMap,
  collectCitedAliases,
  renderBriefMarkdownV3,
  validateBriefV3,
  contentSignature,
  projectIdFromTitle,
  correctAttribution,
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
