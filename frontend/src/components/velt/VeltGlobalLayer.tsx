"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useCommentsVisibilityStore } from "@/lib/stores/comments-visibility-store";
import { observeMalformedVeltAnnotations } from "@/components/velt/annotation-sanitizer";
import {
  VeltComments,
  VeltCommentsSidebar,
  VeltRecorderControlPanel,
  VeltRecorderNotes,
  VeltRecorderPlayer,
  useCommentEventCallback,
  useRecorderAddHandler,
  useSetDocument,
  useVeltClient,
} from "@veltdev/react";

interface VeltCommentElement {
  enableAttachments?: () => void;
  enableScreenshot?: () => void;
  enableRecordingTranscription?: () => void;
  enableRecordingCountdown?: () => void;
  enablePersistentCommentMode?: () => void;
  enableCommentPinHighlighter?: () => void;
  enableEnterKeyToSubmit?: () => void;
  allowedElementQuerySelectors?: (selectors: string[]) => void;
  commentToNearestAllowedElement?: (enabled: boolean) => void;
  enableGhostComments?: () => void;
  enableGhostCommentsIndicator?: () => void;
}

// Overlay surfaces portal outside #app-main-content, so register them
// explicitly. Main-page comments stay anchored to the stable app container via
// VeltComments props below; binding directly to volatile table cells caused pins
// to drift when unified-table DOM re-rendered.
const COMMENTABLE_SELECTORS = [
  "[role='dialog']",
  "[role='alertdialog']",
];

function VeltCommentConfiguration() {
  const { client } = useVeltClient();

  useEffect(() => {
    if (!client) return;
    const commentElement = client.getCommentElement() as unknown as VeltCommentElement;
    commentElement.enableAttachments?.();
    commentElement.enableScreenshot?.();
    commentElement.enableRecordingTranscription?.();
    commentElement.enableRecordingCountdown?.();
    commentElement.enablePersistentCommentMode?.();
    commentElement.enableCommentPinHighlighter?.();
    // NOTE: enableSidebarButtonOnCommentDialog() intentionally removed — it
    // rendered the full-width "All comments" footer band that duplicated
    // all-comments access (still reachable via the global Comments button) and
    // ate ~half the dialog height (noise-gate rule #8).

    // No always-on formatting toolbar. It added a persistent 8-button row that
    // roughly doubled the composer height, and an audit of all 27 comments in
    // the system (Brandon + Megan included) found zero use of bold/italic/lists.
    // The composer collapses to a single growing input + send, matching Linear /
    // Notion and the noise-gate rule that unused controls are guilty until
    // proven useful. Links still auto-linkify; Shift+Enter still breaks lines.
    // (enableFormatOptions intentionally NOT called.)

    // Enter submits the comment; Shift+Enter inserts a newline (paragraph break),
    // matching every other text input in the app.
    commentElement.enableEnterKeyToSubmit?.();

    // Targeting: use the nearest allowed stable container, not ephemeral child
    // nodes like table cells. That preserves dialog commenting without letting
    // pins attach to DOM that gets replaced on table re-renders.
    commentElement.allowedElementQuerySelectors?.(COMMENTABLE_SELECTORS);
    commentElement.commentToNearestAllowedElement?.(true);

    // A pin dropped inside an overlay loses its anchor when the overlay closes.
    // Ghost comments keep it addressable (with a visible indicator) instead of
    // silently vanishing — the "fail loudly" bar for overlay commenting.
    commentElement.enableGhostComments?.();
    commentElement.enableGhostCommentsIndicator?.();
  }, [client]);

  return null;
}

