"use client";

import { EntityComments } from "@/components/comments/entity-comments";
import { EntityRoom } from "@/components/comments/entity-room";

interface DrawingCommentsProps {
  drawingId: string;
  projectId?: number;
}

export function DrawingComments({ drawingId, projectId }: DrawingCommentsProps) {
  return (
    <EntityRoom entityType="drawing" entityId={drawingId} projectId={projectId}>
      <EntityComments title="Discussion" />
    </EntityRoom>
  );
}
