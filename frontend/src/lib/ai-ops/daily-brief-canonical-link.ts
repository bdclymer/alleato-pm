import { createServiceClient } from "@/lib/supabase/service";

export async function linkDailyRecapToCanonicalRun({
  dailyRecapId,
  runId,
}: {
  dailyRecapId: string;
  runId: string;
}) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("daily_recaps")
    .update({ ai_work_run_id: runId })
    .eq("id", dailyRecapId);

  if (error) {
    throw new Error(
      `Failed to link Daily Brief packet ${dailyRecapId} to AI work run ${runId}: ${error.message}`,
    );
  }
}