function VeltFeedbackInboxBridge() {
  const addCommentEvent = useCommentEventCallback("addComment");
  const addCommentAnnotationEvent = useCommentEventCallback("addCommentAnnotation");
  const mirroredKeysRef = useRef(new Set<string>());

  useEffect(() => {
    const annotation = addCommentAnnotationEvent?.commentAnnotation;
    const firstComment = annotation?.comments?.[0];
    if (!annotation?.annotationId || !firstComment?.commentId || !firstComment.from?.userId) {
      return;
    }

    const key = `annotation:${annotation.annotationId}:comment:${firstComment.commentId}`;
    if (mirroredKeysRef.current.has(key)) {
      return;
    }
    mirroredKeysRef.current.add(key);

    void apiFetch("/api/admin/feedback/velt", {
      method: "POST",
      body: JSON.stringify({
        annotationId: annotation.annotationId,
        commentId: firstComment.commentId,
        documentId: annotation.pageInfo?.path ?? window.location.pathname,
        pageUrl: annotation.pageInfo?.commentUrl ?? annotation.pageInfo?.url ?? window.location.href,
        pageTitle: annotation.pageInfo?.title ?? document.title,
        commentText: firstComment.commentText ?? null,
        commentHtml: firstComment.commentHtml ?? null,
        createdAt: firstComment.createdAt ?? annotation.createdAt ?? null,
        lastUpdated: firstComment.lastUpdated ?? annotation.lastUpdated ?? null,
        attachments: firstComment.attachments ?? [],
        author: {
          userId: firstComment.from?.userId ?? null,
          name: firstComment.from?.name ?? null,
          email: firstComment.from?.email ?? null,
        },
        taggedUsers: [
          ...(firstComment.taggedUserContacts ?? []).map((entry) => entry.contact ?? {}),
          ...(firstComment.to ?? []),
        ],
        targetElementId: annotation.targetElementId ?? null,
        targetElementPath: annotation.targetElement?.xpath ?? null,
        taggedElementPath: annotation.taggedElementPath ?? null,
        taggedElementRect: annotation.taggedElementRect ?? null,
        annotationContext:
          annotation.context && typeof annotation.context === "object"
            ? annotation.context
            : null,
        source: "velt_comment_annotation",
        }),
    }).catch((error) => {
      console.warn("[velt-feedback-bridge] addCommentAnnotation mirror failed", error);
    });
  }, [addCommentAnnotationEvent]);

  useEffect(() => {
    const annotation = addCommentEvent?.commentAnnotation;
    const comment = addCommentEvent?.comment;
    if (!annotation?.annotationId || !comment?.commentId || !comment.from?.userId) {
      return;
    }

    const key = `annotation:${annotation.annotationId}:comment:${comment.commentId}`;
    if (mirroredKeysRef.current.has(key)) {
      return;
    }
    mirroredKeysRef.current.add(key);

    void apiFetch("/api/admin/feedback/velt", {
      method: "POST",
      body: JSON.stringify({
        annotationId: annotation.annotationId,
        commentId: comment.commentId,
        documentId: annotation.pageInfo?.path ?? window.location.pathname,
        pageUrl: annotation.pageInfo?.commentUrl ?? annotation.pageInfo?.url ?? window.location.href,
        pageTitle: annotation.pageInfo?.title ?? document.title,
        commentText: comment.commentText ?? null,
        commentHtml: comment.commentHtml ?? null,
        createdAt: comment.createdAt ?? annotation.createdAt ?? null,
        lastUpdated: comment.lastUpdated ?? annotation.lastUpdated ?? null,
        attachments: comment.attachments ?? [],
        author: {
          userId: comment.from?.userId ?? null,
          name: comment.from?.name ?? null,
          email: comment.from?.email ?? null,
        },
        taggedUsers: [
          ...(comment.taggedUserContacts ?? []).map((entry) => entry.contact ?? {}),
          ...(comment.to ?? []),
        ],
        targetElementId: annotation.targetElementId ?? null,
        targetElementPath: annotation.targetElement?.xpath ?? null,
        taggedElementPath: annotation.taggedElementPath ?? null,
        taggedElementRect: annotation.taggedElementRect ?? null,
        annotationContext:
          annotation.context && typeof annotation.context === "object"
            ? annotation.context
            : null,
        source: "velt_comment_reply",
        }),
    }).catch((error) => {
      console.warn("[velt-feedback-bridge] addComment mirror failed", error);
    });
  }, [addCommentEvent]);

  return null;
}

export function VeltGlobalLayer() {
  const rawPathname = usePathname();
  const pathname = rawPathname ?? "/";
  const [activeRecorderId, setActiveRecorderId] = useState<string | null>(null);
  const commentsVisible = useCommentsVisibilityStore((state) => state.visible);

  // Scope page annotations to the current route
  useSetDocument(pathname, { documentName: pathname });

  useEffect(() => observeMalformedVeltAnnotations(document), []);

  // @ts-expect-error -- Velt recorder types lag behind live API
  useRecorderAddHandler((recorder: { recorderId?: string }) => {
    if (recorder?.recorderId) {
      setActiveRecorderId(recorder.recorderId);
      // Tell AdminFeedbackWidget to minimize while Velt recorder is in use
      window.dispatchEvent(new CustomEvent("velt-recorder-active"));
    }
  });

  // When the user hides comments, unmount the entire visual layer — comment
  // pins, the floating recorder control panel, and any audio/video playback
  // widgets — so the page content is unobstructed. Hooks above still run.
  if (!commentsVisible) {
    return null;
  }

  return (
    <>
      <VeltCommentConfiguration />
      <VeltFeedbackInboxBridge />
      <VeltComments
        shadowDom={false}
        textMode={false}
        attachments
        screenshot
        recordings="all"
        recordingTranscription
        recordingCountdown
        persistentCommentMode
        commentPinHighlighter
        commentIndex={false}
        status={false}
        priority={false}
        resolveButton={false}
        sidebarButtonOnCommentDialog
        attachmentNameInMessage
        allowedElementIds={["app-main-content"]}
        commentToNearestAllowedElement
      />
      <VeltCommentsSidebar groupConfig={{ enable: false }} shadowDom={false} />

      <VeltRecorderControlPanel mode="floating" />
      <VeltRecorderNotes />

      {activeRecorderId && (
        <div className="fixed bottom-4 left-4 z-50 w-72 overflow-hidden rounded-lg bg-card shadow-sm">
          <VeltRecorderPlayer recorderId={activeRecorderId} />
        </div>
      )}
    </>
  );
}
