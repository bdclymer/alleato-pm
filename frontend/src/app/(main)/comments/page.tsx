"use client";

import * as React from "react";
import Link from "next/link";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import {
  ArrowUpRight,
  Inbox,
  Menu,
  MessageCircle,
  X,
} from "lucide-react";
import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";
import type { AllCommentItem } from "@/app/api/comments/all/route";
import { EmptyState, ErrorState } from "@/components/ds";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidePanel, SidePanelContent } from "@/components/ui/side-panel";
import { ExpandableSearch } from "@/components/tables/unified/table-toolbar";
import { cn } from "@/lib/utils";
import {
  type CommentScope,
  documentLabel,
  filterComments,
  isResolved,
  relativeTimeLabel,
  scopeLabels,
  sortComments,
  statusLabel,
  timeLabel,
} from "./comments-page-utils";

export const dynamic = "force-dynamic";

function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "C"
  );
}

function commentDate(comment: AllCommentItem): Date {
  return new Date(comment.lastUpdated ?? Date.now());
}

function dateDividerLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function CommentsSidebar({
  comments,
  selectedComment,
  scope,
  scopeCounts,
  query,
  onQueryChange,
  onScopeChange,
  onSelect,
}: {
  comments: AllCommentItem[];
  selectedComment: AllCommentItem | null;
  scope: CommentScope;
  scopeCounts: Record<CommentScope, number>;
  query: string;
  onQueryChange: (value: string) => void;
  onScopeChange: (scope: CommentScope) => void;
  onSelect: (comment: AllCommentItem) => void;
}) {
  return (
    <div className="flex h-full w-72 shrink-0 flex-col overflow-hidden border-r border-border bg-muted/30">
      <div className="flex items-center gap-1 px-4 pb-3 pt-5">
        <p className="flex-1 text-sm font-semibold text-foreground">Comments</p>
        <ExpandableSearch
          value={query}
          onChange={onQueryChange}
          placeholder="Search comments"
          ariaLabel="Search comments"
        />
      </div>

      <div className="flex gap-1 px-4 pb-4">
        {(Object.keys(scopeLabels) as CommentScope[]).map((value) => (
          <Button
            key={value}
            type="button"
            variant={scope === value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onScopeChange(value)}
            className="h-8 flex-1 px-2 text-xs"
          >
            {scopeLabels[value]}
            <span className="ml-1 text-[11px] text-muted-foreground">
              {scopeCounts[value]}
            </span>
          </Button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="px-5 py-3 text-sm text-muted-foreground">
            No matching comments.
          </p>
        ) : (
          comments.map((comment) => {
            const selected = selectedComment?.annotationId === comment.annotationId;
            return (
              <Button
                key={comment.annotationId}
                type="button"
                variant="ghost"
                onClick={() => onSelect(comment)}
                className={cn(
                  "h-auto w-full justify-start gap-3 rounded-none px-5 py-3.5 text-left font-normal",
                  selected ? "bg-primary/5" : "hover:bg-muted/60",
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-muted text-[11px] font-semibold text-foreground">
                    {initials(comment.authorName)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="flex-1 truncate text-[15px] font-semibold leading-snug text-foreground">
                      {comment.authorName}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relativeTimeLabel(comment.lastUpdated)}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                    {comment.preview}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground/70">
                    {documentLabel(comment.documentId)}
                  </span>
                </span>
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
}

function CommentsHeader({
  selectedComment,
  total,
  onToggleSidebar,
  onToggleRightPanel,
}: {
  selectedComment: AllCommentItem | null;
  total: number;
  onToggleSidebar: () => void;
  onToggleRightPanel: () => void;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-3 bg-background px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="text-muted-foreground hover:text-foreground lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            Comments
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {selectedComment
              ? documentLabel(selectedComment.documentId)
              : `${total} comments across Alleato`}
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleRightPanel}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Comment details"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    </div>
  );
}

function CommentsTimeline({
  comments,
  selectedComment,
  onSelect,
}: {
  comments: AllCommentItem[];
  selectedComment: AllCommentItem | null;
  onSelect: (comment: AllCommentItem) => void;
}) {
  if (comments.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="No matching comments"
          description="Clear search or switch filters."
        />
      </div>
    );
  }

  let currentDate: Date | null = null;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 px-3 pb-8 pt-2">
        {comments.map((comment) => {
          const date = commentDate(comment);
          const showDate = !currentDate || !isSameDay(currentDate, date);
          currentDate = date;

          return (
            <div key={comment.annotationId}>
              {showDate ? (
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {dateDividerLabel(date)}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              ) : null}

              <article
                className={cn(
                  "group relative rounded-lg px-4 py-3 transition-colors hover:bg-muted/50",
                  selectedComment?.annotationId === comment.annotationId && "bg-muted/70",
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onSelect(comment)}
                  className="h-auto w-full justify-start gap-3 p-0 text-left font-normal hover:bg-transparent"
                >
                  <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-muted text-[11px] font-semibold text-foreground">
                      {initials(comment.authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {comment.authorName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(date, "h:mm a")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {documentLabel(comment.documentId)}
                      </span>
                    </span>
                    <span className="mt-1 block max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {comment.preview}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{statusLabel(comment)}</span>
                      {comment.replyCount > 0 ? (
                        <span>
                          {comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Button>
              </article>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function CommentsRightPanel({
  selectedComment,
  onClose,
}: {
  selectedComment: AllCommentItem | null;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">Comment</p>
          <p className="truncate text-xs text-muted-foreground">
            {selectedComment ? documentLabel(selectedComment.documentId) : "No comment selected"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          {selectedComment ? (
            <>
              <article className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7 border border-border">
                    <AvatarFallback className="text-[11px] font-semibold">
                      {initials(selectedComment.authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {selectedComment.authorName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {timeLabel(selectedComment.lastUpdated) || "Unknown"}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {selectedComment.preview}
                </p>
              </article>

              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Status</p>
                  <p>{statusLabel(selectedComment)}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Replies</p>
                  <p>{selectedComment.replyCount}</p>
                </div>
              </div>

              {selectedComment.documentId.startsWith("/") ? (
                <Button asChild className="w-full">
                  <Link href={selectedComment.documentId}>
                    Open source
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This comment is missing a page route.
                </p>
              )}
            </>
          ) : (
            <div className="mt-10 px-4 text-center">
              <p className="text-sm text-muted-foreground">
                Select a comment to open its details.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function CommentsPage() {
  const [scope, setScope] = React.useState<CommentScope>("active");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [rightPanelOpen, setRightPanelOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  const { data, error, isLoading } = useSWR<{ comments: AllCommentItem[] }>(
    "/api/comments/all",
    (url: string) => apiFetch<{ comments: AllCommentItem[] }>(url),
  );

  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1280;
      setIsMobile(mobile);
      if (mobile) setRightPanelOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const comments = React.useMemo(() => {
    const rows = data?.comments ?? [];
    return [...rows].sort(sortComments);
  }, [data]);

  const filteredComments = React.useMemo(() => {
    return filterComments(comments, scope, query);
  }, [comments, query, scope]);

  React.useEffect(() => {
    if (
      selectedId &&
      !filteredComments.some((comment) => comment.annotationId === selectedId)
    ) {
      setSelectedId(null);
    }
  }, [filteredComments, selectedId]);

  const selectedComment =
    filteredComments.find((comment) => comment.annotationId === selectedId) ?? null;

  const total = comments.length;
  const activeCount = comments.filter((comment) => !isResolved(comment)).length;
  const resolvedCount = total - activeCount;

  const scopeCounts: Record<CommentScope, number> = {
    active: activeCount,
    resolved: resolvedCount,
    all: total,
  };

  const handleSelect = (comment: AllCommentItem) => {
    setSelectedId(comment.annotationId);
    setRightPanelOpen(true);
    setSidebarOpen(false);
  };

  if (isLoading) {
    return <div className="h-svh w-full bg-background" />;
  }

  if (error) {
    return (
      <div className="flex h-svh w-full items-center justify-center bg-background p-6">
        <ErrorState
          title="Couldn't load comments"
          description="The comments service did not respond. Try again in a moment."
        />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex h-svh w-full items-center justify-center bg-background p-6">
        <EmptyState
          icon={<MessageCircle className="h-6 w-6" />}
          title="No comments yet"
          description="Comments left from page headers will collect here."
        />
      </div>
    );
  }

  return (
    <div className="flex h-svh min-h-0 overflow-hidden bg-background text-foreground">
      <div className="hidden lg:block">
        <CommentsSidebar
          comments={filteredComments}
          selectedComment={selectedComment}
          scope={scope}
          scopeCounts={scopeCounts}
          query={query}
          onQueryChange={setQuery}
          onScopeChange={setScope}
          onSelect={handleSelect}
        />
      </div>

      <SidePanel open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SidePanelContent side="left" size="xs">
          <CommentsSidebar
            comments={filteredComments}
            selectedComment={selectedComment}
            scope={scope}
            scopeCounts={scopeCounts}
            query={query}
            onQueryChange={setQuery}
            onScopeChange={setScope}
            onSelect={handleSelect}
          />
        </SidePanelContent>
      </SidePanel>

      <div className="flex min-w-0 flex-1 flex-col">
        <CommentsHeader
          selectedComment={selectedComment}
          total={total}
          onToggleSidebar={() => setSidebarOpen(true)}
          onToggleRightPanel={() => setRightPanelOpen((open) => !open)}
        />

        <div className="min-h-0 flex-1 overflow-hidden">
          <CommentsTimeline
            comments={filteredComments}
            selectedComment={selectedComment}
            onSelect={handleSelect}
          />
        </div>
      </div>

      <div
        className={cn(
          "hidden border-l border-border transition-all duration-150 xl:block",
          rightPanelOpen ? "w-96" : "w-0",
        )}
      >
        {rightPanelOpen ? (
          <CommentsRightPanel
            selectedComment={selectedComment}
            onClose={() => setRightPanelOpen(false)}
          />
        ) : null}
      </div>

      <SidePanel open={Boolean(rightPanelOpen && isMobile)} onOpenChange={setRightPanelOpen}>
        <SidePanelContent side="right" size="compact">
          <CommentsRightPanel
            selectedComment={selectedComment}
            onClose={() => setRightPanelOpen(false)}
          />
        </SidePanelContent>
      </SidePanel>
    </div>
  );
}
