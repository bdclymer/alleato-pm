#!/usr/bin/env node

/**
 * Backfill Pattern C document_metadata rows for legacy drawing revisions that
 * predate the drawing-upload metadata linkage.
 *
 * Usage:
 *   node scripts/ops/backfill-legacy-drawing-document-metadata.mjs --project=25125 [--drawing=<uuid>] [--apply]
 *
 * Default mode is dry-run. Pass --apply to write changes.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const projectId = Number.parseInt(args.get("project") ?? "", 10);
const drawingId = args.get("drawing") ?? null;
const apply = args.has("apply");

if (!Number.isFinite(projectId)) {
  console.error("Usage: --project=<numeric-project-id> [--drawing=<uuid>] [--apply]");
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

function buildUrl(path, searchParams = {}) {
  const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function restSelect(path, searchParams) {
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

async function restInsert(path, payload, { upsert = false } = {}) {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers: {
      ...headers,
      Prefer: upsert
        ? "resolution=merge-duplicates,return=representation"
        : "return=representation",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`POST ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function restPatch(path, searchParams, payload) {
  const response = await fetch(buildUrl(path, searchParams), {
    method: "PATCH",
    headers: {
      ...headers,
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`PATCH ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function deriveSourcePath(fileUrl) {
  try {
    const url = new URL(fileUrl);
    const marker = "/storage/v1/object/public/project-files/";
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

function deriveTitle(revision) {
  return revision.file_name || `${revision.drawings?.drawing_number ?? "Drawing"}.pdf`;
}

async function main() {
  const drawingRows = await restSelect("drawings", {
    select: "id,project_id,drawing_number,title,current_revision_id,document_metadata_id,deleted_at",
    project_id: `eq.${projectId}`,
    deleted_at: "is.null",
    ...(drawingId ? { id: `eq.${drawingId}` } : {}),
  });

  if (drawingRows.length === 0) {
    console.log(JSON.stringify({ projectId, drawingId, apply, drawings: 0, candidates: [] }, null, 2));
    return;
  }

  const drawingIdList = drawingRows.map((row) => row.id);
  const revisionRows = await restSelect("drawing_revisions", {
    select:
      "id,drawing_id,document_metadata_id,file_url,file_name,created_at,is_current_revision,revision_number,status",
    drawing_id: `in.(${drawingIdList.join(",")})`,
  });

  const drawingsById = new Map(drawingRows.map((row) => [row.id, row]));

  const candidates = revisionRows
    .filter((revision) => !revision.document_metadata_id && revision.file_url)
    .map((revision) => {
      const drawing = drawingsById.get(revision.drawing_id) ?? null;
      const documentId = `drawing-revision:${revision.id}`;
      return {
        revisionId: revision.id,
        drawingId: revision.drawing_id,
        drawingNumber: drawing?.drawing_number ?? null,
        drawingTitle: drawing?.title ?? null,
        currentRevisionId: drawing?.current_revision_id ?? null,
        isCurrentRevision:
          Boolean(revision.is_current_revision) ||
          drawing?.current_revision_id === revision.id,
        revisionNumber: revision.revision_number ?? null,
        fileName: revision.file_name ?? null,
        fileUrl: revision.file_url,
        sourcePath: deriveSourcePath(revision.file_url),
        documentMetadataId: documentId,
      };
    });

  if (!apply) {
    console.log(JSON.stringify({ projectId, drawingId, apply, drawings: drawingRows.length, candidates }, null, 2));
    return;
  }

  const applied = [];
  for (const candidate of candidates) {
    const payload = {
      id: candidate.documentMetadataId,
      title: deriveTitle({
        file_name: candidate.fileName,
        drawings: { drawing_number: candidate.drawingNumber },
      }),
      url: candidate.fileUrl,
      source_web_url: candidate.fileUrl,
      type: "drawing",
      source_system: "drawing_upload",
      document_type: "drawing",
      status: "no_text",
      project_id: projectId,
      file_name: candidate.fileName,
      source_path: candidate.sourcePath,
      storage_bucket: "project-files",
      phase: "Current",
      source_metadata: {
        backfill_origin: "legacy_drawing_revision_document_metadata",
        drawing_id: candidate.drawingId,
        drawing_revision_id: candidate.revisionId,
        revision_number: candidate.revisionNumber,
      },
    };

    await restInsert("document_metadata", payload, { upsert: true });
    await restPatch(
      "drawing_revisions",
      { id: `eq.${candidate.revisionId}` },
      { document_metadata_id: candidate.documentMetadataId },
    );

    if (candidate.isCurrentRevision) {
      await restPatch(
        "drawings",
        { id: `eq.${candidate.drawingId}` },
        { document_metadata_id: candidate.documentMetadataId },
      );
    }

    applied.push(candidate);
  }

  console.log(
    JSON.stringify(
      {
        projectId,
        drawingId,
        apply,
        drawings: drawingRows.length,
        appliedCount: applied.length,
        applied,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
