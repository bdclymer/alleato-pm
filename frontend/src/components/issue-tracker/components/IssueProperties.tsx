"use client";

import {
  ClientSideSuspense,
  useMutation,
  useStorage,
} from "@liveblocks/react/suspense";
import { PRIORITY_STATES, PROGRESS_STATES } from "@/components/issue-tracker/config";
import { getUsers } from "@/components/issue-tracker/database";
import { Select } from "@/components/issue-tracker/components/Select";
import { ImmutableStorage } from "@/components/issue-tracker/liveblocks.config";

// ── Property row wrapper ──────────────────────────────────────────────────────

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center min-h-[28px] -mx-2">
      <span className="text-xs text-muted-foreground w-[88px] shrink-0 pl-2">
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export function IssueProperties({
  storageFallback,
}: {
  storageFallback: ImmutableStorage;
}) {
  return (
    <ClientSideSuspense
      fallback={
        <div className="flex flex-col gap-0.5 pointer-events-none">
          <PropertyRow label="Status">
            <div className="px-2 py-1 text-xs text-muted-foreground">
              {PROGRESS_STATES.find(
                (p) => p.id === storageFallback.properties.progress
              )?.jsx ?? "—"}
            </div>
          </PropertyRow>
          <PropertyRow label="Priority">
            <div className="px-2 py-1 text-xs text-muted-foreground">
              {PRIORITY_STATES.find(
                (p) => p.id === storageFallback.properties.priority
              )?.jsx ?? "—"}
            </div>
          </PropertyRow>
          <PropertyRow label="Assignee">
            <div className="px-2 py-1 text-xs text-muted-foreground">
              {storageFallback.properties.assignedTo === "none"
                ? "No assignee"
                : storageFallback.properties.assignedTo}
            </div>
          </PropertyRow>
        </div>
      }
    >
      <Properties />
    </ClientSideSuspense>
  );
}

// ── Users list ────────────────────────────────────────────────────────────────

const USERS = [
  {
    id: "none",
    jsx: <div className="text-muted-foreground text-xs">No assignee</div>,
  },
  ...getUsers().map((user) => ({
    id: user.id,
    jsx: <AvatarAndName user={user} />,
  })),
];

// ── Inner (needs room context) ────────────────────────────────────────────────

function Properties() {
  const properties = useStorage((root) => root.properties);

  const editProperty = useMutation(({ storage }, prop, value) => {
    storage.get("properties").set(prop, value);
  }, []);

  return (
    <div className="flex flex-col gap-0.5">
      <PropertyRow label="Status">
        <Select
          id="progress"
          value={properties.progress}
          items={PROGRESS_STATES as any}
          adjustFirstItem="split"
          onValueChange={(val) => editProperty("progress", val)}
        />
      </PropertyRow>

      <PropertyRow label="Priority">
        <Select
          id="priority"
          value={properties.priority}
          items={PRIORITY_STATES as any}
          adjustFirstItem="split"
          onValueChange={(val) => editProperty("priority", val)}
        />
      </PropertyRow>

      <PropertyRow label="Assignee">
        <Select
          id="assignedTo"
          value={properties.assignedTo}
          items={USERS}
          adjustFirstItem="split"
          onValueChange={(val) => editProperty("assignedTo", val)}
        />
      </PropertyRow>
    </div>
  );
}

function AvatarAndName({ user }: { user: Liveblocks["UserMeta"] | null }) {
  if (!user) {
    return <div className="text-xs text-muted-foreground">No assignee</div>;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div className="w-4 h-4 rounded-full overflow-hidden shrink-0">
        <img src={user.info.avatar} alt={user.info.name} className="w-full h-full object-cover" />
      </div>
      <span className="truncate">{user.info.name}</span>
    </div>
  );
}
