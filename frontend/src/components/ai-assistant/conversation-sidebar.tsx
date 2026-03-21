"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MenuIcon, MessageSquareTextIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-sidebar">
      <div className="border-b border-border/50 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-3xl font-normal text-foreground">Alleato</h2>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-full text-muted-foreground"
            onClick={onNewChat}
          >
            <PlusIcon className="h-5 w-5" />
          </Button>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          className="mt-6 inline-flex items-center gap-2 text-sm text-foreground transition-colors hover:text-foreground/70"
        >
          <PlusIcon className="h-4 w-4" />
          New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 px-4 py-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-muted/60"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted/60">
              <MessageSquareTextIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">
              No conversations yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with a prompt and a thread will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-1 px-3 py-4">
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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="hidden w-80 shrink-0 flex-col overflow-hidden border-r border-border/50 bg-sidebar/60 backdrop-blur xl:flex">
        <SidebarContent {...props} />
      </aside>

      <div className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/50 bg-background px-4 xl:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full">
              <MenuIcon className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 max-w-sm p-0">
            <SidebarContent {...props} />
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            AI Strategist
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto h-10 w-10 rounded-full"
          onClick={props.onNewChat}
        >
          <PlusIcon className="h-5 w-5" />
        </Button>
      </div>
    </>
  );
}
