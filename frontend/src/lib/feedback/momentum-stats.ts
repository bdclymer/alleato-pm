import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { defaultMomentumStats, type MomentumStats } from "@/lib/onboarding/copy";

export async function getMomentumStats(): Promise<MomentumStats> {
  const supabase = createServiceClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [shipped, activeTesters] = await Promise.all([
    supabase
      .from("admin_feedback_items")
      .select("id", { count: "exact", head: true })
      .in("status", ["Resolved", "resolved", "shipped"])
      .gte("updated_at", monthStart.toISOString()),
    supabase
      .from("admin_feedback_items")
      .select("created_by", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString()),
  ]);

  return {
    fixesShipped: shipped.count ?? defaultMomentumStats.fixesShipped,
    activeTesters: activeTesters.count ?? defaultMomentumStats.activeTesters,
    launchesThisWeek: defaultMomentumStats.launchesThisWeek,
  };
}
