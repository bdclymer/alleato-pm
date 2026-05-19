#!/usr/bin/env node

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

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith("--")) continue;
  const next = process.argv[index + 1];
  args.set(arg.slice(2), next && !next.startsWith("--") ? next : "true");
}

const appDatabaseUrl = getAppDatabaseUrl();
const ragDatabaseUrl = getRagDatabaseUrl();
if (!appDatabaseUrl) {
  console.error("DATABASE_URL or SUPABASE_DB_URL is required for the original app DB.");
  process.exit(1);
}
if (!ragDatabaseUrl) {
  console.error("RAG_DATABASE_URL is required for moved intelligence compiler queue tables.");
  process.exit(1);
}

const maxQueuedMinutes = Number(args.get("max-queued-minutes") ?? process.env.INTELLIGENCE_COMPILER_VERIFY_MAX_QUEUED_MINUTES ?? 30);
const maxRunningMinutes = Number(args.get("max-running-minutes") ?? process.env.INTELLIGENCE_COMPILER_VERIFY_MAX_RUNNING_MINUTES ?? 30);
const recentFailureHours = Number(args.get("recent-failure-hours") ?? process.env.INTELLIGENCE_COMPILER_VERIFY_RECENT_FAILURE_HOURS ?? 24);
const maxRecentFailures = Number(args.get("max-recent-failures") ?? process.env.INTELLIGENCE_COMPILER_VERIFY_MAX_RECENT_FAILURES ?? 0);
const maxUnpromotedMinutes = Number(args.get("max-unpromoted-minutes") ?? process.env.INTELLIGENCE_COMPILER_VERIFY_MAX_UNPROMOTED_MINUTES ?? 30);

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

const failures = [];

function fail(message, details) {
  failures.push({ message, details });
}

async function scalar(client, sql, params = []) {
  const result = await client.query(sql, params);
  return Number(result.rows[0]?.count ?? 0);
}

async function promotedCandidateRows(client) {
  const result = await client.query(
    `select promoted_insight_card_id::text as insight_card_id, source_document_id::text as source_document_id
     from public.source_signal_candidates
     where status = 'promoted'`,
  );
  return result.rows;
}

async function countPromotedWithoutAppRecords(appClient, rows, mode) {
  if (rows.length === 0) return 0;
  await appClient.query("create temp table verify_promoted_candidates (insight_card_id uuid, source_document_id text)");
  for (let start = 0; start < rows.length; start += 500) {
    const chunk = rows.slice(start, start + 500);
    const values = [];
    const params = [];
    chunk.forEach((row, index) => {
      params.push(row.insight_card_id, row.source_document_id);
      values.push(`($${index * 2 + 1}::uuid, $${index * 2 + 2}::text)`);
    });
    await appClient.query(
      `insert into verify_promoted_candidates (insight_card_id, source_document_id) values ${values.join(",")}`,
      params,
    );
  }

  const sql =
    mode === "card"
      ? `select count(*)::int as count
         from verify_promoted_candidates v
         left join public.insight_cards c on c.id = v.insight_card_id
         where v.insight_card_id is null or c.id is null`
      : `select count(*)::int as count
         from verify_promoted_candidates v
         where v.insight_card_id is not null
           and not exists (
             select 1
             from public.insight_card_evidence e
             where e.insight_card_id = v.insight_card_id
               and e.source_document_id = v.source_document_id
           )`;
  const result = await appClient.query(sql);
  await appClient.query("drop table if exists verify_promoted_candidates");
  return Number(result.rows[0]?.count ?? 0);
}

