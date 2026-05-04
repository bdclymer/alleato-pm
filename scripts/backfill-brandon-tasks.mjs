#!/usr/bin/env node
/**
 * Backfill tasks assigned by Brandon from the last 14 days of meetings, emails, and Teams messages.
 *
 * Usage (from repo root):
 *   node scripts/backfill-brandon-tasks.mjs
 *   node scripts/backfill-brandon-tasks.mjs --days 30
 *   node scripts/backfill-brandon-tasks.mjs --dry-run
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load env from frontend/.env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../frontend/.env.local");
try {
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith("#")) continue;
    const eqIdx = stripped.indexOf("=");
    if (eqIdx < 0) continue;
    const key = stripped.slice(0, eqIdx).trim();
    let val = stripped.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // env already set via export
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const OPENAI_KEY = process.env.OPENAI_API_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENAI_API_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const DAYS = parseInt(args.find((a) => a.startsWith("--days"))?.split("=")[1] ?? "14", 10) || 14;
const BRANDON_EMAIL = "bclymer@alleatogroup.com";
const BRANDON_NAME = "Brandon";

// ─── Supabase helpers ────────────────────────────────────────────────────────

async function sbGet(path, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${path}${query ? "?" + query : ""}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });
  if (!res.ok) throw new Error(`Supabase GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbPost(table, payload) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Supabase POST ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

// ─── OpenAI helper ───────────────────────────────────────────────────────────

async function extractTasks(doc) {
  const text = [doc.summary ?? "", doc.content ? doc.content.slice(0, 3000) : ""]
    .join("\n\n")
    .trim();

  if (!text || text.length < 80) return [];

  const typeLabel =
    doc.type === "meeting"
      ? `meeting titled "${doc.title}"`
      : doc.type === "email"
        ? `email titled "${doc.title}"`
        : `Teams message "${doc.title}"`;

  const prompt = `You are extracting action items that Brandon (bclymer@alleatogroup.com) explicitly assigned to specific people from this ${typeLabel}.

Rules:
- Only extract tasks where Brandon is clearly the one directing/assigning the work
- Only extract tasks assigned to a specific named person (not "the team" vaguely)
- Do NOT extract tasks where Brandon himself is doing the work
- Do NOT invent tasks — only extract what is clearly stated in the text
- Each task must have a clear action verb and a clear named owner
- If no qualifying tasks exist, return an empty array

Respond ONLY with a JSON array (no markdown fences, no explanation):
[
  {
    "title": "Short action-oriented title (max 10 words)",
    "description": "Full description including context and any deadline",
    "assignee_name": "First Last name of person assigned, or null",
    "assignee_email": "email if mentioned, otherwise null",
    "due_date": "YYYY-MM-DD if deadline mentioned, otherwise null",
    "priority": "high | medium | low | null"
  }
]

Source text:
${text}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    console.error(`   OpenAI error: ${res.status}`);
    return [];
  }

  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content?.trim() ?? "[]";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function fetchDocs() {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  const enc = encodeURIComponent;
  const filter =
    `organizer_email.ilike.*${BRANDON_EMAIL}*,` +
    `host_email.ilike.*${BRANDON_EMAIL}*,` +
    `participants.ilike.*${BRANDON_EMAIL}*`;

  return sbGet(
    "document_metadata",
    `select=id,title,date,content,summary,type,category,source_system,project_id,source_web_url,fireflies_link,meeting_link` +
      `&created_at=gte.${enc(since)}` +
      `&or=(${enc(filter)})` +
      `&type=in.(meeting,email,teams_dm_conversation)` +
      `&order=date.desc` +
      `&limit=300`
  );
}

async function getExistingKeys() {
  const rows = await sbGet(
    "tasks",
    `select=description,title&assigned_by=eq.${BRANDON_NAME}&limit=1000`
  );
  return new Set(rows.map((r) => (r.description ?? r.title ?? "").toLowerCase().trim()));
}

async function main() {
  console.log(
    `\n${DRY_RUN ? "[DRY RUN] " : ""}Fetching documents from the last ${DAYS} days involving Brandon...`
  );

  const docs = await fetchDocs();
  console.log(`   Found ${docs.length} documents\n`);

  if (!docs.length) {
    console.log("No documents found. Exiting.");
    return;
  }

  const existing = await getExistingKeys();
  console.log(`   ${existing.size} Brandon-assigned tasks already in DB (duplicates will be skipped)\n`);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const doc of docs) {
    process.stdout.write(`   ${doc.title?.slice(0, 55) ?? doc.id}... `);
    const tasks = await extractTasks(doc);

    if (!tasks.length) {
      console.log("no tasks found");
      continue;
    }

    console.log(`${tasks.length} task(s)`);

    for (const task of tasks) {
      const key = task.description?.toLowerCase().trim() ?? "";
      if (existing.has(key)) {
        console.log(`     ⊘ Duplicate: ${task.title}`);
        totalSkipped++;
        continue;
      }

      console.log(`     ✓ "${task.title}" → ${task.assignee_name ?? "unassigned"}`);

      if (!DRY_RUN) {
        await sbPost("tasks", {
          title: task.title,
          description: task.description,
          assignee_name: task.assignee_name ?? null,
          assignee_email: task.assignee_email ?? null,
          due_date: task.due_date ?? null,
          priority: task.priority ?? null,
          status: "open",
          assigned_by: BRANDON_NAME,
          source_system: doc.source_system ?? doc.type ?? "meeting",
          metadata_id: doc.id,
          project_id: doc.project_id ?? null,
        });
        existing.add(key);
      }
      totalInserted++;
    }
  }

  const verb = DRY_RUN ? "Would insert" : "Inserted";
  console.log(`\n✅ Done. ${verb} ${totalInserted} tasks, skipped ${totalSkipped} duplicates.\n`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
