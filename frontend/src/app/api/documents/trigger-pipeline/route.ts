import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PipelinePhase = "parse" | "embed" | "extract";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        workerEndpoint: "/parser/process",
      },
      embed: { currentStage: "segmented", workerEndpoint: "/embedder/process" },
      extract: {
        currentStage: "embedded",
        workerEndpoint: "/extractor/process",
      },
    };

    const { currentStage, workerEndpoint } = stageMapping[phase];

    // Get documents ready for this phase
    let query = supabase
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

    // Trigger the appropriate worker for each document
    const results = [];
    for (const job of jobs) {
      try {
        // Get the worker URL from environment
        const workerUrl =
          process.env.CLOUDFLARE_WORKER_BASE_URL ||
          "https://your-worker.workers.dev";

        // Call the worker endpoint
        const response = await fetch(`${workerUrl}${workerEndpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.WORKER_AUTH_TOKEN || ""}`,
          },
          body: JSON.stringify({
            firefliesId: job.fireflies_id,
            metadataId: job.metadata_id,
          }),
        });

        if (response.ok) {
          results.push({
            fireflies_id: job.fireflies_id,
            status: "triggered",
            message: `${phase} phase triggered successfully`,
          });
        } else {
          const error = await response.text();
          results.push({
            fireflies_id: job.fireflies_id,
            status: "error",
            message: `Failed to trigger ${phase}: ${error}`,
          });
        }
      } catch (error) {
        results.push({
          fireflies_id: job.fireflies_id,
          status: "error",
          message: `Error triggering ${phase}: ${error}`,
        });
      }
    }

    return NextResponse.json({
      message: `Triggered ${phase} phase for ${results.filter((r) => r.status === "triggered").length} documents`,
      processed: results.filter((r) => r.status === "triggered").length,
      total: jobs.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Get count of documents ready for each phase
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Count documents in each stage
    const stages = [
      { stage: "raw_ingested", readyFor: "parse" },
      { stage: "segmented", readyFor: "embed" },
      { stage: "embedded", readyFor: "extract" },
    ];

    const counts = await Promise.all(
      stages.map(async ({ stage, readyFor }) => {
        const { count, error } = await supabase
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
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
