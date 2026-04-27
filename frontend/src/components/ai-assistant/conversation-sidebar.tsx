"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  MessageSquareIcon,
} from "lucide-react";
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

type ConversationGroup = {
  label: string;
  conversations: RagConversation[];
};

function isSameLocalDay(date: Date, comparison: Date): boolean {
  return (
    date.getFullYear() === comparison.getFullYear() &&
    date.getMonth() === comparison.getMonth() &&
    date.getDate() === comparison.getDate()
  );
}

function getConversationGroupLabel(dateStr: string | null): string {
  if (!dateStr) return "Older";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Older";

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameLocalDay(date, today)) return "Today";
  if (isSameLocalDay(date, yesterday)) return "Yesterday";
  return "Older";
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function groupConversations(
  conversations: RagConversation[],
): ConversationGroup[] {
  const groups = new Map<string, RagConversation[]>();

  conversations.forEach((conversation) => {
    const label = getConversationGroupLabel(
      conversation.last_message_at || conversation.created_at,
    );
    const existing = groups.get(label) ?? [];
    existing.push(conversation);
    groups.set(label, existing);
  });

  return ["Today", "Yesterday", "Older"]
    .map((label) => ({
      label,
      conversations: groups.get(label) ?? [],
    }))
    .filter((group) => group.conversations.length > 0);
}

function ConversationActions({
  conversation,
  onRename,
  onDelete,
}: {
  conversation: RagConversation;
  onRename: (conversation: RagConversation) => void;
  onDelete: (conversation: RagConversation) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 rounded-md text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontalIcon />
          <span className="sr-only">Conversation actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onRename(conversation);
          }}
        >
          <PencilIcon className="h-4 w-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(conversation);
          }}
        >
          <Trash2Icon className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConversationRow({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  conversation: RagConversation;
  isActive: boolean;
  onSelect: () => void;
  onRename: (conversation: RagConversation) => void;
  onDelete: (conversation: RagConversation) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] leading-5">
          {conversation.title || "New conversation"}
        </p>
      </div>
      <span className="shrink-0 text-[11px] text-sidebar-foreground/45">
        {formatRelativeTime(conversation.last_message_at || conversation.created_at)}
      </span>
      <div className="opacity-0 transition-opacity group-hover:opacity-100">
        <ConversationActions
          conversation={conversation}
          onRename={onRename}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

export function ConversationSidebar({
  conversations,
  activeSessionId,
  isLoading,
  onSelectConversation,
  onNewChat,
  onRename,
  onDelete,
}: ConversationSidebarProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversationToRename, setConversationToRename] =
    useState<RagConversation | null>(null);
  const [conversationToDelete, setConversationToDelete] =
    useState<RagConversation | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const groupedConversations = useMemo(
    () => groupConversations(conversations),
    [conversations],
  );

  const openRenameDialog = (conversation: RagConversation) => {
    setConversationToRename(conversation);
    setRenameValue(conversation.title || "New conversation");
  };

  const handleRename = () => {
    if (!conversationToRename) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    onRename(conversationToRename.session_id, trimmed);
    setConversationToRename(null);
    setRenameValue("");
  };

  return (
    <>
      <div className="fixed left-5 top-5 z-30 flex items-center justify-start gap-2">
        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-muted/50 text-foreground shadow-none hover:bg-muted"
                >
                  <MessageSquareIcon className="h-4 w-4" />
                  <span className="sr-only">Chat history</span>
                </Button>
              </SheetTrigger>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>Chat history</TooltipContent>
          </Tooltip>

          <SheetContent
            side="left"
            className="h-svh max-h-svh w-72 rounded-none p-0 [&>button]:hidden sm:w-80"
          >
            <div className="flex h-full min-h-svh flex-col bg-sidebar text-sidebar-foreground">
              <SheetHeader className="border-b border-sidebar-border px-4 py-4 text-left">
                <div className="flex items-center justify-between gap-2">
                  <SheetTitle className="text-sm font-semibold text-sidebar-foreground">
                    Chat history
                  </SheetTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    onClick={() => {
                      setHistoryOpen(false);
                      onNewChat();
                    }}
                  >
                    <PlusIcon />
                    <span className="sr-only">New chat</span>
                  </Button>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1">
                <div className="px-2 py-3">
                  {isLoading ? (
                    <div className="space-y-2 px-2">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-7 animate-pulse rounded-md bg-sidebar-accent/40"
                        />
                      ))}
                    </div>
                  ) : groupedConversations.length > 0 ? (
                    groupedConversations.map((group, index) => (
                      <div key={group.label} className="pb-4">
                        {index > 0 ? (
                          <Separator className="mb-3 bg-sidebar-border/70" />
                        ) : null}
                        <div className="px-2 pb-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                            {group.label}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          {group.conversations.map((conversation) => (
                            <ConversationRow
                              key={conversation.session_id}
                              conversation={conversation}
                              isActive={conversation.session_id === activeSessionId}
                              onSelect={() => {
                                setHistoryOpen(false);
                                onSelectConversation(conversation.session_id);
                              }}
                              onRename={openRenameDialog}
                              onDelete={setConversationToDelete}
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6">
                      <p className="text-sm text-sidebar-foreground/65">
                        No conversations yet.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Dialog
        open={!!conversationToRename}
        onOpenChange={(open) => {
          if (!open) {
            setConversationToRename(null);
            setRenameValue("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>
              Give this thread a clearer title so it is easier to find later.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleRename();
              }
            }}
            placeholder="Conversation title"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConversationToRename(null);
                setRenameValue("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!conversationToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setConversationToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the thread from the AI assistant history. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!conversationToDelete) return;
                onDelete(conversationToDelete.session_id);
                setConversationToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
