import { Room } from "@/components/issue-tracker/pages/Room";
import RoomErrors from "@/components/issue-tracker/components/RoomErrors";
import { Issue } from "@/components/issue-tracker/components/Issue";
import { Nav } from "@/components/issue-tracker/components/Nav";
import { Inbox } from "@/components/issue-tracker/components/Inbox";
import { DisplayWhenInboxOpen } from "@/components/issue-tracker/components/InboxContext";

export const revalidate = 0;

export default async function PageHome({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Room issueId={id}>
      <div className="flex flex-row h-full">
        <nav className="p-2 w-[200px] xl:w-[250px]">
          <Nav />
        </nav>
        <main className="m-2 border flex-grow bg-neutral-50 rounded flex flex-row overflow-hidden">
          <DisplayWhenInboxOpen>
            <div className="border-r w-[200px] xl:w-[300px]">
              <Inbox />
            </div>
          </DisplayWhenInboxOpen>
          <div className="flex-grow">
            <Issue issueId={id} />
          </div>
        </main>
      </div>
      <RoomErrors />
    </Room>
  );
}
