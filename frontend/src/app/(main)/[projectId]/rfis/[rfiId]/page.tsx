import { PageShell } from "@/components/layout";
import { createServiceClient } from "@/lib/supabase/service";

import { RfiDetail } from "./rfi-detail";
import { RfiHeaderActions } from "./rfi-header-actions";

export default async function RfiDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; rfiId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { projectId, rfiId } = await params;
  const { mode } = await searchParams;
  const numericProjectId = parseInt(projectId, 10);

  const supabase = createServiceClient();
  const { data: rfi, error } = await supabase
    .from("rfis")
    .select("*")
    .eq("project_id", numericProjectId)
    .eq("id", rfiId)
    .single();

  if (error) {
    console.error("RFI detail fetch error:", error);
  }

  return (
    <PageShell
      variant="detail"
      title={rfi ? `RFI #${rfi.number}` : "RFI Detail"}
      actions={rfi ? <RfiHeaderActions rfi={rfi} projectId={numericProjectId} /> : undefined}
    >
      <RfiDetail
        rfi={rfi}
        projectId={numericProjectId}
        isEditing={mode === "edit"}
      />
    </PageShell>
  );
}
