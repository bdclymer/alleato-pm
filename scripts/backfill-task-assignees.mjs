#!/usr/bin/env node
/**
 * Resolve existing task assignee_name/email values to people.id.
 *
 * Usage:
 *   node scripts/backfill-task-assignees.mjs
 *   node scripts/backfill-task-assignees.mjs --dry-run
 */

import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
for (const envPath of [resolve(__dirname, "../.env"), resolve(__dirname, "../frontend/.env.local")]) {
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
    // Optional env file.
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function sbGet(path, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${path}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbGetAll(path, query = "", pageSize = 1000) {
  const rows = [];
  for (let start = 0; ; start += pageSize) {
    const url = `${SUPABASE_URL}/rest/v1/${path}${query ? `?${query}` : ""}`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Range: `${start}-${start + pageSize - 1}`,
      },
    });
    if (!res.ok) throw new Error(`Supabase GET ${path}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

async function sbPatch(path, payload, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${path}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${path}: ${res.status} ${await res.text()}`);
}

function cleanText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || ["null", "none", "unknown", "n/a"].includes(text.toLowerCase())) return null;
  return text;
}

function normalizeEmail(value) {
  const text = cleanText(value);
  return text && text.includes("@") ? text.toLowerCase() : null;
}

function normalizeName(value) {
  const text = cleanText(value);
  if (!text) return null;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s@._+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || null;
}

function canonicalName(person) {
  return [person.first_name, person.last_name].map(cleanText).filter(Boolean).join(" ") || null;
}

function buildResolver(people) {
  const byEmail = new Map();
  const byName = new Map();
  const byToken = new Map();

  for (const person of people) {
    const email = normalizeEmail(person.email);
    if (email) byEmail.set(email, person);

    const name = normalizeName(canonicalName(person));
    if (!name) continue;
    byName.set(name, [...(byName.get(name) ?? []), person]);
    for (const token of name.split(" ")) {
      if (token.length >= 3) byToken.set(token, [...(byToken.get(token) ?? []), person]);
    }
  }

  return (nameValue, emailValue) => {
    const sourceName = cleanText(nameValue);
    const sourceEmail = normalizeEmail(emailValue);
    if (sourceEmail && byEmail.has(sourceEmail)) {
      return resolved(byEmail.get(sourceEmail), "email_exact", 1, sourceName, sourceEmail);
    }

    const normalizedName = normalizeName(sourceName);
    if (normalizedName) {
      const exact = byName.get(normalizedName) ?? [];
      if (exact.length === 1) return resolved(exact[0], "name_exact", 0.95, sourceName, sourceEmail);

      const token = byToken.get(normalizedName) ?? [];
      if (token.length === 1) return resolved(token[0], "unique_name_token", 0.82, sourceName, sourceEmail);
    }

    return {
      assignee_person_id: null,
      assignee_name: sourceName,
      assignee_email: sourceEmail,
      method: "unresolved",
      confidence: 0,
    };
  };
}

function resolved(person, method, confidence, fallbackName, fallbackEmail) {
  return {
    assignee_person_id: person.id,
    assignee_name: canonicalName(person) ?? fallbackName,
    assignee_email: normalizeEmail(person.email) ?? fallbackEmail,
    method,
    confidence,
  };
}

function mergeMetadata(existing, resolution) {
  const current = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  return {
    ...current,
    assignee_resolution_method: resolution.method,
    assignee_resolution_confidence: resolution.confidence,
    assignee_resolution_backfilled_at: new Date().toISOString(),
  };
}

async function main() {
  const enc = encodeURIComponent;
  const [people, tasks] = await Promise.all([
    sbGetAll("people", "select=id,first_name,last_name,email"),
    sbGetAll(
      "tasks",
      `select=id,assignee_person_id,assignee_name,assignee_email,extraction_metadata` +
        `&or=(${enc("assignee_name.not.is.null,assignee_email.not.is.null")})` +
        ``,
    ),
  ]);

  const resolveAssignee = buildResolver(people);
  let resolvedCount = 0;
  let unresolvedCount = 0;
  let unchangedCount = 0;

  for (const task of tasks) {
    const resolution = resolveAssignee(task.assignee_name, task.assignee_email);
    if (!resolution.assignee_person_id) {
      unresolvedCount += 1;
      continue;
    }

    const payload = {
      assignee_person_id: resolution.assignee_person_id,
      assignee_name: resolution.assignee_name,
      assignee_email: resolution.assignee_email,
      extraction_metadata: mergeMetadata(task.extraction_metadata, resolution),
    };

    if (
      task.assignee_person_id === payload.assignee_person_id &&
      task.assignee_name === payload.assignee_name &&
      task.assignee_email === payload.assignee_email
    ) {
      unchangedCount += 1;
      continue;
    }

    resolvedCount += 1;
    if (!DRY_RUN) {
      await sbPatch("tasks", payload, `id=eq.${enc(task.id)}`);
    }
  }

  console.log(JSON.stringify({
    dry_run: DRY_RUN,
    people_loaded: people.length,
    tasks_checked: tasks.length,
    resolved: resolvedCount,
    already_current: unchangedCount,
    unresolved: unresolvedCount,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
