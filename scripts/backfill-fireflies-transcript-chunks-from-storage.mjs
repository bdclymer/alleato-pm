#!/usr/bin/env node

/**
 * Backfill full Fireflies transcript chunks from Supabase Storage markdown.
 *
 * This repairs rows where document_metadata has summary/segment chunks but no
 * source_type='meeting_transcript' chunks. It can also rebuild transcript
 * chunks from storage and force document_metadata.content to the full stored
 * markdown. It does not call Fireflies.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(repoRoot, ".env"));
loadEnvFile(path.join(repoRoot, "frontend/.env.local"));

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [key, ...rest] = arg.slice(2).split("=");
      return [key, rest.length ? rest.join("=") : "true"];
    }),
);

const year = Number(args.get("year") || "2026");
const limit = Number(args.get("limit") || "10000");
const scanLimit = Number(args.get("scan-limit") || "10000");
const dryRun = args.get("dry-run") === "true";
const onlyId = args.get("id");
const rebuildExisting = args.get("rebuild-existing") === "true";
const contentOnly = args.get("content-only") === "true";
const chunkTargetChars = Number(args.get("chunk-chars") || "3000");
const chunkOverlapChars = Number(args.get("chunk-overlap") || "500");
const embedBatchSize = Number(args.get("embed-batch-size") || "32");
const insertBatchSize = Number(args.get("insert-batch-size") || "250");

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const ragDatabaseUrl = process.env.RAG_DATABASE_URL;
const ragWritesEnabled = String(process.env.RAG_DATABASE_WRITES_ENABLED || "").toLowerCase() === "true";
const aiGatewayKey = process.env.AI_GATEWAY_API_KEY;
const openAiKey = process.env.OPENAI_API_KEY;

if (!databaseUrl) throw new Error("DATABASE_URL or SUPABASE_DB_URL is required.");
if (!ragDatabaseUrl) throw new Error("RAG_DATABASE_URL is required.");
if (!aiGatewayKey && !openAiKey) throw new Error("AI_GATEWAY_API_KEY or OPENAI_API_KEY is required.");
if (!dryRun && !ragWritesEnabled) {
  throw new Error("RAG_DATABASE_WRITES_ENABLED=true is required for writes.");
}

const sql = postgres(databaseUrl, { max: 1, ssl: "require", idle_timeout: 5 });
const ragSql = postgres(ragDatabaseUrl, { max: 1, ssl: "require", idle_timeout: 5 });

const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMS = 3072;

function hashContent(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 24);
}

function chunkText(text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= chunkTargetChars) return [normalized];
  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + chunkTargetChars, normalized.length);
    if (end < normalized.length) {
      const paragraph = normalized.lastIndexOf("\n\n", end);
      const line = normalized.lastIndexOf("\n", end);
      const boundary = paragraph > start + 1000 ? paragraph : line;
      if (boundary > start + 1000) end = boundary;
    }
    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(0, end - chunkOverlapChars);
  }
  return chunks.filter((chunk) => chunk.length >= 100);
}

function transcriptText(markdown) {
  const marker = markdown.match(/^##\s+Transcript\s*$/im);
  if (!marker) return "";
  return markdown.slice(marker.index).trim();
}

function hasTranscriptMarker(value) {
  return /^##\s+Transcript\s*$/im.test(String(value || ""));
}

async function embed(texts) {
  const providers = [
    aiGatewayKey
      ? {
          label: "AI Gateway",
          url: "https://ai-gateway.vercel.sh/v1/embeddings",
          key: aiGatewayKey,
          model: `openai/${EMBEDDING_MODEL}`,
        }
      : null,
    openAiKey
      ? {
          label: "OpenAI direct",
          url: "https://api.openai.com/v1/embeddings",
          key: openAiKey,
          model: EMBEDDING_MODEL,
        }
      : null,
  ].filter(Boolean);

  const errors = [];
  for (const provider of providers) {
    const response = await fetch(provider.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        input: texts.map((text) => text.slice(0, 8000)),
        dimensions: EMBEDDING_DIMS,
      }),
    });
    if (!response.ok) {
      errors.push(`${provider.label}: ${response.status} ${(await response.text()).slice(0, 300)}`);
      continue;
    }
    const json = await response.json();
    if (!Array.isArray(json.data) || json.data.length !== texts.length) {
      errors.push(`${provider.label}: expected ${texts.length} embeddings, got ${json.data?.length}`);
      continue;
    }
    return json.data.map((item) => item.embedding);
  }
  throw new Error(`Embedding failed: ${errors.join(" | ")}`);
}

async function fetchMarkdown(row) {
  const url = row.url || row.source_web_url;
  if (url && /\/storage\/v1\/object\//.test(url)) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`storage URL ${response.status}`);
    return response.text();
  }
  if (!row.file_path) throw new Error("missing storage URL/file_path");
  const bucket = row.storage_bucket || process.env.SUPABASE_MEETINGS_BUCKET || "meetings";
  const base = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const objectUrl = `${base}/storage/v1/object/${bucket}/${encodeURI(row.file_path)}`;
  const response = await fetch(objectUrl, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`,
    },
  });
  if (!response.ok) throw new Error(`storage object ${response.status}`);
  return response.text();
}

async function candidateRows() {
  const start = `${year}-01-01T00:00:00Z`;
  const end = `${year + 1}-01-01T00:00:00Z`;
  const whereId = onlyId ? sql`and dm.id = ${onlyId}` : sql``;
  const rows = await sql`
    select
      dm.id,
      dm.title,
      dm.date,
      dm.captured_at,
      dm.created_at,
      dm.project_id,
      dm.participants_array,
      dm.content,
      dm.storage_bucket,
      dm.file_path,
      dm.url,
      dm.source_web_url,
      dm.source_metadata
    from public.document_metadata dm
    where (dm.source = 'fireflies'
       or dm.fireflies_id is not null
       or dm.type in ('meeting', 'meeting_transcript', 'Interview'))
      and coalesce(dm.date, dm.captured_at, dm.created_at::timestamptz) >= ${start}::timestamptz
      and coalesce(dm.date, dm.captured_at, dm.created_at::timestamptz) < ${end}::timestamptz
      and dm.deleted_at is null
      and coalesce(dm.source_metadata->'transcript_chunk_backfill'->>'status', '') not in (
        'missing_storage',
        'no_transcript_marker'
      )
      ${whereId}
    order by coalesce(dm.date, dm.captured_at, dm.created_at::timestamptz) desc nulls last
    limit ${scanLimit}
  `;

  if (!rows.length) return [];
  const existing = await ragSql`
    select distinct document_id
    from public.document_chunks
    where source_type = 'meeting_transcript'
      and embedding is not null
      and document_id in ${ragSql(rows.map((row) => row.id))}
  `;
  const withTranscriptChunks = new Set(existing.map((row) => String(row.document_id)));
  return rows
    .map((row) => ({
      ...row,
      has_embedded_transcript_chunks: withTranscriptChunks.has(String(row.id)),
      content_has_transcript: hasTranscriptMarker(row.content),
    }))
    .filter(
      (row) =>
        rebuildExisting ||
        contentOnly ||
        !row.has_embedded_transcript_chunks ||
        !row.content_has_transcript,
    )
    .slice(0, limit);
}

async function upsertChunks(records) {
  for (let index = 0; index < records.length; index += insertBatchSize) {
    const batch = records.slice(index, index + insertBatchSize);
    await ragSql`
      insert into public.document_chunks ${ragSql(batch)}
      on conflict (chunk_id) do update set
        text = excluded.text,
        metadata = excluded.metadata,
        content_hash = excluded.content_hash,
        embedding = excluded.embedding,
        source_type = excluded.source_type,
        updated_at = now()
    `;
  }
}

async function markBackfillStatus(row, status, message = null) {
  const metadata = {
    ...(row.source_metadata || {}),
    transcript_chunk_backfill: {
      status,
      message,
      checked_at: new Date().toISOString(),
      script: "backfill-fireflies-transcript-chunks-from-storage",
    },
  };
  await sql`
    update public.document_metadata
    set source_metadata = ${sql.json(metadata)}
    where id = ${row.id}
  `;
}

async function main() {
  const rows = await candidateRows();
  console.log(`Fireflies ${year} meetings selected for storage transcript repair: ${rows.length}`);
  if (dryRun) {
    let storageWithTranscript = 0;
    let storageMissingTranscript = 0;
    let contentMissingTranscript = 0;
    let missingEmbeddedTranscriptChunks = 0;
    for (const row of rows) {
      if (!row.content_has_transcript) contentMissingTranscript += 1;
      if (!row.has_embedded_transcript_chunks) missingEmbeddedTranscriptChunks += 1;
      try {
        const markdown = await fetchMarkdown(row);
        if (transcriptText(markdown)) storageWithTranscript += 1;
        else storageMissingTranscript += 1;
      } catch {
        storageMissingTranscript += 1;
      }
    }
    console.log(
      `Dry run: storage with transcript marker=${storageWithTranscript}, ` +
        `missing/unreadable=${storageMissingTranscript}, ` +
        `content missing transcript marker=${contentMissingTranscript}, ` +
        `missing embedded transcript chunks=${missingEmbeddedTranscriptChunks}`,
    );
    return;
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let insertedChunks = 0;
  for (const row of rows) {
    try {
      const markdown = await fetchMarkdown(row);
      const transcript = transcriptText(markdown);
      if (!transcript) {
        skipped += 1;
        await markBackfillStatus(row, "no_transcript_marker", "Storage markdown has no ## Transcript section.");
        console.error(`[SKIP] ${row.id}: storage markdown has no ## Transcript marker`);
        continue;
      }
      const chunks = chunkText(transcript);
      if (!chunks.length) {
        skipped += 1;
        await markBackfillStatus(row, "no_usable_transcript_chunks", "Transcript section produced no usable chunks.");
        console.error(`[SKIP] ${row.id}: transcript produced no usable chunks`);
        continue;
      }

      if (row.content !== markdown) {
        await sql`
          update public.document_metadata
          set content = ${markdown}
          where id = ${row.id}
        `;
      }

      let records = [];
      if (!contentOnly && (rebuildExisting || !row.has_embedded_transcript_chunks)) {
        const embeddings = [];
        for (let index = 0; index < chunks.length; index += embedBatchSize) {
          const batch = chunks.slice(index, index + embedBatchSize);
          const embeddingTexts = batch.map((chunk, offset) => {
            const chunkNumber = index + offset;
            const date = row.date || row.captured_at || row.created_at || "unknown date";
            return `[Meeting transcript: "${row.title || "Untitled"}" | ${date} | chunk ${chunkNumber}]\n\n${chunk}`;
          });
          embeddings.push(...(await embed(embeddingTexts)));
        }

        records = chunks.map((chunk, index) => {
          const contentHash = hashContent(chunk);
          return {
            chunk_id: `${row.id}__storage_transcript_${index}_${contentHash}`,
            document_id: row.id,
            chunk_index: index,
            text: chunk,
            metadata: {
              doc_type: "meeting_transcript",
              chunk_index: index,
              title: row.title,
              file_date: row.date || row.captured_at || row.created_at,
              project_id: row.project_id,
              participants: row.participants_array || [],
              content_hash: contentHash,
              backfill_source: "backfill-fireflies-transcript-chunks-from-storage",
              transcript_source: "document_metadata.storage_markdown",
            },
            content_hash: contentHash,
            embedding: JSON.stringify(embeddings[index]),
            source_type: "meeting_transcript",
          };
        });
        await upsertChunks(records);
      }

      processed += 1;
      insertedChunks += records.length;
      const status = contentOnly ? "content_synced" : "embedded";
      const message = contentOnly
        ? `content synced from storage markdown; transcript chars=${transcript.length}.`
        : `${records.length} transcript chunks written; transcript chars=${transcript.length}.`;
      await markBackfillStatus(row, status, message);
      console.log(`[OK] ${row.id}: ${records.length} transcript chunks, transcript chars=${transcript.length}`);
    } catch (error) {
      if (error.message === "missing storage URL/file_path") {
        skipped += 1;
        await markBackfillStatus(row, "missing_storage", error.message);
        console.error(`[SKIP] ${row.id}: ${error.message}`);
      } else {
        failed += 1;
        console.error(`[FAIL] ${row.id}: ${error.message}`);
      }
    }
  }

  console.log(`Done. processed=${processed}, skipped=${skipped}, failed=${failed}, transcript_chunks=${insertedChunks}`);
  if (failed > 0) process.exitCode = 1;
}

try {
  await main();
} finally {
  await Promise.allSettled([sql.end(), ragSql.end()]);
}
