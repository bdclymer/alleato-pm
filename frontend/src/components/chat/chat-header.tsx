"use client";

import { Info, Menu, MessageSquare, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  channelName: string;
  topic: string;
  teamName: string;
  memberCount: number;
  onToggleSidebar: () => void;
  onToggleRightPanel: () => void;
  isConnected: boolean;
  messageQuery: string;
  onMessageQueryChange: (value: string) => void;
}

export function ChatHeader({
  channelName,
  topic,
  memberCount,
  onToggleSidebar,
  onToggleRightPanel,
}: ChatHeaderProps) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-3 bg-background px-4">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="text-muted-foreground hover:text-foreground lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Channel name + topic */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{channelName}</h2>
          <p className="truncate text-xs text-muted-foreground">{topic}</p>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <span className="hidden items-center gap-1 px-1 text-xs text-muted-foreground md:inline-flex">
          <Users className="h-3.5 w-3.5" />
          {memberCount}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Start video call"
        >
          <Video className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleRightPanel}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Thread panel"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Channel info"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
