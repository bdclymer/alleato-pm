#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  buildAppDatabaseConnectionString,
  getAppDatabaseUrl,
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

const projectId = Number(args.get("project-id") ?? process.env.PACKET_SYNTHESIS_VERIFY_PROJECT_ID ?? 1009);
const maxPlaceholderRatio = Number(
  args.get("max-placeholder-ratio") ?? process.env.PACKET_SYNTHESIS_MAX_PLACEHOLDER_RATIO ?? 0.05,
);
const maxRawPacketFields = Number(
  args.get("max-raw-packet-fields") ?? process.env.PACKET_SYNTHESIS_MAX_RAW_PACKET_FIELDS ?? 0,
);
const maxRepeatedNextActionRatio = Number(
  args.get("max-repeated-next-action-ratio") ?? process.env.PACKET_SYNTHESIS_MAX_REPEATED_NEXT_ACTION_RATIO ?? 0.5,
);

if (!Number.isInteger(projectId) || projectId < 1) {
  console.error("--project-id must be a positive integer.");
  process.exit(1);
}

const appDatabaseUrl = getAppDatabaseUrl();
if (!appDatabaseUrl) {
  console.error("DATABASE_URL or SUPABASE_DB_URL is required.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: await buildAppDatabaseConnectionString(appDatabaseUrl, { includeSslMode: false }),
  ssl: { rejectUnauthorized: false },
  max: 1,
});

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function looksRaw(value) {
  const text = cleanText(value);
  const emailCount = (text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/g) ?? []).length;
  return (
    text.startsWith("subject:") ||
    (text.includes(" subject:") && text.includes(" from:") && text.includes(" to:")) ||
    (text.includes(" duration:") && text.includes(" participants:")) ||
    emailCount >= 4
  );
}

function fail(message, details) {
  console.error(`AI packet synthesis quality verification failed: ${message}`);
  console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

const client = await pool.connect();
try {
  const packetResult = await client.query(
    `
      select p.id, p.generated_at, p.compiler_version, p.packet_version,
        p.executive_summary, p.current_status, p.strategic_read, p.why_it_matters,
        p.source_coverage, p.packet_json, t.name as target_name
      from public.intelligence_packets p
      join public.intelligence_targets t on t.id = p.target_id
      where t.project_id = $1
        and p.packet_type = 'current'
      order by p.generated_at desc nulls last
      limit 1
    `,
    [projectId],
  );

  const packet = packetResult.rows[0];
  if (!packet) {
    fail("no current packet found", { projectId });
  }

  const cardResult = await client.query(
    `
      select c.id, c.title, c.summary, c.why_it_matters, c.next_action
      from public.intelligence_packet_cards pc
      join public.insight_cards c on c.id = pc.insight_card_id
      where pc.packet_id = $1
    `,
    [packet.id],
  );

  const placeholderCards = cardResult.rows.filter((row) => {
    const why = cleanText(row.why_it_matters);
    const action = cleanText(row.next_action);
    return (
      why === "this source contains project-relevant language that should be reviewed before it is trusted in a current intelligence packet." ||
      action === "review the source attribution and extracted signal, then promote or reject it." ||
      looksRaw(row.summary)
    );
  });

  const rawPacketFields = [
    ["executive_summary", packet.executive_summary],
    ["current_status", packet.current_status],
    ["strategic_read", packet.strategic_read],
    ["why_it_matters", packet.why_it_matters],
  ].filter(([, value]) => looksRaw(value));

  const placeholderRatio = cardResult.rows.length
    ? placeholderCards.length / cardResult.rows.length
    : 1;
  const nextActionCounts = cardResult.rows.reduce((counts, row) => {
    const action = cleanText(row.next_action);
    if (!action) return counts;
    counts.set(action, (counts.get(action) ?? 0) + 1);
    return counts;
  }, new Map());
  const repeatedNextAction = [...nextActionCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  const repeatedNextActionRatio = cardResult.rows.length
    ? repeatedNextAction[1] / cardResult.rows.length
    : 1;
  const sourceCoverage = packet.source_coverage ?? {};
  const qualityGate = sourceCoverage.qualityGate ?? {};
  const strategicReport = packet.packet_json?.strategicReport ?? null;
  const categoryCoverage = Array.isArray(sourceCoverage.categoryCoverage)
    ? sourceCoverage.categoryCoverage
    : [];
  const meetingCoverage = categoryCoverage.find((row) => {
    const label = cleanText(row?.label ?? row?.category);
    return label.includes("meeting");
  });

  if (packet.compiler_version !== "project-operating-summary-v1") {
    fail("packet was not generated by the operating summary compiler", {
      projectId,
      packetId: packet.id,
      compilerVersion: packet.compiler_version,
    });
  }

  if (qualityGate.status !== "passed") {
    fail("packet source quality gate is missing or failed", {
      projectId,
      packetId: packet.id,
      qualityGate,
    });
  }

  if (!strategicReport) {
    fail("packet_json.strategicReport is missing", {
      projectId,
      packetId: packet.id,
    });
  }

  if (rawPacketFields.length > maxRawPacketFields) {
    fail("packet top-level fields still contain raw source text", {
      projectId,
      packetId: packet.id,
      rawPacketFields: rawPacketFields.map(([field]) => field),
      maxRawPacketFields,
    });
  }

  if (placeholderRatio > maxPlaceholderRatio) {
    fail("too many packet cards contain placeholders or raw source text", {
      projectId,
      packetId: packet.id,
      cardCount: cardResult.rows.length,
      placeholderCount: placeholderCards.length,
      placeholderRatio,
      maxPlaceholderRatio,
      sample: placeholderCards.slice(0, 5).map((row) => row.title),
    });
  }

  if (repeatedNextActionRatio > maxRepeatedNextActionRatio && repeatedNextAction[1] > 1) {
    fail("too many packet cards repeat the same next action", {
      projectId,
      packetId: packet.id,
      cardCount: cardResult.rows.length,
      repeatedNextAction: repeatedNextAction[0],
      repeatedCount: repeatedNextAction[1],
      repeatedNextActionRatio,
      maxRepeatedNextActionRatio,
    });
  }

  if (!meetingCoverage || Number(meetingCoverage.sourceCount ?? 0) < 1) {
    fail("operating packet does not expose meeting source coverage", {
      projectId,
      packetId: packet.id,
      meetingCoverage,
      categoryCoverage,
    });
  }

  console.log(JSON.stringify({
    status: "pass",
    projectId,
    targetName: packet.target_name,
    packetId: packet.id,
    generatedAt: packet.generated_at,
    compilerVersion: packet.compiler_version,
    packetVersion: packet.packet_version,
    cardCount: cardResult.rows.length,
    placeholderCount: placeholderCards.length,
    placeholderRatio,
    repeatedNextActionRatio,
    sourceQualityCounts: sourceCoverage.sourceQualityCounts ?? null,
  }, null, 2));
} finally {
  client.release();
  await pool.end();
}
