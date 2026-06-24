"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";

import { EmptyState, ExpandingSearch } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  TeamsConversationThread,
  parseTeamsConversation,
  type ParsedTeamsMessage,
} from "@/features/documents/teams-conversation-thread";
import type { TeamsInboxConversation } from "@/app/api/teams-inbox/route";

type Conversation = TeamsInboxConversation & {
  messages: ParsedTeamsMessage[];
  participants: string[];
  preview: string;
  lastActivity: string | null;
};

function deriveParticipants(messages: ParsedTeamsMessage[]): string[] {
  const seen: string[] = [];
  for (const m of messages) {
    if (!seen.includes(m.sender)) seen.push(m.sender);
  }
  return seen;
}

function displayTitle(conversation: Conversation): string {
  if (conversation.participants.length > 0) {
    return conversation.participants.slice(0, 3).join(", ");
  }
  return conversation.title.replace(/^Teams DM Conversation:\s*/i, "Conversation ");
}

function formatWhen(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ConversationRow({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-auto w-full flex-col items-stretch gap-0 rounded-none border-b border-border/40 px-3 py-3 text-left hover:bg-muted/40",
        isSelected && "border-l-2 border-l-primary bg-muted/60",
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-semibold text-foreground">
          {displayTitle(conversation)}
        </span>
        <span className="shrink-0 text-xs font-normal text-muted-foreground">
          {formatWhen(conversation.lastActivity)}
        </span>
      </span>
      {conversation.preview ? (
        <span className="mt-1 line-clamp-2 whitespace-normal text-xs font-normal text-muted-foreground">
          {conversation.preview}
        </span>
      ) : null}
      {conversation.projectName ? (
        <span className="mt-1 truncate text-xs font-normal text-muted-foreground/80">
          {conversation.projectName}
        </span>
      ) : null}
    </Button>
  );
}

function ReadingPane({ conversation }: { conversation: Conversation | null }) {
  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<MessageSquare className="h-6 w-6" />}
          title="Select a conversation"
          description="Choose a Teams conversation from the list to read it."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border/40 px-6 py-4">
        <p className="text-base font-semibold text-foreground">{displayTitle(conversation)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {conversation.messages.length} message{conversation.messages.length === 1 ? "" : "s"}
          {conversation.projectName ? ` · ${conversation.projectName}` : ""}
          {conversation.lastActivity
            ? ` · ${new Date(conversation.lastActivity).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}`
            : ""}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <TeamsConversationThread messages={conversation.messages} />
      </div>
    </div>
  );
}

export function TeamsInboxClient() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["teams-inbox", debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      return apiFetch<{ conversations: TeamsInboxConversation[] }>(
        `/api/teams-inbox${params.toString() ? `?${params}` : ""}`,
      );
    },
  });

  const conversations = React.useMemo<Conversation[]>(() => {
    const raw = data?.conversations ?? [];
    return raw.map((c) => {
      const messages = parseTeamsConversation(c.content);
      const participants = deriveParticipants(messages);
      const last = messages[messages.length - 1];
      return {
        ...c,
        messages,
        participants,
        preview: last ? `${last.sender}: ${last.text}` : "",
        // Display the last *message* time (meaningful), not the sync timestamp.
        lastActivity: last ? last.timestamp : c.updatedAt,
      };
    });
  }, [data]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  React.useEffect(() => {
    if (conversations.length > 0 && (!selectedId || !conversations.find((c) => c.id === selectedId))) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const idx = conversations.findIndex((c) => c.id === selectedId);
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        if (idx < conversations.length - 1) setSelectedId(conversations[idx + 1].id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        if (idx > 0) setSelectedId(conversations[idx - 1].id);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [conversations, selectedId]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Left: conversation list */}
      <div className="flex w-96 shrink-0 flex-col overflow-hidden border-r border-border/50">
        <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 pb-3 pt-4">
          <p className="text-lg font-semibold text-foreground">Teams Messages</p>
          <ExpandingSearch
            value={search}
            onChange={setSearch}
            placeholder="Search conversations…"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No conversations found.</p>
          ) : (
            conversations.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                isSelected={c.id === selectedId}
                onClick={() => setSelectedId(c.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: reading pane */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ReadingPane conversation={selected} />
      </div>
    </div>
  );
}
