"use client";

import { EntityRoom } from "@/components/comments/entity-room";
import { EntityComments } from "@/components/comments/entity-comments";

interface RfiResponsesProps {
  rfiId: string;
  className?: string;
}

/**
 * RFI Responses section powered by Liveblocks threads.
 *
 * Wraps EntityRoom + EntityComments to provide:
 * - Threaded responses from assignees
 * - Thread resolve = official response designation
 * - Real-time presence indicators
 * - Rich text composer for new responses
 *
 * Usage:
 * ```tsx
 * <RfiResponses rfiId={rfi.id} />
 * ```
 */
export function RfiResponses({ rfiId, className }: RfiResponsesProps) {
  return (
    <EntityRoom entityType="rfi" entityId={rfiId}>
      <EntityComments title="Responses" className={className} />
    </EntityRoom>
  );
}
