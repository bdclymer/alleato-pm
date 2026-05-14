#!/usr/bin/env node

/**
 * AI Assistant Eval Suite Runner
 * ------------------------------
 * Loads the prompt corpus from docs/ai-plan/evals/assistant-eval-suite.json,
 * POSTs each prompt to /api/ai-assistant/chat using the saved Playwright auth
 * cookies, drains the SSE stream, then queries chat_history.metadata.tool_trace
 * to score tool coverage and answer-quality assertions.
 *
 * Usage:
 *   node scripts/verify/verify_ai_assistant_eval_suite.mjs              # full suite
 *   node scripts/verify/verify_ai_assistant_eval_suite.mjs --case <id>  # single case
 *   node scripts/verify/verify_ai_assistant_eval_suite.mjs --bundle <name>
 *   node scripts/verify/verify_ai_assistant_eval_suite.mjs --filter <regex>
 *   AI_EVAL_BASE_URL=https://alleato.example.com node ... # remote target
 *
 * Outputs:
 *   docs/ai-plan/evals/runs/<timestamp>/results.json
 *   docs/ai-plan/evals/runs/<timestamp>/summary.md
 *   docs/ai-plan/evals/runs/<timestamp>/<case-id>.json (per-case full trace)
 */

import fs from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { setDefaultResultOrder } from "node:dns";
import { lookup } from "node:dns/promises";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

setDefaultResultOrder("ipv4first");

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");

dotenv.config({ path: path.join(repoRoot, ".env"), quiet: true });
dotenv.config({ path: path.join(repoRoot, "frontend/.env.local"), quiet: true });

const SUITE_PATH = path.join(repoRoot, "docs/ai-plan/evals/assistant-eval-suite.json");
const AUTH_PATH = path.join(repoRoot, "frontend/tests/.auth/user.json");
const PUBLISHED_ASSISTANT_EVAL_RUNS_PATH = path.join(
  repoRoot,
  "frontend/src/data/assistant-eval-runs.json",
);
const BASE_URL = process.env.AI_EVAL_BASE_URL || "http://localhost:3000";
const CHAT_ENDPOINT = `${BASE_URL}/api/ai-assistant/chat`;
const CASE_TIMEOUT_MS = Number(process.env.AI_EVAL_CASE_TIMEOUT_MS ?? 90_000);
const POLL_INTERVAL_MS = 750;
const POLL_MAX_MS = 15_000;
const DEFAULT_WARN_DURATION_MS = Number(
  suiteSafeNumber(process.env.AI_EVAL_WARN_DURATION_MS) ?? 30_000,
);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const args = process.argv.slice(2);
function flagValue(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}
const onlyCase = flagValue("--case");
const bundleName = flagValue("--bundle");
const filterPattern = flagValue("--filter");

