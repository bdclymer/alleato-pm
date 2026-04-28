import type { ReactElement } from "react";
import { useState, useEffect } from "react";
import { FileText, MoreHorizontal, QrCode } from "lucide-react";

import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ds";

import type {
  ColumnConfig,
  FilterConfig,
  TableColumn,
} from "@/components/tables/unified";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DRAWING_DISCIPLINES,
  DRAWING_TYPES,
  type DrawingLogTableRow,
} from "@/types/drawings.types";

// ─── Status formatting helpers ──────────────────────────────────────────────

function formatStatus(status: string | null): string {
  if (!status) return "-";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Column definitions ─────────────────────────────────────────────────────

export const drawingColumns: ColumnConfig[] = [
  { id: "drawingNumber", label: "#", alwaysVisible: true },
  { id: "title", label: "Title", defaultVisible: true },
  { id: "revisionNumber", label: "Rev.", defaultVisible: true },
  { id: "discipline", label: "Discipline", defaultVisible: true },
  { id: "drawingType", label: "Type", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "publishState", label: "State", defaultVisible: true },
  { id: "drawingDate", label: "Drawing Date", defaultVisible: true },
  { id: "receivedDate", label: "Received", defaultVisible: true },
  { id: "setName", label: "Set", defaultVisible: false },
  { id: "fileName", label: "File", defaultVisible: false },
  { id: "uploadedByEmail", label: "Uploaded By", defaultVisible: false },
];

export const drawingDefaultVisibleColumns = drawingColumns
  .filter((c) => c.defaultVisible !== false || c.alwaysVisible)
  .map((c) => c.id);

// ─── Filters ────────────────────────────────────────────────────────────────

export const drawingFilters: FilterConfig[] = [
  {
    id: "discipline",
    label: "Discipline",
    type: "select",
    options: DRAWING_DISCIPLINES.map((v) => ({ value: v, label: v })),
  },
  {
    id: "drawingType",
    label: "Type",
    type: "select",
    options: DRAWING_TYPES.map((v) => ({ value: v, label: v })),
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "draft", label: "Draft" },
      { value: "under_review", label: "Under Review" },
      { value: "approved", label: "Approved" },
      { value: "superseded", label: "Superseded" },
      { value: "void", label: "Void" },
    ],
  },
];

// ─── Table columns ──────────────────────────────────────────────────────────

export function buildDrawingTableColumns(): TableColumn<DrawingLogTableRow>[] {
  return [
    {
      ...drawingColumns[0],
      render: (item) => (
        <span className="font-medium">{item.drawingNumber || "-"}</span>
      ),
      sortValue: (item) => item.drawingNumber,
    },
    {
      ...drawingColumns[1],
      render: (item) => (
        <span className="max-w-64 truncate block" title={item.title}>
          {item.title || "Untitled"}
        </span>
      ),
      sortValue: (item) => item.title,
    },
    {
      ...drawingColumns[2],
      render: (item) => (
        <Badge variant="outline" className="text-xs">
          {item.revisionNumber || "-"}
        </Badge>
      ),
      sortValue: (item) => item.revisionNumber ?? "",
    },
    {
      ...drawingColumns[3],
      render: (item) => (
        <span className="text-sm">{item.discipline || "-"}</span>
      ),
      sortValue: (item) => item.discipline ?? "",
    },
    {
      ...drawingColumns[4],
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.drawingType || "-"}
        </span>
      ),
      sortValue: (item) => item.drawingType ?? "",
    },
    {
      ...drawingColumns[5],
      render: (item) =>
        item.status ? (
          <StatusBadge status={formatStatus(item.status)} />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      sortValue: (item) => item.status ?? "",
    },
    // State column: shows Unpublished / Obsolete badges
    {
      ...drawingColumns[6],
      render: (item) => {
        if (item.isObsolete) {
          return <Badge variant="secondary">Obsolete</Badge>;
        }
        if (!item.isPublished) {
          return <Badge variant="outline">Unpublished</Badge>;
        }
        return <span className="text-muted-foreground text-xs">-</span>;
      },
      sortValue: (item) =>
        item.isObsolete ? "obsolete" : !item.isPublished ? "unpublished" : "",
    },
    {
      ...drawingColumns[7],
      render: (item) => (
        <span className="text-sm">{formatDate(item.drawingDate)}</span>
      ),
      sortValue: (item) =>
        item.drawingDate ? new Date(item.drawingDate).getTime() : 0,
    },
    {
      ...drawingColumns[8],
      render: (item) => (
        <span className="text-sm">{formatDate(item.receivedDate)}</span>
      ),
      sortValue: (item) =>
        item.receivedDate ? new Date(item.receivedDate).getTime() : 0,
    },
    {
      ...drawingColumns[9],
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.setName || "-"}
        </span>
      ),
      sortValue: (item) => item.setName ?? "",
    },
    {
      ...drawingColumns[10],
      render: (item) => (
        <span className="text-xs text-muted-foreground truncate max-w-32 block">
          {item.fileName || "-"}
        </span>
      ),
      sortValue: (item) => item.fileName ?? "",
    },
    {
      ...drawingColumns[11],
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.uploadedByEmail || "-"}
        </span>
      ),
      sortValue: (item) => item.uploadedByEmail ?? "",
    },
  ];
}

