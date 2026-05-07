import { NextResponse } from "next/server";
import { z } from "zod";

import { validateResponseContract, withApiGuardrails } from "@/lib/guardrails/api";

import { fetchBackendSourceSync, requireAdmin } from "../_shared";

const SourceHealthSchema = z.object({
  source: z.string(),
  resourceId: z.string(),
  resourceName: z.string(),
  status: z.enum(["healthy", "warning", "critical", "unknown"]),
  lastSyncAt: z.string().nullable(),
  lastSuccessAt: z.string().nullable(),
  lastErrorAt: z.string().nullable(),
  lastErrorMessage: z.string().nullable(),
  itemsSynced: z.number(),
  staleMinutes: z.number().nullable(),
  unprocessedCount: z.number(),
  unembeddedCount: z.number(),
  uncompiledCount: z.number(),
  metadata: z.record(z.string(), z.unknown()),
});

const SourceSyncAlertSchema = z.object({
  severity: z.enum(["info", "warning", "critical"]).or(z.string()),
  code: z.string(),
  source: z.string(),
  resourceId: z.string(),
  message: z.string(),
  detectedAt: z.string().nullable(),
});

const SourceSyncStatusSchema = z.object({
  status: z.enum(["healthy", "degraded"]),
  healthy: z.boolean(),
  generatedAt: z.string(),
  thresholds: z.record(z.string(), z.number()),
  sources: z.array(SourceHealthSchema),
  pipeline: z.record(z.string(), z.record(z.string(), z.number())),
  alerts: z.array(SourceSyncAlertSchema),
  counts: z.object({
    sources: z.number(),
    alerts: z.number(),
    documents: z.number(),
    chunks: z.number(),
    unembedded: z.number(),
    uncompiled: z.number(),
    tasks: z.number(),
    graphSubscriptions: z.number(),
  }),
});

export type SourceSyncStatus = z.infer<typeof SourceSyncStatusSchema>;

export const GET = withApiGuardrails(
  "api.admin.source-sync.status.GET",
  async ({ requestId }) => {
    await requireAdmin("api.admin.source-sync.status.GET");
    const backendResponse = await fetchBackendSourceSync(
      requestId,
      "api.admin.source-sync.status.GET",
      "status",
      { method: "GET" },
    );
    const payload = await backendResponse.json();
    const status = validateResponseContract(
      SourceSyncStatusSchema,
      payload,
      "api.admin.source-sync.status.GET",
    );

    return NextResponse.json(status);
  },
);
