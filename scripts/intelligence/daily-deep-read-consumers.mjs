#!/usr/bin/env node

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

function normalizeTitle(value) {
  return String(value || "")
    .replace(/^\s*[-*]\s*/, "")
    .replace(/^\*\*Candidate(?:\s+\w+)?:\*\*\s*/i, "")
    .replace(/^Candidate(?:\s+\w+)?:\s*/i, "")
    .replace(/\*\*/g, "")
    .trim();
}

function cleanInline(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+Sources?:\s*`[^`]+`.*$/i, "")
    .trim();
}

function sourceIdsFromText(value) {
  const ids = new Set();
  const text = String(value || "");
  for (const match of text.matchAll(/`([^`]+)`/g)) {
    const id = match[1].trim();
    if (
      id &&
      (id.startsWith("outlook_") ||
        id.startsWith("teams") ||
        id.startsWith("sharepoint_") ||
        id.startsWith("01") ||
        /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id))
    ) {
      ids.add(id);
    }
  }
  return [...ids];
}

function parseBullets(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const bullets = [];
  let current = null;
  for (const line of lines) {
    if (/^\s*[-*]\s+/.test(line)) {
      if (current) bullets.push(current.join("\n"));
      current = [line];
      continue;
    }
    if (current && line.trim()) {
      current.push(line);
    }
  }
  if (current) bullets.push(current.join("\n"));
  return bullets;
}

function titleFromBullet(bullet) {
  const firstLine = bullet.split(/\r?\n/)[0] || "";
  const withoutBullet = firstLine.replace(/^\s*[-*]\s*/, "");
  const afterCandidate = withoutBullet.match(/^\*\*Candidate(?:\s+\w+)?:\*\*\s*(.+)$/i)?.[1];
  const bold = withoutBullet.match(/\*\*(?!Candidate(?:\s+\w+)?:)(.+?)\*\*/i)?.[1];
  const raw = afterCandidate || bold || withoutBullet;
  const normalized = cleanInline(normalizeTitle(raw));
  const beforeDash = normalized.split(/\s+[—–-]\s+/)[0]?.trim();
  return (beforeDash || normalized).slice(0, 220) || "Daily Deep Read candidate";
}

function summaryFromBullet(bullet, title) {
  const text = cleanInline(
    bullet
      .replace(/^\s*[-*]\s*/, "")
      .replace(/\*\*/g, "")
      .replace(title, ""),
  );
  return text.slice(0, 1800) || title;
}

function stableKey(packetId, signalType, title) {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
  const suffix = crypto.createHash("sha1").update(`${packetId}:${signalType}:${title}`).digest("hex").slice(0, 10);
  return `daily-deep-read:${packetId}:${signalType}:${normalized}:${suffix}`;
}

function confidenceForSection(section) {
  if (section === "Project Intelligence Updates") return { score: 0.86, label: "high" };
  if (section === "Task Candidates") return { score: 0.74, label: "medium" };
  return { score: 0.8, label: "medium" };
}

function signalTypeForSection(section) {
  switch (section) {
    case "Project Intelligence Updates":
      return "project_update";
    case "Risk Candidates":
      return "risk";
    case "Decision Candidates":
    case "Highest-Leverage Owner Decisions":
      return "decision";
    case "Task Candidates":
      return "task";
    case "Initiative Candidates":
      return "process_issue";
    default:
      return null;
  }
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

function candidatesFromPacket(packet, projectRows) {
  const sections = packet.packet_json?.sections || {};
  const sourceSet = packet.packet_json?.sourceSet || {};
  const businessDate = packet.packet_json?.businessDate || packet.covered_start_at?.toISOString?.()?.slice(0, 10);
  const candidates = [];
  for (const section of [
    "Project Intelligence Updates",
    "Risk Candidates",
    "Decision Candidates",
    "Highest-Leverage Owner Decisions",
    "Task Candidates",
    "Initiative Candidates",
  ]) {
    const signalType = signalTypeForSection(section);
    const body = sections[section];
    if (!signalType || typeof body !== "string") continue;
    for (const bullet of parseBullets(body)) {
      const title = titleFromBullet(bullet);
      const summary = summaryFromBullet(bullet, title);
      const sourceIds = sourceIdsFromText(bullet);
      const primarySourceId = sourceIds[0] || `daily_packet:${packet.id}`;
      const { score, label } = confidenceForSection(section);
      const sourceProjectId = projectIdForSourceIds(sourceIds, sourceSet);
      const textProjectId = projectIdForText(`${title}\n${summary}\n${bullet}`, projectRows);
      candidates.push({
        source_document_id: primarySourceId,
        source_chunk_id: null,
        target_id: null,
        project_id: sourceProjectId || textProjectId,
        signal_type: signalType,
        title,
        summary,
        why_it_matters: `Derived from Daily Deep Read section: ${section}`,
        current_status: "open",
        confidence_score: score,
        confidence: label,
        status: "needs_review",
        suggested_owner_person_id: null,
        suggested_owner_label: null,
        next_action:
          signalType === "task"
            ? "Review and either assign as a task or reject."
            : "Review candidate and decide whether to promote into project intelligence.",
        stale_after: null,
        source_occurred_at: packet.covered_end_at,
        excerpt: bullet.slice(0, 2000),
        normalized_signal_key: stableKey(packet.id, signalType, title),
        extraction_json: {
          daily_packet_id: packet.id,
          daily_packet_generated_at: packet.generated_at,
          business_date: businessDate,
          source_ids: sourceIds,
          section,
          consumer_compiler_version: COMPILER_VERSION,
          candidate_policy: "review_gated_not_auto_promoted",
          initiative_subtype: section === "Initiative Candidates" ? "initiative_candidate" : undefined,
          source_policy:
            "Derived from daily_deep_read packet sections/source notes; no direct chunk synthesis.",
          project_assignment_method: sourceProjectId
            ? "source_set_single_project"
            : textProjectId
              ? "project_name_or_number_match"
              : "unassigned_company_wide",
        },
        compiler_version: COMPILER_VERSION,
      });
    }
  }
  return candidates;
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

async function main() {
  const packet = await loadDailyDeepReadPacket();
  const projectRows = await loadProjectRows();
  const candidates = candidatesFromPacket(packet, projectRows);
  if (!candidates.length) {
    throw new Error(`No candidates parsed from Daily Deep Read packet ${packet.id}.`);
  }
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
  const summary = {
    ok: true,
    packetId: packet.id,
    compilerVersion: COMPILER_VERSION,
    shouldWrite,
    candidateCount: candidates.length,
    writeResult,
    readBack: readBackRows,
    evidenceDir,
  };
  await fs.writeFile(path.join(evidenceDir, "consumer-run-summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
