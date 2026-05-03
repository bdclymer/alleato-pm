#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

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

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL or SUPABASE_DB_URL is required.");
  process.exit(1);
}

const maxQueuedMinutes = Number(args.get("max-queued-minutes") ?? process.env.INTELLIGENCE_COMPILER_VERIFY_MAX_QUEUED_MINUTES ?? 30);
const maxRunningMinutes = Number(args.get("max-running-minutes") ?? process.env.INTELLIGENCE_COMPILER_VERIFY_MAX_RUNNING_MINUTES ?? 30);
const recentFailureHours = Number(args.get("recent-failure-hours") ?? process.env.INTELLIGENCE_COMPILER_VERIFY_RECENT_FAILURE_HOURS ?? 24);
const maxRecentFailures = Number(args.get("max-recent-failures") ?? process.env.INTELLIGENCE_COMPILER_VERIFY_MAX_RECENT_FAILURES ?? 0);
const maxUnpromotedMinutes = Number(args.get("max-unpromoted-minutes") ?? process.env.INTELLIGENCE_COMPILER_VERIFY_MAX_UNPROMOTED_MINUTES ?? 30);

function connectionString() {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  return url.toString();
}

const pool = new pg.Pool({
  connectionString: connectionString(),
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

const client = await pool.connect();
try {
  const sourceStaleQueued = await scalar(
    client,
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
    client,
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
    client,
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
    client,
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
    client,
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
    client,
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
    client,
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

  const promotedWithoutCard = await scalar(
    client,
    `select count(*)::int as count
     from public.source_signal_candidates s
     left join public.insight_cards c on c.id = s.promoted_insight_card_id
     where s.status = 'promoted'
       and (s.promoted_insight_card_id is null or c.id is null)`,
  );
  if (promotedWithoutCard > 0) {
    fail("promoted source_signal_candidates are missing promoted insight cards", { count: promotedWithoutCard });
  }

  const promotedWithoutEvidence = await scalar(
    client,
    `select count(*)::int as count
     from public.source_signal_candidates s
     where s.status = 'promoted'
       and s.promoted_insight_card_id is not null
       and not exists (
         select 1
         from public.insight_card_evidence e
         where e.insight_card_id = s.promoted_insight_card_id
           and e.source_document_id = s.source_document_id
       )`,
  );
  if (promotedWithoutEvidence > 0) {
    fail("promoted source_signal_candidates are missing source-linked evidence", { count: promotedWithoutEvidence });
  }

  const activeCardsMissingCurrentPacket = await scalar(
    client,
    `select count(*)::int as count
     from public.insight_cards c
     where c.current_status in ('open','blocked','needs_review','stale')
       and c.attribution_status <> 'rejected'
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
    client,
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
  client.release();
  await pool.end();
}
