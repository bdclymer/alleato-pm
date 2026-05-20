"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSelectedArtifact } from "@/hooks/use-selected-artifact";
import type { ArtifactType } from "@/lib/ai/services/workspace-artifact-service";
import { ArtifactBody } from "./artifact-body";

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  owner_update: "Owner Update",
  risk_report: "Risk Report",
  meeting_prep: "Meeting Prep",
  analysis: "Analysis",
  briefing: "Briefing",
  note: "Note",
};

export function ArtifactSidePanel() {
  const { artifact, close } = useSelectedArtifact();

  const open = artifact !== null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl"
      >
        <SheetHeader className="border-b bg-muted/30 px-6 py-4">
          <SheetTitle className="truncate text-base">
            {artifact?.title ?? "Artifact"}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {artifact
              ? `${ARTIFACT_TYPE_LABELS[artifact.artifactType] ?? artifact.artifactType} · v${artifact.version}`
              : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-auto px-6 py-5">
          {artifact && (
            <ArtifactBody
              artifactType={artifact.artifactType}
              content={artifact.content}
              variant="full"
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
