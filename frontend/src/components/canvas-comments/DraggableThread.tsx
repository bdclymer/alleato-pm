"use client";

import { useMemo, useState } from "react";
import { useEditThreadMetadata } from "@liveblocks/react/suspense";
import { FloatingThread, CommentPin } from "@liveblocks/react-ui";
import { ThreadData } from "@liveblocks/client";
import { useDraggable } from "@dnd-kit/core";
import { useMaxZIndex } from "./useMaxZIndex";

interface DraggableThreadProps {
  thread: ThreadData;
}

export function DraggableThread({ thread }: DraggableThreadProps) {
  // Auto-open threads created in the last 200ms (just placed)
  const defaultOpen = useMemo(
    () => Number(new Date()) - Number(new Date(thread.createdAt)) <= 200,
    [thread.createdAt]
  );
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const { isDragging, attributes, listeners, setNodeRef, transform } =
    useDraggable({
      id: thread.id,
      data: { thread },
    });

  // Live position while dragging, otherwise use stored metadata
  const x = (transform?.x ?? 0) + (thread.metadata.x ?? 0);
  const y = (transform?.y ?? 0) + (thread.metadata.y ?? 0);

  const maxZIndex = useMaxZIndex();
  const zIndex = isOpen || isDragging ? maxZIndex + 1 : thread.metadata.zIndex ?? 0;

  return (
    <FloatingThread
      thread={thread}
      open={isOpen}
      onOpenChange={setIsOpen}
      defaultOpen={defaultOpen}
      side="right"
      style={{ pointerEvents: isDragging ? "none" : "auto" }}
    >
      <div
        ref={setNodeRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          transform: `translate3d(${x}px, ${y}px, 0)`,
          zIndex,
        }}
      >
        <CommentPin
          userId={thread.comments[0]?.userId}
          corner="top-left"
          {...listeners}
          {...attributes}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        />
      </div>
    </FloatingThread>
  );
}
