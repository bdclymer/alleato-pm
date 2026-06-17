#!/usr/bin/env node

/**
 * Repair meeting durations that were stored as a stale low value (commonly
 * `duration_minutes = 1`) because the Fireflies transcript was ingested before
 * Fireflies finished processing it. We re-query the Fireflies GraphQL API for
 * each affected meeting and write back the authoritative duration.
 *
 * Fireflies returns `transcript.duration` in MINUTES (float). We round to the
 * nearest integer to match the `duration_minutes` integer column.
 *
 * Intentionally loud: any meeting we cannot repair (missing from Fireflies,
 * API error, or still reporting a sub-2-minute duration) is reported, and the
 * script exits non-zero if nothing could be fixed.
 *
 * Usage:
 *   node scripts/backfill-fireflies-meeting-durations.mjs            # repair all <= 2 min
 *   node scripts/backfill-fireflies-meeting-durations.mjs --dry-run  # report only
 *   node scripts/backfill-fireflies-meeting-durations.mjs --id=<fireflies_id>
 *   node scripts/backfill-fireflies-meeting-durations.mjs --threshold=2
 */

import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env", quiet: true });
dotenv.config({ path: "frontend/.env.local", override: true, quiet: true });
dotenv.config({ path: "backend/.env", override: false, quiet: true });

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const firefliesApiKey = process.env.FIREFLIES_API_KEY;
const firefliesApiUrl =
  process.env.FIREFLIES_API_URL || "https://api.fireflies.ai/graphql";

const dryRun = process.argv.includes("--dry-run");
const onlyId = process.argv.find((arg) => arg.startsWith("--id="))?.split("=")[1];
const threshold = Number(
  process.argv.find((arg) => arg.startsWith("--threshold="))?.split("=")[1] ?? 2,
);

if (!databaseUrl) {
  console.error("[FATAL] DATABASE_URL or SUPABASE_DB_URL is required.");
  process.exit(1);
}
if (!firefliesApiKey) {
  console.error("[FATAL] FIREFLIES_API_KEY is required.");
  process.exit(1);
}

const TRANSCRIPT_QUERY = `
  query Transcript($id: String!) {
    transcript(id: $id) {
      id
      duration
    }
  }
`;

async function fireflies(query, variables) {
  const response = await fetch(firefliesApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firefliesApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`Fireflies HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  if (payload.errors) {
    throw new Error(`Fireflies GraphQL error: ${JSON.stringify(payload.errors)}`);
  }
  return payload.data;
}

async function main() {
  const sql = postgres(databaseUrl, { prepare: false });

  try {
    const rows = onlyId
      ? await sql`
          SELECT id, fireflies_id, duration_minutes, title
          FROM document_metadata
          WHERE fireflies_id = ${onlyId} AND deleted_at IS NULL
        `
      : await sql`
          SELECT id, fireflies_id, duration_minutes, title
          FROM document_metadata
          WHERE type = 'meeting'
            AND fireflies_id IS NOT NULL
            AND deleted_at IS NULL
            AND duration_minutes IS NOT NULL
            AND duration_minutes <= ${threshold}
            AND length(coalesce(content, '')) > 1500
          ORDER BY date DESC
        `;

    console.log(
      `[INFO] ${rows.length} meeting(s) with duration_minutes <= ${threshold} and real content.`,
    );

    let fixed = 0;
    let unchanged = 0;
    const failures = [];

    for (const row of rows) {
      // Throttle: Fireflies rate-limits aggressively (429) on bursts.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      let transcript;
      try {
        const data = await fireflies(TRANSCRIPT_QUERY, { id: row.fireflies_id });
        transcript = data?.transcript;
      } catch (error) {
        failures.push({ id: row.fireflies_id, reason: error.message });
        console.warn(`[WARN] ${row.fireflies_id} — Fireflies query failed: ${error.message}`);
        continue;
      }

      const durationRaw = transcript?.duration;
      const next =
        typeof durationRaw === "number" && Number.isFinite(durationRaw)
          ? Math.max(1, Math.round(durationRaw))
          : null;

      if (next === null) {
        failures.push({ id: row.fireflies_id, reason: "Fireflies returned no duration" });
        console.warn(`[WARN] ${row.fireflies_id} — Fireflies returned no duration.`);
        continue;
      }

      if (next <= row.duration_minutes) {
        unchanged += 1;
        console.log(
          `[SKIP] ${row.fireflies_id} — Fireflies duration ${next}m not greater than stored ${row.duration_minutes}m.`,
        );
        continue;
      }

      console.log(
        `[FIX ] ${row.fireflies_id} — ${row.duration_minutes}m -> ${next}m  (${row.title ?? "Untitled"})`,
      );

      if (!dryRun) {
        await sql`
          UPDATE document_metadata
          SET duration_minutes = ${next}
          WHERE id = ${row.id}
        `;
      }
      fixed += 1;
    }

    console.log(
      `\n[DONE] fixed=${fixed} unchanged=${unchanged} failed=${failures.length} dryRun=${dryRun}`,
    );

    if (fixed === 0 && rows.length > 0 && failures.length === rows.length) {
      console.error("[FATAL] No durations could be repaired — every Fireflies lookup failed.");
      process.exitCode = 1;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("[FATAL]", error);
  process.exit(1);
});
