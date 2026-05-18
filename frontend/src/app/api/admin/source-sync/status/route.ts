import { NextResponse } from "next/server";

import { validateResponseContract, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { logEvent } from "@/lib/guardrails/observability";

import { SourceSyncStatusSchema, type SourceSyncStatus } from "../_contracts";
import { fetchBackendSourceSync, requireAdmin } from "../_shared";

/**
 * Graceful-degradation payload returned when the backend times out or is
 * unreachable. Using HTTP 200 here intentionally — the UI should render a
 * "checking…" state rather than surfacing a red error page, and the error
 * tracker should not fire a high-severity alert for routine backend cold-starts.
 */
function unavailableStatus(reason: string, requestId: string): SourceSyncStatus {
  return {
    status: "unavailable",
    healthy: false,
    generatedAt: new Date().toISOString(),
    thresholds: {
      staleSyncMinutes: 120,
      staleFirefliesMinutes: 240,
      staleExtractionMinutes: 1440,
      embeddingBacklogWarning: 25,
      compilerBacklogWarning: 25,
      failedJobWarning: 1,
      documentHealthSampleLimit: 2500,
      chunkHealthSampleLimit: 5000,
      jobHealthSampleLimit: 5000,
      maxReturnedSources: 80,
      maxReturnedAlerts: 80,
      maxReturnedStuckItems: 25,
    },
    sources: [],
    pipeline: {},
    alerts: [
      {
        severity: "warning",
        code: "backend_unavailable",
        source: "backend",
        resourceId: "source-sync-status",
        message: `Status check could not reach the backend: ${reason}`,
        detectedAt: new Date().toISOString(),
      },
    ],
    recentRuns: [],
    stuckItems: [],
    counts: {
      sources: 0,
      alerts: 1,
      documents: 0,
      chunks: 0,
      unembedded: 0,
      uncompiled: 0,
      tasks: 0,
      graphSubscriptions: 0,
      stuckItems: 0,
    },
  };
}

export const GET = withApiGuardrails(
  "api.admin.source-sync.status.GET",
  async ({ requestId }) => {
    await requireAdmin("api.admin.source-sync.status.GET");

    let backendResponse: Response;
    try {
      backendResponse = await fetchBackendSourceSync(
        requestId,
        "api.admin.source-sync.status.GET",
        "status",
        { method: "GET" },
      );
    } catch (err) {
      // UPSTREAM_TIMEOUT / UPSTREAM_FAILURE: the backend is slow or down.
      // Return a structured "unavailable" payload (HTTP 200) so the UI renders
      // gracefully and the error tracker is not spammed with high-severity 504s.
      const isTimeout =
        err instanceof GuardrailError &&
        (err.code === "UPSTREAM_TIMEOUT" || err.code === "UPSTREAM_FAILURE");

      if (isTimeout) {
        logEvent({
          event: "dependency_degraded",
          level: "warn",
          requestId,
          where: "api.admin.source-sync.status.GET",
          dependency: "backend.source-sync.status",
          details: {
            code: (err as GuardrailError).code,
            reason: (err as GuardrailError).message,
          },
        });
        return NextResponse.json(
          unavailableStatus((err as GuardrailError).message, requestId),
        );
      }
      throw err;
    }

    const payload = await backendResponse.json();
    const status = validateResponseContract(
      SourceSyncStatusSchema,
      payload,
      "api.admin.source-sync.status.GET",
    );

    return NextResponse.json(status);
  },
);
