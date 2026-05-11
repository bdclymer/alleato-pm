import { z } from "zod";

export const SourceHealthSchema = z.object({
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

export const SourceSyncAlertSchema = z.object({
  severity: z.enum(["info", "warning", "critical"]).or(z.string()),
  code: z.string(),
  source: z.string(),
  resourceId: z.string(),
  message: z.string(),
  detectedAt: z.string().nullable(),
});

export const SourceSyncRunSchema = z.object({
  id: z.string(),
  source: z.string(),
  stage: z.string(),
  status: z.string(),
  resourceId: z.string(),
  resourceName: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  itemsSeen: z.number(),
  itemsSynced: z.number(),
  itemsFailed: z.number(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
});

export const SourceSyncStuckItemSchema = z.object({
  source: z.string(),
  resourceId: z.string(),
  resourceName: z.string(),
  stage: z.string(),
  status: z.string(),
  ageMinutes: z.number().nullable(),
  lastAttemptAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
});

export const SourceSyncStatusSchema = z.object({
  status: z.enum(["healthy", "degraded"]),
  healthy: z.boolean(),
  generatedAt: z.string(),
  thresholds: z.record(z.string(), z.number()),
  sources: z.array(SourceHealthSchema),
  pipeline: z.record(z.string(), z.record(z.string(), z.number())),
  alerts: z.array(SourceSyncAlertSchema),
  recentRuns: z.array(SourceSyncRunSchema),
  stuckItems: z.array(SourceSyncStuckItemSchema),
  counts: z.object({
    sources: z.number(),
    alerts: z.number(),
    documents: z.number(),
    chunks: z.number(),
    unembedded: z.number(),
    uncompiled: z.number(),
    tasks: z.number(),
    graphSubscriptions: z.number(),
    stuckItems: z.number(),
  }),
});

export type SourceSyncStatus = z.infer<typeof SourceSyncStatusSchema>;
