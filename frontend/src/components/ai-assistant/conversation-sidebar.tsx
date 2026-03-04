"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MenuIcon, PlusIcon } from "lucide-react";
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
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-3 py-3">
        <h2 className="text-sm font-semibold text-foreground">Chats</h2>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onNewChat}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1 px-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No conversations yet
          </div>
        ) : (
          <div className="space-y-0.5 px-2 py-1">
            {conversations.map((convo) => (
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
      </div>
    </div>
  );
}

export function ConversationSidebar(props: ConversationSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col overflow-hidden border-r border-border/40 bg-muted/30 md:flex">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <div className="flex items-center border-b border-border/40 bg-muted/30 px-2 py-1 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost" className="h-9 w-9">
              <MenuIcon className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
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
