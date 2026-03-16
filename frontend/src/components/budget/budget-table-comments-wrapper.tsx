"use client";

import { type ReactNode } from "react";
import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { LiveList, LiveObject } from "@liveblocks/client";
import { getRoomId } from "@/lib/liveblocks/rooms";
import { CellThreadProvider } from "@/components/comments/cell-thread-context";

const INITIAL_STORAGE = {
  meta: new LiveObject({ title: "" }),
  properties: new LiveObject({
    progress: "none" as const,
    priority: "none" as const,
    assignedTo: "none",
  }),
  labels: new LiveList<string>([]),
  links: new LiveList<string>([]),
};

interface BudgetTableCommentsWrapperProps {
  projectId: string;
  children: ReactNode;
}

/**
 * Wraps the budget table in a Liveblocks room scoped to the project's budget,
 * providing cell-level comment threads via CellThreadProvider.
 */
export function BudgetTableCommentsWrapper({
  projectId,
  children,
}: BudgetTableCommentsWrapperProps) {
  return (
    <RoomProvider
      id={getRoomId("budget", `project-${projectId}`)}
      initialStorage={INITIAL_STORAGE}
    >
      <ClientSideSuspense fallback={children}>
        <CellThreadProvider>{children}</CellThreadProvider>
      </ClientSideSuspense>
    </RoomProvider>
  );
}
