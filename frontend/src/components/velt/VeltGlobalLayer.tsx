"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import {
  VeltComments,
  VeltCommentsSidebar,
  VeltRecorderControlPanel,
  VeltRecorderNotes,
  VeltRecorderPlayer,
  VeltRecorderTool,
  useRecorderAddHandler,
  useSetDocument,
  useVeltClient,
} from "@veltdev/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VeltCommentElement {
  onCommentModeChange?: () => { subscribe: (cb: (mode: boolean) => void) => { unsubscribe: () => void } };
  enableFloatingCommentTool?: () => void;
  disableFloatingCommentTool?: () => void;
}

function AnnotationToggle() {
  const { client } = useVeltClient();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!client) return;
    const commentElement = client.getCommentElement() as unknown as VeltCommentElement;
    const sub = commentElement.onCommentModeChange?.()?.subscribe((mode: boolean) => {
      setActive(!!mode);
    });
    return () => sub?.unsubscribe?.();
  }, [client]);

  const toggle = useCallback(() => {
    if (!client) return;
    const commentElement = client.getCommentElement() as unknown as VeltCommentElement;
    if (active) {
      commentElement.disableFloatingCommentTool?.();
    } else {
      commentElement.enableFloatingCommentTool?.();
    }
  }, [client, active]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={active ? "Exit annotation mode" : "Annotate page"}
      aria-pressed={active}
      className={cn(
        "fixed bottom-20 right-4 z-40 h-10 w-10 rounded-full transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-card text-muted-foreground shadow-sm hover:text-foreground",
      )}
    >
      {active ? <X className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
    </Button>
  );
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
      <VeltComments shadowDom={false} />
      <VeltCommentsSidebar groupConfig={{ enable: false }} />

      {/* @ts-expect-error -- Velt recorder types lag behind live API */}
      <VeltRecorderTool type="all" recordingTranscription summary />
      <VeltRecorderControlPanel mode="floating" />
      <VeltRecorderNotes />

      {activeRecorderId && (
        <div className="fixed bottom-4 left-4 z-50 w-72 overflow-hidden rounded-lg bg-card shadow-sm">
          <VeltRecorderPlayer recorderId={activeRecorderId} />
        </div>
      )}

      <AnnotationToggle />
    </>
  );
}
