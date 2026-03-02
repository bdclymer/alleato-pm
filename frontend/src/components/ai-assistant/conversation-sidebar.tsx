"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MenuIcon, PlusIcon, SearchIcon } from "lucide-react";
import { ConversationListItem } from "./conversation-list-item";
import type { RagConversation } from "@/hooks/use-rag-conversations";

interface ConversationSidebarProps {
  conversations: RagConversation[];
  activeSessionId: string | null;
  isLoading: boolean;
  onSelectConversation: (sessionId: string) => void;
  onNewChat: () => void;
  onRename: (sessionId: string, title: string) => void;
  onDelete: (sessionId: string) => void;
}

function SidebarContent({
  conversations,
  activeSessionId,
  isLoading,
  onSelectConversation,
  onNewChat,
  onRename,
  onDelete,
}: ConversationSidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? conversations.filter((c) =>
        (c.title || "").toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Conversations</h2>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onNewChat}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 px-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {search ? "No matching conversations" : "No conversations yet"}
          </div>
        ) : (
          <div className="space-y-0.5 py-1">
            {filtered.map((convo) => (
              <ConversationListItem
                key={convo.session_id}
                conversation={convo}
                isActive={convo.session_id === activeSessionId}
                onSelect={() => onSelectConversation(convo.session_id)}
                onRename={(title) => onRename(convo.session_id, title)}
                onDelete={() => onDelete(convo.session_id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export function ConversationSidebar(props: ConversationSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-80 shrink-0 border-r bg-muted/30 md:flex">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <div className="flex items-center border-b px-2 py-1 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost" className="h-9 w-9">
              <MenuIcon className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SidebarContent {...props} />
          </SheetContent>
        </Sheet>
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto h-9 w-9"
          onClick={props.onNewChat}
        >
          <PlusIcon className="h-5 w-5" />
        </Button>
      </div>
    </>
  );
}
