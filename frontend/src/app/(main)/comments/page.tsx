"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";
import type { AllCommentItem } from "@/app/api/comments/all/route";
import { EmptyState, ErrorState } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { ExpandableSearch } from "@/components/tables/unified/table-toolbar";
import { Button } from "@/components/ui/button";
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

export default function CommentsPage() {
  const [scope, setScope] = React.useState<CommentScope>("active");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const { data, error, isLoading } = useSWR<{ comments: AllCommentItem[] }>(
    "/api/comments/all",
    (url: string) => apiFetch<{ comments: AllCommentItem[] }>(url),
  );

  const comments = React.useMemo(() => {
    const comments = data?.comments ?? [];
    return [...comments].sort(sortComments);
  }, [data]);

  const filteredComments = React.useMemo(() => {
    return filterComments(comments, scope, query);
  }, [comments, query, scope]);

  React.useEffect(() => {
    if (!filteredComments.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !filteredComments.some((comment) => comment.annotationId === selectedId)) {
      setSelectedId(filteredComments[0].annotationId);
    }
  }, [filteredComments, selectedId]);

  const selectedComment =
    filteredComments.find((comment) => comment.annotationId === selectedId) ??
    filteredComments[0] ??
    null;

  const total = comments.length;
  const activeCount = comments.filter((comment) => !isResolved(comment)).length;
  const resolvedCount = total - activeCount;

  const scopeCounts: Record<CommentScope, number> = {
    active: activeCount,
    resolved: resolvedCount,
    all: total,
  };

  return (
    <PageShell variant="detailWide" title="Comments">
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-10 rounded-md bg-muted" />
          <div className="h-16 rounded-md bg-muted/70" />
          <div className="h-16 rounded-md bg-muted/60" />
          <div className="h-16 rounded-md bg-muted/50" />
        </div>
      ) : error ? (
        <ErrorState
          title="Couldn't load comments"
          description="The comments service did not respond. Try again in a moment."
        />
      ) : total === 0 ? (
        <EmptyState
          icon={<MessageCircle className="h-6 w-6" />}
          title="No comments yet"
          description="Comments left from page headers will collect here."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <ExpandableSearch
              value={query}
              onChange={setQuery}
              placeholder="Search comments"
              ariaLabel="Search comments"
            />

            <div className="flex items-center gap-1 overflow-x-auto">
              {(Object.keys(scopeLabels) as CommentScope[]).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={scope === value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setScope(value)}
                  className="shrink-0"
                >
                  {scopeLabels[value]}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {scopeCounts[value]}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section aria-label="Comment inbox" className="min-w-0">
              {filteredComments.length === 0 ? (
                <div className="border-t border-border/60 py-12">
                  <EmptyState
                    icon={<MessageCircle className="h-6 w-6" />}
                    title="No matching comments"
                    description="Clear search or switch filters."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-border/60 border-t border-border/60">
                  {filteredComments.map((comment) => {
                    const selected = selectedComment?.annotationId === comment.annotationId;
                    const navigable = comment.documentId.startsWith("/");
                    const resolved = isResolved(comment);
                    return (
                      <li key={comment.annotationId}>
                        <div
                          className={cn(
                            "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-3 px-2 py-3 text-left transition-colors hover:bg-muted/50 sm:px-3",
                            selected && "bg-muted/70",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-1 h-2 w-2 rounded-full",
                              resolved ? "bg-muted-foreground/30" : "bg-primary",
                            )}
                            aria-hidden="true"
                          />
                          <Button
                            onClick={() => setSelectedId(comment.annotationId)}
                            variant="ghost"
                            className="h-auto min-w-0 justify-start rounded-none p-0 text-left hover:bg-transparent"
                            aria-label={`Select comment from ${comment.authorName} on ${documentLabel(comment.documentId)}`}
                          >
                            <span className="min-w-0 flex-1 space-y-1">
                              <span className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                                <span className="truncate text-sm font-medium text-foreground">
                                  {comment.authorName}
                                </span>
                                <span className="shrink-0 text-xs font-normal text-muted-foreground">
                                  {relativeTimeLabel(comment.lastUpdated)}
                                </span>
                              </span>
                              <span className="line-clamp-2 whitespace-normal text-sm font-normal leading-normal text-muted-foreground">
                                {comment.preview}
                              </span>
                              <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal text-muted-foreground">
                                <span className="truncate">{documentLabel(comment.documentId)}</span>
                                <span>{statusLabel(comment)}</span>
                                {comment.replyCount > 0 ? (
                                  <span>
                                    {comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}
                                  </span>
                                ) : null}
                              </span>
                            </span>
                          </Button>
                          {navigable ? (
                            <Link
                              href={comment.documentId}
                              className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              aria-label={`Open ${documentLabel(comment.documentId)}`}
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          ) : (
                            <span className="h-8 w-8" aria-hidden="true" />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start" aria-label="Selected comment">
              {selectedComment ? (
                <div className="space-y-4 rounded-lg bg-card p-4 shadow-xs">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Selected comment
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {documentLabel(selectedComment.documentId)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {statusLabel(selectedComment)} / {relativeTimeLabel(selectedComment.lastUpdated)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {selectedComment.authorName}
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {selectedComment.preview}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">Replies</p>
                      <p>{selectedComment.replyCount}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Updated</p>
                      <p>{timeLabel(selectedComment.lastUpdated) || "Unknown"}</p>
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
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      )}
    </PageShell>
  );
}
