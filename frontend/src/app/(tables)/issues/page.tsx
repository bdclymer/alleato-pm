import { createClient } from "@/lib/supabase/server";
import { TablePageWrapper } from "@/components/tables/table-page-wrapper";
import { IssuesClientPage } from "./issues-client";

const PAGE_TITLE = "Issues";
const PAGE_DESCRIPTION = "Track and manage project issues";

export default async function IssuesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        <div className="text-center text-destructive p-6">
          Error loading data. Please try again later.
        </div>
      </TablePageWrapper>
    );
  }

  return (
    <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
      <IssuesClientPage data={data || []} />
    </TablePageWrapper>
  );
}