function suiteSafeNumber(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// ───────────────────────────────────────────────────────────── Suite load
const suiteRaw = await fs.readFile(SUITE_PATH, "utf8");
const suite = JSON.parse(suiteRaw);
const bundle = bundleName ? suite.evalBundles?.[bundleName] : null;
if (bundleName && !bundle) {
  console.error(`Unknown eval bundle: ${bundleName}`);
  console.error("Available bundles:");
  for (const name of Object.keys(suite.evalBundles ?? {})) console.error(`  - ${name}`);
  process.exit(1);
}
const effectiveFilterPattern = filterPattern ?? bundle?.filter;
const allCases = suite.cases ?? [];
const cases = allCases.filter((c) => {
  if (onlyCase && c.id !== onlyCase) return false;
  if (effectiveFilterPattern && !new RegExp(effectiveFilterPattern).test(c.id)) return false;
  return true;
});
if (cases.length === 0) {
  console.error("No cases matched. Available case IDs:");
  for (const c of allCases) console.error(`  - ${c.id}`);
  process.exit(1);
}

// ───────────────────────────────────────────────────────── Auth + run dir
const authState = existsSync(AUTH_PATH)
  ? JSON.parse(await fs.readFile(AUTH_PATH, "utf8"))
  : { cookies: [], origins: [] };
let cookieHeader = (authState.cookies ?? [])
  .map((c) => `${c.name}=${c.value}`)
  .join("; ");

// ─────────────────────────────────────────────────────── Auth refresh
const SUPABASE_URL = process.env.AI_EVAL_SUPABASE_URL || "https://lgveqfnpkxvzbnnwuled.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.AI_EVAL_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndmVxZm5wa3h2emJubnd1bGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTQxNjYsImV4cCI6MjA3MDgzMDE2Nn0.g56kDPUokoJpWY7vXd3GTMXpOc4WFOU0hDVWfGMZtO8";
const SUPABASE_EMAIL = process.env.AI_EVAL_SUPABASE_EMAIL || "test1@mail.com";
const SUPABASE_PASSWORD = process.env.AI_EVAL_SUPABASE_PASSWORD || "test12026!!!";
const SUPABASE_COOKIE_NAME = "sb-lgveqfnpkxvzbnnwuled-auth-token";
const SUPABASE_PROJECT_REF = "lgveqfnpkxvzbnnwuled";
const SUPABASE_POOLER_HOST = "aws-1-us-east-2.pooler.supabase.com";
const REFRESH_BUFFER_SEC = 5 * 60; // refresh if expiring within 5 minutes
const AUTH_REFRESH_RETRIES = 3;

function getCookieExpiry(header) {
  // Find the auth cookie in the header string and decode its expiry.
  // Cookie value format: base64-<base64-encoded-JSON>
  // The JSON contains { expires_at: <unix-seconds> }
  const match = header.match(
    new RegExp(`${SUPABASE_COOKIE_NAME}=([^;]+)`),
  );
  if (!match) return null;
  try {
    let value = match[1];
    if (value.startsWith("base64-")) value = value.slice("base64-".length);
    const decoded = Buffer.from(value, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    return typeof parsed.expires_at === "number" ? parsed.expires_at : null;
  } catch {
    return null;
  }
}

async function refreshAuthIfNeeded() {
  const expiresAt = getCookieExpiry(cookieHeader);
  const nowSec = Math.floor(Date.now() / 1000);

  if (expiresAt !== null && expiresAt - nowSec > REFRESH_BUFFER_SEC) {
    // Token still valid with enough headroom — nothing to do.
    return cookieHeader;
  }

  // Token is missing, expired, or expiring soon — fetch a fresh one.
  if (!cookieHeader) {
    console.log(`[auth] Auth state missing or empty at ${AUTH_PATH}; creating a fresh eval session.`);
  }
  let res = null;
  let lastAuthError = null;
  for (let attempt = 1; attempt <= AUTH_REFRESH_RETRIES; attempt += 1) {
    try {
      res = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email: SUPABASE_EMAIL, password: SUPABASE_PASSWORD }),
        },
      );
      if (res.ok || res.status < 500 || attempt === AUTH_REFRESH_RETRIES) break;
      lastAuthError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      lastAuthError = error;
      if (attempt === AUTH_REFRESH_RETRIES) break;
    }
    const backoffMs = 500 * attempt;
    console.warn(`[auth] Refresh attempt ${attempt} failed; retrying in ${backoffMs}ms.`);
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }

  if (!res?.ok) {
    const text = res ? await res.text().catch(() => "") : String(lastAuthError?.message ?? "unknown error");
    throw new Error(`Auth refresh failed (HTTP ${res?.status ?? "unknown"}): ${text.slice(0, 200)}`);
  }

  const session = await res.json();
  const {
    access_token,
    token_type,
    expires_in,
    expires_at: newExpiresAt,
    refresh_token,
    user,
  } = session;

  // Encode new cookie value in the same format Supabase sets via the browser.
  const payload = JSON.stringify({ access_token, token_type, expires_in, expires_at: newExpiresAt, refresh_token, user });
  const encoded = `base64-${Buffer.from(payload).toString("base64")}`;

  // Patch the in-memory authState and persist it back to the file.
  const existingCookieIndex = (authState.cookies ?? []).findIndex(
    (c) => c.name === SUPABASE_COOKIE_NAME,
  );
  const newCookie = {
    name: SUPABASE_COOKIE_NAME,
    value: encoded,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  };
  if (existingCookieIndex >= 0) {
    authState.cookies[existingCookieIndex] = {
      ...authState.cookies[existingCookieIndex],
      value: encoded,
    };
  } else {
    authState.cookies = [...(authState.cookies ?? []), newCookie];
  }
  mkdirSync(path.dirname(AUTH_PATH), { recursive: true });
  await fs.writeFile(AUTH_PATH, JSON.stringify(authState, null, 2));

  // Rebuild the cookie header string.
  cookieHeader = authState.cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const expiryIso = newExpiresAt
    ? new Date(newExpiresAt * 1000).toISOString()
    : "(unknown)";
  console.log(`[auth] Token refreshed, expires ${expiryIso}`);

  return cookieHeader;
}

