#!/usr/bin/env node
/**
 * Backfill tasks.project_ids from linked document_metadata.project_id.
 *
 * ~83% of tasks have empty project_ids arrays despite being linked to
 * document_metadata records that have a project_id set.
 *
 * Run from frontend/: node ../scripts/backfill-task-project-ids.js
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../frontend/.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key);

async function backfill() {
  // Count tasks with empty project_ids
  const { count: emptyCount } = await sb
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .filter("project_ids", "eq", "{}");
  console.log("Tasks with empty project_ids:", emptyCount);

  // Get tasks that have metadata_id linking to doc_metadata with project_id
  const { data: tasksToFix, error } = await sb
    .from("tasks")
    .select("id, metadata_id, document_metadata!tasks_metadata_id_fkey(project_id)")
    .filter("project_ids", "eq", "{}")
    .not("metadata_id", "is", null)
    .limit(5000);

  if (error) {
    console.error("Query error:", error);
    return;
  }

  console.log("Tasks fetched for backfill:", tasksToFix?.length);

  let updated = 0;
  let skipped = 0;
  for (const task of tasksToFix || []) {
    const docMeta = task.document_metadata;
    const projectId = docMeta?.project_id;
    if (!projectId) {
      skipped++;
      continue;
    }

    const { error: updateErr } = await sb
      .from("tasks")
      .update({ project_ids: [projectId] })
      .eq("id", task.id);

    if (updateErr) {
      console.error("Update error for", task.id, updateErr);
    } else {
      updated++;
    }
  }

  console.log(`\nBackfill complete: ${updated} updated, ${skipped} skipped (no project_id on doc_metadata)`);

  // Verify
  const { count: remainingEmpty } = await sb
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .filter("project_ids", "eq", "{}");
  console.log("Tasks still with empty project_ids:", remainingEmpty);
}

backfill().catch(console.error);