const appClient = await appPool.connect();
const ragClient = await ragPool.connect();
try {
  const sourceStaleQueued = await scalar(
    ragClient,
    `select count(*)::int as count
     from public.source_intelligence_jobs
     where status = 'queued'
       and queued_at < now() - ($1::text || ' minutes')::interval`,
    [maxQueuedMinutes],
  );
  if (sourceStaleQueued > 0) {
    fail("source_intelligence_jobs has stale queued jobs", { count: sourceStaleQueued, maxQueuedMinutes });
  }

  const packetStaleQueued = await scalar(
    ragClient,
    `select count(*)::int as count
     from public.packet_refresh_jobs
     where status = 'queued'
       and queued_at < now() - ($1::text || ' minutes')::interval`,
    [maxQueuedMinutes],
  );
  if (packetStaleQueued > 0) {
    fail("packet_refresh_jobs has stale queued jobs", { count: packetStaleQueued, maxQueuedMinutes });
  }

  const sourceStaleRunning = await scalar(
    ragClient,
    `select count(*)::int as count
     from public.source_intelligence_jobs
     where status = 'running'
       and coalesce(started_at, updated_at, queued_at) < now() - ($1::text || ' minutes')::interval`,
    [maxRunningMinutes],
  );
  if (sourceStaleRunning > 0) {
    fail("source_intelligence_jobs has stale running jobs", { count: sourceStaleRunning, maxRunningMinutes });
  }

  const packetStaleRunning = await scalar(
    ragClient,
    `select count(*)::int as count
     from public.packet_refresh_jobs
     where status = 'running'
       and coalesce(started_at, updated_at, queued_at) < now() - ($1::text || ' minutes')::interval`,
    [maxRunningMinutes],
  );
  if (packetStaleRunning > 0) {
    fail("packet_refresh_jobs has stale running jobs", { count: packetStaleRunning, maxRunningMinutes });
  }

  const sourceRecentFailed = await scalar(
    ragClient,
    `select count(*)::int as count
     from public.source_intelligence_jobs
     where status = 'failed'
       and coalesce(finished_at, updated_at, queued_at) >= now() - ($1::text || ' hours')::interval`,
    [recentFailureHours],
  );
  if (sourceRecentFailed > maxRecentFailures) {
    fail("source_intelligence_jobs has recent failures", { count: sourceRecentFailed, maxRecentFailures, recentFailureHours });
  }

  const packetRecentFailed = await scalar(
    ragClient,
    `select count(*)::int as count
     from public.packet_refresh_jobs
     where status = 'failed'
       and coalesce(finished_at, updated_at, queued_at) >= now() - ($1::text || ' hours')::interval`,
    [recentFailureHours],
  );
  if (packetRecentFailed > maxRecentFailures) {
    fail("packet_refresh_jobs has recent failures", { count: packetRecentFailed, maxRecentFailures, recentFailureHours });
  }

  const highConfidenceUnpromoted = await scalar(
    ragClient,
    `select count(*)::int as count
     from public.source_signal_candidates
     where confidence = 'high'
       and status = 'candidate'
       and created_at < now() - ($1::text || ' minutes')::interval`,
    [maxUnpromotedMinutes],
  );
  if (highConfidenceUnpromoted > 0) {
    fail("high-confidence source_signal_candidates are stuck before promotion", { count: highConfidenceUnpromoted, maxUnpromotedMinutes });
  }

  const promotedRows = await promotedCandidateRows(ragClient);
  const promotedWithoutCard = await countPromotedWithoutAppRecords(appClient, promotedRows, "card");
  if (promotedWithoutCard > 0) {
    fail("promoted source_signal_candidates are missing promoted insight cards", { count: promotedWithoutCard });
  }

  const promotedWithoutEvidence = await countPromotedWithoutAppRecords(appClient, promotedRows, "evidence");
  if (promotedWithoutEvidence > 0) {
    fail("promoted source_signal_candidates are missing source-linked evidence", { count: promotedWithoutEvidence });
  }

  const activeCardsMissingCurrentPacket = await scalar(
    appClient,
    `select count(*)::int as count
     from public.insight_cards c
     where c.current_status in ('open','blocked','needs_review','stale')
       and c.attribution_status <> 'rejected'
       and not exists (
         select 1
         from public.intelligence_packets operating_packet
         where operating_packet.target_id = c.primary_target_id
           and operating_packet.packet_type = 'current'
           and operating_packet.compiler_version = 'project-operating-summary-v1'
           and coalesce(c.compiler_version, '') <> 'project-operating-summary-v1'
       )
       and not exists (
         select 1
         from public.intelligence_packets p
         join public.intelligence_packet_cards pc on pc.packet_id = p.id
         where p.target_id = c.primary_target_id
           and p.packet_type = 'current'
           and pc.insight_card_id = c.id
       )`,
  );
  if (activeCardsMissingCurrentPacket > 0) {
    fail("active insight_cards are missing from their target current packet", { count: activeCardsMissingCurrentPacket });
  }

  const succeededPacketJobsWithoutOutput = await scalar(
    ragClient,
    `select count(*)::int as count
     from public.packet_refresh_jobs
     where status = 'succeeded'
       and output_packet_id is null
       and finished_at >= now() - ($1::text || ' hours')::interval`,
    [recentFailureHours],
  );
  if (succeededPacketJobsWithoutOutput > 0) {
    fail("recent succeeded packet_refresh_jobs are missing output_packet_id", { count: succeededPacketJobsWithoutOutput, recentFailureHours });
  }

  const summary = {
    status: failures.length ? "fail" : "pass",
    thresholds: {
      maxQueuedMinutes,
      maxRunningMinutes,
      recentFailureHours,
      maxRecentFailures,
      maxUnpromotedMinutes,
    },
    checks: {
      sourceStaleQueued,
      packetStaleQueued,
      sourceStaleRunning,
      packetStaleRunning,
      sourceRecentFailed,
      packetRecentFailed,
      highConfidenceUnpromoted,
      promotedWithoutCard,
      promotedWithoutEvidence,
      activeCardsMissingCurrentPacket,
      succeededPacketJobsWithoutOutput,
    },
    failures,
  };

  if (failures.length > 0) {
    console.error("AI intelligence compiler health verification failed:");
    console.error(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(summary, null, 2));
  }
} finally {
  appClient.release();
  ragClient.release();
  await appPool.end();
  await ragPool.end();
}
