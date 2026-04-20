import * as React from "react";
import type { ReactElement } from "react";

import { formatDate } from "@/lib/format";
import type {
  ColumnConfig,
  FilterConfig,
  TableColumn,
} from "@/components/tables/unified";
import { Badge } from "@/components/ui/badge";

export interface SubmittalTableRow {
  id: string;
  // Procore-aligned columns (12)
  specification_section: string | null;
  submittal_number: string;
  revision: number;
  title: string;
  submittal_type_name: string | null;
  status: string;
  responsible_contractor: string | null;
  received_from: string | null;
  ball_in_court: string | null;
  approvers: string | null;
  latest_response: string | null;
  sent_date: string | null;
  // Extra display helpers
  is_private: boolean;
  division: string | null;
  final_due_date: string | null;
  deleted_at: string | null;
}

// ─── Status / Response badge maps ────────────────────────────────────────────

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success"
> = {
  // Form enum values
  Draft: "secondary",
  Open: "default",
  Distributed: "outline",
  Closed: "success",
  // Legacy / seeded values
  approved: "success",
  "approved as noted": "success",
  requires_revision: "destructive",
  revise_and_resubmit: "destructive",
  rejected: "destructive",
  under_review: "default",
  submitted: "secondary",
  pending: "outline",
};

const responseVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success"
> = {
  Submitted: "default",
  Pending: "outline",
  Approved: "success",
  "Approved as Noted": "success",
  Revise: "destructive",
  Rejected: "destructive",
};

// ─── Column definitions ───────────────────────────────────────────────────────

export const submittalColumns: ColumnConfig[] = [
  { id: "specification_section", label: "Spec Section", defaultVisible: true },
  { id: "submittal_number", label: "#", alwaysVisible: true },
  { id: "revision", label: "Rev.", defaultVisible: true },
  { id: "title", label: "Title", defaultVisible: true },
  { id: "submittal_type_name", label: "Type", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "responsible_contractor", label: "Responsible C.", defaultVisible: true },
  { id: "received_from", label: "Received From", defaultVisible: false },
  { id: "ball_in_court", label: "Ball In Court", defaultVisible: true },
  { id: "approvers", label: "Approvers", defaultVisible: false },
  { id: "latest_response", label: "Response", defaultVisible: true },
  { id: "sent_date", label: "Sent Date", defaultVisible: true },
];

export const submittalDefaultVisibleColumns = submittalColumns
  .filter((c) => c.defaultVisible !== false || c.alwaysVisible)
  .map((c) => c.id);

// ─── Filters ─────────────────────────────────────────────────────────────────

export const submittalFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: ["Draft", "Open", "Distributed", "Closed"].map((v) => ({
      value: v,
      label: v,
    })),
  },
  {
    id: "latest_response",
    label: "Response",
    type: "select",
    options: [
      "Submitted",
      "Pending",
      "Approved",
      "Approved as Noted",
      "Revise",
      "Rejected",
    ].map((v) => ({ value: v, label: v })),
  },
  {
    id: "division",
    label: "Division",
    type: "text",
  },
];

// ─── Table columns ────────────────────────────────────────────────────────────

export function buildSubmittalTableColumns(): TableColumn<SubmittalTableRow>[] {
  return [
    {
      ...submittalColumns[0],
      render: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.specification_section || "-"}
        </span>
      ),
      sortValue: (item) => item.specification_section ?? "",
    },
    {
      ...submittalColumns[1],
      render: (item) => (
        <span className="font-medium">{item.submittal_number || "-"}</span>
      ),
      sortValue: (item) => item.submittal_number,
    },
    {
      ...submittalColumns[2],
      render: (item) => <span>{item.revision ?? 0}</span>,
      sortValue: (item) => item.revision ?? 0,
    },
    {
      ...submittalColumns[3],
      render: (item) => (
        <span className="max-w-[240px] truncate block" title={item.title}>
          {item.title || "Untitled"}
        </span>
      ),
      sortValue: (item) => item.title,
    },
    {
      ...submittalColumns[4],
      render: (item) => <span>{item.submittal_type_name || "-"}</span>,
      sortValue: (item) => item.submittal_type_name ?? "",
    },
    {
      ...submittalColumns[5],
      render: (item) => (
        <Badge variant={statusVariantMap[item.status] ?? "outline"}>
          {item.status || "-"}
        </Badge>
      ),
      sortValue: (item) => item.status,
    },
    {
      ...submittalColumns[6],
      render: (item) => <span>{item.responsible_contractor || "-"}</span>,
      sortValue: (item) => item.responsible_contractor ?? "",
    },
    {
      ...submittalColumns[7],
      render: (item) => <span>{item.received_from || "-"}</span>,
      sortValue: (item) => item.received_from ?? "",
    },
    {
      ...submittalColumns[8],
      render: (item) => <span>{item.ball_in_court || "-"}</span>,
      sortValue: (item) => item.ball_in_court ?? "",
    },
    {
      ...submittalColumns[9],
      render: (item) => <span>{item.approvers || "-"}</span>,
      sortValue: (item) => item.approvers ?? "",
    },
    {
      ...submittalColumns[10],
      render: (item) =>
        item.latest_response ? (
          <Badge variant={responseVariantMap[item.latest_response] ?? "outline"}>
            {item.latest_response}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      sortValue: (item) => item.latest_response ?? "",
    },
    {
      ...submittalColumns[11],
      render: (item) => <span>{formatDate(item.sent_date)}</span>,
      sortValue: (item) =>
        item.sent_date ? new Date(item.sent_date).getTime() : 0,
    },
  ];
}

// ─── Card / List views ────────────────────────────────────────────────────────

export function renderSubmittalCard(
  item: SubmittalTableRow,
  onClick: (item: SubmittalTableRow) => void,
): ReactElement {
  return (
    <div
      className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            {item.submittal_number} Rev.&nbsp;{item.revision ?? 0}
          </p>
          {/* eslint-disable-next-line design-system/no-raw-heading */}
          <h3 className="font-medium">{item.title || "Untitled"}</h3>
        </div>
        <Badge variant={statusVariantMap[item.status] ?? "outline"}>
          {item.status}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {item.specification_section || item.submittal_type_name || "-"}
      </p>
      {item.ball_in_court && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ball In Court: {item.ball_in_court}
        </p>
      )}
    </div>
  );
}

export function renderSubmittalList(
  item: SubmittalTableRow,
  onClick: (item: SubmittalTableRow) => void,
): ReactElement {
  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-md px-4 py-2 transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div>
        <p className="text-sm font-medium">
          {item.submittal_number} — {item.title || "Untitled"}
        </p>
        <p className="text-xs text-muted-foreground">
          Rev.&nbsp;{item.revision ?? 0} &middot;{" "}
          {item.specification_section || item.submittal_type_name || "-"}
        </p>
      </div>
      <Badge variant={statusVariantMap[item.status] ?? "outline"}>
        {item.status}
      </Badge>
    </div>
  );
}
