import { createClient } from "@/lib/supabase/server";
import { getProjectRfis } from "@/lib/supabase/queries";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { RfisClient } from "./rfis-client";

export default async function RfisPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const numericProjectId = parseInt(projectId, 10);

  const supabase = await createClient();
  const { data: rfis, error } = await getProjectRfis(
    supabase,
    numericProjectId,
  );

  if (error) {
    console.error("RFI page fetch error:", error);
  }

  return (
    <>
      <ProjectPageHeader
        title="RFIs"
        description="Requests for Information"
      />
      <PageContainer>
        <RfisClient rfis={rfis ?? []} projectId={numericProjectId} />
      </PageContainer>
    </>
  );
}