export interface DrawingRowActionCallbacks {
  onPublish: (drawingId: string, publish: boolean) => void;
  onObsolete: (drawingId: string, obsolete: boolean) => void;
  onDelete: (item: DrawingLogTableRow) => void;
  onQrCode?: (drawingId: string, drawingNumber: string) => void;
}

/**
 * Returns a rowActions renderer for UnifiedTablePage that includes
 * Publish/Unpublish, Mark Obsolete/Restore, and Delete actions.
 */
export function buildDrawingRowActions(callbacks: DrawingRowActionCallbacks) {
  return (item: DrawingLogTableRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            callbacks.onPublish(item.id, !item.isPublished);
          }}
        >
          {item.isPublished ? "Unpublish" : "Publish"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            callbacks.onObsolete(item.id, !item.isObsolete);
          }}
        >
          {item.isObsolete ? "Restore" : "Mark Obsolete"}
        </DropdownMenuItem>
        {callbacks.onQrCode && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              callbacks.onQrCode!(item.id, item.drawingNumber ?? "Drawing");
            }}
          >
            QR Code
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            callbacks.onDelete(item);
          }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Card / List views ──────────────────────────────────────────────────────

// ─── Drawing grid card component ────────────────────────────────────────────

interface DrawingGridCardProps {
  item: DrawingLogTableRow;
  onClick: (item: DrawingLogTableRow) => void;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
}

