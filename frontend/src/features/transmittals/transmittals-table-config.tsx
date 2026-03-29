import * as React from "react";
import type { ReactElement } from "react";

import type {
  ColumnConfig,
  FilterConfig,
  TableColumn,
} from "@/components/tables/unified";
import { Badge } from "@/components/ui/badge";

export interface TransmittalTableRow {
  id: number;
  number: string;
  subject: string;
  status: string;
  to_company: string | null;
  from_company: string | null;
  delivery_method: string | null;
  sent_date: string | null;
  due_date: string | null;
  ball_in_court: string | null;
  is_private: boolean | null;
  deleted_at: string | null;
}

// ─── Status badge map ────────────────────────────────────────────────────────

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success"
> = {
  Draft: "secondary",
  Open: "default",
  Closed: "success",
  Void: "destructive",
};

// ─── Column definitions ───────────────────────────────────────────────────────

export const transmittalColumns: ColumnConfig[] = [
  { id: "number", label: "#", alwaysVisible: true },
  { id: "subject", label: "Subject", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "to_company", label: "To Company", defaultVisible: true },
  { id: "from_company", label: "From Company", defaultVisible: true },
  { id: "delivery_method", label: "Delivery Method", defaultVisible: true },
  { id: "sent_date", label: "Sent Date", defaultVisible: true },
  { id: "due_date", label: "Due Date", defaultVisible: true },
];

export const transmittalDefaultVisibleColumns = transmittalColumns
  .filter((c) => c.defaultVisible !== false || c.alwaysVisible)
  .map((c) => c.id);

// ─── Filters ─────────────────────────────────────────────────────────────────

export const transmittalFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: ["Draft", "Open", "Closed", "Void"].map((v) => ({
      value: v,
      label: v,
    })),
  },
  {
    id: "delivery_method",
    label: "Delivery Method",
    type: "select",
    options: [
      "Email",
      "Hand Delivery",
      "Mail",
      "Courier",
      "Fax",
      "Other",
    ].map((v) => ({ value: v, label: v })),
  },
];

// ─── Table columns ────────────────────────────────────────────────────────────

function formatDate(v: string | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}

export function buildTransmittalTableColumns(): TableColumn<TransmittalTableRow>[] {
  return [
    {
      ...transmittalColumns[0],
      render: (item) => (
        <span className="font-medium">{item.number || "-"}</span>
      ),
      sortValue: (item) => item.number,
    },
    {
      ...transmittalColumns[1],
      render: (item) => (
        <span className="max-w-[240px] truncate block" title={item.subject}>
          {item.subject || "Untitled"}
        </span>
      ),
      sortValue: (item) => item.subject,
    },
    {
      ...transmittalColumns[2],
      render: (item) => (
        <Badge variant={statusVariantMap[item.status] ?? "outline"}>
          {item.status || "-"}
        </Badge>
      ),
      sortValue: (item) => item.status,
    },
    {
      ...transmittalColumns[3],
      render: (item) => <span>{item.to_company || "-"}</span>,
      sortValue: (item) => item.to_company ?? "",
    },
    {
      ...transmittalColumns[4],
      render: (item) => <span>{item.from_company || "-"}</span>,
      sortValue: (item) => item.from_company ?? "",
    },
    {
      ...transmittalColumns[5],
      render: (item) => <span>{item.delivery_method || "-"}</span>,
      sortValue: (item) => item.delivery_method ?? "",
    },
    {
      ...transmittalColumns[6],
      render: (item) => <span>{formatDate(item.sent_date)}</span>,
      sortValue: (item) =>
        item.sent_date ? new Date(item.sent_date).getTime() : 0,
    },
    {
      ...transmittalColumns[7],
      render: (item) => <span>{formatDate(item.due_date)}</span>,
      sortValue: (item) =>
        item.due_date ? new Date(item.due_date).getTime() : 0,
    },
  ];
}

// ─── Card / List views ────────────────────────────────────────────────────────

export function renderTransmittalCard(
  item: TransmittalTableRow,
  onClick: (item: TransmittalTableRow) => void,
): ReactElement {
  return (
    <div
      className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            {item.number}
          </p>
          <h3 className="font-medium">{item.subject || "Untitled"}</h3>
        </div>
        <Badge variant={statusVariantMap[item.status] ?? "outline"}>
          {item.status}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {item.to_company ? `To: ${item.to_company}` : "-"}
        {item.from_company ? ` / From: ${item.from_company}` : ""}
      </p>
      {item.delivery_method && (
        <p className="mt-2 text-xs text-muted-foreground">
          {item.delivery_method}
          {item.sent_date ? ` - Sent ${formatDate(item.sent_date)}` : ""}
        </p>
      )}
    </div>
  );
}

export function renderTransmittalList(
  item: TransmittalTableRow,
  onClick: (item: TransmittalTableRow) => void,
): ReactElement {
  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-md px-4 py-2 transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div>
        <p className="text-sm font-medium">
          {item.number} — {item.subject || "Untitled"}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.to_company ? `To: ${item.to_company}` : "-"}
          {item.delivery_method ? ` / ${item.delivery_method}` : ""}
        </p>
      </div>
      <Badge variant={statusVariantMap[item.status] ?? "outline"}>
        {item.status}
      </Badge>
    </div>
  );
}
