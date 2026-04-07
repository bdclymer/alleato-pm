import type { ReactElement } from "react";
import { useState, useEffect } from "react";
import { FileText } from "lucide-react";

import type {
  ColumnConfig,
  FilterConfig,
  TableColumn,
} from "@/components/tables/unified";
import { Badge } from "@/components/ui/badge";
import {
  DRAWING_DISCIPLINES,
  DRAWING_TYPES,
  type DrawingLogTableRow,
} from "@/types/drawings.types";

// ─── Status badge maps ──────────────────────────────────────────────────────

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success"
> = {
  draft: "secondary",
  under_review: "default",
  approved: "success",
  superseded: "outline",
  void: "destructive",
};

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
  { id: "drawingDate", label: "Drawing Date", defaultVisible: true },
  { id: "receivedDate", label: "Received", defaultVisible: true },
  { id: "areaName", label: "Area", defaultVisible: true },
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
  {
    id: "areaName",
    label: "Area",
    type: "text",
  },
];

// ─── Date formatter ─────────────────────────────────────────────────────────

function formatDate(v: string | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}

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
          <Badge variant={statusVariantMap[item.status] ?? "outline"}>
            {formatStatus(item.status)}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      sortValue: (item) => item.status ?? "",
    },
    {
      ...drawingColumns[6],
      render: (item) => (
        <span className="text-sm">{formatDate(item.drawingDate)}</span>
      ),
      sortValue: (item) =>
        item.drawingDate ? new Date(item.drawingDate).getTime() : 0,
    },
    {
      ...drawingColumns[7],
      render: (item) => (
        <span className="text-sm">{formatDate(item.receivedDate)}</span>
      ),
      sortValue: (item) =>
        item.receivedDate ? new Date(item.receivedDate).getTime() : 0,
    },
    {
      ...drawingColumns[8],
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.areaName || "-"}
        </span>
      ),
      sortValue: (item) => item.areaName ?? "",
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

// ─── Card / List views ──────────────────────────────────────────────────────

// ─── Drawing grid card component ────────────────────────────────────────────

interface DrawingGridCardProps {
  item: DrawingLogTableRow;
  onClick: (item: DrawingLogTableRow) => void;
}

function DrawingGridCard({ item, onClick }: DrawingGridCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!item.fileUrl) return;
    fetch(`/api/projects/${item.projectId}/drawings/${item.id}/download`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.downloadUrl) setPreviewUrl(data.downloadUrl); })
      .catch(() => {});
  }, [item.id, item.projectId, item.fileUrl]);

  const isPdf =
    item.fileType?.toLowerCase().includes("pdf") ||
    item.fileUrl?.toLowerCase().endsWith(".pdf");
  const isImage =
    item.fileType?.startsWith("image/") ||
    /\.(png|jpe?g|tiff?)$/i.test(item.fileUrl ?? "");

  return (
    <button
      type="button"
      className="w-full cursor-pointer rounded-lg border border-border text-left transition-shadow hover:shadow-sm overflow-hidden bg-card"
      onClick={() => onClick(item)}
    >
      {/* Landscape PDF thumbnail (11 × 8.5) */}
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
            <FileText className="h-12 w-12" />
          </div>
        )}
      </div>

      {/* Minimal footer */}
      <div className="px-2.5 py-2 border-t border-border">
        <p className="text-xs font-medium text-foreground truncate leading-tight">
          {item.title || "Untitled"}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {(() => {
            const normalize = (s: string) => s.replace(/[-_]/g, " ").trim().toLowerCase();
            const numberDiffersFromTitle =
              item.drawingNumber && normalize(item.drawingNumber) !== normalize(item.title);
            return (
              <>
                {numberDiffersFromTitle ? item.drawingNumber : null}
                {numberDiffersFromTitle && item.revisionNumber
                  ? ` · Rev ${item.revisionNumber}`
                  : item.revisionNumber
                  ? `Rev ${item.revisionNumber}`
                  : null}
              </>
            );
          })()}
        </p>
      </div>
    </button>
  );
}

export function renderDrawingCard(
  item: DrawingLogTableRow,
  onClick: (item: DrawingLogTableRow) => void,
): ReactElement {
  return <DrawingGridCard item={item} onClick={onClick} />;
}

export function renderDrawingList(
  item: DrawingLogTableRow,
  onClick: (item: DrawingLogTableRow) => void,
): ReactElement {
  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center justify-between rounded-md px-4 py-2 text-left transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div>
        <p className="text-sm font-medium">
          {item.drawingNumber} — {item.title || "Untitled"}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.revisionNumber ? `Rev. ${item.revisionNumber}` : "No rev."}
          {item.discipline ? ` · ${item.discipline}` : ""}
          {item.areaName ? ` · ${item.areaName}` : ""}
        </p>
      </div>
      {item.status && (
        <Badge variant={statusVariantMap[item.status] ?? "outline"}>
          {formatStatus(item.status)}
        </Badge>
      )}
    </button>
  );
}
