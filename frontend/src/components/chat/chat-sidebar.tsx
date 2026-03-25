"use client";

import { Hash, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { SourcesList, type Source } from "@/components/misc/sources-list";

interface Channel {
  id: string;
  name: string;
  unread?: number;
}

interface ChatSidebarProps {
  activeChannel: string;
  onChannelSelect: (channelId: string) => void;
  sources?: Source[];
}

const channels: Channel[] = [
  { id: "general", name: "general" },
  { id: "project-updates", name: "project-updates" },
  { id: "support", name: "support" },
];

export function ChatSidebar({
  activeChannel,
  onChannelSelect,
  sources = [],
}: ChatSidebarProps) {
  return (
    <div className="w-72 h-full bg-muted border-r border-border flex flex-col">
      {/* Workspace Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Team Chat</h1>
      </div>

      <ScrollArea className="flex-1">
        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search channels..."
              className="pl-9 bg-background border-border text-sm h-9 placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Channels */}
        <div className="px-2 py-1">
          <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Channels
          </div>
          <div className="space-y-0.5 mt-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-1.5 rounded-md text-sm transition-colors",
                  activeChannel === channel.id
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Hash className="h-4 w-4 shrink-0" />
                <span className="truncate">{channel.name}</span>
                {channel.unread && channel.unread > 0 && (
                  <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full">
                    {channel.unread > 99 ? "99+" : channel.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sources Section */}
        {sources.length > 0 && (
          <div className="px-2 py-4 border-t border-border">
            <SourcesList sources={sources} />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
