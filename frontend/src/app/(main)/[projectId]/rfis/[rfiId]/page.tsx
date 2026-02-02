import { createClient } from "@/lib/supabase/server";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { RfiDetail } from "./rfi-detail";

export default async function RfiDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; rfiId: string }>;
}) {
  const { projectId, rfiId } = await params;
  const numericProjectId = parseInt(projectId, 10);

  const supabase = await createClient();
  const { data: rfi, error } = await supabase
    .from("rfis")
    .select("*")
    .eq("id", rfiId)
    .single();

  if (error) {
    console.error("RFI detail fetch error:", error);
  }

  return (
    <>
      <ProjectPageHeader
        title={rfi ? `RFI #${rfi.number}` : "RFI Detail"}
        description={rfi?.subject ?? ""}
      />
      <PageContainer>
        <RfiDetail rfi={rfi} projectId={numericProjectId} />
      </PageContainer>
    </>
  );
}
