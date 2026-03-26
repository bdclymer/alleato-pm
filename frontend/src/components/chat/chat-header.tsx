"use client";

import { Hash, Menu, MessageSquare, MoreVertical, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  channelName: string;
  topic: string;
  memberCount: number;
  onToggleSidebar: () => void;
  onToggleRightPanel: () => void;
  isConnected: boolean;
}

export function ChatHeader({
  channelName,
  topic,
  memberCount,
  onToggleSidebar,
  onToggleRightPanel,
  isConnected,
}: ChatHeaderProps) {
  return (
    <div className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center px-4 gap-4">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="md:hidden text-muted-foreground hover:text-foreground"
      >
        <Menu />
      </Button>

      {/* Channel Name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground truncate">
            {channelName}
          </h2>
          {topic && (
            <p className="text-xs text-muted-foreground truncate hidden sm:block">
              {topic}
            </p>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-muted-foreground",
          )}
        />
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {isConnected ? "Connected" : "Connecting..."}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:flex text-muted-foreground hover:text-foreground"
        >
          <Search />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleRightPanel}
          className="text-muted-foreground hover:text-foreground"
        >
          <MessageSquare />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
        >
          <MoreVertical />
        </Button>
      </div>
    </div>
  );
}
