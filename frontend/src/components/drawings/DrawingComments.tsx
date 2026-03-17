"use client";

import { RoomProvider, ClientSideSuspense, useThreads } from "@liveblocks/react/suspense";
import { Thread, Composer } from "@liveblocks/react-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";

// ---------------------------------------------------------------------------
// Room wrapper — scopes threads to a specific drawing
// ---------------------------------------------------------------------------

interface DrawingCommentsProps {
  drawingId: string;
}

export function DrawingComments({ drawingId }: DrawingCommentsProps) {
  const roomId = `alleato:drawing:${drawingId}`;

  return (
    <RoomProvider id={roomId}>
      <ClientSideSuspense
        fallback={
          <div className="space-y-3 py-2">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        }
      >
        <CommentsInner />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

// ---------------------------------------------------------------------------
// Inner — rendered inside the RoomProvider (can use useThreads)
// ---------------------------------------------------------------------------

function CommentsInner() {
  const { threads } = useThreads();

  return (
    <div className="space-y-2">
      {threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No comments yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to leave a comment on this drawing.
          </p>
        </div>
      ) : (
        threads.map((thread) => (
          <Thread key={thread.id} thread={thread} />
        ))
      )}

      <Composer className="mt-4" />
    </div>
  );
}
