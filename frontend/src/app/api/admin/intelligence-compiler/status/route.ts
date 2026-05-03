import { NextResponse } from "next/server";

import { validateResponseContract, withApiGuardrails } from "@/lib/guardrails/api";
import { z } from "zod";

import { fetchBackendCompiler, requireAdmin } from "../_shared";

const CompilerStatusSchema = z.object({
  status: z.enum(["healthy", "unhealthy"]),
  healthy: z.boolean(),
  thresholds: z.record(z.string(), z.number()),
  counts: z.object({
    sourceJobsByStatus: z.record(z.string(), z.number()),
    packetJobsByStatus: z.record(z.string(), z.number()),
    sourceSignalCandidatesByStatus: z.record(z.string(), z.number()),
    insightCards: z.number(),
    currentPackets: z.number(),
  }),
  checks: z.record(z.string(), z.number()),
  unhealthyChecks: z.record(z.string(), z.number()),
  generatedAt: z.string(),
});

export type IntelligenceCompilerStatus = z.infer<typeof CompilerStatusSchema>;

export const GET = withApiGuardrails(
  "api.admin.intelligence-compiler.status.GET",
  async ({ requestId }) => {
    await requireAdmin("api.admin.intelligence-compiler.status.GET");
    const backendResponse = await fetchBackendCompiler(
      requestId,
      "api.admin.intelligence-compiler.status.GET",
      "status",
      { method: "GET" },
    );
    const payload = await backendResponse.json();
    const status = validateResponseContract(
      CompilerStatusSchema,
      payload,
      "api.admin.intelligence-compiler.status.GET",
    );

    return NextResponse.json(status);
  },
);
