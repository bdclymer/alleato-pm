"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Smile, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  user: { name: string };
  createdAt: string;
}

interface MessageGroupProps {
  message: Message;
  isFirstInGroup: boolean;
  isOwnMessage: boolean;
  onSelect?: () => void;
}

export function MessageGroup({
  message,
  isFirstInGroup,
  isOwnMessage,
  onSelect,
}: MessageGroupProps) {
  const [isHovered, setIsHovered] = useState(false);

  const time = format(parseISO(message.createdAt), "h:mm a");
  const initials = message.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "group relative px-4 py-1 hover:bg-[hsl(var(--chat-hover))] transition-colors",
        isFirstInGroup && "mt-2",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      <div className="flex gap-4">
        {/* Avatar - only show for first message in group */}
        <div className="w-9 shrink-0">
          {isFirstInGroup && (
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-[hsl(var(--chat-accent))] text-white text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {isFirstInGroup && (
            <div className="flex items-baseline gap-2 mb-1">
              <span
                className={cn(
                  "font-semibold text-sm",
                  isOwnMessage
                    ? "text-[hsl(var(--chat-accent))]"
                    : "text-[hsl(var(--chat-text))]",
                )}
              >
                {message.user.name}
              </span>
              <span className="text-xs text-[hsl(var(--chat-muted))]">
                {time}
              </span>
            </div>
          )}

          <div className="text-sm text-[hsl(var(--chat-text))] leading-relaxed break-words">
            {message.content}
          </div>
        </div>

        {/* Hover Actions */}
        {isHovered && (
          <div className="absolute top-0 right-4 -translate-y-1/2 flex items-center gap-1 bg-[hsl(var(--chat-panel-2))] border border-[hsl(var(--chat-border))] rounded-lg shadow-lg px-1 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[hsl(var(--chat-muted))] hover:text-[hsl(var(--chat-text))] hover:bg-[hsl(var(--chat-hover))]"
              title="Reply in thread"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[hsl(var(--chat-muted))] hover:text-[hsl(var(--chat-text))] hover:bg-[hsl(var(--chat-hover))]"
              title="Add reaction"
            >
              <Smile className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[hsl(var(--chat-muted))] hover:text-[hsl(var(--chat-text))] hover:bg-[hsl(var(--chat-hover))]"
              title="More actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Time indicator for subsequent messages in group - show on hover */}
      {!isFirstInGroup && isHovered && (
        <div className="absolute left-14 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--chat-muted))]">
          {time}
        </div>
      )}
    </div>
  );
}
