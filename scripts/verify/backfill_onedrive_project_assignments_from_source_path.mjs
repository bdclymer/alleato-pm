#!/usr/bin/env node

/**
 * Backfill OneDrive/SharePoint document project_id from source_path project numbers.
 *
 * This is bounded and model-free. It handles paths such as:
 *   2025 Jobs/25- 109 Uniqlo (...)/...
 * by matching the normalized project_number to public.projects.project_number.
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

const lookbackDays = Number(args.get("days") ?? process.env.ONEDRIVE_PATH_ASSIGN_BACKFILL_DAYS ?? 14);
const limit = Number(args.get("limit") ?? process.env.ONEDRIVE_PATH_ASSIGN_BACKFILL_LIMIT ?? 1_000);
const dryRun = args.get("dry-run") === "true";

if (!Number.isFinite(lookbackDays) || !Number.isFinite(limit)) {
  console.error("--days and --limit must be numeric.");
  process.exit(1);
}

function normalizeProjectNumber(value) {
  return String(value ?? "").toLowerCase().replace(/\s+/g, "").trim();
}

function appendTag(existing, tag) {
  const tags = String(existing ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!tags.includes(tag)) tags.push(tag);
  return tags.join(",");
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
  const docs = (await appClient.query(
    `
      select id, title, source_path, tags, created_at
      from public.document_metadata
      where deleted_at is null
        and source = 'microsoft_graph'
        and category = 'document'
        and project_id is null
        and nullif(source_path, '') is not null
        and created_at >= now() - ($1::text || ' days')::interval
      order by created_at desc
      limit $2
    `,
    [lookbackDays, limit],
  )).rows;

  const projects = (await appClient.query(
    `
      select id, name, project_number
      from public.projects
      where archived is not true
        and nullif(project_number, '') is not null
    `,
  )).rows
    .map((project) => ({
      ...project,
      normalized_project_number: normalizeProjectNumber(project.project_number),
    }))
    .filter((project) => project.normalized_project_number.length >= 4);

  const assignments = [];
  const ambiguous = [];
  for (const doc of docs) {
    const normalizedPath = normalizeProjectNumber(doc.source_path);
    const matches = projects
      .filter((project) => normalizedPath.includes(project.normalized_project_number))
      .sort((a, b) => b.normalized_project_number.length - a.normalized_project_number.length);
    if (matches.length === 0) continue;
    if (
      matches.length > 1 &&
      matches[0].normalized_project_number.length === matches[1].normalized_project_number.length &&
      Number(matches[0].id) !== Number(matches[1].id)
    ) {
      ambiguous.push({
        id: doc.id,
        title: doc.title,
        source_path: doc.source_path,
        matches: matches.slice(0, 5).map((project) => ({
          project_id: Number(project.id),
          project_number: project.project_number,
          name: project.name,
        })),
      });
      continue;
    }
    assignments.push({
      document_id: String(doc.id),
      title: doc.title,
      source_path: doc.source_path,
      tags: appendTag(doc.tags, "project_auto_backfill:source_path_project_number_v1"),
      project_id: Number(matches[0].id),
      project_name: matches[0].name,
      project_number: matches[0].project_number,
    });
  }

  if (!dryRun && assignments.length > 0) {
    await appClient.query("begin");
    try {
      await appClient.query(
        `
          update public.document_metadata d
          set project_id = v.project_id,
            project = v.project_name,
            tags = v.tags,
            source_metadata = jsonb_set(
              coalesce(d.source_metadata, '{}'::jsonb),
              '{project_assignment_backfill}',
              jsonb_build_object(
                'status', 'assigned',
                'source', 'source_path_project_number',
                'project_number', v.project_number,
                'assigned_at', now()
              ),
              true
            )
          from jsonb_to_recordset($1::jsonb) as v(
            document_id text,
            project_id bigint,
            project_name text,
            project_number text,
            tags text
          )
          where d.id = v.document_id
            and d.project_id is null
            and d.deleted_at is null
        `,
        [JSON.stringify(assignments)],
      );
      await appClient.query("commit");

      await ragClient.query(
        `
          update public.source_processing_jobs j
          set project_id = v.project_id,
            status = case
              when j.status = 'project_assignment_review' then 'project_assigned'
              else j.status
            end,
            updated_at = now(),
            metadata = coalesce(j.metadata, '{}'::jsonb) || jsonb_build_object(
              'project_assignment_backfill',
              jsonb_build_object(
                'status', 'assigned',
                'source', 'source_path_project_number',
                'project_number', v.project_number,
                'assigned_at', now()
              )
            )
          from jsonb_to_recordset($1::jsonb) as v(
            document_id text,
            project_id bigint,
            project_number text
          )
          where j.source_document_id = v.document_id
            and j.project_id is null
        `,
        [JSON.stringify(assignments.map((assignment) => ({
          document_id: assignment.document_id,
          project_id: assignment.project_id,
          project_number: assignment.project_number,
        })))],
      );
    } catch (error) {
      await appClient.query("rollback");
      throw error;
    }
  }

  console.log(JSON.stringify({
    status: "pass",
    dryRun,
    lookbackDays,
    docsScanned: docs.length,
    assignments: assignments.length,
    updated: dryRun ? 0 : assignments.length,
    ambiguous: ambiguous.length,
    samples: assignments.slice(0, 20).map((assignment) => ({
      document_id: assignment.document_id,
      title: assignment.title,
      project_id: assignment.project_id,
      project_number: assignment.project_number,
      project_name: assignment.project_name,
      source_path: assignment.source_path,
    })),
    ambiguousSamples: ambiguous.slice(0, 10),
  }, null, 2));
} finally {
  appClient.release();
  ragClient.release();
  await appPool.end();
  await ragPool.end();
}
