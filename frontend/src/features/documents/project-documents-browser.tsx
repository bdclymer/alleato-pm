"use client";

import * as React from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout";
import { apiFetch } from "@/lib/api-client";
import { DocumentsTablePage } from "@/features/documents/documents-table-page";
import { createDocumentsTableDefinition } from "@/features/documents/documents-table-definition";
import type { PipelineDoc } from "@/features/documents/documents-table-config";
import { SmartGroupRail } from "@/features/documents/smart-group-rail";
import { PreviewPane } from "@/features/documents/preview-pane";
import { useResizableSplit } from "@/features/documents/use-resizable-split";
import {
  SMART_GROUPS,
  type SmartGroupCounts,
} from "@/features/documents/smart-groups";

export function ProjectDocumentsBrowser({
  projectId,
  projectName,
}: {
  projectId: number;
  projectName?: string;
}): React.ReactElement {
  const [activeGroupId, setActiveGroupId] = React.useState("all");
  const [selectedDoc, setSelectedDoc] = React.useState<PipelineDoc | null>(null);
  const [counts, setCounts] = React.useState<SmartGroupCounts>({});
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const { ratio, onHandleDown, containerRef } = useResizableSplit(
    "documents-browser-split",
    0.5,
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const loadCounts = React.useCallback(() => {
    apiFetch<{ counts: SmartGroupCounts }>(
      `/api/projects/${projectId}/documents/group-counts`,
    )
      .then((r) => setCounts(r.counts))
      .catch(() => setCounts({}));
  }, [projectId]);

  React.useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const activeGroup =
    SMART_GROUPS.find((g) => g.id === activeGroupId) ?? SMART_GROUPS[0];

  const definition = React.useMemo(
    () =>
      createDocumentsTableDefinition({
        entityKey: "project-documents-unified",
        forcedProjectId: projectId,
        forcedFilters: activeGroup.filter,
        defaultView: "card",
      }),
    [projectId, activeGroup],
  );

  const handleDragEnd = React.useCallback(
    async (event: DragEndEvent) => {
      const overId = event.over?.id;
      const docId = event.active?.id;
      if (typeof overId !== "string" || typeof docId !== "string") return;
      if (!overId.startsWith("group:")) return;
      const group = SMART_GROUPS.find((g) => `group:${g.id}` === overId);
      if (!group?.reclassifyTo) return;

      try {
        await apiFetch(`/api/documents/${docId}/assign-project`, {
          method: "PATCH",
          body: JSON.stringify({ category: group.reclassifyTo }),
        });
        toast.success(`Moved to ${group.label}`);
        loadCounts();
        setRefreshNonce((n) => n + 1);
      } catch {
        toast.error("Could not reclassify document. Try again.");
      }
    },
    [loadCounts],
  );

  return (
    <PageShell
      variant="table"
      title="Documents"
      eyebrow={projectName}
      contentClassName="p-0"
    >
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex h-[calc(100vh-9rem)] w-full overflow-hidden rounded-lg border border-border">
          <div className="w-44 shrink-0">
            <SmartGroupRail
              counts={counts}
              activeGroupId={activeGroupId}
              onSelect={(id) => setActiveGroupId(id)}
            />
          </div>
          <div ref={containerRef} className="flex min-w-0 flex-1">
            <div
              className="min-w-0 overflow-auto"
              style={{ flexBasis: `${ratio * 100}%` }}
            >
              <DocumentsTablePage
                key={`${activeGroupId}:${refreshNonce}`}
                definition={definition}
                title="Documents"
                description="Project document library"
                uploadEnabled
                uploadProjectId={projectId}
                inlineEditingEnabled
                projectAssignmentEnabled={false}
                deleteEnabled
                pageArea="project-documents-browser"
                selectedDocId={selectedDoc?.id}
                onSelectDoc={setSelectedDoc}
                draggableCards
                cardGridClassName="grid-cols-1 xl:grid-cols-2 gap-3"
              />
            </div>
            <div
              onPointerDown={onHandleDown}
              className="flex w-2 shrink-0 cursor-col-resize items-center justify-center border-x border-border bg-muted/40 text-muted-foreground"
              role="separator"
              aria-label="Resize preview"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <PreviewPane doc={selectedDoc} />
            </div>
          </div>
        </div>
      </DndContext>
    </PageShell>
  );
}
