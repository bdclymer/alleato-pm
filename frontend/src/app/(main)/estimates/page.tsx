import { createClient } from "@/lib/supabase/server";
import { EstimateService } from "@/lib/services/estimate-service";
import { EstimatesHubClient } from "./estimates-hub-client";

export default async function EstimatesHubPage() {
  const supabase = await createClient();
  const service = new EstimateService(supabase);
  const stats = await service.getTypeStats();

  return <EstimatesHubClient stats={stats} />;
}
