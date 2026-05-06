/**
 * POST /api/cron/graph-sync
 *
 * Hourly cron that triggers a Microsoft Graph incremental sync on the Render backend.
 * Syncs Outlook emails, Teams channel messages, and OneDrive files, then runs the
 * embedding pass. Uses delta tokens so only new/changed items are fetched.
 *
 * Why this exists: without an automated trigger, Teams and email data never gets
 * ingested into document_metadata, making RAG searches return empty for those sources.
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

export const POST = withApiGuardrails("/api/cron/graph-sync#POST", async ({ request }) => {
  const expectedSecret = process.env.CRON_SECRET;
  const token = parseBearerToken(request.headers.get("authorization"));

  if (!expectedSecret || token !== expectedSecret) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/cron/graph-sync#POST",
      message: "Unauthorized cron invocation.",
      status: 401,
      severity: "medium",
    });
  }

  const backendUrl = process.env.PYTHON_BACKEND_URL;
  if (!backendUrl) {
    throw new GuardrailError({
      code: "CONFIGURATION_ERROR",
      where: "/api/cron/graph-sync#POST",
      message: "PYTHON_BACKEND_URL is not set.",
      status: 503,
      severity: "high",
    });
  }

  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    throw new GuardrailError({
      code: "CONFIGURATION_ERROR",
      where: "/api/cron/graph-sync#POST",
      message: "ADMIN_API_KEY is not set.",
      status: 503,
      severity: "high",
    });
  }

  const result = await fetchWithGuardrails(`${backendUrl}/api/graph/sync`, {
    method: "POST",
    headers: {
      "x-api-key": adminKey,
      "content-type": "application/json",
    },
    requestId: `cron-graph-sync-${Date.now()}`,
    timeoutMs: 270_000,
    retries: 0,
    where: "cron/graph-sync",
  });

  return NextResponse.json({ ok: true, triggered_at: new Date().toISOString(), result });
});
