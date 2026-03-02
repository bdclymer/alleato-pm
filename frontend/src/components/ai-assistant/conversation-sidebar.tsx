"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-b-black/5 px-4 py-4">
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

      {/* List */}
      <ScrollArea className="flex-1 px-2">
        <div className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">
          Your chats
        </div>
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No conversations yet
          </div>
        ) : (
          <div className="space-y-0.5 py-1">
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
      </ScrollArea>
    </div>
  );
}

export function ConversationSidebar(props: ConversationSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-80 shrink-0 border-r border-r-black/5 bg-[#f7f7f8] md:flex">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <div className="flex items-center border-b border-b-black/5 bg-[#f7f7f8] px-2 py-1 md:hidden">
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
