"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Search,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { TeamChannel } from "./team-chat-data";

interface ChatSidebarProps {
  channels: TeamChannel[];
  activeChannel: string;
  onChannelSelect: (channelId: string) => void;
}

type Filter = "all" | "unread" | "channels";

export function ChatSidebar({ channels, activeChannel, onChannelSelect }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("all");

  const filteredChannels = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    return channels.filter((channel) => {
      const matchesQuery =
        normalized.length === 0 ||
        channel.name.toLowerCase().includes(normalized) ||
        channel.topic.toLowerCase().includes(normalized) ||
        channel.preview.toLowerCase().includes(normalized);

      if (!matchesQuery) {
        return false;
      }

      if (activeFilter === "unread") {
        return channel.unread > 0;
      }

      if (activeFilter === "channels") {
        return channel.section !== "direct";
      }

      return true;
    });
  }, [activeFilter, channels, searchQuery]);

  const sections: Array<{ key: TeamChannel["section"]; label: string }> = [
    { key: "favorites", label: "Favorites" },
    { key: "channels", label: "Teams and channels" },
    { key: "direct", label: "Chats" },
  ];

  return (
    <div className="flex h-full w-80 border-r border-border bg-muted/40">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Chat</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Customize
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {(["all", "unread", "channels"] as Filter[]).map((filterKey) => (
              <Button
                key={filterKey}
                type="button"
                onClick={() => setActiveFilter(filterKey)}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 rounded-full px-2.5 text-xs",
                  activeFilter === filterKey
                    ? "bg-primary/10 text-primary"
                    : "bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {filterKey === "all"
                  ? "Chats"
                  : filterKey === "unread"
                    ? "Unread"
                    : "Channels"}
              </Button>
            ))}
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search chats and channels"
              className="h-9 border-border bg-background pl-9 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-5 px-3 py-3">
            {sections.map((section) => {
              const sectionChannels = filteredChannels.filter(
                (channel) => channel.section === section.key,
              );

              if (sectionChannels.length === 0) {
                return null;
              }

              return (
                <section key={section.key} className="space-y-1.5">
                  <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.label}
                  </h3>

                  {sectionChannels.map((channel) => {
                    const isActive = activeChannel === channel.id;

                    return (
                      <Button
                        key={channel.id}
                        type="button"
                        onClick={() => onChannelSelect(channel.id)}
                        variant="ghost"
                        className={cn(
                          "h-auto w-full rounded-md px-2 py-2 text-left transition-colors",
                          isActive
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {channel.section === "direct" ? (
                            <Avatar className="h-5 w-5 border border-border">
                              <AvatarFallback className="text-[10px] font-semibold">
                                {channel.name
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <span className="text-sm text-muted-foreground">#</span>
                          )}

                          <span className="flex-1 truncate text-sm font-medium">
                            {channel.name}
                          </span>

                          {channel.unread > 0 ? (
                            <Badge className="h-5 rounded-full px-1.5 text-[10px] font-semibold">
                              {channel.unread}
                            </Badge>
                          ) : null}
                        </div>

                        <p className="mt-1 truncate pl-7 text-xs text-muted-foreground">
                          {channel.preview}
                        </p>
                      </Button>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
