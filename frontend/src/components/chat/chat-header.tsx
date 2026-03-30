"use client";

import {
  Hash,
  Info,
  Menu,
  MessageSquare,
  Search,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  teamName,
  memberCount,
  onToggleSidebar,
  onToggleRightPanel,
  isConnected,
  messageQuery,
  onMessageQueryChange,
}: ChatHeaderProps) {
  return (
    <div className="border-b border-border bg-background">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="text-muted-foreground hover:text-foreground lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {channelName}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {teamName} · {topic}
            </p>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center xl:flex">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={messageQuery}
              onChange={(event) => onMessageQueryChange(event.target.value)}
              placeholder="Search this conversation"
              className="h-9 border-border bg-muted/40 pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span
            className={cn(
              "hidden rounded-full px-2 py-0.5 text-[11px] sm:inline",
              isConnected
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isConnected ? "Live" : "Syncing"}
          </span>
          <span className="hidden items-center gap-1 px-2 text-xs text-muted-foreground md:inline-flex">
            <Users className="h-3.5 w-3.5" />
            {memberCount}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            title="Start meeting"
          >
            <Video className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleRightPanel}
            className="text-muted-foreground hover:text-foreground"
            title="Open thread panel"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            title="Channel details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-t border-border px-4 py-2 xl:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={messageQuery}
            onChange={(event) => onMessageQueryChange(event.target.value)}
            placeholder="Search this conversation"
            className="h-9 border-border bg-muted/40 pl-9"
          />
        </div>
      </div>
    </div>
  );
}
