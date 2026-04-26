#!/usr/bin/env node

/**
 * Backfill document_chunks for recent Fireflies meetings that already have
 * document_metadata.content but no chunk rows.
 *
 * This is intentionally loud: provider failures abort, and the script exits
 * non-zero if any selected meeting could not be chunked and embedded.
 */

import "dotenv/config";
import { createHash } from "crypto";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const aiGatewayKey = process.env.AI_GATEWAY_API_KEY;
const openAiKey = process.env.OPENAI_API_KEY;
const days = Number(process.argv.find((arg) => arg.startsWith("--days="))?.split("=")[1] ?? 14);
const limit = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] ?? 500);
const dryRun = process.argv.includes("--dry-run");

if (!databaseUrl) {
  console.error("[FATAL] DATABASE_URL or SUPABASE_DB_URL is required.");
  process.exit(1);
}

if (!aiGatewayKey && !openAiKey) {
  console.error("[FATAL] AI_GATEWAY_API_KEY or OPENAI_API_KEY is required.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1, ssl: "require" });
const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMS = 3072;
const CHUNK_TARGET_CHARS = 3000;
const CHUNK_OVERLAP_CHARS = 500;

function hashContent(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 24);
}

function chunkText(text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= CHUNK_TARGET_CHARS) return [normalized];

  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + CHUNK_TARGET_CHARS, normalized.length);
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf("\n\n", end);
      if (boundary > start + 1000) end = boundary;
    }
    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(0, end - CHUNK_OVERLAP_CHARS);
  }
  return chunks.filter((chunk) => chunk.length >= 100);
}

async function embed(texts) {
  const errors = [];
  const attempts = [
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

  for (const attempt of attempts) {
    const response = await fetch(attempt.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${attempt.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: attempt.model,
        input: texts.map((text) => text.slice(0, 8000)),
        dimensions: EMBEDDING_DIMS,
      }),
    });

    if (!response.ok) {
      errors.push(`${attempt.label}: ${response.status} ${(await response.text()).slice(0, 300)}`);
      continue;
    }

    const data = await response.json();
    if (data.data.length !== texts.length) {
      errors.push(`${attempt.label}: expected ${texts.length} embeddings, got ${data.data.length}`);
      continue;
    }
    return data.data.map((item) => item.embedding);
  }

  throw new Error(`Embedding failed across all providers: ${errors.join(" | ")}`);
}

try {
  const rows = await sql`
    select dm.id, dm.title, dm.date, dm.project_id, dm.participants_array, dm.content, dm.summary, dm.overview
    from public.document_metadata dm
    where (dm.source = 'fireflies'
       or dm.type in ('meeting', 'meeting_transcript')
       or dm.category = 'meeting'
       or dm.fireflies_id is not null)
      and coalesce(dm.captured_at, dm.date, dm.created_at::timestamptz) >= now() - (${days} || ' days')::interval
      and length(coalesce(dm.content, dm.summary, dm.overview, '')) >= 100
      and not exists (
        select 1
        from public.document_chunks dc
        where dc.document_id = dm.id
          and dc.embedding is not null
      )
    order by coalesce(dm.captured_at, dm.date, dm.created_at::timestamptz) desc nulls last
    limit ${limit}
  `;

  console.log(`Recent meetings missing chunks: ${rows.length}`);
  if (dryRun || rows.length === 0) {
    if (dryRun) console.log("Dry run: no writes performed.");
    process.exit(0);
  }

  let inserted = 0;
  let failed = 0;

  for (const row of rows) {
    const baseText = String(row.content || row.summary || row.overview || "").trim();
    const chunks = chunkText(baseText);
    if (chunks.length === 0) {
      console.error(`[FAIL] ${row.id}: no usable chunk text`);
      failed++;
      continue;
    }

    const embeddingTexts = chunks.map((chunk) => {
      const date = row.date ? new Date(row.date).toISOString() : "Unknown date";
      return `[Meeting: "${row.title || "Untitled Meeting"}" | ${date}]\n\n${chunk}`;
    });
    const embeddings = await embed(embeddingTexts);

    const records = chunks.map((chunk, index) => {
      const contentHash = hashContent(chunk);
      return {
        chunk_id: `${row.id}__recent_meeting_${index}_${contentHash}`,
        document_id: row.id,
        chunk_index: index,
        text: chunk,
        metadata: {
          doc_type: "meeting_content",
          title: row.title,
          file_date: row.date,
          project_id: row.project_id,
          participants: row.participants_array ?? [],
          content_hash: contentHash,
          backfill_source: "backfill-recent-meeting-chunks",
        },
        content_hash: contentHash,
        embedding: JSON.stringify(embeddings[index]),
        source_type: baseText.includes("## Transcript") ? "meeting_transcript" : "meeting_summary",
      };
    });

    await sql`
      insert into public.document_chunks ${sql(records)}
      on conflict (chunk_id) do update set
        text = excluded.text,
        metadata = excluded.metadata,
        content_hash = excluded.content_hash,
        embedding = excluded.embedding,
        source_type = excluded.source_type,
        updated_at = now()
    `;
    inserted += records.length;
    process.stdout.write(`\rInserted chunks: ${inserted}, failed meetings: ${failed}`);
  }

  console.log(`\nDone. Inserted chunks: ${inserted}. Failed meetings: ${failed}.`);
  if (failed > 0) process.exit(1);
} finally {
  await sql.end();
}
