import { createClient } from "@/lib/supabase/server";
import { MeetingsDataTable } from "@/app/(tables)/meetings/components/meetings-data-table";
import { TablePageWrapper } from "@/components/tables/table-page-wrapper";

const PAGE_TITLE = "Meetings";
const PAGE_DESCRIPTION = "View and manage all your meetings";

export default async function MeetingsPage() {
  const supabase = await createClient();

  // Fetch all meetings from document_metadata table
  const { data: meetings, error } = await supabase
    .from("document_metadata")
    .select("*")
    .eq("type", "meeting")
    .order("date", { ascending: false });

  if (error) {
    return (
      <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        <div className="text-center text-destructive p-6">
          Error loading meetings. Please try again later.
        </div>
      </TablePageWrapper>
    );
  }

  return (
    <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
      <MeetingsDataTable meetings={meetings || []} />
    </TablePageWrapper>
  );
}
