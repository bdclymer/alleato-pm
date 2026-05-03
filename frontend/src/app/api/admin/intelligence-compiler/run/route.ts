import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";

import { fetchBackendCompiler, requireAdmin } from "../_shared";

const RunRequestSchema = z.object({
  sourceLimit: z.number().int().min(0).max(100).default(5),
  packetLimit: z.number().int().min(0).max(100).default(5),
  dryRun: z.boolean().default(false),
  background: z.boolean().default(true),
  maxProcessingTimeMs: z.number().int().min(1000).max(600000).default(120000),
});

export const POST = withApiGuardrails(
  "api.admin.intelligence-compiler.run.POST",
  async ({ request, requestId }) => {
    await requireAdmin("api.admin.intelligence-compiler.run.POST");
    const body = await parseJsonBody(
      request,
      RunRequestSchema,
      "api.admin.intelligence-compiler.run.POST",
    );

    const backendResponse = await fetchBackendCompiler(
      requestId,
      "api.admin.intelligence-compiler.run.POST",
      "run",
      {
        method: "POST",
        body: JSON.stringify({
          source_limit: body.sourceLimit,
          packet_limit: body.packetLimit,
          dry_run: body.dryRun,
          background: body.background,
          max_processing_time_ms: body.maxProcessingTimeMs,
        }),
      },
    );

    return NextResponse.json(await backendResponse.json());
  },
);
