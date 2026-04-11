"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NavView } from "./chat-layout";
import type { TeamChannel } from "./team-chat-data";

interface ChatSidebarProps {
  channels: TeamChannel[];
  activeChannel: string;
  activeView: NavView;
  onChannelSelect: (channelId: string) => void;
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
];

const PREVIEW_TIMES = ["9:00 AM", "10:30 AM", "Yesterday", "12:45 PM", "2:00 PM", "Mon", "Tue"];

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

interface ChannelRowProps {
  channel: TeamChannel;
  isActive: boolean;
  colorClass: string;
  timeLabel: string;
  showOnlineDot?: boolean;
  onClick: () => void;
}

function ChannelRow({ channel, isActive, colorClass, timeLabel, showOnlineDot, onClick }: ChannelRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-5 text-left transition-colors",
        "py-3.75",
        isActive ? "bg-primary/5" : "hover:bg-black/3",
      )}
    >
      {/* Avatar — 32px (avatar-xs in template) */}
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarFallback className={cn("text-[11px] font-semibold", colorClass)}>
            {getInitials(channel.name)}
          </AvatarFallback>
        </Avatar>
        {showOnlineDot && (
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-background bg-emerald-500" />
        )}
      </div>

      {/* Text block */}
      <div className="min-w-0 flex-1 overflow-hidden">
        {/* Name row */}
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex-1 truncate text-[15px] leading-snug",
            channel.unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/80",
          )}>
            {channel.name}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{timeLabel}</span>
        </div>
        {/* Preview row */}
        <div className="flex items-center gap-2 mt-0.5">
          <p className="flex-1 truncate text-sm text-muted-foreground">{channel.preview}</p>
          {channel.unread > 0 && (
            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {channel.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ChatSidebar({ channels, activeChannel, onChannelSelect }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(
      (ch) => ch.name.toLowerCase().includes(q) || ch.preview.toLowerCase().includes(q),
    );
  }, [channels, searchQuery]);

  const directContacts = useMemo(() => channels.filter((ch) => ch.section === "direct"), [channels]);
  const channelList = useMemo(() => filteredChannels.filter((ch) => ch.section !== "direct"), [filteredChannels]);
  const dmList = useMemo(() => filteredChannels.filter((ch) => ch.section === "direct"), [filteredChannels]);

  return (
    <div className="flex h-full w-95 shrink-0 flex-col overflow-hidden border-r border-border bg-muted/60">

      {/* Header — px-4 pt-4 matching template */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <h2 className="text-base font-semibold text-foreground">Chats</h2>
        <button
          type="button"
          title="New conversation"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/6 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Search — px-4 pb-4 */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages or users"
            className="h-9 rounded-full border-0 bg-transparent pl-9 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Pinned contacts avatar row — px-4 pb-4, avatar-xs (32px) */}
      {directContacts.length > 0 && (
        <div className="px-4 pb-5">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {directContacts.map((contact, idx) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => onChannelSelect(contact.id)}
                className="flex shrink-0 flex-col items-center gap-1.5"
                title={contact.name}
              >
                <div className="relative">
                  <Avatar className={cn(
                    "h-10 w-10 transition-all",
                    activeChannel === contact.id ? "ring-2 ring-primary ring-offset-1" : "",
                  )}>
                    <AvatarFallback className={cn("text-[11px] font-semibold", AVATAR_COLORS[idx % AVATAR_COLORS.length])}>
                      {getInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                </div>
                <span className="max-w-11 truncate text-[11px] text-muted-foreground">
                  {contact.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Channel + DM lists — "Recent" header matches template px-3 mb-3 font-size-16 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="w-95 pb-4">
          {channelList.length > 0 && (
            <div>
              <p className="mb-1 px-4 text-[13px] font-semibold text-muted-foreground/60">
                Recent
              </p>
              {channelList.map((channel, idx) => (
                <ChannelRow
                  key={channel.id}
                  channel={channel}
                  isActive={activeChannel === channel.id}
                  colorClass={AVATAR_COLORS[idx % AVATAR_COLORS.length]}
                  timeLabel={PREVIEW_TIMES[idx % PREVIEW_TIMES.length]}
                  onClick={() => onChannelSelect(channel.id)}
                />
              ))}
            </div>
          )}

          {dmList.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 px-4 text-[13px] font-semibold text-muted-foreground/60">
                Direct Messages
              </p>
              {dmList.map((contact, idx) => (
                <ChannelRow
                  key={contact.id}
                  channel={contact}
                  isActive={activeChannel === contact.id}
                  colorClass={AVATAR_COLORS[(idx + 4) % AVATAR_COLORS.length]}
                  timeLabel={PREVIEW_TIMES[(idx + 4) % PREVIEW_TIMES.length]}
                  showOnlineDot
                  onClick={() => onChannelSelect(contact.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
