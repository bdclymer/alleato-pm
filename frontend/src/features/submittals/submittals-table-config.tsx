import * as React from "react";
import type { ReactElement } from "react";

import type {
  ColumnConfig,
  FilterConfig,
  TableColumn,
} from "@/components/tables/unified";
import { Badge } from "@/components/ui/badge";

export interface SubmittalTableRow {
  id: string;
  submittal_number: string;
  title: string;
  statusDisplay: string;
  priorityLabel: string;
  submitter_company: string;
  submission_date: string | null;
  required_approval_date: string | null;
  submittal_type_name: string | null;
  project_name: string | null;
  ballInCourt: boolean;
}

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success"
> = {
  Draft: "secondary",
  Submitted: "default",
  "Under Review": "outline",
  "Requires Revision": "destructive",
  Approved: "success",
  Rejected: "destructive",
  Superseded: "secondary",
};

const priorityVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  High: "destructive",
  Normal: "secondary",
  Low: "outline",
};

export const submittalColumns: ColumnConfig[] = [
  { id: "submittal_number", label: "Number", alwaysVisible: true },
  { id: "title", label: "Title", defaultVisible: true },
  { id: "submittal_type_name", label: "Type", defaultVisible: true },
  { id: "statusDisplay", label: "Status", defaultVisible: true },
  { id: "priorityLabel", label: "Priority", defaultVisible: true },
  { id: "submitter_company", label: "Submitted By", defaultVisible: true },
  { id: "submission_date", label: "Submitted", defaultVisible: true },
  { id: "required_approval_date", label: "Required Approval", defaultVisible: true },
  { id: "project_name", label: "Project", defaultVisible: false },
];

export const submittalDefaultVisibleColumns = submittalColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

export const submittalFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      "Draft",
      "Submitted",
      "Under Review",
      "Requires Revision",
      "Approved",
      "Rejected",
      "Superseded",
    ].map((status) => ({
      value: status,
      label: status,
    })),
  },
  {
    id: "priority",
    label: "Priority",
    type: "select",
    options: ["High", "Normal", "Low"].map((priority) => ({
      value: priority,
      label: priority,
    })),
  },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

export function buildSubmittalTableColumns(): TableColumn<SubmittalTableRow>[] {
  return [
    {
      ...submittalColumns[0],
      render: (item) => <span className="font-medium">{item.submittal_number || "-"}</span>,
      sortValue: (item) => item.submittal_number || "",
    },
    {
      ...submittalColumns[1],
      render: (item) => <span>{item.title || "Untitled Submittal"}</span>,
      sortValue: (item) => item.title || "",
    },
    {
      ...submittalColumns[2],
      render: (item) => <span>{item.submittal_type_name || "-"}</span>,
      sortValue: (item) => item.submittal_type_name || "",
    },
    {
      ...submittalColumns[3],
      render: (item) => (
        <Badge variant={statusVariantMap[item.statusDisplay] ?? "outline"}>
          {item.statusDisplay}
        </Badge>
      ),
      sortValue: (item) => item.statusDisplay,
    },
    {
      ...submittalColumns[4],
      render: (item) => (
        <Badge variant={priorityVariantMap[item.priorityLabel] ?? "secondary"}>
          {item.priorityLabel}
        </Badge>
      ),
      sortValue: (item) => item.priorityLabel,
    },
    {
      ...submittalColumns[5],
      render: (item) => <span>{item.submitter_company || "-"}</span>,
      sortValue: (item) => item.submitter_company || "",
    },
    {
      ...submittalColumns[6],
      render: (item) => <span>{formatDate(item.submission_date)}</span>,
      sortValue: (item) => (item.submission_date ? new Date(item.submission_date).getTime() : 0),
    },
    {
      ...submittalColumns[7],
      render: (item) => <span>{formatDate(item.required_approval_date)}</span>,
      sortValue: (item) =>
        item.required_approval_date ? new Date(item.required_approval_date).getTime() : 0,
    },
    {
      ...submittalColumns[8],
      render: (item) => <span>{item.project_name || "-"}</span>,
      sortValue: (item) => item.project_name || "",
    },
  ];
}

export function renderSubmittalCard(
  item: SubmittalTableRow,
  onClick: (item: SubmittalTableRow) => void,
): ReactElement {
  return (
    <div
      className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{item.submittal_number || "-"}</p>
          <h3 className="font-medium">{item.title || "Untitled Submittal"}</h3>
        </div>
        <Badge variant={statusVariantMap[item.statusDisplay] ?? "outline"}>
          {item.statusDisplay}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{item.submittal_type_name || "-"}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Required Approval: {formatDate(item.required_approval_date)}
      </p>
    </div>
  );
}

export function renderSubmittalList(
  item: SubmittalTableRow,
  onClick: (item: SubmittalTableRow) => void,
): ReactElement {
  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div>
        <p className="text-sm font-medium">{item.submittal_number || "-"}</p>
        <p className="text-xs text-muted-foreground">{item.title || "Untitled"}</p>
      </div>
      <Badge variant={statusVariantMap[item.statusDisplay] ?? "outline"}>
        {item.statusDisplay}
      </Badge>
    </div>
  );
}
