"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Circle,
  Copy,
  ExternalLink,
  GitBranch,
  Hash,
  PauseCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ds";
import { useConfirm } from "@/hooks/use-confirm";
import { appToast as toast } from "@/lib/toast/app-toast";

import type { DisplayStatus, FeedbackItem } from "../types";
import { toDisplayStatus } from "../helpers";

export function ListItemContextMenu({
  item,
  children,
  onUpdateStatus,
  onSendToGitHub,
  onDelete,
}: {
  item: FeedbackItem;
  children: React.ReactNode;
  onUpdateStatus: (id: string, status: DisplayStatus) => void;
  onSendToGitHub: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirm: confirmDelete, ConfirmDialog: ListItemConfirmDialog } = useConfirm();

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextPos({ x: e.clientX, y: e.clientY });
  }

  useEffect(() => {
    if (!contextPos) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextPos(null);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setContextPos(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextPos]);

  const displayStatus = toDisplayStatus(item.status);
  const isResolved = displayStatus === "resolved";

  async function handleAction(action: string) {
    setContextPos(null);
    switch (action) {
      case "resolve":
        onUpdateStatus(item.id, "resolved");
        break;
      case "reopen":
        onUpdateStatus(item.id, "open");
        break;
      case "send_to_github":
        onSendToGitHub(item.id);
        break;
      case "view_github":
        if (item.github_issue_url) {
          window.open(item.github_issue_url, "_blank", "noopener,noreferrer");
        }
        break;
      case "copy_link":
        navigator.clipboard.writeText(
          `${window.location.origin}/feedback-inbox?id=${item.id}`,
        );
        toast.success("Link copied to clipboard");
        break;
      case "copy_id":
        navigator.clipboard.writeText(item.id);
        toast.success("ID copied to clipboard");
        break;
      case "archive":
        onUpdateStatus(item.id, "archived");
        break;
      case "defer":
        onUpdateStatus(item.id, "deferred");
        break;
      case "delete": {
        const ok = await confirmDelete({
          description: "Delete this feedback item? This cannot be undone.",
          variant: "destructive",
          confirmLabel: "Delete",
        });
        if (ok) onDelete(item.id);
        break;
      }
    }
  }

  return (
    <>
      <div onContextMenu={handleContextMenu} className="contents">
        {children}
      </div>

      {contextPos && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-40 rounded-md border border-border bg-popover p-1 shadow-sm animate-in fade-in-0 zoom-in-95"
          style={{ top: contextPos.y, left: contextPos.x }}
        >
          {!isResolved && (
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              onClick={() => handleAction("resolve")}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Resolve
            </Button>
          )}

          {isResolved && (
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              onClick={() => handleAction("reopen")}
            >
              <Circle className="h-3.5 w-3.5" />
              Move to Submitted
            </Button>
          )}

          <div className="my-1 h-px bg-border" />

          {!item.github_issue_number && (
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              onClick={() => handleAction("send_to_github")}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Create Issue
            </Button>
          )}

          {item.github_issue_url && (
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              onClick={() => handleAction("view_github")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View in GitHub
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="default"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
            onClick={() => handleAction("copy_link")}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy link
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="default"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
            onClick={() => handleAction("copy_id")}
          >
            <Hash className="h-3.5 w-3.5" />
            Copy ID
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="default"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
            onClick={() => handleAction("defer")}
          >
            <PauseCircle className="h-3.5 w-3.5" />
            Defer
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="default"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
            onClick={() => handleAction("archive")}
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </Button>

          <div className="my-1 h-px bg-border" />

          <Button
            type="button"
            variant="ghost"
            size="default"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-status-error hover:bg-status-error/10 transition-colors"
            onClick={() => handleAction("delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      )}
      {ListItemConfirmDialog}
    </>
  );
}
