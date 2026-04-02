"use client";

import { useSyncStatus } from "@liveblocks/react/suspense";
import { SyncCompleteIcon } from "@/components/issue-tracker/icons/SyncCompleteIcon";
import { SyncSpinnerIcon } from "@/components/issue-tracker/icons/SyncSpinnerIcon";

export function Status() {
  const status = useSyncStatus({ smooth: true });
  return (
    <div className="flex items-center text-muted-foreground font-semibold gap-1.5 text-xs">
      {status === "synchronizing" ? (
        <SyncSpinnerIcon className="w-5 h-5 opacity-80 p-[1px] animate-spin" />
      ) : (
        <SyncCompleteIcon className="w-5 h-5 opacity-80" />
      )}
    </div>
  );
}
