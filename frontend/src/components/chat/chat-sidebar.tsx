"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Shield, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NavView } from "./chat-layout";
import type { TeamChannel, TeamChatAdminUser } from "./team-chat-data";

interface ChatSidebarProps {
  channels: TeamChannel[];
  adminUsers: TeamChatAdminUser[];
  activeChannel: string;
  activeView: NavView;
  canManageChannels: boolean;
  onChannelSelect: (channelId: string) => void;
  onCreateChannel: (name: string, topic: string) => Promise<void>;
  onDeleteChannel: (channelId: string) => Promise<void>;
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

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CH"
  );
}

interface ChannelRowProps {
  channel: TeamChannel;
  isActive: boolean;
  canManageChannels: boolean;
  colorClass: string;
  onClick: () => void;
  onDelete: () => void;
}

function ChannelRow({
  channel,
  isActive,
  canManageChannels,
  colorClass,
  onClick,
  onDelete,
}: ChannelRowProps) {
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors",
        isActive ? "bg-primary/5" : "hover:bg-black/3",
      )}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className={cn("text-[11px] font-semibold", colorClass)}>
            {getInitials(channel.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex-1 truncate text-[15px] leading-snug",
                channel.unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/80",
              )}
            >
              {channel.name}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="flex-1 truncate text-sm text-muted-foreground">{channel.preview}</p>
            {channel.unread > 0 && (
              <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {channel.unread}
              </span>
            )}
          </div>
        </div>
      </button>

      {canManageChannels && channel.deletable && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-7 w-7 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
          title={`Delete ${channel.name}`}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}

export function ChatSidebar({
  channels,
  adminUsers,
  activeChannel,
  activeView,
  canManageChannels,
  onChannelSelect,
  onCreateChannel,
  onDeleteChannel,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelTopic, setNewChannelTopic] = useState("");
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(
      (ch) =>
        ch.name.toLowerCase().includes(q) ||
        ch.preview.toLowerCase().includes(q) ||
        ch.topic.toLowerCase().includes(q),
    );
  }, [channels, searchQuery]);

  const handleCreateChannel = async () => {
    // Submit a new channel then clear form state on success.
    const normalizedName = newChannelName.trim();
    if (!normalizedName) {
      setErrorMessage("Enter a channel name.");
      return;
    }

    try {
      setErrorMessage(null);
      await onCreateChannel(normalizedName, newChannelTopic.trim());
      setNewChannelName("");
      setNewChannelTopic("");
      setIsCreatingChannel(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create channel.");
    }
  };

  const handleDeleteChannel = async (channel: TeamChannel) => {
    // Guard deletion with explicit confirmation to avoid accidental data loss.
    const confirmed = window.confirm(`Delete channel "${channel.name}"? This removes all messages in it.`);
    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage(null);
      await onDeleteChannel(channel.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete channel.");
    }
  };

  return (
    <div className="flex h-full w-95 shrink-0 flex-col overflow-hidden border-r border-border bg-muted/60">
      <div className="flex items-center justify-between px-4 pb-4 pt-5">
        <h2 className="text-base font-semibold text-foreground">Team Chat</h2>
        {canManageChannels && (
          <button
            type="button"
            title="Create channel"
            onClick={() => {
              setErrorMessage(null);
              setIsCreatingChannel((current) => !current);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/6 hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels"
            className="h-9 rounded-full border-0 bg-transparent pl-9 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {canManageChannels && isCreatingChannel && (
        <div className="space-y-2 px-4 pb-4">
          <Input
            value={newChannelName}
            onChange={(event) => setNewChannelName(event.target.value)}
            placeholder="Channel name"
          />
          <Input
            value={newChannelTopic}
            onChange={(event) => setNewChannelTopic(event.target.value)}
            placeholder="Topic (optional)"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCreateChannel}>
              Create Channel
            </Button>
          </div>
        </div>
      )}

      {errorMessage && <p className="px-4 pb-3 text-xs text-destructive">{errorMessage}</p>}

      {adminUsers.length > 0 && (
        <div className="px-4 pb-5">
          <p className="mb-2 text-[13px] font-semibold text-muted-foreground/70">Admins</p>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {adminUsers.map((admin, idx) => (
              <div key={admin.id} className="flex shrink-0 flex-col items-center gap-1.5" title={admin.name}>
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={cn("text-[11px] font-semibold", AVATAR_COLORS[idx % AVATAR_COLORS.length])}>
                      {getInitials(admin.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-emerald-500">
                    <Shield className="h-1.5 w-1.5 text-white" />
                  </span>
                </div>
                <span className="max-w-14 truncate text-[11px] text-muted-foreground">{admin.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="w-95 pb-4">
          <div>
            <p className="mb-1 px-4 text-[13px] font-semibold text-muted-foreground/60">
              {activeView === "channels" ? "Channels" : "Recent"}
            </p>
            {filteredChannels.length === 0 ? (
              <p className="px-4 py-2 text-sm text-muted-foreground">No channels found.</p>
            ) : (
              filteredChannels.map((channel, idx) => (
                <ChannelRow
                  key={channel.id}
                  channel={channel}
                  canManageChannels={canManageChannels}
                  isActive={activeChannel === channel.id}
                  colorClass={AVATAR_COLORS[idx % AVATAR_COLORS.length]}
                  onClick={() => onChannelSelect(channel.id)}
                  onDelete={() => handleDeleteChannel(channel)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
