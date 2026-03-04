"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import type { RagConversation } from "@/hooks/use-rag-conversations";

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ConversationListItemProps {
  conversation: RagConversation;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function ConversationListItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: ConversationListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(
    conversation.title || "New conversation",
  );

  const handleSaveRename = () => {
    if (editValue.trim()) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setEditValue(conversation.title || "New conversation");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 rounded-lg px-4 py-2">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveRename();
            if (e.key === "Escape") handleCancelRename();
          }}
          className="h-7 text-sm"
          autoFocus
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={handleSaveRename}
        >
          <CheckIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={handleCancelRename}
        >
          <XIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative flex w-full min-w-0 cursor-pointer items-center overflow-hidden rounded-lg px-3 py-2 text-left text-sm transition-colors",
        "hover:bg-muted/80",
        isActive && "bg-muted",
      )}
    >
      <span className="block min-w-0 flex-1 truncate text-foreground/80">
        {conversation.title || "New conversation"}
      </span>

      {/* Action buttons — overlay on right with gradient fade */}
      <div className={cn(
        "absolute inset-y-0 right-0 flex items-center gap-0.5 rounded-r-lg pl-6 pr-1 opacity-0 transition-opacity group-hover:opacity-100",
        isActive
          ? "bg-gradient-to-l from-muted via-muted to-transparent"
          : "bg-gradient-to-l from-background via-background to-transparent group-hover:from-muted/80 group-hover:via-muted/80",
      )}>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <PencilIcon className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2Icon className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