function DrawingGridCard({ item, onClick, selected, onSelect }: DrawingGridCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!item.fileUrl) return;
    apiFetch<{ downloadUrl?: string }>(
      `/api/projects/${item.projectId}/drawings/${item.id}/download`,
    )
      .then((data) => {
        if (data?.downloadUrl) {
          setPreviewUrl(data.downloadUrl);
        }
      })
      .catch(() => {});
  }, [item.id, item.projectId, item.fileUrl]);

  const isPdf =
    item.fileType?.toLowerCase().includes("pdf") ||
    item.fileUrl?.toLowerCase().endsWith(".pdf");
  const isImage =
    item.fileType?.startsWith("image/") ||
    /\.(png|jpe?g|tiff?)$/i.test(item.fileUrl ?? "");

  const dimmed = item.isObsolete || !item.isPublished;

  return (
    <Button
      type="button"
      variant="ghost"
      className={`group/card relative flex flex-col items-stretch justify-start h-auto w-full overflow-hidden rounded-lg border bg-background p-0 text-left transition-all hover:bg-muted/40${dimmed ? " opacity-60" : ""}${selected ? " border-primary ring-1 ring-primary" : " border-border"}`}
      onClick={() => onClick(item)}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <div
          className={`absolute top-1.5 left-1.5 z-20 transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"}`}
          onClick={(e) => { e.stopPropagation(); onSelect(item.id, !selected); }}
        >
          <div className={`flex h-4.5 w-4.5 items-center justify-center rounded border-2 text-primary-foreground transition-colors ${selected ? "border-primary bg-primary" : "border-muted-foreground/40 bg-background/80 backdrop-blur-sm"}`}>
            {selected && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </div>
        </div>
      )}

      {/* Landscape thumbnail (PDF proportions ~11:8.5) */}
      <div className="relative w-full bg-muted" style={{ aspectRatio: "11 / 8.5" }}>
        {previewUrl && isPdf ? (
          <iframe
            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
            className="absolute inset-0 w-full h-full pointer-events-none"
            title={item.title}
            tabIndex={-1}
          />
        ) : previewUrl && isImage ? (
          <img
            src={previewUrl}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
            <FileText className="h-8 w-8" />
          </div>
        )}
        {/* State overlay badges */}
        {(item.isObsolete || !item.isPublished) && (
          <div className="absolute top-1.5 right-1.5">
            {item.isObsolete ? (
              <Badge variant="secondary" className="text-[10px] px-1 py-0">Obsolete</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-card">Unpublished</Badge>
            )}
          </div>
        )}
      </div>

      {/* Compact footer */}
      <div className="px-1.5 py-1.5 border-t border-border">
        <p className="text-[11px] font-medium text-foreground truncate leading-tight">
          {item.drawingNumber || item.title || "Untitled"}
        </p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5 leading-tight">
          {item.drawingNumber ? (item.title || "") : ""}
          {item.revisionNumber ? ` · Rev ${item.revisionNumber}` : ""}
        </p>
      </div>
    </Button>
  );
}

export function renderDrawingCard(
  item: DrawingLogTableRow,
  onClick: (item: DrawingLogTableRow) => void,
  onDelete?: (item: DrawingLogTableRow) => void,
  options?: { selected?: boolean; onSelect?: (id: string, checked: boolean) => void },
  onQrCode?: () => void,
): ReactElement {
  return (
    <div className="relative group/wrapper">
      {(onDelete || onQrCode) && (
        <div className="absolute right-1.5 top-1.5 z-20 opacity-0 group-hover/wrapper:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="h-6 w-6 p-0"
                aria-label="Open drawing actions"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onQrCode && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onQrCode();
                  }}
                >
                  QR Code
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item);
                  }}
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <DrawingGridCard
        item={item}
        onClick={onClick}
        selected={options?.selected}
        onSelect={options?.onSelect}
      />
    </div>
  );
}

export function renderDrawingList(
  item: DrawingLogTableRow,
  onClick: (item: DrawingLogTableRow) => void,
  onDelete?: (item: DrawingLogTableRow) => void,
  onQrCode?: () => void,
): ReactElement {
  const dimmed = item.isObsolete || !item.isPublished;

  return (
    <div className={`relative${dimmed ? " opacity-60" : ""}`}>
      {onDelete && (
        <div className="absolute right-2 top-1/2 z-20 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                aria-label="Open drawing actions"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item);
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        className={`h-auto flex w-full items-center justify-between rounded-md px-4 py-2 text-left hover:bg-muted/50${onDelete ? " pr-12" : ""}`}
        onClick={() => onClick(item)}
      >
        <div>
          <p className="text-sm font-medium">
            {item.drawingNumber} — {item.title || "Untitled"}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.revisionNumber ? `Rev. ${item.revisionNumber}` : "No rev."}
            {item.discipline ? ` · ${item.discipline}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onQrCode && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onQrCode();
              }}
            >
              <QrCode className="h-4 w-4" />
              <span className="sr-only">QR Code</span>
            </Button>
          )}
          {item.isObsolete && (
            <Badge variant="secondary">Obsolete</Badge>
          )}
          {!item.isPublished && !item.isObsolete && (
            <Badge variant="outline">Unpublished</Badge>
          )}
          {item.status && (
            <StatusBadge status={formatStatus(item.status)} />
          )}
        </div>
      </Button>
    </div>
  );
}
