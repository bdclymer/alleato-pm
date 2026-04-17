/**
 * /api/testing/runs/[runId]
 * DELETE — delete a test run and all child records
 */
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export const DELETE = withApiGuardrails<{ runId: string }>(
  "testing/runs/[runId]#DELETE",
  async ({ params }) => {
    const { runId } = params;
    const supabase = await createClient();
    const service = createServiceClient();

    const { data: run, error: runError } = await supabase
      .from("test_runs")
      .select("id")
      .eq("id", runId)
      .single();

    if (runError || !run) {
      return NextResponse.json(
        { error: runError?.message ?? "Run not found", code: "NOT_FOUND", where: "testing/runs DELETE" },
        { status: 404 },
      );
    }

    const { data: results, error: resultsError } = await supabase
      .from("test_results")
      .select("id")
      .eq("run_id", runId);

    if (resultsError) {
      return NextResponse.json(
        { error: resultsError.message, code: "DB_ERROR", where: "testing/runs DELETE:load-results" },
        { status: 500 },
      );
    }

    const resultIds = (results ?? []).map((result) => result.id);

    if (resultIds.length > 0) {
      const { data: screenshots, error: screenshotsError } = await supabase
        .from("test_screenshots")
        .select("id, storage_path")
        .in("result_id", resultIds);

      if (screenshotsError) {
        return NextResponse.json(
          { error: screenshotsError.message, code: "DB_ERROR", where: "testing/runs DELETE:load-screenshots" },
          { status: 500 },
        );
      }

      const storagePaths = (screenshots ?? [])
        .map((screenshot) => screenshot.storage_path)
        .filter((path): path is string => Boolean(path));

      if (storagePaths.length > 0) {
        // Sensitive: removes screenshot blobs from storage for test evidence tied to this run.
        const { error: storageDeleteError } = await service.storage
          .from("test-screenshots")
          .remove(storagePaths);

        if (storageDeleteError) {
          return NextResponse.json(
            { error: storageDeleteError.message, code: "STORAGE_ERROR", where: "testing/runs DELETE:remove-storage" },
            { status: 500 },
          );
        }
      }

      const { error: screenshotDeleteError } = await supabase
        .from("test_screenshots")
        .delete()
        .in("result_id", resultIds);

      if (screenshotDeleteError) {
        return NextResponse.json(
          { error: screenshotDeleteError.message, code: "DB_ERROR", where: "testing/runs DELETE:delete-screenshots" },
          { status: 500 },
        );
      }

      // Sensitive: deletes persisted test result records associated with this run.
      const { error: resultDeleteError } = await supabase
        .from("test_results")
        .delete()
        .eq("run_id", runId);

      if (resultDeleteError) {
        return NextResponse.json(
          { error: resultDeleteError.message, code: "DB_ERROR", where: "testing/runs DELETE:delete-results" },
          { status: 500 },
        );
      }
    }

    const { error: deleteRunError } = await supabase
      .from("test_runs")
      .delete()
      .eq("id", runId);

    if (deleteRunError) {
      return NextResponse.json(
        { error: deleteRunError.message, code: "DB_ERROR", where: "testing/runs DELETE:delete-run" },
        { status: 500 },
      );
    }

    return NextResponse.json({ deleted: true, run_id: runId, deleted_result_count: resultIds.length });
  },
);
