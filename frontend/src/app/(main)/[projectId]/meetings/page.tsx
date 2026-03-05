import { createClient } from "@/lib/supabase/server";
import { MeetingsTablePage } from "@/features/meetings/meetings-table-page";
import { meetingsSchema } from "@/lib/validation/meetings";
import { TablePageWrapper } from "@/components/tables/table-page-wrapper";
import { getProjectInfo } from "@/lib/supabase/project-fetcher";

const PAGE_TITLE = "Meetings";
const PAGE_DESCRIPTION = "View and manage project meetings";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectMeetingsPage({ params }: PageProps) {
  const { projectId } = await params;
  const { numericProjectId } = await getProjectInfo(projectId);

  const supabase = await createClient();

  const { data: meetings, error } = await supabase
    .from("document_metadata")
    .select("*")
    .eq("project_id", numericProjectId)
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

  const parsed = meetingsSchema.safeParse(meetings ?? []);
  if (!parsed.success) {
    return (
      <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        <div className="text-center text-destructive p-6">
          Error loading meetings. Please try again later.
        </div>
      </TablePageWrapper>
    );
  }

  return <MeetingsTablePage initialMeetings={parsed.data} projectId={projectId} />;
}
