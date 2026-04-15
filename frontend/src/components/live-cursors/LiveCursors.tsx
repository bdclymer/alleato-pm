"use client";

import { Cursor } from "@/components/cursor";
import { useCurrentUserName } from "@/hooks/use-current-user-name";
import { useRealtimeCursors } from "@/hooks/use-realtime-cursors";
import { getRoomId } from "@/lib/liveblocks/rooms";
import { useEntityContext } from "@/components/header/comments-sidebar";

const THROTTLE_MS = 50;

export function LiveCursors() {
  const entityContext = useEntityContext();
  const username = useCurrentUserName();

  if (!entityContext) return null;

  const roomName = getRoomId(entityContext.entityType, entityContext.entityId);
  return <LiveCursorsRoom roomName={roomName} username={username} />;
}

function LiveCursorsRoom({
  roomName,
  username,
}: {
  roomName: string;
  username: string;
}) {
  const { cursors } = useRealtimeCursors({
    roomName,
    username,
    throttleMs: THROTTLE_MS,
  });

  return (
    <div>
      {Object.keys(cursors).map((id) => (
        <Cursor
          key={id}
          className="fixed z-[9999] transition-transform ease-in-out"
          style={{
            transitionDuration: "20ms",
            top: 0,
            left: 0,
            transform: `translate(${cursors[id].position.x}px, ${cursors[id].position.y}px)`,
          }}
          color={cursors[id].color}
          name={cursors[id].user.name}
        />
      ))}
    </div>
  );
}
