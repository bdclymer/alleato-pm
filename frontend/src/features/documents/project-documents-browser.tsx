"use client";

import * as React from "react";
import {
  Calendar,
  FileSpreadsheet,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Mail,
  MoreVertical,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
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

// Category groups a document can be re-filed into (search/type groups like
// Commitments, Meetings, Emails are not move targets).
const MOVE_TARGETS = SMART_GROUPS.filter((g) => g.reclassifyTo).map((g) => ({
  label: g.label,
  category: g.reclassifyTo as string,
}));

const SPREADSHEET_EXT = new Set(["xls", "xlsx", "csv"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"]);

function cardIcon(item: PipelineDoc): LucideIcon {
  if (item.type === "email") return Mail;
  if (item.type === "meeting") return Calendar;
  const ext =
    (item.title ?? item.file_path ?? "")
      .toLowerCase()
      .match(/\.([a-z0-9]+)(?:$|\?)/)?.[1] ?? "";
  if (SPREADSHEET_EXT.has(ext)) return FileSpreadsheet;
  if (IMAGE_EXT.has(ext)) return ImageIcon;
  return FileText;
}

// Turn raw classification values into a clean, sentence-case label
// ("teams_message" → "Teams message"); already-human values pass through.
function humanizeCategory(value: string | null): string | null {
  if (!value) return null;
  const spaced = value.replace(/_/g, " ").trim();
  if (!spaced) return null;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function DocumentCardWithMenu({
  item,
  onView,
  onMove,
}: {
  item: PipelineDoc;
  onView: (item: PipelineDoc) => void;
  onMove: (item: PipelineDoc, category: string, label: string) => void;
}) {
  const Icon = cardIcon(item);
  const dateValue = item.created_at ?? item.date;
  const meta = [humanizeCategory(item.category), dateValue ? formatDate(dateValue) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="group relative">
      <Button
        type="button"
        variant="ghost"
        data-testid="document-card"
        onClick={() => onView(item)}
        className="flex h-auto w-full min-w-0 items-start gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted/50"
      >
        <Icon
          className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="line-clamp-2 text-sm font-medium text-foreground">
            {item.title || "Untitled document"}
          </span>
          {meta ? (
            <span className="truncate text-xs text-muted-foreground">{meta}</span>
          ) : null}
        </span>
      </Button>
      <div className="absolute right-2 top-2 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Document actions"
              className="h-7 w-7 bg-background shadow-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            {MOVE_TARGETS.map((t) => (
              <DropdownMenuItem
                key={t.category}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(item, t.category, t.label);
                }}
              >
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

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
        setSelectedDoc((current) =>
          current?.id === doc.id ? null : current,
        );
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
      <DocumentCardWithMenu item={item} onView={onView} onMove={handleMove} />
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
    >
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
              renderCard={renderCard}
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
    </PageShell>
  );
}