const runStamp = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
const runDir = path.join(repoRoot, "docs/ai-plan/evals/runs", runStamp);
mkdirSync(runDir, { recursive: true });

// ─────────────────────────────────────────────────────────────── DB pool
async function buildDatabaseConnectionString() {
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete("sslmode");

  if (url.hostname === `db.${SUPABASE_PROJECT_REF}.supabase.co`) {
    url.hostname = SUPABASE_POOLER_HOST;
    url.port = url.port || "5432";
    if (url.username === "postgres") {
      url.username = `postgres.${SUPABASE_PROJECT_REF}`;
    }
  }

  if (!/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
    try {
      const { address, family } = await lookup(url.hostname, { family: 4 });
      if (family === 4) url.hostname = address;
    } catch (error) {
      console.warn(`[db] IPv4 hostname lookup failed for ${url.hostname}: ${error.message}`);
    }
  }

  return url.toString();
}

const pool = new pg.Pool({
  connectionString: await buildDatabaseConnectionString(),
  ssl: { rejectUnauthorized: false },
  max: 2,
});

// ───────────────────────────────────────────────────────── Helpers
function tokenizeUserId() {
  // Decode the supabase auth cookie to extract the user id for chat_history filtering.
  const cookie = (authState.cookies ?? []).find((c) =>
    c.name.startsWith("sb-") && c.name.endsWith("-auth-token"),
  );
  if (!cookie) return null;
  try {
    let value = cookie.value;
    if (value.startsWith("base64-")) value = value.slice("base64-".length);
    const decoded = Buffer.from(value, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    return parsed?.user?.id ?? parsed?.access_token_payload?.sub ?? null;
  } catch (error) {
    return null;
  }
}
async function postPromptAndDrain(testCase, sessionId, messageId) {
  const currentCookieHeader = await refreshAuthIfNeeded();
  const messages = Array.isArray(testCase.messages) && testCase.messages.length > 0
    ? testCase.messages.map((message, index) => ({
        id: message.id ?? (index === testCase.messages.length - 1 ? messageId : randomUUID()),
        role: message.role,
        parts: [{ type: "text", text: message.content ?? message.text ?? "" }],
      }))
    : [
        {
          id: messageId,
          role: "user",
          parts: [{ type: "text", text: testCase.prompt }],
        },
      ];

  const body = {
    id: sessionId,
    selectedProjectId: testCase.selectedProjectId,
    messages,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CASE_TIMEOUT_MS);
  const startedAt = Date.now();

  let response;
  try {
    response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: currentCookieHeader,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    return {
      httpStatus: 0,
      streamText: "",
      streamEvents: [],
      streamError: error.message,
      durationMs: Date.now() - startedAt,
    };
  }

  if (!response.ok) {
    clearTimeout(timer);
    const text = await response.text().catch(() => "");
    return {
      httpStatus: response.status,
      streamText: text,
      streamEvents: [],
      streamError: `HTTP ${response.status}: ${text.slice(0, 400)}`,
      durationMs: Date.now() - startedAt,
    };
  }

  const reader = response.body?.getReader();
  if (!reader) {
    clearTimeout(timer);
    return {
      httpStatus: response.status,
      streamText: "",
      streamEvents: [],
      streamError: "No readable stream",
      durationMs: Date.now() - startedAt,
    };
  }

  const decoder = new TextDecoder();
  const streamEvents = [];
  let buffer = "";
  let textAccumulator = "";
  let midStreamError = null;
  try {
    while (true) {
      let chunk;
      try {
        chunk = await reader.read();
      } catch (error) {
        midStreamError = `stream read error: ${error.message ?? String(error)}`;
        break;
      }
      const { done, value } = chunk;
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line || !line.startsWith("data:")) continue;
        const payload = line.slice("data:".length).trim();
        if (payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          streamEvents.push(evt);
          if (evt.type === "text-delta" && typeof evt.delta === "string") {
            textAccumulator += evt.delta;
          } else if (evt.type === "text" && typeof evt.text === "string") {
            textAccumulator += evt.text;
          }
        } catch {
          // Non-JSON SSE frame; ignore.
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }

  return {
    httpStatus: response.status,
    streamText: textAccumulator,
    streamEvents,
    streamError: midStreamError,
    durationMs: Date.now() - startedAt,
  };
}

async function fetchPersistedAssistantMessage(sessionId) {
  const deadline = Date.now() + POLL_MAX_MS;
  let lastLookupError = null;
  while (Date.now() < deadline) {
    try {
      const result = await pool.query(
        `select id, role, content, metadata, created_at
         from public.chat_history
         where session_id = $1 and role = 'assistant'
         order by created_at desc
         limit 1`,
        [sessionId],
      );
      if (result.rows.length > 0) return result.rows[0];
    } catch (error) {
      lastLookupError = error;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  if (lastLookupError) {
    console.warn(
      `\n[warn] persisted assistant lookup failed for session ${sessionId}: ${lastLookupError.message}`,
    );
  }
  return null;
}

function extractToolNames(metadata) {
  const trace = metadata?.tool_trace;
  if (!Array.isArray(trace)) return [];
  return trace
    .map((entry) => entry?.tool ?? entry?.toolName ?? entry?.name)
    .filter((name) => typeof name === "string");
}

function extractStreamToolNames(streamEvents) {
  if (!Array.isArray(streamEvents)) return [];
  const toolNames = streamEvents
    .map((event) => event?.toolName)
    .filter((name) => typeof name === "string");
  const retrievalToolMap = {
    recent_emails: "getRecentEmails",
    source_specific_rag: "sourceSpecificRagRetrieval",
    semantic_search: "semanticSearch",
    project_snapshot: "getProjectBriefingSnapshot",
    intelligence_packet: "loadIntelligencePacket",
    brandon_daily: "generateDailyBrief",
  };
  for (const event of streamEvents) {
    const durations = event?.data?.durations;
    if (!durations || typeof durations !== "object") continue;
    for (const source of Object.keys(durations)) {
      const mapped = retrievalToolMap[source];
      if (mapped) toolNames.push(mapped);
    }
  }
  return toolNames;
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string"))];
}

function metadataPath(metadata, pathExpression) {
  return String(pathExpression)
    .split(".")
    .filter(Boolean)
    .reduce((value, key) => {
      if (value == null) return undefined;
      if (Array.isArray(value) && /^\d+$/.test(key)) return value[Number(key)];
      if (typeof value === "object") return value[key];
      return undefined;
    }, metadata);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsForbiddenPhrase(text, phrase) {
  const normalizedPhrase = String(phrase);
  if (/^[A-Za-z0-9]+$/.test(normalizedPhrase)) {
    return new RegExp(`\\b${escapeRegExp(normalizedPhrase)}\\b`, "i").test(text);
  }
  return text.toLowerCase().includes(normalizedPhrase.toLowerCase());
}

const qualityRank = { low: 1, medium: 2, high: 3 };

function scoreCase(testCase, runOutput, persisted) {
  const failures = [];
  const warnings = [];
  const observations = [];

  const finalText = (
    persisted?.content && typeof persisted.content === "string"
      ? persisted.content
      : runOutput.streamText
  ).trim();

  if (runOutput.streamError) {
    failures.push(`stream error: ${runOutput.streamError}`);
  }
  if (runOutput.httpStatus && runOutput.httpStatus !== 200) {
    failures.push(`HTTP ${runOutput.httpStatus}`);
  }

  const persistedToolNames = extractToolNames(persisted?.metadata);
  const streamToolNames = extractStreamToolNames(runOutput.streamEvents);
  const toolNames = uniqueStrings([...persistedToolNames, ...streamToolNames]);
  observations.push(`tools fired: ${toolNames.join(", ") || "(none)"}`);

  if (!persisted) {
    failures.push("assistant message was not persisted to chat_history");
  }

  // Tool coverage check (any-of semantics — passes if at least one of the
  // expected tools fired). Empty expectedToolNames means no expectation.
  const expectedTools = testCase.expectedToolNames ?? [];
  if (expectedTools.length > 0) {
    const hit = expectedTools.some((name) => toolNames.includes(name));
    if (!hit) {
      failures.push(
        `expected at least one of [${expectedTools.join(", ")}] to fire — none did`,
      );
    }
  }

  // Required tool check (all-of semantics). Use this for action safety,
  // planner, source-health, and task-management gates where any-of is too weak.
  const expectedAllTools = testCase.expectedAllToolNames ?? [];
  for (const name of expectedAllTools) {
    if (!toolNames.includes(name)) {
      failures.push(`expected required tool '${name}' to fire`);
    }
  }

  for (const name of testCase.forbiddenToolNames ?? []) {
    if (toolNames.includes(name)) {
      failures.push(`forbidden tool fired: '${name}'`);
    }
  }

  // Family coverage — soft signal
  const expectedFamilies = testCase.expectedToolFamilies ?? [];
  const familyMap = suite.toolFamilyMap ?? {};
  const familiesHit = new Set();
  for (const [family, names] of Object.entries(familyMap)) {
    if (names.some((n) => toolNames.includes(n))) familiesHit.add(family);
  }
  for (const family of expectedFamilies) {
    if (!familiesHit.has(family)) {
      warnings.push(`expected family '${family}' not represented`);
    }
  }

  // Substring assertions
  const lower = finalText.toLowerCase();
  for (const phrase of testCase.mustInclude ?? []) {
    if (!lower.includes(phrase.toLowerCase())) {
      failures.push(`mustInclude missing: "${phrase}"`);
    }
  }
  for (const anyGroup of testCase.mustIncludeAny ?? []) {
    const options = Array.isArray(anyGroup) ? anyGroup : [anyGroup];
    const hit = options.some((phrase) => lower.includes(String(phrase).toLowerCase()));
    if (!hit) {
      failures.push(`mustIncludeAny missing one of: ${options.map((p) => `"${p}"`).join(", ")}`);
    }
  }
  for (const phrase of testCase.mustExclude ?? []) {
    if (lower.includes(phrase.toLowerCase())) {
      failures.push(`mustExclude present: "${phrase}"`);
    }
  }
  for (const phrase of suite.globalForbiddenPhrases ?? []) {
    if (containsForbiddenPhrase(finalText, phrase)) {
      warnings.push(`global forbidden phrase: "${phrase}"`);
    }
  }

  if (testCase.minAnswerLength && finalText.length < testCase.minAnswerLength) {
    failures.push(
      `answer length ${finalText.length} < min ${testCase.minAnswerLength}`,
    );
  }

  const warnDurationMs =
    suiteSafeNumber(testCase.warnDurationMs) ??
    suiteSafeNumber(bundle?.warnDurationMs) ??
    suiteSafeNumber(suite.defaultWarnDurationMs) ??
    DEFAULT_WARN_DURATION_MS;
  const maxDurationMs =
    suiteSafeNumber(testCase.maxDurationMs) ??
    suiteSafeNumber(bundle?.maxDurationMs) ??
    suiteSafeNumber(suite.defaultMaxDurationMs);
  if (warnDurationMs && runOutput.durationMs > warnDurationMs) {
    warnings.push(`duration ${runOutput.durationMs}ms exceeded warning budget ${warnDurationMs}ms`);
  }
  if (maxDurationMs && runOutput.durationMs > maxDurationMs) {
    failures.push(`duration ${runOutput.durationMs}ms exceeded max budget ${maxDurationMs}ms`);
  }

  const metadata = persisted?.metadata ?? {};
  for (const pathExpression of testCase.requiredMetadataPaths ?? []) {
    if (metadataPath(metadata, pathExpression) == null) {
      failures.push(`required metadata missing: ${pathExpression}`);
    }
  }

  const responseQuality = metadata.response_quality ?? {};
  if (
    typeof testCase.minResponseQualityScore === "number" &&
    typeof responseQuality.score === "number" &&
    responseQuality.score < testCase.minResponseQualityScore
  ) {
    failures.push(
      `response_quality.score ${responseQuality.score} < ${testCase.minResponseQualityScore}`,
    );
  } else if (
    typeof testCase.minResponseQualityScore === "number" &&
    responseQuality.score == null
  ) {
    failures.push("response_quality.score missing");
  }

  if (testCase.minSourceQuality) {
    const actual = responseQuality.sourceQuality;
    if (!actual || qualityRank[actual] < qualityRank[testCase.minSourceQuality]) {
      failures.push(
        `response_quality.sourceQuality ${actual ?? "(missing)"} < ${testCase.minSourceQuality}`,
      );
    }
  }

  if (testCase.minConfidence) {
    const actual = responseQuality.confidence;
    if (!actual || qualityRank[actual] < qualityRank[testCase.minConfidence]) {
      failures.push(
        `response_quality.confidence ${actual ?? "(missing)"} < ${testCase.minConfidence}`,
      );
    }
  }

  return {
    status: failures.length === 0 ? "pass" : "fail",
    failures,
    warnings,
    observations,
    toolNames,
    familiesHit: [...familiesHit],
    finalTextLength: finalText.length,
    finalText,
    latencyBudget: {
      warnDurationMs,
      maxDurationMs: maxDurationMs ?? null,
      durationMs: runOutput.durationMs,
    },
  };
}

function toPublishedRun(result, runId) {
  const cases = Array.isArray(result.results)
    ? result.results.map((testCase) => {
        const score = testCase.score ?? {};
        return {
          id: String(testCase.id ?? ""),
          prompt: String(testCase.prompt ?? ""),
          intent: typeof testCase.intent === "string" ? testCase.intent : null,
          status: typeof score.status === "string" ? score.status : "unknown",
          durationMs: typeof testCase.durationMs === "number" ? testCase.durationMs : null,
          streamEventCount:
            typeof testCase.streamEventCount === "number" ? testCase.streamEventCount : null,
          toolNames: Array.isArray(score.toolNames)
            ? score.toolNames.filter((tool) => typeof tool === "string")
            : [],
          failures: Array.isArray(score.failures)
            ? score.failures.filter((failure) => typeof failure === "string")
            : [],
          warnings: Array.isArray(score.warnings)
            ? score.warnings.filter((warning) => typeof warning === "string")
            : [],
          observations: Array.isArray(score.observations)
            ? score.observations.filter((observation) => typeof observation === "string")
            : [],
          finalText: typeof score.finalText === "string" ? score.finalText : "",
          latencyBudget:
            score.latencyBudget && typeof score.latencyBudget === "object"
              ? {
                  warnDurationMs:
                    typeof score.latencyBudget.warnDurationMs === "number"
                      ? score.latencyBudget.warnDurationMs
                      : null,
                  maxDurationMs:
                    typeof score.latencyBudget.maxDurationMs === "number"
                      ? score.latencyBudget.maxDurationMs
                      : null,
                  durationMs:
                    typeof score.latencyBudget.durationMs === "number"
                      ? score.latencyBudget.durationMs
                      : null,
                }
              : null,
        };
      })
    : [];

  return {
    runId,
    generatedAt: typeof result.generatedAt === "string" ? result.generatedAt : null,
    baseUrl: typeof result.baseUrl === "string" ? result.baseUrl : null,
    bundle: result.bundle && typeof result.bundle === "object"
      ? result.bundle.name ?? null
      : typeof result.bundle === "string"
        ? result.bundle
        : null,
    filter: typeof result.filter === "string" ? result.filter : null,
    totalCases: typeof result.totalCases === "number" ? result.totalCases : cases.length,
    passed:
      typeof result.passed === "number"
        ? result.passed
        : cases.filter((testCase) => testCase.status === "pass").length,
    failed:
      typeof result.failed === "number"
        ? result.failed
        : cases.filter((testCase) => testCase.status === "fail").length,
    warningCount:
      typeof result.warningCount === "number"
        ? result.warningCount
        : cases.reduce((count, testCase) => count + testCase.warnings.length, 0),
    slowestCases: Array.isArray(result.slowestCases)
      ? result.slowestCases
      : [...cases]
          .sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))
          .slice(0, 10)
          .map((testCase) => ({
            id: testCase.id,
            intent: testCase.intent,
            durationMs: testCase.durationMs,
            status: testCase.status,
            warnings: testCase.warnings,
          })),
    file: `docs/ai-plan/evals/runs/${runId}/results.json`,
    summaryFile: `docs/ai-plan/evals/runs/${runId}/summary.md`,
    cases,
  };
}

async function refreshPublishedAssistantEvalRuns() {
  const runsDir = path.join(repoRoot, "docs/ai-plan/evals/runs");
  let runIds = [];
  try {
    runIds = (await fs.readdir(runsDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse()
      .slice(0, 20);
  } catch {
    runIds = [];
  }

  const runs = [];
  for (const runId of runIds) {
    try {
      const resultRaw = await fs.readFile(path.join(runsDir, runId, "results.json"), "utf8");
      runs.push(toPublishedRun(JSON.parse(resultRaw), runId));
    } catch {
      // Ignore incomplete run directories.
    }
  }

  await fs.mkdir(path.dirname(PUBLISHED_ASSISTANT_EVAL_RUNS_PATH), { recursive: true });
  await fs.writeFile(
    PUBLISHED_ASSISTANT_EVAL_RUNS_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "scripts/verify/verify_ai_assistant_eval_suite.mjs",
        runs,
      },
      null,
      2,
    ) + "\n",
  );
}

// ─────────────────────────────────────────────────────────── Run loop
// Always start with a fresh token so we don't begin the run with a stale one.
await refreshAuthIfNeeded();
const userId = tokenizeUserId();

console.log(`AI Assistant eval suite — ${cases.length} cases`);
console.log(`Endpoint: ${CHAT_ENDPOINT}`);
console.log(`User id: ${userId ?? "(unknown)"}`);
if (bundleName) console.log(`Bundle: ${bundleName}`);
console.log(`Run dir: ${path.relative(repoRoot, runDir)}`);
console.log("");

const results = [];
const toolCoverage = new Map();

for (const [index, testCase] of cases.entries()) {
  // chat_history.session_id is a UUID column, so we generate a proper UUID
  // and persist the human-readable label separately for the artifact only.
  const sessionId = randomUUID();
  const sessionLabel = `eval-${runStamp}-${testCase.id}`;
  const messageId = randomUUID();
  const label = `[${index + 1}/${cases.length}] ${testCase.id}`;
  process.stdout.write(`${label} … `);

  const startedAt = new Date().toISOString();
  const runOutput = await postPromptAndDrain(testCase, sessionId, messageId);
  const persisted = await fetchPersistedAssistantMessage(sessionId);
  const score = scoreCase(testCase, runOutput, persisted);
  const finishedAt = new Date().toISOString();

  for (const tool of score.toolNames) {
    toolCoverage.set(tool, (toolCoverage.get(tool) ?? 0) + 1);
  }

  const record = {
    id: testCase.id,
    intent: testCase.intent,
    prompt: testCase.prompt,
    selectedProjectId: testCase.selectedProjectId ?? null,
    sessionId,
    sessionLabel,
    startedAt,
    finishedAt,
    durationMs: runOutput.durationMs,
    httpStatus: runOutput.httpStatus,
    streamError: runOutput.streamError,
    streamEventCount: runOutput.streamEvents.length,
    persistedFound: Boolean(persisted),
    score,
    expectedToolNames: testCase.expectedToolNames ?? [],
    expectedToolFamilies: testCase.expectedToolFamilies ?? [],
  };
  results.push(record);

  await fs.writeFile(
    path.join(runDir, `${testCase.id}.json`),
    JSON.stringify(
      {
        ...record,
        streamEvents: runOutput.streamEvents,
        persistedMetadata: persisted?.metadata ?? null,
      },
      null,
      2,
    ),
  );

  const symbol = score.status === "pass" ? "✓" : "✗";
  console.log(
    `${symbol} ${score.status} (${runOutput.durationMs}ms, ${score.toolNames.length} tools)`,
  );
  if (score.failures.length > 0) {
    for (const f of score.failures) console.log(`    ! ${f}`);
  }
  if (score.warnings.length > 0) {
    for (const w of score.warnings) console.log(`    ⚠ ${w}`);
  }
}

// ─────────────────────────────────────────────────────────── Reporting
const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  bundle: bundleName
    ? {
        name: bundleName,
        description: bundle.description ?? "",
        criteria: bundle.criteria ?? [],
      }
    : null,
  filter: effectiveFilterPattern ?? null,
  totalCases: results.length,
  passed: results.filter((r) => r.score.status === "pass").length,
  failed: results.filter((r) => r.score.status === "fail").length,
  warningCount: results.reduce((count, r) => count + r.score.warnings.length, 0),
  slowestCases: [...results]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      intent: r.intent,
      durationMs: r.durationMs,
      status: r.score.status,
      warnings: r.score.warnings,
    })),
  toolCoverage: Object.fromEntries(
    [...toolCoverage.entries()].sort((a, b) => b[1] - a[1]),
  ),
  intentDistribution: results.reduce((acc, r) => {
    acc[r.intent] = (acc[r.intent] ?? 0) + 1;
    return acc;
  }, {}),
  results,
};

