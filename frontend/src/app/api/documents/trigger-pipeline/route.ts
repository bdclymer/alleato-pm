import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRagServiceClient } from "@/lib/supabase/service";

type PipelinePhase = "parse" | "embed" | "extract";

export const POST = withApiGuardrails(
  "documents/trigger-pipeline#POST",
  async ({ request }) => {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "documents/trigger-pipeline#POST",
        message: "Authentication required.",
      });
    }

    const { phase, documentIds } = (await request.json()) as {
      phase: PipelinePhase;
      documentIds?: string[];
    };

    if (!phase) {
      return NextResponse.json({ error: "Phase is required" }, { status: 400 });
    }

    // Map phase to pipeline stage requirements
    const stageMapping = {
      parse: {
        currentStage: "raw_ingested",
      },
      embed: { currentStage: "segmented" },
      extract: {
        currentStage: "embedded",
      },
    };

    const { currentStage } = stageMapping[phase];
    const jobClient = createRagServiceClient();

    // Get documents ready for this phase
    let query = jobClient
      .from("fireflies_ingestion_jobs")
      .select("fireflies_id, metadata_id")
      .eq("stage", currentStage)
      .is("error_message", null);

    // If specific documents requested, filter by them
    if (documentIds && documentIds.length > 0) {
      query = query.in("metadata_id", documentIds);
    }

    const { data: jobs, error } = await query.limit(10); // Process up to 10 at a time

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch jobs" },
        { status: 500 },
      );
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        message: "No documents ready for this phase",
        processed: 0,
      });
    }

    const pythonBackendUrl = (
      process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000"
    )
      .replace(/\/+$/, "")
      .trim();

    // Trigger the native Render/FastAPI pipeline for each document.
    const results = [];
    for (const job of jobs) {
      try {
        const endpoint = `${pythonBackendUrl}/api/pipeline/process`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            metadataId: job.metadata_id,
          }),
        });

        if (response.ok) {
          let backendStatus: string | undefined;
          try {
            const payload = (await response.json()) as { status?: string };
            backendStatus = payload.status;
          } catch {
            backendStatus = undefined;
          }
          results.push({
            fireflies_id: job.fireflies_id,
            status: "triggered",
            message: `${phase} phase triggered successfully${backendStatus ? ` (${backendStatus})` : ""}`,
            endpoint,
          });
        } else {
          const error = await response.text();
          results.push({
            fireflies_id: job.fireflies_id,
            status: "error",
            message: `Failed to trigger ${phase}: ${error}`,
            endpoint,
          });
        }
      } catch (error) {
        results.push({
          fireflies_id: job.fireflies_id,
          status: "error",
          message: `Error triggering ${phase}: ${error}`,
          endpoint: `${pythonBackendUrl}/api/pipeline/process`,
        });
      }
    }

    return NextResponse.json({
      message: `Triggered ${phase} phase for ${results.filter((r) => r.status === "triggered").length} documents`,
      processed: results.filter((r) => r.status === "triggered").length,
      total: jobs.length,
      results,
    });
  },
);

// Get count of documents ready for each phase
export const GET = withApiGuardrails(
  "documents/trigger-pipeline#GET",
  async () => {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "documents/trigger-pipeline#GET",
        message: "Authentication required.",
      });
    }
    const jobClient = createRagServiceClient();

    // Count documents in each stage
    const stages = [
      { stage: "raw_ingested", readyFor: "parse" },
      { stage: "segmented", readyFor: "embed" },
      { stage: "embedded", readyFor: "extract" },
    ];

    const counts = await Promise.all(
      stages.map(async ({ stage, readyFor }) => {
        const { count, error } = await jobClient
          .from("fireflies_ingestion_jobs")
          .select("*", { count: "exact", head: true })
          .eq("stage", stage)
          .is("error_message", null);

        return {
          phase: readyFor,
          ready: count || 0,
          stage,
        };
      }),
    );

    return NextResponse.json({ phaseCounts: counts });
  },
);
