"use client";

import { MessageSquare, MoreVertical, Search } from "lucide-react";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { Composer } from "./composer";
import { useRealtimeChat, type ChatMessage } from "@/hooks/use-realtime-chat";
import { useEffect, useMemo, useState } from "react";

interface ChatMainProps {
  channelId: string;
  username: string;
  onUsernameChange?: (username: string) => void;
  onToggleSidebar: () => void;
  onToggleRightPanel: () => void;
  onMessageSelect?: (messageId: string) => void;
}

const channelInfo: Record<string, { name: string; topic: string }> = {
  general: {
    name: "general",
    topic: "Company-wide announcements and work-related matters",
  },
  "project-updates": {
    name: "project-updates",
    topic: "Share updates and progress on active projects",
  },
  support: {
    name: "support",
    topic: "Get help and support from the team",
  },
};

export function ChatMain({
  channelId,
  username,
  onToggleSidebar,
  onToggleRightPanel,
  onMessageSelect,
}: ChatMainProps) {
  const roomName = `${channelId}-channel`;
  const { messages: realtimeMessages, sendMessage, isConnected } = useRealtimeChat({
    roomName,
    username,
  });

  const [history, setHistory] = useState<ChatMessage[]>([]);

  // Load message history when channel changes
  useEffect(() => {
    setHistory([]);
    fetch(`/api/team-chat/messages?channel=${encodeURIComponent(channelId)}`)
      .then((r) => r.json())
      .then((rows: Array<{ id: string; user_name: string; content: string; created_at: string }>) => {
        if (Array.isArray(rows)) {
          setHistory(
            rows.map((r) => ({
              id: r.id,
              content: r.content,
              user: { name: r.user_name },
              createdAt: r.created_at,
            })),
          );
        }
      })
      .catch(() => {
        // History unavailable — realtime still works
      });
  }, [channelId]);

  // Merge history + realtime, deduplicate, sort
  const allMessages = useMemo(() => {
    const merged = [...history, ...realtimeMessages];
    const seen = new Set<string>();
    return merged
      .filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [history, realtimeMessages]);

  const handleSend = async (content: string) => {
    // Broadcast to connected clients immediately
    sendMessage(content);

    // Persist to database
    fetch("/api/team-chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, content, userName: username }),
    }).catch(() => {
      // Persist failure is silent — message already delivered via broadcast
    });
  };

  const channel = channelInfo[channelId] || { name: channelId, topic: "" };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        channelName={channel.name}
        topic={channel.topic}
        memberCount={0}
        onToggleSidebar={onToggleSidebar}
        onToggleRightPanel={onToggleRightPanel}
        isConnected={isConnected}
      />

      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={allMessages}
          currentUsername={username}
          onMessageSelect={onMessageSelect}
        />
      </div>

      <Composer
        onSend={handleSend}
        channelName={channel.name}
        disabled={!isConnected}
      />
    </div>
  );
}