await fs.writeFile(
  path.join(runDir, "results.json"),
  JSON.stringify(summary, null, 2),
);

const md = [
  `# AI Assistant Eval Suite — ${runStamp}`,
  "",
  `- Endpoint: \`${CHAT_ENDPOINT}\``,
  ...(summary.bundle
    ? [
        `- Bundle: \`${summary.bundle.name}\``,
        `- Bundle description: ${summary.bundle.description}`,
      ]
    : []),
  ...(summary.filter ? [`- Filter: \`${summary.filter}\``] : []),
  `- Total: ${summary.totalCases}`,
  `- Passed: ${summary.passed}`,
  `- Failed: ${summary.failed}`,
  `- Warnings: ${summary.warningCount}`,
  "",
  "## Slowest Cases",
  "",
  "| Case | Intent | Status | Duration | Warnings |",
  "|---|---|---|---|---|",
  ...summary.slowestCases.map(
    (r) =>
      `| ${r.id} | ${r.intent} | ${r.status === "pass" ? "✅" : "❌"} | ${r.durationMs}ms | ${r.warnings.join("; ") || "—"} |`,
  ),
  "",
  ...(summary.bundle?.criteria?.length
    ? [
        "## Bundle Criteria",
        "",
        ...summary.bundle.criteria.map((criterion) => `- ${criterion}`),
        "",
      ]
    : []),
  "## Per-case results",
  "",
  "| Case | Intent | Status | Duration | Tools fired | Failures |",
  "|---|---|---|---|---|---|",
  ...results.map(
    (r) =>
      `| ${r.id} | ${r.intent} | ${r.score.status === "pass" ? "✅" : "❌"} | ${r.durationMs}ms | ${r.score.toolNames.join(", ") || "(none)"} | ${r.score.failures.join("; ") || "—"} |`,
  ),
  "",
  "## Tool coverage across the suite",
  "",
  "| Tool | Hits |",
  "|---|---|",
  ...Object.entries(summary.toolCoverage).map(([tool, hits]) => `| \`${tool}\` | ${hits} |`),
  "",
  "## Tools defined but never fired in this run",
  "",
];

const allKnownTools = new Set(
  Object.values(suite.toolFamilyMap ?? {}).flatMap((arr) => arr),
);
const missed = [...allKnownTools].filter((t) => !toolCoverage.has(t)).sort();
if (missed.length === 0) {
  md.push("All catalogued tools fired at least once. 🎯");
} else {
  for (const t of missed) md.push(`- \`${t}\``);
}

await fs.writeFile(path.join(runDir, "summary.md"), md.join("\n") + "\n");
await refreshPublishedAssistantEvalRuns();

await pool.end();

console.log("");
console.log(`Results: ${path.relative(repoRoot, runDir)}/results.json`);
console.log(`Summary: ${path.relative(repoRoot, runDir)}/summary.md`);
console.log(`Pass: ${summary.passed}/${summary.totalCases}`);

process.exit(summary.failed > 0 ? 1 : 0);
