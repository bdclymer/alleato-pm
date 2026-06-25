"use client";

import { useState } from "react";
import { FileText, Plus, Unlink } from "lucide-react";

import { ConfirmDeleteDialog } from "@/components/ds/ConfirmDeleteDialog";
import { EmptyState } from "@/components/ds";
import { SectionAction, SectionRuleHeading } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  useRemoveLinkedDrawing,
  useSubmittalLinkedDrawings,
} from "@/hooks/use-submittals";
import { appToast as toast } from "@/lib/toast/app-toast";

interface Props {
  projectId: number;
  submittalId: string;
  onAddClick: () => void;
}

export function SubmittalLinkedDrawingsPanel({
  projectId,
  submittalId,
  onAddClick,
}: Props) {
  const { data: drawings, isLoading } = useSubmittalLinkedDrawings(
    projectId,
    submittalId,
  );
  const removeMutation = useRemoveLinkedDrawing(projectId, submittalId);
  const [unlinkTargetId, setUnlinkTargetId] = useState<string | null>(null);

  const rows = drawings ?? [];
  const unlinkTarget = rows.find(
    (drawing) => drawing.drawingId === unlinkTargetId,
  );

  async function handleConfirmUnlink() {
    if (!unlinkTargetId) return;
    try {
      await removeMutation.mutateAsync({ drawingId: unlinkTargetId });
      toast.success("Drawing unlinked");
    } catch {
      toast.error("Failed to unlink drawing");
    } finally {
      setUnlinkTargetId(null);
    }
  }

  return (
    <div>
      <SectionRuleHeading
        label="Linked Drawings"
        actions={
          <SectionAction onClick={onAddClick}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Link Drawing
          </SectionAction>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No linked drawings"
          description="Link relevant drawings to enable AI review of this submittal."
          action={
            <Button size="sm" onClick={onAddClick}>
              <Plus className="mr-1.5 h-4 w-4" />
              Link Drawing
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {rows.map((drawing) => (
            <div
              key={drawing.id}
              className="flex items-start justify-between rounded-md border border-border px-4 py-3"
            >
              <div className="flex min-w-0 items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {drawing.drawingNumber} - {drawing.title}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {drawing.discipline && <span>{drawing.discipline}</span>}
                    {drawing.revision && <span>Rev {drawing.revision}</span>}
                    <span>
                      {drawing.readiness.state === "ready"
                        ? "AI review ready"
                        : drawing.readiness.state === "partial"
                          ? "AI review partially ready"
                          : drawing.readiness.state === "failed"
                            ? "AI processing failed"
                            : "AI review not ready"}
                    </span>
                  </div>
                  {drawing.readiness.reasons[0] && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {drawing.readiness.reasons[0]}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>
                      OCR {drawing.readiness.ocrTextReady ? "ready" : "missing"}
                    </span>
                    <span>
                      Vision{" "}
                      {drawing.readiness.visionReady ? "ready" : "missing"}
                    </span>
                    <span>
                      Retrieval{" "}
                      {drawing.readiness.embeddedReady ? "ready" : "missing"}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setUnlinkTargetId(drawing.drawingId)}
              >
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(unlinkTargetId)}
        onOpenChange={(open) => {
          if (!open) setUnlinkTargetId(null);
        }}
        title="Unlink drawing?"
        description={`Remove "${unlinkTarget?.drawingNumber}" from this submittal? The drawing itself is not deleted.`}
        onConfirm={handleConfirmUnlink}
        isDeleting={removeMutation.isPending}
      />
    </div>
  );
}
