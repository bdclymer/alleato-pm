"use client";

import * as React from "react";
import { ArrowLeft, GripVertical } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { DocumentsTablePage } from "@/features/documents/documents-table-page";
import { createDocumentsTableDefinition } from "@/features/documents/documents-table-definition";
import type { PipelineDoc } from "@/features/documents/documents-table-config";
import {
  DocumentGridCard,
  type MoveTarget,
} from "@/features/documents/document-grid-card";
import {
  SmartGroupRail,
  SmartGroupPills,
} from "@/features/documents/smart-group-rail";
import { PreviewPane } from "@/features/documents/preview-pane";
import { useResizableSplit } from "@/features/documents/use-resizable-split";
import { cn } from "@/lib/utils";
import {
  SMART_GROUPS,
  type SmartGroupCounts,
} from "@/features/documents/smart-groups";

// Category groups a document can be re-filed into (search/type groups like
// Commitments, Meetings, Emails are not move targets).
const MOVE_TARGETS: MoveTarget[] = SMART_GROUPS.filter(
  (g) => g.reclassifyTo,
).map((g) => ({ label: g.label, category: g.reclassifyTo as string }));

export function ProjectDocumentsBrowser({
  projectId,
  projectName,
}: {
  projectId: number;
  projectName?: string;
}): React.ReactElement {
  const [activeGroupId, setActiveGroupId] = React.useState("all");
  const [selectedDoc, setSelectedDoc] = React.useState<PipelineDoc | null>(
    null,
  );
  const [counts, setCounts] = React.useState<SmartGroupCounts>({});
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const { ratio, onHandleDown, containerRef } = useResizableSplit(
    "documents-browser-split",
    0.5,
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
        forcedSearch: activeGroup.search,
        defaultView: "card",
      }),
    [projectId, activeGroup],
  );

  const handleMove = React.useCallback(
    async (doc: PipelineDoc, category: string, label: string) => {
      try {
        await apiFetch(`/api/documents/${doc.id}/reclassify`, {
          method: "PATCH",
          body: JSON.stringify({ category, projectId }),
        });
        toast.success(`Moved to ${label}`);
        setSelectedDoc((current) => (current?.id === doc.id ? null : current));
        loadCounts();
        setRefreshNonce((n) => n + 1);
      } catch (error) {
        console.error("Document reclassify failed", error);
        toast.error(
          "Could not move the document. You may not have permission, or it may no longer exist.",
        );
      }
    },
    [projectId, loadCounts],
  );

  const renderCard = React.useCallback(
    (item: PipelineDoc, onView: (item: PipelineDoc) => void) => (
      <DocumentGridCard
        item={item}
        onView={onView}
        onMove={handleMove}
        moveTargets={MOVE_TARGETS}
      />
    ),
    [handleMove],
  );

  return (
    <PageShell
      variant="table"
      title="Documents"
      eyebrow={projectName}
      showHeader={false}
      contentClassName="p-0"
      fillHeight
    >
      <div
        data-testid="documents-browser-shell"
        className="flex h-[calc(100vh-9rem)] w-full flex-col overflow-hidden md:flex-row"
      >
        {/* Mobile: smart groups collapse into a horizontal pill row */}
        <div className="shrink-0 border-b border-border md:hidden">
          <SmartGroupPills
            counts={counts}
            activeGroupId={activeGroupId}
            onSelect={(id) => setActiveGroupId(id)}
          />
        </div>
        {/* Desktop: vertical smart-group rail */}
        <div className="hidden w-44 shrink-0 md:block">
          <SmartGroupRail
            counts={counts}
            activeGroupId={activeGroupId}
            onSelect={(id) => setActiveGroupId(id)}
          />
        </div>
        <div ref={containerRef} className="flex min-w-0 flex-1">
          <div
            className="min-w-0 overflow-auto max-md:flex-1"
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
              renderCard={renderCard}
              cardGridClassName="grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"
            />
          </div>
          <div
            onPointerDown={onHandleDown}
            className="hidden w-2 shrink-0 cursor-col-resize items-center justify-center bg-muted/40 text-muted-foreground md:flex"
            role="separator"
            aria-label="Resize preview"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          {/* Below md, the preview opens as a full-screen overlay so the file
              table keeps the full width until a document is selected. */}
          <div
            data-testid="document-preview-pane"
            className={cn(
              "min-w-0 overflow-hidden md:flex-1",
              selectedDoc
                ? "fixed inset-0 z-50 flex flex-col bg-background md:static md:z-auto md:block"
                : "hidden md:block",
            )}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-border p-2 md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDoc(null)}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to files
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden md:h-full">
              <PreviewPane doc={selectedDoc} />
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
