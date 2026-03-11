import { LiveList, LiveObject, ToImmutable } from "@liveblocks/client";
import { Metadata, PriorityState, ProgressState } from "@/components/issue-tracker/config";

// Issue tracker-specific Liveblocks types
// NOTE: These are local types for the issue tracker, not global Liveblocks interface augmentation.
// The global interface is declared in the main app's liveblocks.config.ts.

export type IssueTrackerUserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
    avatar: string;
  };
};

export type IssueTrackerStorage = {
  meta: LiveObject<{
    title: string;
  }>;
  properties: LiveObject<{
    progress: ProgressState;
    priority: PriorityState;
    assignedTo: string | "none";
  }>;
  labels: LiveList<string>;
  links: LiveList<string>;
};

export type IssueTrackerRoomInfo = {
  id: string;
  metadata: Metadata;
};

export type ImmutableStorage = ToImmutable<IssueTrackerStorage>;
