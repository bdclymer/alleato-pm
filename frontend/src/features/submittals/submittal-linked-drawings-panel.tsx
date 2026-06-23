"use client";

import { EmptyState } from "@/components/ds";
import { SectionAction, SectionRuleHeading } from "@/components/layout";
import { ConfirmDeleteDialog } from "@/components/ds/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { useSubmittalLinkedDrawings, useRemoveLinkedDrawing } from "@/hooks/use-submittals";
import { appToast as toast } from "@/lib/toast/app-toast";
import { FileText, Cpu, Plus, Unlink } from "lucide-react";
import { useState } from "react";

interface Props {
  projectId: number;
  submittalId: string;
  onAddClick: () => void;
}

export function SubmittalLinkedDrawingsPanel({ projectId, submittalId, onAddClick }: Props) {
  const { data: drawings, isLoading } = useSubmittalLinkedDrawings(projectId, submittalId);
  const removeMutation = useRemoveLinkedDrawing(projectId, submittalId);
  const [unlinkTargetId, setUnlinkTargetId] = useState<string | null>(null);

  const unlinkTarget = drawings?.find((d) => d.drawing_id === unlinkTargetId);

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
    <div className="space-y-4">
      <SectionRuleHeading
        label="Linked Drawings"
        actions={<SectionAction onClick={onAddClick}><Plus className="h-3.5 w-3.5 mr-1" />Link Drawing</SectionAction>}
      />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-14 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : !drawings?.length ? (
        <EmptyState
          icon={<FileText />}
          title="No linked drawings"
          description="Link relevant drawings to enable AI review of this submittal."
          action={<Button size="sm" onClick={onAddClick}><Plus className="h-4 w-4 mr-1.5" />Link Drawing</Button>}
        />
      ) : (
        <div className="space-y-2">
          {drawings.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-md border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.drawing_number} — {d.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {d.discipline && (
                      <span className="text-xs text-muted-foreground">{d.discipline}</span>
                    )}
                    {d.revision && (
                      <span className="text-xs text-muted-foreground">Rev {d.revision}</span>
                    )}
                    {d.has_vectorized_content && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-primary">
                        <Cpu className="h-3 w-3" />AI-readable
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setUnlinkTargetId(d.drawing_id)}
              >
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!unlinkTargetId}
        onOpenChange={(open) => { if (!open) setUnlinkTargetId(null); }}
        title="Unlink drawing?"
        description={`Remove "${unlinkTarget?.drawing_number}" from this submittal? The drawing itself is not deleted.`}
        onConfirm={handleConfirmUnlink}
        isDeleting={removeMutation.isPending}
      />
    </div>
  );
}
