"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { Composer } from "./composer";
import { useRealtimeChat, type ChatMessage } from "@/hooks/use-realtime-chat";
import type { TeamChannel } from "./team-chat-data";

export type TeamChatMessage = ChatMessage;

interface ChatMainProps {
  channel: TeamChannel;
  username: string;
  onToggleSidebar: () => void;
  onToggleRightPanel: () => void;
  onMessageSelect?: (message: TeamChatMessage) => void;
  onMessageSent?: () => void;
  selectedMessageId?: string | null;
  threadReplyCountByMessage?: Record<string, number>;
}

interface MessageRow {
  id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export function ChatMain({
  channel,
  username,
  onToggleSidebar,
  onToggleRightPanel,
  onMessageSelect,
  onMessageSent,
  selectedMessageId,
  threadReplyCountByMessage = {},
}: ChatMainProps) {
  const roomName = channel.id ? `${channel.id}-channel` : "team-chat-empty";
  const canChatInChannel = Boolean(channel.id);
  const { messages: realtimeMessages, sendMessage, isConnected } = useRealtimeChat({
    roomName,
    username,
  });

  const [history, setHistory] = useState<TeamChatMessage[]>([]);
  const [messageQuery, setMessageQuery] = useState("");
  const [reactionsByMessage, setReactionsByMessage] = useState<
    Record<string, Record<string, number>>
  >({});

  useEffect(() => {
    setHistory([]);
    setMessageQuery("");

    if (!channel.id) {
      return;
    }

    apiFetch<MessageRow[]>(
      `/api/team-chat/messages?channel=${encodeURIComponent(channel.id)}`,
    )
      .then((rows) => {
        if (!Array.isArray(rows)) {
          return;
        }

        setHistory(
          rows.map((row) => ({
            id: row.id,
            content: row.content,
            user: { name: row.user_name },
            createdAt: row.created_at,
          })),
        );
      })
      .catch(() => {
        // Keep chat usable with realtime only when history fetch fails.
      });
  }, [channel.id]);

  const allMessages = useMemo(() => {
    const merged = [...history, ...realtimeMessages];
    const seen = new Set<string>();

    return merged
      .filter((message) => {
        if (seen.has(message.id)) {
          return false;
        }

        seen.add(message.id);
        return true;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [history, realtimeMessages]);

  const filteredMessages = useMemo(() => {
    const normalized = messageQuery.trim().toLowerCase();

    if (!normalized) {
      return allMessages;
    }

    return allMessages.filter(
      (message) =>
        message.content.toLowerCase().includes(normalized) ||
        message.user.name.toLowerCase().includes(normalized),
    );
  }, [allMessages, messageQuery]);

  const handleSend = async (content: string) => {
    if (!canChatInChannel) {
      return;
    }

    sendMessage(content);

    apiFetch("/api/team-chat/messages", {
      method: "POST",
      body: JSON.stringify({ channelId: channel.id, content }),
    })
      .then(() => onMessageSent?.())
      .catch(() => {
        // Broadcast already sent; leave optimistic message in view.
      });
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    setReactionsByMessage((current) => {
      const currentMessageReactions = current[messageId] ?? {};
      const currentEmojiCount = currentMessageReactions[emoji] ?? 0;

      return {
        ...current,
        [messageId]: {
          ...currentMessageReactions,
          [emoji]: currentEmojiCount + 1,
        },
      };
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ChatHeader
        channelName={channel.name}
        topic={channel.topic}
        teamName={channel.team}
        memberCount={channel.memberCount}
        onToggleSidebar={onToggleSidebar}
        onToggleRightPanel={onToggleRightPanel}
        isConnected={isConnected}
        messageQuery={messageQuery}
        onMessageQueryChange={setMessageQuery}
      />

      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={filteredMessages}
          currentUsername={username}
          selectedMessageId={selectedMessageId}
          threadReplyCountByMessage={threadReplyCountByMessage}
          reactionsByMessage={reactionsByMessage}
          onMessageSelect={onMessageSelect}
          onReplyInThread={onMessageSelect}
          onAddReaction={handleAddReaction}
        />
      </div>

      <Composer
        onSend={handleSend}
        channelName={channel.name}
        placeholder={canChatInChannel ? `Message ${channel.name}` : "Create a channel to start chatting"}
        disabled={!isConnected || !canChatInChannel}
      />
    </div>
  );
}
