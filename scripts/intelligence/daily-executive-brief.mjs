#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import dotenv from "dotenv";
import pg from "pg";

import {
  buildAppDatabaseConnectionString,
  getAppDatabaseUrl,
  getRagDatabaseUrl,
} from "../verify/app-db-connection.mjs";

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

async function materializeSources(rows) {
  const sources = [];
  const skipped = [];
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
    sources.push({
      id: row.id,
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
        `- ${source.id} | ${source.title} | project=${source.projectId ?? "none"} | sourceAt=${source.sourceAt ?? "unknown"} | chars=${source.charCount} | basis=${source.inclusionBasis} | storage=${source.usedStorage ? "yes" : "no"}`,
      );
    }
    lines.push("");
  }
  lines.push("## Full Source Text", "");
  for (const source of sources) {
    lines.push(
      `### ${source.lane.toUpperCase()} | ${source.title}`,
      "",
      `Source ID: ${source.id}`,
      `Project ID: ${source.projectId ?? "none"}`,
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
    id: source.id,
    lane: source.lane,
    title: source.title,
    projectId: source.projectId,
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
            "You are preparing source notes for an owner-grade construction executive brief. Extract only concrete decisions, risks, money, schedule movement, commitments, blockers, and owner-relevant context. Preserve source IDs. Do not write generic summaries.",
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

async function draftExecutiveBrief(sources) {
  const grouped = groupByLane(sources);
  const laneNotes = {};
  for (const lane of ["meetings", "emails", "teams", "documents"]) {
    laneNotes[lane] = await summarizeLane(lane, grouped[lane]);
  }

  const brief = await callModel(
    [
      {
        role: "system",
        content:
          "You write Daily Deep Read packets for a construction company owner. The brief must be useful in under two minutes: decisions needed, money exposure, schedule risk, client/vendor issues, project-specific movement, and follow-ups. Be direct. Cite source IDs inline. Do not write a chronological recap. If evidence is thin, say exactly which lane is thin. Use these exact markdown section headings: ## Executive Brief, ## Highest-Leverage Owner Decisions, ## Project Intelligence Updates, ## Risk Candidates, ## Decision Candidates, ## Task Candidates, ## Initiative Candidates, ## Source Coverage, ## Automation Instructions Learned.",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            businessDate,
            instruction:
              "Write the Daily Executive Brief from these source notes. Include: Executive read, critical decisions, financial/watch items, schedule/operations watch, project-by-project notes, follow-ups, and source coverage.",
            sourceCounts: Object.fromEntries(Object.entries(grouped).map(([key, value]) => [key, value.length])),
            laneNotes,
          },
          null,
          2,
        ),
      },
    ],
    3500,
  );

  return { brief: brief.replace(/^#\s+Daily Executive Brief[^\n]*\n+/i, "").trim(), laneNotes };
}

function nextMovesFromBrief(brief) {
  const lines = brief
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);
  return lines
    .filter((line) => /\b(follow|decide|confirm|review|approve|call|send|collect|resolve|assign|escalate)\b/i.test(line))
    .slice(0, 8);
}

function bulletLinesFromBrief(brief, pattern, limit = 8) {
  const lines = String(brief || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line));
  return lines
    .filter((line) => pattern.test(line))
    .slice(0, limit);
}

function firstSourceIdFromBrief(brief) {
  return String(brief || "").match(/\[([^\]]+)\]/)?.[1]?.split(",")?.[0]?.trim() ?? null;
}

function fallbackBullet(title, summary, brief) {
  const sourceId = firstSourceIdFromBrief(brief);
  return `- **${title}**: ${summary}${sourceId ? ` [${sourceId}]` : ""}`;
}

function sectionBlock(title, body) {
  return [`## ${title}`, "", body.trim()].join("\n");
}

