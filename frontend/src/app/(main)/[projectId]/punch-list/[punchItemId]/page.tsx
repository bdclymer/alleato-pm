import { PageShell } from "@/components/layout";
import { createClient } from "@/lib/supabase/server";

import { PunchItemDetail } from "./punch-item-detail";

export default async function PunchItemDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; punchItemId: string }>;
}) {
  const { projectId, punchItemId } = await params;
  const numericProjectId = parseInt(projectId, 10);

  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("punch_items")
    .select("*")
    .eq("id", punchItemId)
    .eq("project_id", numericProjectId)
    .single();

  if (error) {
    console.error("Punch item detail fetch error:", error);
  }

  return (
    <PageShell
      variant="detail"
      title={item ? `Punch Item #${item.number}` : "Punch Item"}
    >
      <PunchItemDetail
        item={item}
        projectId={numericProjectId}
        punchItemId={punchItemId}
      />
    </PageShell>
  );
}
