import type { ReactElement } from "react";

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

export function renderDrawingCard(
  item: DrawingLogTableRow,
  onClick: (item: DrawingLogTableRow) => void,
): ReactElement {
  return (
    <button
      type="button"
      className="w-full cursor-pointer rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            {item.drawingNumber}
            {item.revisionNumber ? ` Rev. ${item.revisionNumber}` : ""}
          </p>
          <h3 className="font-medium">{item.title || "Untitled"}</h3>
        </div>
        {item.status && (
          <Badge variant={statusVariantMap[item.status] ?? "outline"}>
            {formatStatus(item.status)}
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {[item.discipline, item.drawingType].filter(Boolean).join(" · ") || "-"}
      </p>
      {item.areaName && (
        <p className="mt-1 text-xs text-muted-foreground">
          Area: {item.areaName}
        </p>
      )}
    </button>
  );
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
