"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChatSidebar } from "./chat-sidebar";
import { ChatMain, type TeamChatMessage } from "./chat-main";
import { ChatRightPanel, type ThreadReply } from "./chat-right-panel";
import { TEAM_CHANNELS, getTeamChannel, type TeamChannel } from "./team-chat-data";

interface ChatLayoutProps {
  username: string;
  onUsernameChange?: (username: string) => void;
}

export type NavView = "chats" | "channels" | "contacts";

interface ChannelPreview {
  content: string;
  user_name: string;
  created_at: string;
}

export function ChatLayout({ username }: ChatLayoutProps) {
  const [activeChannel, setActiveChannel] = useState(TEAM_CHANNELS[0]?.id ?? "general");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<TeamChatMessage | null>(null);
  const [threadRepliesByMessage, setThreadRepliesByMessage] = useState<Record<string, ThreadReply[]>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [activeView] = useState<NavView>("chats");
  const [previews, setPreviews] = useState<Record<string, ChannelPreview>>({});

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setRightPanelOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const fetchPreviews = useCallback(() => {
    apiFetch<Record<string, ChannelPreview>>("/api/team-chat/previews")
      .then((data) => setPreviews(data ?? {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPreviews();
  }, [fetchPreviews]);

  // Merge real previews into channel list
  const channels = useMemo<TeamChannel[]>(() =>
    TEAM_CHANNELS.map((ch) => {
      const p = previews[ch.id];
      if (!p) return ch;
      return { ...ch, preview: p.content };
    }),
    [previews],
  );

  const activeChannelDetails = useMemo(() => getTeamChannel(activeChannel), [activeChannel]);

  const selectedThreadReplies = selectedMessage
    ? (threadRepliesByMessage[selectedMessage.id] ?? [])
    : [];

  const handleAddThreadReply = (content: string) => {
    if (!selectedMessage) return;
    const reply: ThreadReply = {
      id: crypto.randomUUID(),
      content,
      userName: username,
      createdAt: new Date().toISOString(),
    };
    setThreadRepliesByMessage((cur) => ({
      ...cur,
      [selectedMessage.id]: [...(cur[selectedMessage.id] ?? []), reply],
    }));
  };

  // Refresh previews when a message is sent in any channel
  const handleMessageSent = useCallback(() => {
    fetchPreviews();
  }, [fetchPreviews]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background text-foreground">
      {/* Sidebar – desktop */}
      <div className="hidden lg:block">
        <ChatSidebar
          channels={channels}
          activeChannel={activeChannel}
          activeView={activeView}
          onChannelSelect={(channelId) => {
            setActiveChannel(channelId);
            setSelectedMessage(null);
          }}
        />
      </div>

      {/* Sidebar – mobile sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-95 p-0 sm:max-w-95">
          <ChatSidebar
            channels={channels}
            activeChannel={activeChannel}
            activeView={activeView}
            onChannelSelect={(channelId) => {
              setActiveChannel(channelId);
              setSelectedMessage(null);
              setSidebarOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Main chat */}
      <div className="min-w-0 flex-1">
        <ChatMain
          channel={activeChannelDetails}
          username={username}
          onToggleSidebar={() => setSidebarOpen(true)}
          onToggleRightPanel={() => setRightPanelOpen((o) => !o)}
          onMessageSelect={(message) => {
            setSelectedMessage(message);
            setRightPanelOpen(true);
          }}
          onMessageSent={handleMessageSent}
          selectedMessageId={selectedMessage?.id ?? null}
          threadReplyCountByMessage={Object.fromEntries(
            Object.entries(threadRepliesByMessage).map(([mid, replies]) => [mid, replies.length]),
          )}
        />
      </div>

      {/* Right thread panel – desktop */}
      <div
        className={cn(
          "hidden xl:block border-l border-border transition-all duration-150",
          rightPanelOpen ? "w-96" : "w-0",
        )}
      >
        {rightPanelOpen && (
          <ChatRightPanel
            channel={activeChannelDetails}
            selectedMessage={selectedMessage}
            threadReplies={selectedThreadReplies}
            onAddThreadReply={handleAddThreadReply}
            onClose={() => setRightPanelOpen(false)}
          />
        )}
      </div>

      {/* Right panel – mobile sheet */}
      <Sheet open={Boolean(rightPanelOpen && isMobile)} onOpenChange={setRightPanelOpen}>
        <SheetContent side="right" className="w-96 p-0 sm:max-w-96">
          <ChatRightPanel
            channel={activeChannelDetails}
            selectedMessage={selectedMessage}
            threadReplies={selectedThreadReplies}
            onAddThreadReply={handleAddThreadReply}
            onClose={() => setRightPanelOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
