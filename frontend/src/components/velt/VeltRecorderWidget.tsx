"use client";

import { useState } from "react";
import {
  VeltRecorderControlPanel,
  VeltRecorderNotes,
  VeltRecorderPlayer,
  VeltRecorderTool,
  useRecorderAddHandler,
  useSetDocument,
} from "@veltdev/react";

export function VeltRecorderWidget() {
  useSetDocument("global-recorder", { documentName: "Global Recorder" });

  const [activeRecorderId, setActiveRecorderId] = useState<string | null>(null);

  // @ts-expect-error -- Velt types lag behind the live API; callback param is valid at runtime
  useRecorderAddHandler((recorder: { recorderId?: string }) => {
    if (recorder?.recorderId) {
      setActiveRecorderId(recorder.recorderId);
    }
  });

  return (
    <>
      {/* @ts-expect-error -- Velt types lag behind the live API; these props are valid at runtime */}
      <VeltRecorderTool type="all" recordingTranscription summary />
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
