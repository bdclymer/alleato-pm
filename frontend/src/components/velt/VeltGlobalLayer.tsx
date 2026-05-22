"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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

interface VeltCommentElement {
  enableAttachments?: () => void;
  enableScreenshot?: () => void;
  enableRecordingTranscription?: () => void;
  enableRecordingCountdown?: () => void;
  enablePersistentCommentMode?: () => void;
  enableCommentPinHighlighter?: () => void;
  enableSidebarButtonOnCommentDialog?: () => void;
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
    commentElement.enableSidebarButtonOnCommentDialog?.();
  }, [client]);

  return null;
}

export function VeltGlobalLayer() {
  const rawPathname = usePathname();
  const pathname = rawPathname ?? "/";
  const [activeRecorderId, setActiveRecorderId] = useState<string | null>(null);

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
