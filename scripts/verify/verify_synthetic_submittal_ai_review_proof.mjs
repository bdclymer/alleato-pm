#!/usr/bin/env node

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
};

function buildUrl(path, searchParams = {}) {
  const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function select(path, searchParams) {
  const response = await fetch(buildUrl(path, searchParams), {
    headers: {
      ...headers,
      Prefer: "count=exact",
    },
  });
  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const syntheticSubmittalId = "7dfbccac-6ccf-4d69-8129-7de7918c5248";
const drawingId = "4a041968-6862-41de-95da-f104a39d1172";
const drawingMetadataId = "drawing-revision:4d3acc68-890a-4bfc-bb02-63616d13a0c9";

const [submittals, linkedDrawings, drawings, docs, pages] = await Promise.all([
  select("submittals", {
    select: "id,submittal_number,title,ai_review_result",
    id: `eq.${syntheticSubmittalId}`,
  }),
  select("submittal_linked_drawings", {
    select: "submittal_id,drawing_id",
    submittal_id: `eq.${syntheticSubmittalId}`,
  }),
  select("drawings", {
    select: "id,drawing_number,document_metadata_id",
    id: `eq.${drawingId}`,
  }),
  select("document_metadata", {
    select: "id,status,content",
    id: `eq.${drawingMetadataId}`,
  }),
  select("document_page_intelligence", {
    select: "document_metadata_id,page_number",
    document_metadata_id: `eq.${drawingMetadataId}`,
  }),
]);

const submittal = submittals[0];
if (!submittal) fail("Synthetic submittal row is missing.");

const drawing = drawings[0];
if (!drawing) fail("Target drawing row is missing.");
if (drawing.document_metadata_id !== drawingMetadataId) {
  fail(
    `Drawing ${drawingId} does not point at expected document_metadata_id ${drawingMetadataId}.`,
  );
}

if (!linkedDrawings.some((row) => row.submittal_id === syntheticSubmittalId && row.drawing_id === drawingId)) {
  fail("Synthetic submittal is not linked to the target drawing.");
}

const doc = docs[0];
if (!doc) fail("Backfilled drawing document_metadata row is missing.");
if (!doc.content || doc.content.trim().length === 0) {
  fail("Backfilled drawing document_metadata row has no OCR/content text.");
}

if ((pages ?? []).length === 0) {
  fail("Backfilled drawing has no document_page_intelligence rows.");
}

const aiReview = submittal.ai_review_result;
if (!aiReview || typeof aiReview !== "object") {
  fail("Synthetic submittal has no stored ai_review_result.");
}

const layers = aiReview.readiness?.layers ?? [];
const linkedLayer = layers.find((layer) => layer.key === "linked_drawings");
const ocrLayer = layers.find((layer) => layer.key === "drawing_ocr");
const visionLayer = layers.find((layer) => layer.key === "drawing_vision");
const retrievalLayer = layers.find((layer) => layer.key === "retrieval");

for (const [name, layer] of [
  ["linked_drawings", linkedLayer],
  ["drawing_ocr", ocrLayer],
  ["drawing_vision", visionLayer],
  ["retrieval", retrievalLayer],
]) {
  if (!layer || layer.state !== "ready") {
    fail(`Synthetic submittal readiness layer ${name} is not ready.`);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      syntheticSubmittalId,
      drawingId,
      drawingMetadataId,
      drawingStatus: doc.status,
      drawingContentLength: doc.content.length,
      pageCount: pages.length,
      aiReviewStatus: aiReview.status,
      summary: aiReview.summary,
    },
    null,
    2,
  ),
);
