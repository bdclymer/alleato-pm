"use client";

import { useMemo, useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [activeFilter] = useState<Filter>("all");
  const [collapsed, setCollapsed] = useState(false);

  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      if (activeFilter === "unread") return channel.unread > 0;
      if (activeFilter === "channels") return channel.section !== "direct";
      return true;
    });
  }, [activeFilter, channels]);

  const sections: Array<{ key: TeamChannel["section"]; label: string }> = [
    { key: "favorites", label: "Favorites" },
    { key: "channels", label: "Teams and channels" },
    { key: "direct", label: "Chats" },
  ];

  if (collapsed) {
    return (
      <div className="flex h-full w-12 flex-col border-r border-border bg-muted/40">
        {/* Expand toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mx-auto mt-2 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center gap-1 px-1 py-2">
            {filteredChannels.map((channel) => {
              const isActive = activeChannel === channel.id;
              const initials = channel.name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => onChannelSelect(channel.id)}
                  title={channel.name}
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                  )}
                >
                  {channel.section === "direct" ? (
                    <Avatar className="h-6 w-6 border border-border">
                      <AvatarFallback className="text-[9px] font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">#</span>
                  )}
                  {channel.unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground leading-none">
                      {channel.unread > 9 ? "9+" : channel.unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex h-full w-72 border-r border-border bg-muted/40">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Collapse toggle */}
        <div className="flex items-center justify-end px-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-5 px-3 py-2">
            {sections.map((section) => {
              const sectionChannels = filteredChannels.filter(
                (channel) => channel.section === section.key,
              );

              if (sectionChannels.length === 0) return null;

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
