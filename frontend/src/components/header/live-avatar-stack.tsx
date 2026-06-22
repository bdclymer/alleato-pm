"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useRealtimePresenceRoom } from "@/hooks/use-realtime-presence-room";
import { getRoomId } from "@/lib/collaboration/rooms";
import { useEntityContext } from "./use-entity-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const MAX_VISIBLE = 3;

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name?: string | null): string {
  if (!name) return "hsl(var(--muted))";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 45%)`;
}

function AvatarBubble({
  name,
  avatarUrl,
}: {
  name?: string | null;
  avatarUrl?: string | null;
}) {
  const initials = getInitials(name);
  const bg = getAvatarColor(name);

  return (
    <div
      className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ring-background text-[11px] font-medium text-white select-none"
      style={{ backgroundColor: bg }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name ?? ""}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}

export function LiveAvatarStack() {
  const entityContext = useEntityContext();

  if (!entityContext) return null;

  const roomId = getRoomId(entityContext.entityType, entityContext.entityId);
  return <LiveAvatarStackRoom roomId={roomId} />;
}

function LiveAvatarStackRoom({ roomId }: { roomId: string }) {
  const { users } = useRealtimePresenceRoom(roomId);

  const allUsers = Object.entries(users).map(([id, user]) => ({
    id,
    name: user.name,
    image: user.image,
  }));

  if (allUsers.length === 0) return null;

  const visibleUsers = allUsers.slice(0, MAX_VISIBLE);
  const overflow = allUsers.length - MAX_VISIBLE;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center">
        <div className="flex -space-x-2">
          <AnimatePresence initial={false}>
            {visibleUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.5, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.5, x: 8 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-default">
                      <AvatarBubble name={user.name} avatarUrl={user.image} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {user.name ?? "Anonymous"}
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ))}

            {overflow > 0 ? (
              <motion.div
                key="overflow"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex h-7 w-7 shrink-0 cursor-default items-center justify-center rounded-full ring-2 ring-background bg-muted text-[10px] font-semibold text-muted-foreground select-none">
                      +{overflow}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {overflow} more {overflow === 1 ? "person" : "people"} viewing
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}
