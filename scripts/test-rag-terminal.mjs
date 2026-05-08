/**
 * RAG Pipeline Terminal Test
 *
 * Tests each layer independently so we can pinpoint exactly where it breaks:
 *   Layer 1 — Embedding generation (OpenAI / AI Gateway)
 *   Layer 2 — Vector search (Supabase RPCs: search_document_chunks, search_all_knowledge)
 *   Layer 3 — Chat completion (streamText equivalent via raw OpenAI)
 *
 * Run from repo root:
 *   node scripts/test-rag-terminal.mjs
 *   node scripts/test-rag-terminal.mjs "what's the status of Vermillion Rise?"
 *   node scripts/test-rag-terminal.mjs "budget overruns" --project-id 67
 *   node scripts/test-rag-terminal.mjs --layer 1   # only test embeddings
 *   node scripts/test-rag-terminal.mjs --layer 2   # only test vector search
 *   node scripts/test-rag-terminal.mjs --layer 3   # only test chat completion
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "../.env");
  const envLocal = resolve(__dirname, "../frontend/.env.local");
  const vars = {};

  for (const path of [envPath, envLocal]) {
    try {
      const lines = readFileSync(path, "utf8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (key && !(key in vars)) vars[key] = val;
      }
    } catch {
      // file not found — skip
    }
  }
  return vars;
}

const ENV = loadEnv();

const SUPABASE_URL = ENV.SUPABASE_URL || ENV.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
const AI_GATEWAY_KEY = ENV.AI_GATEWAY_API_KEY;
const OPENAI_KEY = ENV.OPENAI_API_KEY;

// Parse CLI args
const args = process.argv.slice(2);
const layerArg = args.includes("--layer") ? parseInt(args[args.indexOf("--layer") + 1]) : null;
const projectIdArg = args.includes("--project-id") ? parseInt(args[args.indexOf("--project-id") + 1]) : null;
const queryArg = args.find(a => !a.startsWith("--") && isNaN(parseInt(a))) ?? "what's the latest on Vermillion Rise?";

const QUERY = queryArg;
const PROJECT_ID = projectIdArg ?? null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";

function ok(label, detail = "") {
  console.log(`${GREEN}✓${RESET} ${label}${detail ? `  ${YELLOW}${detail}${RESET}` : ""}`);
}
function fail(label, err) {
  console.log(`${RED}✗${RESET} ${label}`);
  console.log(`  ${RED}${err}${RESET}`);
}
function info(msg) {
  console.log(`${CYAN}ℹ${RESET} ${msg}`);
}
function section(title) {
  console.log(`\n${BOLD}${CYAN}━━━ ${title} ━━━${RESET}`);
}

function truncate(str, n = 120) {
  const s = String(str ?? "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ---------------------------------------------------------------------------
// Layer 1 — Embeddings
// ---------------------------------------------------------------------------
async function testEmbeddings() {
  section("Layer 1: Embedding Generation");
  info(`Query: "${QUERY}"`);
  info(`Using: ${AI_GATEWAY_KEY ? "AI Gateway (ai-gateway.vercel.sh)" : "Direct OpenAI"}`);

  if (!AI_GATEWAY_KEY && !OPENAI_KEY) {
    fail("No API key", "Neither AI_GATEWAY_API_KEY nor OPENAI_API_KEY is set");
    return null;
  }

  const openai = AI_GATEWAY_KEY
    ? new OpenAI({ apiKey: AI_GATEWAY_KEY, baseURL: "https://ai-gateway.vercel.sh/v1" })
    : new OpenAI({ apiKey: OPENAI_KEY });

  const modelId = AI_GATEWAY_KEY ? "openai/text-embedding-3-large" : "text-embedding-3-large";

  try {
    const t0 = Date.now();
    const resp = await openai.embeddings.create({ model: modelId, input: QUERY, dimensions: 3072 });
    const elapsed = Date.now() - t0;

    if (!resp.data[0]?.embedding) {
      fail("Embedding response empty", JSON.stringify(resp));
      return null;
    }

    const vec = resp.data[0].embedding;
    ok(`Embedding generated`, `${vec.length} dims in ${elapsed}ms`);
    ok(`Model`, modelId);
    ok(`First 5 values`, `[${vec.slice(0, 5).map(v => v.toFixed(4)).join(", ")}]`);

    return JSON.stringify(vec);
  } catch (err) {
    fail("Embedding failed", err?.message ?? err);
    if (err?.status) info(`HTTP status: ${err.status}`);
    if (err?.error) info(`API error: ${JSON.stringify(err.error)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Layer 2 — Vector Search (all three RPCs)
// ---------------------------------------------------------------------------
async function testVectorSearch(embeddingJson) {
  section("Layer 2: Vector Search (Supabase RPCs)");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    fail("Supabase config", `URL=${!!SUPABASE_URL}, SERVICE_KEY=${!!SUPABASE_KEY}`);
    return;
  }

  if (!embeddingJson) {
    fail("Skipped — no embedding from Layer 1", "");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // --- search_document_chunks ---
  info("RPC: search_document_chunks");
  try {
    const t0 = Date.now();
    const { data, error } = await supabase.rpc("search_document_chunks", {
      query_embedding: embeddingJson,
      filter_source_types: null,
      filter_project_id: PROJECT_ID,
      match_count: 10,
      match_threshold: 0.2,
    });
    const elapsed = Date.now() - t0;

    if (error) {
      fail("search_document_chunks", error.message);
    } else {
      ok(`search_document_chunks`, `${(data ?? []).length} results in ${elapsed}ms`);
      for (const row of (data ?? []).slice(0, 3)) {
        console.log(`   → [${row.source_type ?? row.source_table ?? "?"}] ${truncate(row.content, 100)}`);
        console.log(`     similarity=${Number(row.similarity ?? 0).toFixed(4)}  project_id=${row.doc_project_id ?? "?"}`);
      }
      if ((data ?? []).length === 0) {
        info("No chunks returned — check if document_chunks table has data and embeddings");
        // Check raw count
        const { count } = await supabase.from("document_chunks").select("*", { count: "exact", head: true });
        info(`document_chunks total rows: ${count ?? "error"}`);
      }
    }
  } catch (err) {
    fail("search_document_chunks threw", err?.message ?? err);
  }

  // --- search_all_knowledge ---
  info("RPC: search_all_knowledge");
  try {
    const t0 = Date.now();
    const { data, error } = await supabase.rpc("search_all_knowledge", {
      query_embedding: embeddingJson,
      match_count: 5,
      match_threshold: 0.2,
    });
    const elapsed = Date.now() - t0;

    if (error) {
      fail("search_all_knowledge", error.message);
    } else {
      ok(`search_all_knowledge`, `${(data ?? []).length} results in ${elapsed}ms`);
      for (const row of (data ?? []).slice(0, 2)) {
        console.log(`   → [${row.source_table ?? "?"}] ${truncate(row.content, 100)}`);
      }
    }
  } catch (err) {
    fail("search_all_knowledge threw", err?.message ?? err);
  }

  info("RPC: search_knowledge_base retired; company knowledge now routes through document_chunks/search_all_knowledge");
}

// ---------------------------------------------------------------------------
// Layer 3 — Chat Completion (no streaming, raw OpenAI)
// ---------------------------------------------------------------------------
async function testChatCompletion(embeddingJson) {
  section("Layer 3: Chat Completion (OpenAI)");

  const openai = AI_GATEWAY_KEY
    ? new OpenAI({ apiKey: AI_GATEWAY_KEY, baseURL: "https://ai-gateway.vercel.sh/v1" })
    : new OpenAI({ apiKey: OPENAI_KEY });

  const model = AI_GATEWAY_KEY ? "openai/gpt-4.1-mini" : "gpt-4.1-mini";
  info(`Model: ${model}`);

  // Build minimal context from vector search if embedding available
  let contextBlock = "(No RAG context — embedding failed in Layer 1)";
  if (embeddingJson && SUPABASE_URL && SUPABASE_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data } = await supabase.rpc("search_document_chunks", {
      query_embedding: embeddingJson,
      filter_source_types: null,
      filter_project_id: PROJECT_ID,
      match_count: 5,
      match_threshold: 0.2,
    });
    const rows = data ?? [];
    if (rows.length > 0) {
      contextBlock = rows
        .slice(0, 5)
        .map((r, i) => `[${i+1}] (${r.source_type ?? "?"}) ${String(r.content ?? "").slice(0, 400)}`)
        .join("\n\n");
    } else {
      contextBlock = "(Vector search returned 0 results — model will answer from general knowledge)";
    }
  }

  const systemPrompt = `You are Alleato's AI project management assistant. Answer using only the provided context. If context is empty, say so.\n\nContext:\n${contextBlock}`;

  try {
    const t0 = Date.now();
    const resp = await openai.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 400,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: QUERY },
      ],
    });
    const elapsed = Date.now() - t0;

    const answer = resp.choices[0]?.message?.content ?? "(no content)";
    const usage = resp.usage;

    ok(`Chat response`, `${elapsed}ms`);
    if (usage) ok(`Tokens`, `prompt=${usage.prompt_tokens} completion=${usage.completion_tokens}`);
    console.log(`\n${BOLD}Answer:${RESET}`);
    console.log(answer);
  } catch (err) {
    fail("Chat completion failed", err?.message ?? err);
    if (err?.status) info(`HTTP status: ${err.status}`);
    if (err?.error) info(`API error: ${JSON.stringify(err.error)}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`${BOLD}RAG Pipeline Terminal Test${RESET}`);
  console.log(`Query: "${QUERY}"${PROJECT_ID ? `  project_id=${PROJECT_ID}` : ""}`);
  console.log(`Gateway: ${AI_GATEWAY_KEY ? "YES" : "NO (direct OpenAI)"}  Supabase: ${SUPABASE_URL ? "YES" : "NO"}`);

  const runAll = layerArg === null;
  let embeddingJson = null;

  if (runAll || layerArg === 1) {
    embeddingJson = await testEmbeddings();
  }
  if (runAll || layerArg === 2) {
    await testVectorSearch(embeddingJson);
  }
  if (runAll || layerArg === 3) {
    await testChatCompletion(embeddingJson);
  }

  console.log(`\n${BOLD}Done.${RESET}\n`);
}

main().catch(err => {
  console.error(`${RED}Fatal:${RESET}`, err);
  process.exit(1);
});
