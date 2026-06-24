"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";
import type { AllCommentItem } from "@/app/api/comments/all/route";
import { EmptyState, ErrorState } from "@/components/ds";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Turn a Velt documentId (which we set to the route pathname) into a readable label. */
function documentLabel(documentId: string): string {
  if (!documentId || documentId === "/") return "Home";
  return documentId.replace(/^\//, "").replace(/\//g, " › ");
}

function timeLabel(ms: number | null): string {
  if (!ms) return "";
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CommentsPage() {
  const { data, error, isLoading } = useSWR<{ comments: AllCommentItem[] }>(
    "/api/comments/all",
    (url: string) => apiFetch<{ comments: AllCommentItem[] }>(url),
  );

  const groups = React.useMemo(() => {
    const comments = data?.comments ?? [];
    const byDocument = new Map<string, AllCommentItem[]>();
    for (const comment of comments) {
      const list = byDocument.get(comment.documentId) ?? [];
      list.push(comment);
      byDocument.set(comment.documentId, list);
    }
    return Array.from(byDocument.entries())
      .map(([documentId, annotations]) => ({
        documentId,
        label: documentLabel(documentId),
        annotations: annotations.sort(
          (a, b) => (b.lastUpdated ?? 0) - (a.lastUpdated ?? 0),
        ),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  const total = data?.comments?.length ?? 0;

  return (
    <PageShell variant="content" title="Comments">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : error ? (
        <ErrorState
          title="Couldn't load comments"
          description="The comments service didn't respond. Try again in a moment."
        />
      ) : total === 0 ? (
        <EmptyState
          icon={<MessageCircle className="h-6 w-6" />}
          title="No comments yet"
          description="Use the comment button in the header on any page to leave a comment. They'll all collect here."
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.documentId || "ungrouped"}>
              <SectionRuleHeading label={group.label} />
              <ul className="mt-3 space-y-1">
                {group.annotations.map((annotation) => {
                  const navigable = annotation.documentId.startsWith("/");
                  const rowClass = cn(
                    "block w-full rounded-md px-3 py-2.5 text-left",
                    navigable && "transition-colors hover:bg-accent",
                  );
                  const body = (
                    <>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">
                          {annotation.authorName}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {timeLabel(annotation.lastUpdated)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {annotation.preview}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        {annotation.statusName ? (
                          <span>{annotation.statusName}</span>
                        ) : null}
                        {annotation.replyCount > 0 ? (
                          <span>
                            {annotation.replyCount}{" "}
                            {annotation.replyCount === 1 ? "reply" : "replies"}
                          </span>
                        ) : null}
                      </div>
                    </>
                  );
                  return (
                    <li key={annotation.annotationId}>
                      {navigable ? (
                        <Link href={annotation.documentId} className={rowClass}>
                          {body}
                        </Link>
                      ) : (
                        <div className={rowClass}>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
