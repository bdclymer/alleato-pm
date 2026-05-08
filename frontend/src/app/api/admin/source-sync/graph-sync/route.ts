import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";

import { fetchBackendSourceSync, requireAdmin } from "../_shared";

const GraphSyncRequestSchema = z.object({
  runEmbedding: z.boolean().default(false),
  runTeamsCompiler: z.boolean().default(false),
  embedLimit: z.number().int().min(1).max(1000).default(100),
  teamsCompilerBatchSize: z.number().int().min(1).max(100).default(10),
});

export const POST = withApiGuardrails(
  "api.admin.source-sync.graph-sync.POST",
  async ({ request, requestId }) => {
    await requireAdmin("api.admin.source-sync.graph-sync.POST");
    const body = await parseJsonBody(
      request,
      GraphSyncRequestSchema,
      "api.admin.source-sync.graph-sync.POST",
    );
    const backendResponse = await fetchBackendSourceSync(
      requestId,
      "api.admin.source-sync.graph-sync.POST",
      "graph-sync",
      {
        method: "POST",
        body: JSON.stringify({
          run_embedding: body.runEmbedding,
          run_teams_compiler: body.runTeamsCompiler,
          embed_limit: body.embedLimit,
          teams_compiler_batch_size: body.teamsCompilerBatchSize,
        }),
      },
    );

    return NextResponse.json(await backendResponse.json());
  },
);
