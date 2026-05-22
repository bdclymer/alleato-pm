"use client";
import {
  VeltCommentTool,
  VeltRecorderTool,
  VeltSidebarButton,
  useSetDocument,
} from "@veltdev/react";
import { MessageSquare, MessageSquarePlus, Video } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Adds Velt freestyle comments to any page.
 * Call with a documentId that scopes the comments to the current entity.
 *
 * Example:
 *   <VeltFeedbackComments documentId="feedback-inbox" />
 *   <VeltFeedbackComments documentId={`feedback-item-${itemId}`} />
 */
export function VeltFeedbackComments({
  documentId,
  documentName,
}: {
  documentId: string;
  documentName?: string;
  showSidebar?: boolean;
}) {
  useSetDocument(documentId, { documentName: documentName ?? documentId });

  return null;
}

/**
 * Toolbar button pair: comment tool (pencil-pin trigger) + sidebar toggle.
 * Drop this into a page header's action area.
 */
export function VeltCommentToolbar() {
  return (
    <div className="flex items-center gap-1">
      <VeltCommentTool
        sourceId="feedback-inbox-toolbar"
        targetElementId="app-main-content"
        shadowDom={false}
      >
        <span
          aria-label="Comment mode"
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <MessageSquarePlus className="h-4 w-4" />
        </span>
      </VeltCommentTool>
      <VeltRecorderTool
        type="all"
        buttonLabel="Record comment"
        shadowDom={false}
        recordingCountdown
        maxLength={120}
      >
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Record comment">
          <Video className="h-4 w-4" />
        </Button>
      </VeltRecorderTool>
      <VeltSidebarButton shadowDom={false}>
        <span
          aria-label="Comments"
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <MessageSquare className="h-4 w-4" />
        </span>
      </VeltSidebarButton>
    </div>
  );
}
