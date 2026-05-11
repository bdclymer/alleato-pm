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
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");

dotenv.config({ path: path.join(repoRoot, ".env"), quiet: true });
dotenv.config({ path: path.join(repoRoot, "frontend/.env.local"), quiet: true });

const SUITE_PATH = path.join(repoRoot, "docs/ai-plan/evals/assistant-eval-suite.json");
const AUTH_PATH = path.join(repoRoot, "frontend/tests/.auth/user.json");
const BASE_URL = process.env.AI_EVAL_BASE_URL || "http://localhost:3000";
const CHAT_ENDPOINT = `${BASE_URL}/api/ai-assistant/chat`;
const CASE_TIMEOUT_MS = Number(process.env.AI_EVAL_CASE_TIMEOUT_MS ?? 90_000);
const POLL_INTERVAL_MS = 750;
const POLL_MAX_MS = 15_000;

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
const filterPattern = flagValue("--filter");

// ───────────────────────────────────────────────────────────── Suite load
const suiteRaw = await fs.readFile(SUITE_PATH, "utf8");
const suite = JSON.parse(suiteRaw);
const allCases = suite.cases ?? [];
const cases = allCases.filter((c) => {
  if (onlyCase && c.id !== onlyCase) return false;
  if (filterPattern && !new RegExp(filterPattern).test(c.id)) return false;
  return true;
});
if (cases.length === 0) {
  console.error("No cases matched. Available case IDs:");
  for (const c of allCases) console.error(`  - ${c.id}`);
  process.exit(1);
}

// ───────────────────────────────────────────────────────── Auth + run dir
if (!existsSync(AUTH_PATH)) {
  console.error(
    `Missing auth state at ${AUTH_PATH}. Run: cd frontend && npx playwright test tests/auth.setup.ts`,
  );
  process.exit(1);
}
const authState = JSON.parse(await fs.readFile(AUTH_PATH, "utf8"));
const cookieHeader = (authState.cookies ?? [])
  .map((c) => `${c.name}=${c.value}`)
  .join("; ");
if (!cookieHeader) {
  console.error("Auth state has no cookies. Re-run auth.setup.ts.");
  process.exit(1);
}

const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(repoRoot, "docs/ai-plan/evals/runs", runStamp);
mkdirSync(runDir, { recursive: true });

// ─────────────────────────────────────────────────────────────── DB pool
const pool = new pg.Pool({
  connectionString: (() => {
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.delete("sslmode");
    return url.toString();
  })(),
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
const userId = tokenizeUserId();

async function postPromptAndDrain(testCase, sessionId, messageId) {
  const body = {
    id: sessionId,
    selectedProjectId: testCase.selectedProjectId,
    messages: [
      {
        id: messageId,
        role: "user",
        parts: [{ type: "text", text: testCase.prompt }],
      },
    ],
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
        cookie: cookieHeader,
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
  while (Date.now() < deadline) {
    const result = await pool.query(
      `select id, role, content, metadata, created_at
       from public.chat_history
       where session_id = $1 and role = 'assistant'
       order by created_at desc
       limit 1`,
      [sessionId],
    );
    if (result.rows.length > 0) return result.rows[0];
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
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

  const toolNames = extractToolNames(persisted?.metadata);
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
    if (lower.includes(phrase.toLowerCase())) {
      warnings.push(`global forbidden phrase: "${phrase}"`);
    }
  }

  if (testCase.minAnswerLength && finalText.length < testCase.minAnswerLength) {
    failures.push(
      `answer length ${finalText.length} < min ${testCase.minAnswerLength}`,
    );
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
  };
}

// ─────────────────────────────────────────────────────────── Run loop
console.log(`AI Assistant eval suite — ${cases.length} cases`);
console.log(`Endpoint: ${CHAT_ENDPOINT}`);
console.log(`User id: ${userId ?? "(unknown)"}`);
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
}

// ─────────────────────────────────────────────────────────── Reporting
const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  totalCases: results.length,
  passed: results.filter((r) => r.score.status === "pass").length,
  failed: results.filter((r) => r.score.status === "fail").length,
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
  `- Total: ${summary.totalCases}`,
  `- Passed: ${summary.passed}`,
  `- Failed: ${summary.failed}`,
  "",
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

await pool.end();

console.log("");
console.log(`Results: ${path.relative(repoRoot, runDir)}/results.json`);
console.log(`Summary: ${path.relative(repoRoot, runDir)}/summary.md`);
console.log(`Pass: ${summary.passed}/${summary.totalCases}`);

process.exit(summary.failed > 0 ? 1 : 0);
