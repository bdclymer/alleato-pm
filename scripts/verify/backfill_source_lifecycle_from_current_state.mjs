#!/usr/bin/env node

/**
 * Backfill source_processing_jobs from existing app/RAG state.
 *
 * This does not call models or create embeddings. It creates the lifecycle
 * observability rows that let the source lifecycle verifier reason about data
 * already present before the source_processing_jobs ledger existed.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  buildAppDatabaseConnectionString,
  getAppDatabaseUrl,
  getRagDatabaseUrl,
} from "./app-db-connection.mjs";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");

dotenv.config({ path: path.join(repoRoot, ".env"), quiet: true });
dotenv.config({ path: path.join(repoRoot, "frontend/.env.local"), override: false, quiet: true });

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith("--")) continue;
  const next = process.argv[index + 1];
  args.set(arg.slice(2), next && !next.startsWith("--") ? next : "true");
}

const lookbackDays = numberArg("days", "SOURCE_LIFECYCLE_BACKFILL_DAYS", 14);
const sourceLimit = numberArg("source-limit", "SOURCE_LIFECYCLE_BACKFILL_SOURCE_LIMIT", 5_000);
const dryRun = args.get("dry-run") === "true";

function numberArg(name, envName, fallback) {
  const raw = args.get(name) ?? process.env[envName];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    console.error(`--${name} must be numeric.`);
    process.exit(1);
  }
  return value;
}

function classifySource(row) {
  const source = String(row.source ?? "").toLowerCase();
  const category = String(row.category ?? "").toLowerCase();
  const type = String(row.type ?? "").toLowerCase();
  const id = String(row.id ?? "").toLowerCase();

  if (source === "fireflies") return "fireflies";
  if (source !== "microsoft_graph") return null;
  if (category === "teams_message" || type.includes("teams")) return "teams";
  if (category === "email" || type === "email" || id.startsWith("outlook_")) return "outlook_email";
  if (
    category === "document" ||
    type === "document" ||
    id.startsWith("sharepoint_") ||
    id.startsWith("onedrive_")
  ) {
    return "onedrive_document";
  }
  if (type === "email_attachment") return "outlook_email";
  return null;
}

function sourceSystemForFamily(family) {
  return {
    fireflies: "fireflies",
    teams: "microsoft_graph_teams",
    outlook_email: "microsoft_graph_outlook",
    onedrive_document: "microsoft_graph_onedrive",
  }[family] ?? "unknown";
}

function contentHashFor(row) {
  return String(row.content_hash || row.source_etag || row.source_last_modified_at || row.created_at || "unknown");
}

function statusFor(row, state) {
  if (!row.project_id) return "project_assignment_review";
  if (state.hasProjectIntelligenceEvidence) return "project_intelligence_updated";
  if (state.hasTask) return "actions_routed";
  if (state.embeddedChunks > 0) return "indexed_for_rag";
  return "project_assigned";
}

function compactMetadata(row, state) {
  return {
    source: row.source,
    category: row.category,
    type: row.type,
    backfilled_from_current_state: true,
    chunks: state.chunks,
    embedded_chunks: state.embeddedChunks,
    has_project_intelligence_evidence: state.hasProjectIntelligenceEvidence,
    has_task: state.hasTask,
  };
}

const appDatabaseUrl = getAppDatabaseUrl();
const ragDatabaseUrl = getRagDatabaseUrl();

if (!appDatabaseUrl) {
  console.error("DATABASE_URL or SUPABASE_DB_URL is required.");
  process.exit(1);
}
if (!ragDatabaseUrl) {
  console.error("RAG_DATABASE_URL is required.");
  process.exit(1);
}

const appPool = new pg.Pool({
  connectionString: await buildAppDatabaseConnectionString(appDatabaseUrl, { includeSslMode: false }),
  ssl: { rejectUnauthorized: false },
  max: 1,
});

const ragPool = new pg.Pool({
  connectionString: await buildAppDatabaseConnectionString(ragDatabaseUrl, {
    includeSslMode: false,
    rewriteSupabaseDirectHost: false,
  }),
  ssl: { rejectUnauthorized: false },
  max: 1,
});

const appClient = await appPool.connect();
const ragClient = await ragPool.connect();

try {
  const sourceResult = await appClient.query(
    `
      select id, title, url, source, category, type, project_id, source_item_id,
        fireflies_id, content_hash, source_etag, source_web_url,
        source_last_modified_at, created_at, date
      from public.document_metadata
      where deleted_at is null
        and created_at >= now() - ($1::text || ' days')::interval
        and source in ('fireflies', 'microsoft_graph')
      order by created_at desc
      limit $2
    `,
    [lookbackDays, sourceLimit],
  );

  const sources = sourceResult.rows
    .map((row) => ({ ...row, source_family: classifySource(row) }))
    .filter((row) => row.source_family);
  const sourceIds = sources.map((row) => String(row.id));

  const chunkRows = sourceIds.length
    ? (await ragClient.query(
        `
          select document_id, count(*)::int as chunks,
            count(*) filter (where embedding is not null)::int as embedded_chunks
          from public.document_chunks
          where document_id = any($1::text[])
          group by document_id
        `,
        [sourceIds],
      )).rows
    : [];
  const chunkByDocumentId = new Map(chunkRows.map((row) => [String(row.document_id), row]));

  const taskRows = sourceIds.length
    ? (await appClient.query(
        `
          select metadata_id, count(*)::int as tasks
          from public.tasks
          where metadata_id = any($1::text[])
          group by metadata_id
        `,
        [sourceIds],
      )).rows
    : [];
  const tasksByDocumentId = new Map(taskRows.map((row) => [String(row.metadata_id), Number(row.tasks ?? 0)]));

  const evidenceRows = sourceIds.length
    ? (await appClient.query(
        `
          select source_document_id, count(*)::int as evidence
          from public.insight_card_evidence
          where source_document_id = any($1::text[])
          group by source_document_id
        `,
        [sourceIds],
      )).rows
    : [];
  const evidenceByDocumentId = new Map(evidenceRows.map((row) => [String(row.source_document_id), Number(row.evidence ?? 0)]));

  const rows = sources.map((row) => {
    const chunkState = chunkByDocumentId.get(String(row.id)) ?? { chunks: 0, embedded_chunks: 0 };
    const state = {
      chunks: Number(chunkState.chunks ?? 0),
      embeddedChunks: Number(chunkState.embedded_chunks ?? 0),
      hasTask: Number(tasksByDocumentId.get(String(row.id)) ?? 0) > 0,
      hasProjectIntelligenceEvidence: Number(evidenceByDocumentId.get(String(row.id)) ?? 0) > 0,
    };
    const status = statusFor(row, state);
    return {
      source_system: sourceSystemForFamily(row.source_family),
      source_item_id: String(row.source_item_id || row.fireflies_id || row.id),
      content_hash: contentHashFor(row),
      source_document_id: String(row.id),
      project_id: row.project_id,
      status,
      source_title: row.title,
      source_url: row.source_web_url || row.url,
      occurred_at: row.date || row.source_last_modified_at || row.created_at,
      completed_at: ["project_intelligence_updated", "actions_routed", "indexed_for_rag"].includes(status)
        ? new Date().toISOString()
        : null,
      metadata: compactMetadata(row, state),
    };
  });

  if (!dryRun && rows.length > 0) {
    const batchSize = 500;
    for (let start = 0; start < rows.length; start += batchSize) {
      const batch = rows.slice(start, start + batchSize);
      const params = [];
      const values = batch.map((row, rowIndex) => {
        const offset = rowIndex * 13;
        params.push(
          row.source_system,
          row.source_item_id,
          row.content_hash,
          row.source_document_id,
          row.project_id,
          row.status,
          row.source_title,
          row.source_url,
          row.occurred_at,
          row.completed_at,
          null,
          null,
          JSON.stringify(row.metadata),
        );
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}::bigint, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}::timestamptz, now(), now(), $${offset + 10}::timestamptz, 0, $${offset + 11}, $${offset + 12}, $${offset + 13}::jsonb)`;
      });

      await ragClient.query(
        `
          insert into public.source_processing_jobs (
            source_system, source_item_id, content_hash, source_document_id, project_id,
            status, source_title, source_url, occurred_at, first_seen_at, updated_at,
            completed_at, retry_count, error_code, error_message, metadata
          )
          values ${values.join(",")}
          on conflict (source_system, source_item_id, content_hash)
          do update set
            source_document_id = excluded.source_document_id,
            project_id = excluded.project_id,
            status = excluded.status,
            source_title = excluded.source_title,
            source_url = excluded.source_url,
            occurred_at = excluded.occurred_at,
            updated_at = now(),
            completed_at = excluded.completed_at,
            error_code = null,
            error_message = null,
            metadata = excluded.metadata
        `,
        params,
      );
    }
  }

  const byStatus = rows.reduce((groups, row) => {
    const key = `${row.source_system}:${row.status}`;
    groups[key] ??= {
      source_system: row.source_system,
      status: row.status,
      count: 0,
    };
    groups[key].count += 1;
    return groups;
  }, {});

  console.log(JSON.stringify({
    status: "pass",
    dryRun,
    lookbackDays,
    sourceLimit,
    rowsPrepared: rows.length,
    rowsWritten: dryRun ? 0 : rows.length,
    bySourceAndStatus: Object.values(byStatus),
  }, null, 2));
} finally {
  appClient.release();
  ragClient.release();
  await appPool.end();
  await ragPool.end();
}
