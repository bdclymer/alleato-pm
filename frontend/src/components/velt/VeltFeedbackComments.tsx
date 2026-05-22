"use client";

import { useEffect } from "react";
import {
  VeltComments,
  VeltCommentsSidebar,
  VeltCommentTool,
  VeltSidebarButton,
  useSetDocument,
} from "@veltdev/react";

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
  showSidebar = true,
}: {
  documentId: string;
  documentName?: string;
  showSidebar?: boolean;
}) {
  useSetDocument(documentId, { documentName: documentName ?? documentId });

  return (
    <>
      {/* Enables click-to-pin commenting on the whole page */}
      <VeltComments shadowDom={false} />

      {/* Sidebar panel listing all threads */}
      {showSidebar && (
        <VeltCommentsSidebar groupConfig={{ enable: false }} />
      )}
    </>
  );
}

/**
 * Toolbar button pair: comment tool (pencil-pin trigger) + sidebar toggle.
 * Drop this into a page header's action area.
 */
export function VeltCommentToolbar() {
  return (
    <div className="flex items-center gap-1">
      <VeltCommentTool />
      <VeltSidebarButton />
    </div>
  );
}
