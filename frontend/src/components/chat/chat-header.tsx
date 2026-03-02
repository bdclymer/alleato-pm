"use client";

import {
  Menu,
  Hash,
  Search,
  Users,
  MoreVertical,
  MessageSquare,
} from "lucide-react";
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
    <div className="h-14 border-b border-[hsl(var(--chat-border))] bg-[hsl(var(--chat-panel))]/80 backdrop-blur-sm flex items-center px-4 gap-4">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="md:hidden text-[hsl(var(--chat-muted))] hover:text-[hsl(var(--chat-text))] hover:bg-[hsl(var(--chat-hover))]"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Channel Name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Hash className="h-5 w-5 text-[hsl(var(--chat-muted))] shrink-0" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[hsl(var(--chat-text))] truncate">
            {channelName}
          </h2>
          {topic && (
            <p className="text-xs text-[hsl(var(--chat-muted))] truncate hidden sm:block">
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
            isConnected ? "bg-green-500" : "bg-muted0",
          )}
        />
        <span className="text-xs text-[hsl(var(--chat-muted))] hidden sm:inline">
          {isConnected ? "Connected" : "Connecting..."}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-[hsl(var(--chat-muted))] hover:text-[hsl(var(--chat-text))] hover:bg-[hsl(var(--chat-hover))] hidden sm:flex"
        >
          <Search className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleRightPanel}
          className="text-[hsl(var(--chat-muted))] hover:text-[hsl(var(--chat-text))] hover:bg-[hsl(var(--chat-hover))]"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-[hsl(var(--chat-muted))] hover:text-[hsl(var(--chat-text))] hover:bg-[hsl(var(--chat-hover))]"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
