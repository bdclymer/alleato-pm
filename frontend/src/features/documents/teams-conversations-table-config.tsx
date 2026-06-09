"use client";

import type { ReactElement } from "react";

import { formatDate } from "@/lib/format";

import { StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import type {
  ColumnConfig,
  TableColumn,
} from "@/components/tables/unified";

import type { PipelineDoc } from "./documents-table-config";

function getConversationSummary(item: PipelineDoc): string | null {
  const value = item.overview || item.summary;
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function getParticipants(item: PipelineDoc): string[] {
  if (Array.isArray(item.participants_array) && item.participants_array.length > 0) {
    return item.participants_array
      .map((participant) => participant.trim())
      .filter(Boolean);
  }

  if (!item.participants) return [];

  return item.participants
    .replace(/[{}"]/g, "")
    .split(/[,;|\n]+/)
    .map((participant) => participant.trim())
    .filter(Boolean);
}

function renderParticipants(item: PipelineDoc): ReactElement {
  const participants = getParticipants(item);
  if (participants.length === 0) {
    return <span className="text-sm text-muted-foreground italic">No participants</span>;
  }

  const preview = participants.slice(0, 2).join(", ");
  const remaining = participants.length - 2;

  return (
    <div className="min-w-0">
      <div className="truncate text-sm text-foreground">{preview}</div>
      <div className="text-xs text-muted-foreground">
        {participants.length} participant{participants.length === 1 ? "" : "s"}
        {remaining > 0 ? ` · +${remaining} more` : ""}
      </div>
    </div>
  );
}

function renderProject(item: PipelineDoc): ReactElement {
  if (!item.project_id) {
    return <span className="text-sm font-medium text-status-warning">Needs attribution</span>;
  }

  return (
    <div className="min-w-0">
      <div className="truncate text-sm text-foreground">
        {item.project_name || `Project #${item.project_id}`}
      </div>
      <div className="text-xs text-muted-foreground">Assigned</div>
    </div>
  );
}

function renderSummary(item: PipelineDoc): ReactElement {
  const summary = getConversationSummary(item);
  if (!summary) {
    return <span className="text-sm text-muted-foreground italic">No compiled summary yet</span>;
  }

  return (
    <div className="max-w-xl">
      <p className="line-clamp-3 text-sm text-foreground">{summary}</p>
    </div>
  );
}

function stageVariant(item: PipelineDoc): "success" | "warning" | "error" {
  if (item.error_message) return "error";
  if (item.pipeline_stage === "done") return "success";
  return "warning";
}

function formatConversationDate(item: PipelineDoc): string {
  return formatDate(item.date || item.captured_at || item.created_at);
}

export const teamsConversationColumns: ColumnConfig[] = [
  { id: "view", label: "", defaultVisible: true },
  { id: "title", label: "Conversation", alwaysVisible: true },
  { id: "project", label: "Project", defaultVisible: true },
  { id: "participants", label: "Participants", defaultVisible: true },
  { id: "summary", label: "Summary", defaultVisible: true },
  { id: "pipeline_stage", label: "Compiler", defaultVisible: true },
  { id: "date", label: "Activity", defaultVisible: true },
  { id: "source", label: "Source", defaultVisible: false },
  { id: "error", label: "Issue", defaultVisible: false },
];

export const teamsConversationDefaultVisibleColumns = teamsConversationColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

export function buildTeamsConversationTableColumns(): TableColumn<PipelineDoc>[] {
  return [
    {
      ...teamsConversationColumns[0],
      render: () => null,
      width: 36,
    },
    {
      ...teamsConversationColumns[1],
      render: (item) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">
            {item.title || "Untitled conversation"}
          </div>
          <div className="text-xs text-muted-foreground">
            {item.source_system || item.source || "Unknown source"}
          </div>
        </div>
      ),
      sortValue: (item) => item.title ?? "Untitled conversation",
      sortable: true,
      width: 260,
    },
    {
      ...teamsConversationColumns[2],
      render: renderProject,
      sortValue: (item) => item.project_name ?? item.project_id ?? 0,
      sortable: true,
      width: 180,
    },
    {
      ...teamsConversationColumns[3],
      render: renderParticipants,
      csvValue: (item) => getParticipants(item).join("; "),
      sortValue: (item) => getParticipants(item).length,
      sortable: true,
      width: 220,
    },
    {
      ...teamsConversationColumns[4],
      render: renderSummary,
      csvValue: (item) => getConversationSummary(item) ?? "",
      sortValue: (item) => getConversationSummary(item) ?? "",
      sortable: true,
      width: 420,
    },
    {
      ...teamsConversationColumns[5],
      render: (item) => (
        <StatusBadge status={item.pipeline_stage === "done" ? "Complete" : item.pipeline_stage} variant={stageVariant(item)} />
      ),
      sortValue: (item) => item.pipeline_stage,
      sortable: true,
      width: 130,
    },
    {
      ...teamsConversationColumns[6],
      render: (item) => (
        <span className="text-sm text-muted-foreground">{formatConversationDate(item)}</span>
      ),
      csvValue: (item) => item.date || item.captured_at || item.created_at || "",
      sortValue: (item) => item.date || item.captured_at || item.created_at || "",
      sortable: true,
      width: 120,
    },
    {
      ...teamsConversationColumns[7],
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.source_system || item.source || "-"}
        </span>
      ),
      sortValue: (item) => item.source_system || item.source || "",
      sortable: true,
      width: 140,
    },
    {
      ...teamsConversationColumns[8],
      render: (item) =>
        item.error_message ? (
          <span className="line-clamp-2 text-xs text-destructive">{item.error_message}</span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
      csvValue: (item) => item.error_message ?? "",
      width: 260,
    },
  ];
}

export function renderTeamsConversationCard(
  item: PipelineDoc,
  onView: (item: PipelineDoc) => void,
): ReactElement {
  const participants = getParticipants(item);
  const summary = getConversationSummary(item);

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto flex flex-col gap-3 rounded-lg border border-border p-4 text-left hover:bg-muted/50"
      onClick={() => onView(item)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">
            {item.title || "Untitled conversation"}
          </div>
          <div className="text-xs text-muted-foreground">
            {item.project_name || (item.project_id ? `Project #${item.project_id}` : "Needs attribution")}
          </div>
        </div>
        <StatusBadge
          status={item.pipeline_stage === "done" ? "Complete" : item.pipeline_stage}
          variant={stageVariant(item)}
        />
      </div>

      {summary ? <p className="line-clamp-3 text-sm text-foreground">{summary}</p> : null}

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{formatConversationDate(item)}</span>
        <span>
          {participants.length > 0
            ? `${participants.length} participant${participants.length === 1 ? "" : "s"}`
            : "No participants"}
        </span>
        <span>{item.source_system || item.source || "Unknown source"}</span>
      </div>
    </Button>
  );
}

export function renderTeamsConversationList(
  item: PipelineDoc,
  onView: (item: PipelineDoc) => void,
): ReactElement {
  const participants = getParticipants(item);
  const summary = getConversationSummary(item);

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto flex w-full items-center justify-between gap-4 rounded-md px-3 py-2.5 text-left hover:bg-muted/50"
      onClick={() => onView(item)}
    >
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {item.title || "Untitled conversation"}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {summary || item.project_name || (item.project_id ? `Project #${item.project_id}` : "Needs attribution")}
        </span>
        <span className="text-xs text-muted-foreground">
          {[formatConversationDate(item), participants.length ? `${participants.length} participants` : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <StatusBadge
        status={item.pipeline_stage === "done" ? "Complete" : item.pipeline_stage}
        variant={stageVariant(item)}
      />
    </Button>
  );
}
