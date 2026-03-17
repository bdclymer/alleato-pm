"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { useOthers, useSelf } from "@liveblocks/react/suspense";
import { LiveList, LiveObject } from "@liveblocks/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getRoomId } from "@/lib/liveblocks/rooms";
import { useEntityContext } from "./comments-sidebar";

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_VISIBLE = 3;

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

// ── Avatar ───────────────────────────────────────────────────────────────────

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

interface AvatarBubbleProps {
  name?: string | null;
  avatarUrl?: string | null;
  isSelf?: boolean;
}

function AvatarBubble({ name, avatarUrl, isSelf }: AvatarBubbleProps) {
  const initials = getInitials(name);
  const bg = getAvatarColor(name);

  return (
    <div
      className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ring-background text-[11px] font-medium text-white select-none"
      style={{ backgroundColor: bg }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name ?? ""}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        initials
      )}
      {isSelf && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
      )}
    </div>
  );
}

// ── Inner component (needs room context) ─────────────────────────────────────

function AvatarsInner() {
  const others = useOthers();
  const self = useSelf();

  // Don't show anything if nobody else is here
  if (others.length === 0) return null;

  const visibleOthers = others.slice(0, MAX_VISIBLE);
  const overflow = others.length - MAX_VISIBLE;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center">
        <div className="flex -space-x-2">
          <AnimatePresence initial={false}>
            {/* Others first */}
            {visibleOthers.map((user) => (
              <motion.div
                key={user.connectionId}
                initial={{ opacity: 0, scale: 0.5, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.5, x: 8 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-default">
                      <AvatarBubble
                        name={user.info?.name}
                        avatarUrl={user.info?.avatar}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {user.info?.name ?? "Anonymous"}
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ))}

            {/* Overflow bubble */}
            {overflow > 0 && (
              <motion.div
                key="overflow"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="flex h-7 w-7 shrink-0 cursor-default items-center justify-center rounded-full ring-2 ring-background bg-muted text-[10px] font-semibold text-muted-foreground select-none"
                    >
                      +{overflow}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {overflow} more {overflow === 1 ? "person" : "people"} viewing
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            )}

            {/* Self last */}
            {self && (
              <motion.div
                key="self"
                initial={{ opacity: 0, scale: 0.5, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.5, x: 8 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-default">
                      <AvatarBubble
                        name={self.info?.name}
                        avatarUrl={self.info?.avatar}
                        isSelf
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {self.info?.name ?? "You"} (you)
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ── Public component ─────────────────────────────────────────────────────────

/**
 * Live avatar stack that shows who is currently viewing the same page.
 * Renders nothing if no entity context (outside project tools) or nobody else is present.
 */
export function LiveAvatarStack() {
  const entityContext = useEntityContext();

  if (!entityContext) return null;

  const roomId = getRoomId(entityContext.entityType, entityContext.entityId);

  return (
    <ClientSideSuspense fallback={null}>
      <RoomProvider id={roomId} initialStorage={INITIAL_STORAGE}>
        <AvatarsInner />
      </RoomProvider>
    </ClientSideSuspense>
  );
}