function buildMissingSection(title, brief, sources, skipped) {
  const riskLines = bulletLinesFromBrief(
    brief,
    /\b(risk|blocked|blocker|delay|delayed|slip|slipped|exposure|unpaid|missing|hold|shutdown|not validated|not commit)\b/i,
  );
  const decisionLines = bulletLinesFromBrief(brief, /\b(decide|approve|push|escalate|confirm|review)\b/i);
  const taskLines = bulletLinesFromBrief(brief, /\b(follow|confirm|send|collect|resolve|assign|finish|return|insert|price|schedule)\b/i);
  const initiativeLines = bulletLinesFromBrief(brief, /\b(lock|control|workflow|source of truth|permanent|system|automation|prevent)\b/i);

  switch (title) {
    case "Risk Candidates":
      return (
        riskLines.join("\n") ||
        fallbackBullet(
          "Daily operational exposure review",
          "Review the Executive Brief and Project Intelligence Updates for schedule, money, permit, and coordination exposure before promotion.",
          brief,
        )
      );
    case "Decision Candidates":
      return (
        decisionLines.join("\n") ||
        fallbackBullet(
          "Owner decision review",
          "Review the Highest-Leverage Owner Decisions section and promote only decisions that have a clear owner action.",
          brief,
        )
      );
    case "Task Candidates":
      return (
        taskLines.join("\n") ||
        nextMovesFromBrief(brief)
          .map((line) => `- ${line}`)
          .join("\n") ||
        fallbackBullet(
          "Daily follow-up review",
          "Review source-backed follow-ups in the packet before creating assigned tasks.",
          brief,
        )
      );
    case "Initiative Candidates":
      return (
        initiativeLines.join("\n") ||
        fallbackBullet(
          "Daily Deep Read operating control",
          "Use the packet to identify recurring process controls that should become durable project intelligence improvements.",
          brief,
        )
      );
    case "Source Coverage":
      return [
        "```json",
        JSON.stringify(
          {
            businessDate,
            window: windowBounds,
            included: Object.fromEntries(
              Object.entries(groupByLane(sources)).map(([key, value]) => [key, value.length]),
            ),
            skipped: skipped.length,
          },
          null,
          2,
        ),
        "```",
      ].join("\n");
    case "Automation Instructions Learned":
      return [
        "- Keep Daily Deep Read synthesis packet-first: full transcript/email/Teams/document source notes create the packet; RAG chunks support search and citation only.",
        "- Promote tasks, risks, decisions, initiatives, and project updates through review-gated candidates before updating project intelligence packets.",
        "- Fail loudly when required sections are missing instead of writing incomplete packets.",
      ].join("\n");
    default:
      return "No source-backed content identified.";
  }
}

function ensureDailyDeepReadSections(brief, sources, skipped) {
  const sections = markdownSections(brief);
  const blocks = [String(brief || "").trim()];
  for (const title of REQUIRED_DEEP_READ_SECTIONS) {
    if (sections[title]) continue;
    blocks.push(sectionBlock(title, buildMissingSection(title, brief, sources, skipped)));
  }
  return blocks.filter(Boolean).join("\n\n").trim();
}

function markdownSections(markdown) {
  const sections = {};
  let current = null;
  const lines = String(markdown || "").split(/\r?\n/);
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      current = heading[1].trim();
      sections[current] = "";
      continue;
    }
    if (current) {
      sections[current] = `${sections[current]}${sections[current] ? "\n" : ""}${line}`;
    }
  }
  return Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, String(value).trim()]));
}

const REQUIRED_DEEP_READ_SECTIONS = [
  "Executive Brief",
  "Highest-Leverage Owner Decisions",
  "Project Intelligence Updates",
  "Risk Candidates",
  "Decision Candidates",
  "Task Candidates",
  "Initiative Candidates",
  "Source Coverage",
  "Automation Instructions Learned",
];

function validateDailyDeepReadSections(sections) {
  const missing = REQUIRED_DEEP_READ_SECTIONS.filter((section) => !sections[section]);
  if (missing.length > 0) {
    throw new Error(`Daily Deep Read brief missing required sections: ${missing.join(", ")}`);
  }
}

async function writePacket({ sources, brief, laneNotes }) {
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
      const sections = markdownSections(brief);
      validateDailyDeepReadSections(sections);
      const packetJson = {
        kind: "daily_deep_read",
        businessDate,
        generatedAt: new Date().toISOString(),
        briefMarkdown: brief,
        sections,
        laneNotes,
        sourceSet: {
          sources: sources.map((source) => ({
            id: source.id,
            title: source.title,
            lane: source.lane,
            projectId: source.projectId,
            sourceAt: source.sourceAt,
            url: source.url,
          })),
        },
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
          brief.slice(0, 4000),
          `Daily executive brief for ${businessDate}`,
          brief,
          "Manual source-of-truth packet built from the raw daily source bundle.",
          nextMovesFromBrief(brief),
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

  const { brief, laneNotes } = await draftExecutiveBrief(sources);
  const packetBrief = ensureDailyDeepReadSections(brief, sources, skipped);
  const briefMarkdown = [
    `# Daily Executive Brief - ${businessDate}`,
    "",
    packetBrief,
    "",
  ].join("\n");
  await fs.writeFile(path.join(evidenceDir, "brief.md"), briefMarkdown);

  let packet = null;
  let consumers = null;
  if (shouldWrite) {
    packet = await writePacket({ sources, brief: packetBrief, laneNotes });
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

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
