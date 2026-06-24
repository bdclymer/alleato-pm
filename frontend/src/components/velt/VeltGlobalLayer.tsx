"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCommentsVisibilityStore } from "@/lib/stores/comments-visibility-store";
import {
  VeltComments,
  VeltCommentsSidebar,
  VeltRecorderControlPanel,
  VeltRecorderNotes,
  VeltRecorderPlayer,
  useRecorderAddHandler,
  useSetDocument,
  useVeltClient,
} from "@veltdev/react";

interface VeltFormatConfig {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  link?: boolean;
  blockquote?: boolean;
  codeBlock?: boolean;
  heading?: boolean;
  list?: boolean;
  orderedList?: boolean;
}

interface VeltCommentElement {
  enableAttachments?: () => void;
  enableScreenshot?: () => void;
  enableRecordingTranscription?: () => void;
  enableRecordingCountdown?: () => void;
  enablePersistentCommentMode?: () => void;
  enableCommentPinHighlighter?: () => void;
  enableFormatOptions?: () => void;
  setFormatConfig?: (config: VeltFormatConfig) => void;
  enableEnterKeyToSubmit?: () => void;
}

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

    // Rich-text composer: show the formatting toolbar so users can bold/italic,
    // link, quote, and make lists. Headings are disabled — comment bodies should
    // never render as oversized page headings (noise-gate rule #8).
    commentElement.enableFormatOptions?.();
    commentElement.setFormatConfig?.({
      bold: true,
      italic: true,
      strikethrough: true,
      link: true,
      blockquote: true,
      codeBlock: true,
      list: true,
      orderedList: true,
      heading: false,
    });

    // Enter submits the comment; Shift+Enter inserts a newline (paragraph break),
    // matching every other text input in the app.
    commentElement.enableEnterKeyToSubmit?.();
  }, [client]);

  return null;
}

export function VeltGlobalLayer() {
  const rawPathname = usePathname();
  const pathname = rawPathname ?? "/";
  const [activeRecorderId, setActiveRecorderId] = useState<string | null>(null);
  const commentsVisible = useCommentsVisibilityStore((state) => state.visible);

  // Scope page annotations to the current route
  useSetDocument(pathname, { documentName: pathname });

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
