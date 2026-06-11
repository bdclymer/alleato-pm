"use client";

import Link from "next/link";

import {
  CellDate,
  CellStatus,
  type ColumnConfig,
  type FilterConfig,
  type TableColumn,
} from "@/components/tables/unified";
import { Badge } from "@/components/ui/badge";
import type { DailyBriefHistoryItem } from "@/lib/daily-briefs/types";

export const dailyBriefColumns: ColumnConfig[] = [
  { id: "recapDate", label: "Brief Date", alwaysVisible: true },
  { id: "workflowStatus", label: "Status", defaultVisible: true },
  { id: "delivery", label: "Delivery", defaultVisible: true },
  { id: "items", label: "Items", defaultVisible: true },
  { id: "sourceCoverage", label: "Sources", defaultVisible: true },
  { id: "approvedAt", label: "Approved", defaultVisible: true },
  { id: "sentAt", label: "Sent", defaultVisible: true },
  { id: "window", label: "Window", defaultVisible: false },
  { id: "modelUsed", label: "Model", defaultVisible: false },
  { id: "createdAt", label: "Created", defaultVisible: false },
];

export const dailyBriefDefaultVisibleColumns = dailyBriefColumns
  .filter((column) => column.defaultVisible || column.alwaysVisible)
  .map((column) => column.id);

export const dailyBriefFilters: FilterConfig[] = [
  {
    id: "workflowStatus",
    label: "Status",
    type: "select",
    options: [
      { value: "approved", label: "Approved" },
      { value: "draft", label: "Draft" },
    ],
  },
  {
    id: "delivery",
    label: "Delivery",
    type: "select",
    options: [
      { value: "sent", label: "Sent to Teams" },
      { value: "not_sent", label: "Not sent to Teams" },
    ],
  },
  {
    id: "packet",
    label: "Packet",
    type: "select",
    options: [
      { value: "ready", label: "Ready" },
      { value: "warnings", label: "Source warnings" },
      { value: "missing", label: "Missing packet" },
    ],
  },
];

function formatDateForExport(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function formatDayRange(item: DailyBriefHistoryItem) {
  if (item.dateRangeStart === item.dateRangeEnd) {
    return item.dateRangeStart;
  }
  return `${item.dateRangeStart} to ${item.dateRangeEnd}`;
}

function DeliveryCell({ item }: { item: DailyBriefHistoryItem }) {
  if (item.sentTeams) {
    return <Badge variant="outline">Teams sent</Badge>;
  }
  if (item.workflowStatus === "approved") {
    return <span className="text-sm text-muted-foreground">Approved, not sent</span>;
  }
  return <span className="text-sm text-muted-foreground">Not ready</span>;
}

function SourceCoverageCell({ item }: { item: DailyBriefHistoryItem }) {
  if (!item.hasPacket) {
    return <span className="text-sm text-destructive">Missing packet</span>;
  }
  if (item.sourceWarningCount > 0) {
    return (
      <span className="text-sm text-warning">
        {item.sourceWarningCount} warning{item.sourceWarningCount === 1 ? "" : "s"}
      </span>
    );
  }
  return (
    <span className="text-sm text-muted-foreground">
      {item.sourceCoverageCount} source{item.sourceCoverageCount === 1 ? "" : "s"}
    </span>
  );
}

export function buildDailyBriefTableColumns(): TableColumn<DailyBriefHistoryItem>[] {
  return [
    {
      id: "recapDate",
      label: "Brief Date",
      alwaysVisible: true,
      sortable: true,
      sortValue: (item) => item.recapDate,
      render: (item) => (
        <Link
          href="/executive"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {item.recapDate}
        </Link>
      ),
      csvValue: (item) => item.recapDate,
      width: 150,
    },
    {
      id: "workflowStatus",
      label: "Status",
      defaultVisible: true,
      sortable: true,
      sortValue: (item) => item.workflowStatus,
      render: (item) => <CellStatus value={item.workflowStatus} />,
      csvValue: (item) => item.workflowStatus,
      width: 140,
    },
    {
      id: "delivery",
      label: "Delivery",
      defaultVisible: true,
      sortable: true,
      sortValue: (item) => (item.sentTeams ? 1 : 0),
      render: (item) => <DeliveryCell item={item} />,
      csvValue: (item) =>
        item.sentTeams
          ? "Teams sent"
          : item.workflowStatus === "approved"
            ? "Approved, not sent"
            : "Not ready",
      width: 170,
    },
    {
      id: "items",
      label: "Items",
      defaultVisible: true,
      sortable: true,
      sortValue: (item) => item.itemCounts.total,
      align: "right",
      render: (item) => (
        <span className="tabular-nums text-sm">
          {item.itemCounts.total}
          <span className="ml-1 text-muted-foreground">
            ({item.itemCounts.needsBrandon}/{item.itemCounts.waitingOnOthers}/
            {item.itemCounts.importantUpdates})
          </span>
        </span>
      ),
      csvValue: (item) =>
        `${item.itemCounts.total} total; ${item.itemCounts.needsBrandon} needs Brandon; ${item.itemCounts.waitingOnOthers} waiting; ${item.itemCounts.importantUpdates} updates`,
      width: 150,
    },
    {
      id: "sourceCoverage",
      label: "Sources",
      defaultVisible: true,
      sortable: true,
      sortValue: (item) => item.sourceWarningCount,
      render: (item) => <SourceCoverageCell item={item} />,
      csvValue: (item) =>
        item.hasPacket
          ? `${item.sourceCoverageCount} sources; ${item.sourceWarningCount} warnings`
          : "Missing packet",
      width: 150,
    },
    {
      id: "approvedAt",
      label: "Approved",
      defaultVisible: true,
      sortable: true,
      sortValue: (item) => item.approvedAt,
      render: (item) => <CellDate value={item.approvedAt} />,
      csvValue: (item) => formatDateForExport(item.approvedAt),
      width: 160,
    },
    {
      id: "sentAt",
      label: "Sent",
      defaultVisible: true,
      sortable: true,
      sortValue: (item) => item.sentAt,
      render: (item) => <CellDate value={item.sentAt} />,
      csvValue: (item) => formatDateForExport(item.sentAt),
      width: 160,
    },
    {
      id: "window",
      label: "Window",
      defaultVisible: false,
      sortable: true,
      sortValue: (item) => item.windowDays,
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.windowDays ? `${item.windowDays}d` : formatDayRange(item)}
        </span>
      ),
      csvValue: (item) => item.windowDays ? `${item.windowDays} days` : formatDayRange(item),
      width: 120,
    },
    {
      id: "modelUsed",
      label: "Model",
      defaultVisible: false,
      sortable: true,
      sortValue: (item) => item.modelUsed,
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.modelUsed ?? "Unknown"}
        </span>
      ),
      csvValue: (item) => item.modelUsed ?? "",
      width: 140,
    },
    {
      id: "createdAt",
      label: "Created",
      defaultVisible: false,
      sortable: true,
      sortValue: (item) => item.createdAt,
      render: (item) => <CellDate value={item.createdAt} />,
      csvValue: (item) => formatDateForExport(item.createdAt),
      width: 160,
    },
  ];
}
