"use client";

import * as React from "react";
import { AlertCircle, MessageSquarePlus, Reply } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCollaborationComments } from "@/hooks/use-collaboration-comments";
import { useCollaborationEntityContext } from "./entity-context";
import { cn } from "@/lib/utils";

interface EntityCommentsProps {
  title?: string;
  className?: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getAvatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 62%, 46%)`;
}

function formatTimestamp(timestamp: string) {
  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) return "Now";
  return value.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EntityComments({ title = "Comments", className }: EntityCommentsProps) {
  const entity = useCollaborationEntityContext();
  if (!entity) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <AlertCircle className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Comments unavailable for this page.</p>
      </div>
    );
  }

  return <EntityCommentsInner title={title} className={className} entity={entity} />;
}

function EntityCommentsInner({
  title,
  className,
  entity,
}: {
  title: string;
  className?: string;
  entity: NonNullable<ReturnType<typeof useCollaborationEntityContext>>;
}) {
  const [newComment, setNewComment] = React.useState("");
  const [replyTarget, setReplyTarget] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { comments, isLoading, error, createComment } = useCollaborationComments({
    entityType: entity.entityType,
    entityId: entity.entityId,
    projectId: entity.projectId,
  });

  const rootComments = comments.filter((comment) => !comment.parentCommentId);
  const childrenByParent = comments.reduce<Record<string, typeof comments>>((acc, comment) => {
    if (!comment.parentCommentId) return acc;
    if (!acc[comment.parentCommentId]) {
      acc[comment.parentCommentId] = [];
    }
    acc[comment.parentCommentId].push(comment);
    return acc;
  }, {});

  const submitComment = async () => {
    const body = newComment.trim();
    if (!body) return;

    setIsSubmitting(true);
    try {
      await createComment({
        body,
        parentCommentId: replyTarget,
      });
      setNewComment("");
      setReplyTarget(null);
    } catch (submitError) {
      console.error("[EntityComments] Failed to create comment", submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("space-y-5", className)}>
      {title ? (
        <div className="mb-2 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <MessageSquarePlus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">Supabase realtime discussion</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : rootComments.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center">
          <p className="text-sm font-medium text-foreground">No comments yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Start the discussion below.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rootComments.map((comment) => {
            const replies = childrenByParent[comment.id] ?? [];
            const avatarColor = getAvatarColor(comment.authorId);
            return (
              <article key={comment.id} className="rounded-md border border-border/60 p-3">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {getInitials(comment.authorName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {comment.authorName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{comment.body}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setReplyTarget(comment.id)}
                    >
                      <Reply className="mr-1 h-3 w-3" /> Reply
                    </Button>
                  </div>
                </div>

                {replies.length > 0 ? (
                  <div className="mt-3 space-y-2 border-l border-border pl-4">
                    {replies.map((reply) => (
                      <div key={reply.id} className="rounded-md bg-muted/30 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">{reply.authorName}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatTimestamp(reply.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{reply.body}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <div className="space-y-2 rounded-md border border-border p-3">
        {replyTarget ? (
          <div className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
            <span>Replying to a comment</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setReplyTarget(null)}
            >
              Cancel
            </Button>
          </div>
        ) : null}
        <Textarea
          value={newComment}
          onChange={(event) => setNewComment(event.target.value)}
          placeholder="Write a comment..."
          className="min-h-20"
        />
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={submitComment} disabled={isSubmitting || !newComment.trim()}>
            {isSubmitting ? "Posting..." : replyTarget ? "Post Reply" : "Post Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { EntityRoom } from "./entity-room";
