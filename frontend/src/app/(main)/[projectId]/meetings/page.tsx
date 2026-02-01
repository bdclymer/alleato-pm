import { Calendar, Clock } from "lucide-react";

import { EmptyState } from "@/components/design-system";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { getProjectInfo } from "@/lib/supabase/project-fetcher";

import { MeetingsTableWrapper } from "./meetings-table-wrapper";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectMeetingsPage({ params }: PageProps) {
  const { projectId } = await params;
  const { numericProjectId, supabase } = await getProjectInfo(projectId);

  // Fetch meetings for this project
  const { data: meetings, error } = await supabase
    .from("document_metadata")
    .select("*")
    .eq("project_id", numericProjectId)
    .eq("type", "meeting")
    .order("date", { ascending: false });

  if (error) {
    }

  // Calculate meeting statistics
  const totalMeetings = meetings?.length || 0;
  const thisMonth =
    meetings?.filter((m) => {
      if (!m.date) return false;
      const meetingDate = new Date(m.date);
      const now = new Date();
      return (
        meetingDate.getMonth() === now.getMonth() &&
        meetingDate.getFullYear() === now.getFullYear()
      );
    }).length || 0;

  return (
    <>
      <ProjectPageHeader title="Meetings" />

      <PageContainer>
        {/* Meeting Statistics */}
        <div className="flex items-center lg:gap-12 gap-4 mb-6">
          <div className="flex items-center lg:gap-3 gap-2">
            <Calendar className="h-4 w-4 text-brand" />
            <p className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500">
              {totalMeetings} Total Meetings
            </p>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <Clock className="h-4 w-4 text-brand" />
            <p className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500">
              {thisMonth} This Month
            </p>
          </div>
        </div>

        {/* Meetings Table */}
        {!meetings || meetings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No meetings found"
            description="No meeting records for this project yet. Meetings will appear here once they are uploaded or synced from your meeting platform."
          />
        ) : (
          <div className="space-y-6">
            <div className="mb-8"></div>

            <MeetingsTableWrapper
              meetings={meetings || []}
              projectId={projectId}
            />
          </div>
        )}
      </PageContainer>
    </>
  );
}
