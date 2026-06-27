"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  PinIcon,
} from "lucide-react";
import type { RagConversation } from "@/hooks/use-rag-conversations";

interface ConversationSidebarProps {
  conversations: RagConversation[];
  activeSessionId: string | null;
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConversation: (sessionId: string) => void;
  onNewChat: () => void;
  onRename: (sessionId: string, title: string) => void;
  onDelete: (sessionId: string) => void;
  onTogglePin: (sessionId: string, isPinned: boolean) => void;
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
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  if (isSameLocalDay(date, today)) return "Today";
  if (isSameLocalDay(date, yesterday)) return "Yesterday";
  if (date > sevenDaysAgo) return "Previous 7 days";
  if (date > thirtyDaysAgo) return "Previous 30 days";
  return "Older";
}

function groupConversations(
  conversations: RagConversation[],
): ConversationGroup[] {
  const pinned = conversations.filter((conversation) => conversation.is_pinned);

  const ORDER = ["Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"];
  const groups = new Map<string, RagConversation[]>();

  conversations
    .filter((conversation) => !conversation.is_pinned)
    .forEach((conversation) => {
      const label = getConversationGroupLabel(
        conversation.last_message_at || conversation.created_at,
      );
      const existing = groups.get(label) ?? [];
      existing.push(conversation);
      groups.set(label, existing);
    });

  const dateGroups = ORDER.map((label) => ({
    label,
    conversations: groups.get(label) ?? [],
  })).filter((group) => group.conversations.length > 0);

  return pinned.length > 0
    ? [{ label: "Pinned", conversations: pinned }, ...dateGroups]
    : dateGroups;
}

function ConversationRow({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
  onTogglePin,
}: {
  conversation: RagConversation;
  isActive: boolean;
  onSelect: () => void;
  onRename: (conversation: RagConversation) => void;
  onDelete: (conversation: RagConversation) => void;
  onTogglePin: (conversation: RagConversation) => void;
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
        "group relative flex cursor-pointer items-center overflow-hidden rounded-lg px-2 py-[5px] text-left transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <span className="min-w-0 flex-1 truncate text-[13px] leading-5">
        {conversation.title || "New conversation"}
      </span>

      {/* Absolute-positioned hover actions — overlays end of text, matching ChatGPT pattern.
          Pinned rows keep the actions visible so the pin state is obvious and reversible. */}
      <div
        className={cn(
          "absolute right-0 flex items-center transition-opacity group-hover:opacity-100",
          conversation.is_pinned ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Gradient fade so text doesn't hard-clip under buttons */}
        <div
          className={cn(
            "pointer-events-none absolute right-full h-full w-8",
            isActive
              ? "bg-gradient-to-r from-transparent to-sidebar-accent"
              : "bg-gradient-to-r from-transparent to-sidebar-accent/50",
          )}
        />
        <div className={cn(
          "flex items-center pr-1",
          isActive ? "bg-sidebar-accent" : "bg-sidebar-accent/50",
        )}>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn(
              "h-6 w-6 rounded-md hover:bg-transparent",
              conversation.is_pinned
                ? "text-primary hover:text-primary"
                : "text-sidebar-foreground/50 hover:text-sidebar-foreground",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(conversation);
            }}
            title={conversation.is_pinned ? "Unpin conversation" : "Pin conversation"}
          >
            <PinIcon
              className={cn("h-3.5 w-3.5", conversation.is_pinned && "fill-current")}
            />
            <span className="sr-only">
              {conversation.is_pinned ? "Unpin conversation" : "Pin conversation"}
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6 rounded-md text-sidebar-foreground/50 hover:bg-transparent hover:text-sidebar-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontalIcon className="h-3.5 w-3.5" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(conversation);
                }}
              >
                <PencilIcon className="h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conversation);
                }}
              >
                <Trash2Icon className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export function ConversationSidebar({
  conversations,
  activeSessionId,
  isLoading,
  open,
  onOpenChange,
  onSelectConversation,
  onNewChat,
  onRename,
  onDelete,
  onTogglePin,
}: ConversationSidebarProps) {
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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="h-dvh max-h-dvh w-72 overflow-hidden rounded-none p-0 [&>button]:hidden sm:w-80"
        >
          <div className="flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
            <SheetHeader className="px-4 pt-4 pb-2 text-left">
              <div className="flex items-center justify-between gap-2">
                <SheetTitle className="text-sm font-semibold text-sidebar-foreground">
                  Chat history
                </SheetTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  onClick={() => {
                    onOpenChange(false);
                    onNewChat();
                  }}
                  title="New chat"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span className="sr-only">New chat</span>
                </Button>
              </div>
            </SheetHeader>

            {/* Native scroll container — NOT Radix ScrollArea. Its viewport wraps
                content in a `display:table` div that shrink-to-fits to the widest
                row, which breaks `truncate` and lets long titles run off the panel. */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="px-2 pb-4">
                {isLoading ? (
                  <div className="space-y-0.5 px-2 pt-1">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-7 animate-pulse rounded-lg bg-sidebar-accent/40"
                      />
                    ))}
                  </div>
                ) : groupedConversations.length > 0 ? (
                  groupedConversations.map((group) => (
                    <div key={group.label} className="pt-4">
                      <p className="px-2 pb-1 text-[11px] font-semibold text-sidebar-foreground/40">
                        {group.label}
                      </p>
                      <div>
                        {group.conversations.map((conversation) => (
                          <ConversationRow
                            key={conversation.session_id}
                            conversation={conversation}
                            isActive={conversation.session_id === activeSessionId}
                            onSelect={() => {
                              onOpenChange(false);
                              onSelectConversation(conversation.session_id);
                            }}
                            onRename={openRenameDialog}
                            onDelete={setConversationToDelete}
                            onTogglePin={(conversation) =>
                              onTogglePin(
                                conversation.session_id,
                                !conversation.is_pinned,
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-6">
                    <p className="text-sm text-sidebar-foreground/50">
                      No conversations yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Modal
        open={!!conversationToRename}
        onOpenChange={(open) => {
          if (!open) {
            setConversationToRename(null);
            setRenameValue("");
          }
        }}
      >
        <ModalContent size="sm">
          <ModalHeader>
            <ModalTitle>Rename conversation</ModalTitle>
            <ModalDescription>
              Give this thread a clearer title so it is easier to find later.
            </ModalDescription>
          </ModalHeader>
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
          <ModalFooter>
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
          </ModalFooter>
        </ModalContent>
      </Modal>

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
