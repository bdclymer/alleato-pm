/**
 * POST /api/cron/graph-embed
 *
 * Runs every 30 minutes. Calls the backend embed-only endpoint to vectorize any
 * document_metadata rows with status in (raw_ingested, segmented, compiled).
 *
 * Why separate from graph-sync: the sync fetches new items from Microsoft Graph.
 * The embed step vectorizes whatever is already in document_metadata. Separating
 * them means the backlog clears continuously even between full sync runs.
 *
 * Current known backlog: 689 compiled teams_messages + 66 emails + others.
 * The embed limit is 1000 per run, so this clears the full backlog each pass.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { fetchWithGuardrails } from "@/lib/fetch-with-guardrails";

function parseBearerToken(header: string | null): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export const POST = withApiGuardrails("/api/cron/graph-embed#POST", async ({ request }) => {
  const expectedSecret = process.env.CRON_SECRET;
  const token = parseBearerToken(request.headers.get("authorization"));

  if (!expectedSecret || token !== expectedSecret) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/cron/graph-embed#POST",
      message: "Unauthorized cron invocation.",
      status: 401,
      severity: "medium",
    });
  }

  const backendUrl = process.env.PYTHON_BACKEND_URL;
  if (!backendUrl) {
    throw new GuardrailError({
      code: "CONFIGURATION_ERROR",
      where: "/api/cron/graph-embed#POST",
      message: "PYTHON_BACKEND_URL is not set.",
      status: 503,
      severity: "high",
    });
  }

  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    throw new GuardrailError({
      code: "CONFIGURATION_ERROR",
      where: "/api/cron/graph-embed#POST",
      message: "ADMIN_API_KEY is not set.",
      status: 503,
      severity: "high",
    });
  }

  const result = await fetchWithGuardrails(`${backendUrl}/api/admin/documents/generate-embeddings`, {
    method: "POST",
    headers: {
      "x-admin-api-key": adminKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ limit: 1000 }),
    requestId: `cron-graph-embed-${Date.now()}`,
    timeoutMs: 30_000,
    retries: 0,
    where: "cron/graph-embed",
  });

  return NextResponse.json({ ok: true, triggered_at: new Date().toISOString(), result });
});
