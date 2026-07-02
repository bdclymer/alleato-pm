"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CircleDot,
  Github,
  Link2,
  Tag,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ds";
import { SectionRuleHeading } from "@/components/layout/spacing";
import {
  DetailPropertyBar,
  DetailPropertyItem,
} from "@/components/ui/detail-property-bar";
import { useConfirm } from "@/hooks/use-confirm";
import { displayAdminFeedbackTitle } from "@/lib/admin-feedback/title";
import { appToast as toast } from "@/lib/toast/app-toast";
import { cn } from "@/lib/utils";

import { STATUS_OPTIONS, REQUEST_TYPE_LABELS } from "../constants";
import {
  submitterLabel,
  toDisplayStatus,
  toolLabelFromPath,
} from "../helpers";
import type { DisplayStatus, FeedbackItem } from "../types";

import { CollapsibleDetailSection } from "./collapsible-detail-section";
import { CommentsSection } from "./comments-section";
import { FeedbackResourcesSection } from "./feedback-resources-section";
import { GitHubActivitySection } from "./github-activity-section";
import { ToolContextSection } from "./tool-context-section";

export function FeedbackDetail({
  item,
  updatingId,
  sendingToGitHub,
  deletingId,
  onUpdateStatus,
  onSendToGitHub,
  onDelete,
  onRefresh,
  onBack,
  commentInputRef,
}: {
  item: FeedbackItem;
  updatingId: string | null;
  sendingToGitHub: boolean;
  deletingId: string | null;
  onUpdateStatus: (id: string, status: DisplayStatus) => void;
  onSendToGitHub: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onBack?: () => void;
  commentInputRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const displayStatus = toDisplayStatus(item.status);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { confirm: confirmDetailDelete, ConfirmDialog: DetailConfirmDialog } =
    useConfirm();
  const displayTitle = displayAdminFeedbackTitle({
    storedTitle: item.title,
    requestType: item.request_type,
    comment: item.comment,
    targetText: item.target_text,
    pageTitle: item.page_title,
  });
  const toolLabel = toolLabelFromPath(item.page_path);

  useEffect(() => {
    if (!lightboxImage) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxImage(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxImage]);

  return (
    <>
      {DetailConfirmDialog}
      <div className="mx-auto w-full max-w-2xl space-y-8 px-5 py-8 sm:px-6 lg:px-8 xl:px-10">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-2 gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}

        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold leading-snug text-foreground">
                {displayTitle}
              </h2>
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>

          <DetailPropertyBar className="mt-6 mb-0 gap-x-4 gap-y-2 overflow-hidden pb-0 sm:flex-nowrap">
            <DetailPropertyItem
              icon={CircleDot}
              className="shrink-0"
              contentClassName="overflow-visible"
            >
              <Select
                value={displayStatus}
                onValueChange={(value) =>
                  onUpdateStatus(item.id, value as DisplayStatus)
                }
                disabled={updatingId === item.id}
              >
                <SelectTrigger
                  aria-label="Feedback status"
                  size="sm"
                  className={cn(
                    "h-auto w-auto min-w-0 gap-1 border-0 bg-transparent p-0 text-xs font-medium text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground focus-visible:ring-1",
                    displayStatus === "resolved" &&
                      "text-muted-foreground hover:text-foreground",
                    (displayStatus === "in_progress" || displayStatus === "pr_created") &&
                      "text-muted-foreground hover:text-foreground",
                    displayStatus === "deferred" &&
                      "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DetailPropertyItem>

            {item.github_issue_url && (
              <DetailPropertyItem
                icon={Github}
                href={item.github_issue_url}
                external
                className="shrink-0"
              >
                #{item.github_issue_number}
              </DetailPropertyItem>
            )}

            {item.severity && (
              <DetailPropertyItem icon={AlertCircle} className="shrink-0">
                {item.severity.charAt(0).toUpperCase() +
                  item.severity.slice(1)}{" "}
                priority
              </DetailPropertyItem>
            )}

            <DetailPropertyItem icon={Tag} className="shrink-0">
              {REQUEST_TYPE_LABELS[item.request_type] ?? item.request_type}
            </DetailPropertyItem>

            <DetailPropertyItem
              icon={Link2}
              href={item.page_url}
              external
              className="min-w-32 flex-1"
              title={item.page_url}
            >
              Open submitted page
            </DetailPropertyItem>

            <DetailPropertyItem
              icon={User}
              className="min-w-0 max-w-40 shrink"
              title={submitterLabel(item)}
            >
              {submitterLabel(item)}
            </DetailPropertyItem>

            {!item.github_issue_number && (
              <DetailPropertyItem
                icon={Github}
                onClick={() => onSendToGitHub(item.id)}
                disabled={sendingToGitHub}
                className="shrink-0"
                aria-label="Create GitHub issue"
              >
                {sendingToGitHub ? "Creating" : "Issue"}
              </DetailPropertyItem>
            )}
          </DetailPropertyBar>
        </div>

        {/* Description */}
        <div className="space-y-8">
          <div className="space-y-1.5 text-sm">
            <div className="min-w-0 text-muted-foreground">
              <a
                href={item.page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block min-w-0 truncate text-foreground hover:text-primary hover:underline"
              >
                {item.page_url}
              </a>
            </div>
            {item.target_text ? (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {item.target_text}
              </p>
            ) : null}
          </div>

          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {item.comment}
          </p>

          {item.screenshot_url && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLightboxImage(item.screenshot_url)}
              className="group block h-auto w-full overflow-hidden rounded-lg p-0 text-left transition-colors hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Open feedback screenshot"
            >
              <img
                src={item.screenshot_url}
                alt="Feedback screenshot"
                className="h-64 w-full object-cover object-top transition-opacity group-hover:opacity-95"
              />
            </Button>
          )}
        </div>

        <FeedbackResourcesSection
          item={item}
          onResourcesChanged={onRefresh}
        />

        {/* Comments */}
        <div>
          <CommentsSection
            feedbackItemId={item.id}
            commentInputRef={commentInputRef}
          />
        </div>

        {/* GitHub Activity — visible when there's an issue, not hidden in accordion */}
        {item.github_issue_number && (
          <section className="space-y-3">
            <SectionRuleHeading
              label={`GitHub Activity #${item.github_issue_number}`}
              className="mb-0 pb-0"
            />
            <GitHubActivitySection issueNumber={item.github_issue_number} />
          </section>
        )}

        {/* Debug — tool context, page context, metadata, dangerous actions */}
        <CollapsibleDetailSection key={`${item.id}-debug`} label="Debug">
          <div className="space-y-8">
            {/* Tool Context */}
            <section className="space-y-3">
              <SectionRuleHeading label="Tool Context" className="mb-0 pb-0" />
              <ToolContextSection item={item} />
            </section>

            <section className="space-y-3">
              <SectionRuleHeading label="Page Context" className="mb-0 pb-0" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 text-muted-foreground">ID</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-auto rounded px-0 py-0 text-xs font-normal text-foreground transition-colors hover:bg-transparent hover:text-muted-foreground"
                    onClick={() => {
                      navigator.clipboard.writeText(item.id);
                      toast.success("ID copied to clipboard");
                    }}
                    title={`Copy full ID: ${item.id}`}
                  >
                    <code className="font-mono text-xs">{item.id}</code>
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 text-muted-foreground">Page</span>
                  <a
                    href={item.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate font-mono text-xs text-foreground hover:underline"
                  >
                    {item.page_path}
                  </a>
                </div>
                {item.page_title && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0 text-muted-foreground">Title</span>
                    <span className="text-foreground">{item.page_title}</span>
                  </div>
                )}
                {item.target_text && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0 text-muted-foreground">Element</span>
                    <span className="truncate text-foreground">{item.target_text}</span>
                  </div>
                )}
                {item.target_selector && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0 text-muted-foreground">Selector</span>
                    <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                      {item.target_selector}
                    </code>
                  </div>
                )}
                {item.project_id && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0 text-muted-foreground">Project</span>
                    <span className="text-foreground">#{item.project_id}</span>
                  </div>
                )}
              </div>
            </section>

            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <section className="space-y-3">
                <SectionRuleHeading label="Source Metadata" className="mb-0 pb-0" />
                <div className="space-y-1.5">
                  {Object.entries(item.metadata as Record<string, unknown>).map(
                    ([key, value]) => {
                      const label = key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (c) => c.toUpperCase())
                        .trim();
                      const displayValue =
                        value === null || value === undefined
                          ? "—"
                          : typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value);
                      return (
                        <div key={key} className="flex items-start gap-2 text-xs">
                          <span className="w-28 shrink-0 text-muted-foreground">
                            {label}
                          </span>
                          <span className="break-all text-foreground">
                            {displayValue}
                          </span>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <SectionRuleHeading label="Danger Zone" className="mb-0 pb-0" />
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button
                  size="xs"
                  variant="ghost"
                  className="shrink-0 gap-1.5 text-xs text-muted-foreground hover:bg-status-error/10 hover:text-status-error"
                  onClick={async () => {
                    const ok = await confirmDetailDelete({
                      description: "Delete this feedback item? This cannot be undone.",
                      variant: "destructive",
                      confirmLabel: "Delete",
                    });
                    if (ok) onDelete(item.id);
                  }}
                  disabled={deletingId === item.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete item
                </Button>
              </div>
            </section>
          </div>
        </CollapsibleDetailSection>
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setLightboxImage(null);
            }
          }}
        >
          <img
            src={lightboxImage}
            alt="Feedback screenshot enlarged"
            className="max-h-full max-w-full object-contain"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setLightboxImage(null)}
            className="absolute right-4 top-4 bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label="Close screenshot"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
