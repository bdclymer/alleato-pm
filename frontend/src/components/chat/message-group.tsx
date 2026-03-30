"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Smile, ThumbsUp } from "lucide-react";
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
  isSelected?: boolean;
  threadReplyCount?: number;
  reactions?: Record<string, number>;
  onSelect?: () => void;
  onReplyInThread?: () => void;
  onAddReaction?: (emoji: string) => void;
}

function renderMentions(text: string) {
  const mentionPattern = /(@[a-z0-9._-]+)/gi;
  const parts = text.split(mentionPattern);

  return parts.map((part, index) => {
    if (part.match(mentionPattern)) {
      return (
        <span key={`${part}-${index}`} className="font-medium text-primary">
          {part}
        </span>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export function MessageGroup({
  message,
  isFirstInGroup,
  isOwnMessage,
  isSelected = false,
  threadReplyCount = 0,
  reactions = {},
  onSelect,
  onReplyInThread,
  onAddReaction,
}: MessageGroupProps) {
  const [isHovered, setIsHovered] = useState(false);

  const time = format(parseISO(message.createdAt), "h:mm a");
  const initials = message.user.name
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const reactionEntries = useMemo(() => Object.entries(reactions), [reactions]);

  return (
    <div
      className={cn(
        "group relative rounded-md px-3 py-2 transition-colors",
        isFirstInGroup ? "mt-2" : "mt-0.5",
        isSelected ? "bg-primary/5" : "hover:bg-muted/60",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      <div className="flex gap-3">
        <div className="w-8 shrink-0">
          {isFirstInGroup ? (
            <Avatar className="h-8 w-8 border border-border/80">
              <AvatarFallback className="bg-muted text-[11px] font-semibold text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          {isFirstInGroup ? (
            <div className="mb-0.5 flex items-baseline gap-2">
              <span
                className={cn(
                  "text-sm font-semibold",
                  isOwnMessage ? "text-primary" : "text-foreground",
                )}
              >
                {message.user.name}
              </span>
              <span className="text-xs text-muted-foreground">{time}</span>
            </div>
          ) : null}

          <div className="text-sm leading-relaxed text-foreground">
            {renderMentions(message.content)}
          </div>

          {threadReplyCount > 0 ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onReplyInThread?.();
              }}
              className="mt-1 h-auto p-0 text-xs text-primary"
            >
              {threadReplyCount} {threadReplyCount === 1 ? "reply" : "replies"}
            </Button>
          ) : null}

          {reactionEntries.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {reactionEntries.map(([emoji, count]) => (
                <Button
                  key={`${message.id}-${emoji}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddReaction?.(emoji);
                  }}
                  className="h-6 rounded-full px-2 text-xs text-foreground"
                >
                  <span>{emoji}</span>
                  <span className="text-[11px] text-muted-foreground">{count}</span>
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        {isHovered ? (
          <div className="absolute right-3 top-0 flex -translate-y-1/2 items-center gap-1 rounded-md border border-border bg-background px-1 py-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Reply in thread"
              onClick={(event) => {
                event.stopPropagation();
                onReplyInThread?.();
              }}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Add thumbs up"
              onClick={(event) => {
                event.stopPropagation();
                onAddReaction?.("👍");
              }}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Add reaction"
              onClick={(event) => {
                event.stopPropagation();
                onAddReaction?.("❤️");
              }}
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {!isFirstInGroup && isHovered ? (
        <div className="absolute left-11 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
          {time}
        </div>
      ) : null}
    </div>
  );
}
