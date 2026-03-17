import { Room } from "@/components/issue-tracker/pages/Room";
import RoomErrors from "@/components/issue-tracker/components/RoomErrors";
import { Issue } from "@/components/issue-tracker/components/Issue";
import { Inbox } from "@/components/issue-tracker/components/Inbox";
import { DisplayWhenInboxOpen } from "@/components/issue-tracker/components/InboxContext";

export const revalidate = 0;

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = await params;
  return (
    <Room issueId={issueId}>
      {/* flex-1 min-h-0 makes this fill the parent flex column without overflow */}
      <div className="flex flex-1 min-h-0 border bg-neutral-50 rounded overflow-hidden">
        <DisplayWhenInboxOpen>
          <div className="border-r w-[200px] xl:w-[300px] shrink-0">
            <Inbox />
          </div>
        </DisplayWhenInboxOpen>
        <div className="flex-1 min-w-0 relative">
          <Issue issueId={issueId} />
        </div>
      </div>
      <RoomErrors />
    </Room>
  );
}
