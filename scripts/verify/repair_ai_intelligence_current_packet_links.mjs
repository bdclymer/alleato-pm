#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import { buildAppDatabaseConnectionString, getAppDatabaseUrl } from "./app-db-connection.mjs";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");

dotenv.config({ path: path.join(repoRoot, ".env"), quiet: true });

const dryRun = process.argv.includes("--dry-run");
const databaseUrl = getAppDatabaseUrl();

if (!databaseUrl) {
  console.error("DATABASE_URL or SUPABASE_DB_URL is required for the original app DB.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: await buildAppDatabaseConnectionString(databaseUrl, { includeSslMode: false }),
  ssl: { rejectUnauthorized: false },
  max: 1,
});

const client = await pool.connect();
try {
  await client.query("begin");

  await client.query(`
    create temp table repair_targets on commit drop as
    select distinct c.primary_target_id as target_id
    from public.insight_cards c
    where c.current_status in ('open', 'blocked', 'needs_review', 'stale')
      and c.attribution_status <> 'rejected'
      and not exists (
        select 1
        from public.intelligence_packets p
        join public.intelligence_packet_cards pc on pc.packet_id = p.id
        where p.target_id = c.primary_target_id
          and p.packet_type = 'current'
          and pc.insight_card_id = c.id
      )
      and not exists (
        select 1
        from public.intelligence_packets current_packet
        where current_packet.target_id = c.primary_target_id
          and current_packet.packet_type = 'current'
          and current_packet.compiler_version = 'project-operating-summary-v1'
      )
  `);

  const targetResult = await client.query("select count(*)::int as count from repair_targets");
  const repairTargetCount = Number(targetResult.rows[0]?.count ?? 0);

  if (repairTargetCount === 0) {
    await client.query(dryRun ? "rollback" : "commit");
    console.log(JSON.stringify({ status: "clean", repairedTargets: 0, repairedPacketCards: 0 }, null, 2));
    process.exit(0);
  }

  const missingPacketTargets = await client.query(`
    select rt.target_id, t.name
    from repair_targets rt
    left join public.intelligence_packets p
      on p.target_id = rt.target_id
     and p.packet_type = 'current'
    left join public.intelligence_targets t on t.id = rt.target_id
    where p.id is null
    order by t.name nulls last, rt.target_id
  `);

  if (missingPacketTargets.rowCount > 0) {
    await client.query("rollback");
    console.error("Cannot repair intelligence packet links because some targets have no current packet.");
    console.error(JSON.stringify({ missingPacketTargets: missingPacketTargets.rows }, null, 2));
    process.exit(1);
  }

  await client.query(`
    create temp table repair_packets on commit drop as
    select p.id as packet_id, p.target_id
    from public.intelligence_packets p
    join repair_targets rt on rt.target_id = p.target_id
    where p.packet_type = 'current'
  `);

  await client.query(`
    delete from public.intelligence_packet_cards pc
    using repair_packets rp
    where pc.packet_id = rp.packet_id
  `);

  const insertResult = await client.query(`
    with ranked_cards as (
      select
        rp.packet_id,
        c.id as insight_card_id,
        case
          when c.card_type in ('risk', 'blocker', 'financial_exposure', 'schedule_risk') then 'risks'
          when c.card_type in ('decision', 'change_management') then 'decisions'
          when c.card_type in ('task', 'open_question') then 'follow_ups'
          else 'current_read'
        end as section,
        row_number() over (
          partition by rp.packet_id
          order by c.last_seen_at desc nulls last, c.created_at desc, c.id
        ) as rank
      from repair_packets rp
      join public.insight_cards c on c.primary_target_id = rp.target_id
      where c.current_status in ('open', 'blocked', 'needs_review', 'stale')
        and c.attribution_status <> 'rejected'
    )
    insert into public.intelligence_packet_cards (
      packet_id,
      insight_card_id,
      section,
      rank,
      included_reason
    )
    select
      packet_id,
      insight_card_id,
      section,
      rank,
      'Active promoted card for the current intelligence packet.'
    from ranked_cards
    returning packet_id
  `);

  await client.query(dryRun ? "rollback" : "commit");

  console.log(
    JSON.stringify(
      {
        status: dryRun ? "dry_run" : "repaired",
        repairedTargets: repairTargetCount,
        repairedPacketCards: insertResult.rowCount,
      },
      null,
      2,
    ),
  );
} catch (error) {
  try {
    await client.query("rollback");
  } catch {
    // Ignore rollback errors; the original error is more useful.
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
