import { createServiceClient } from "@/lib/supabase/service";
import { getProjectRfis } from "@/lib/supabase/queries";
import { RfisClient } from "./rfis-client";

export default async function RfisPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const numericProjectId = parseInt(projectId, 10);

  const supabase = createServiceClient();
  const { data: rfis, error } = await getProjectRfis(
    supabase,
    numericProjectId,
  );

  if (error) {
    console.error("RFI page fetch error:", error);
  }

  return <RfisClient rfis={rfis ?? []} projectId={numericProjectId} />;
}
