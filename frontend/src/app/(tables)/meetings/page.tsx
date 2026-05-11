import { createClient } from "@/lib/supabase/server";
import { MeetingsTablePage } from "@/features/meetings/meetings-table-page";
import { meetingsSchema } from "@/lib/validation/meetings";
import { TablePageWrapper } from "@/components/tables/table-page-wrapper";

const PAGE_TITLE = "Meetings";
const PAGE_DESCRIPTION = "View and manage all your meetings";

export default async function MeetingsPage() {
  const supabase = await createClient();

  const { data: meetings, error } = await supabase
    .from("document_metadata")
    .select("id,title,date,project,project_id,description,type,category,status,source,fireflies_link,url,participants,participants_array,notes,summary,overview,action_items,bullet_points,content,keywords,sentiment,duration_minutes,audio,video,created_at")
    .eq("type", "meeting")
    .order("date", { ascending: false });

  if (error) {
    console.error("[MeetingsPage] Supabase query error:", error.message);
    return (
      <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        <div className="text-center text-destructive p-6">
          Error loading meetings. Please try again later.
        </div>
      </TablePageWrapper>
    );
  }

  const parsed = meetingsSchema.safeParse(meetings ?? []);
  if (!parsed.success) {
    console.error("[MeetingsPage] Zod parse error:", parsed.error.issues.slice(0, 3));
    return (
      <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        <div className="text-center text-destructive p-6">
          Error loading meetings. Please try again later.
        </div>
      </TablePageWrapper>
    );
  }

  return <MeetingsTablePage initialMeetings={parsed.data} />;
}
