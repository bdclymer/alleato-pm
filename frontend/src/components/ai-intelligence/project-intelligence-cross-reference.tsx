"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  TableDateValue,
  TableTagBadge,
  CellLink,
  CellText,
  TruncatedCell,
  UnifiedTablePage,
  type TableColumn,
  type ViewMode,
} from "@/components/tables/unified";
import { apiFetch } from "@/lib/api-client";
import type {
  ClientProjectIntelligencePacket,
  ConfidenceLevel,
  InsightCardEvidence,
} from "@/lib/ai/intelligence/types";
import type {
  ProjectOperatingSourceCoverage,
  ProjectOperatingSummarySource,
} from "@/lib/ai/services/project-operating-summary-sources";
import {
  buildTasksFilters,
  buildTasksTableColumns,
  tasksColumns,
  tasksDefaultVisibleColumns,
} from "@/features/tasks/tasks-table-config";
import type { TasksRow } from "@/features/tasks/task-utils";
import { getTaskSourceLabel } from "@/features/tasks/task-utils";

type EvidenceWithCard = InsightCardEvidence & {
  cardId: string;
  cardTitle: string;
  cardType: string;
};

type SourceReferenceRow = ProjectOperatingSummarySource & {
  packetEvidence: EvidenceWithCard | null;
};

type CoverageRow = ProjectOperatingSourceCoverage & {
  inPacketCount: number;
};

const confidenceVariant: Record<ConfidenceLevel, "default" | "secondary" | "outline"> = {
  high: "default",
  medium: "secondary",
  low: "outline",
};

const sourceBadgeClass: Record<ProjectOperatingSummarySource["category"], string> = {
  project_detail: "border-sky-200 bg-sky-50 text-sky-700",
  meeting: "border-violet-200 bg-violet-50 text-violet-700",
  email: "border-emerald-200 bg-emerald-50 text-emerald-700",
  teams: "border-indigo-200 bg-indigo-50 text-indigo-700",
  document: "border-slate-200 bg-slate-50 text-slate-700",
  acumatica: "border-amber-200 bg-amber-50 text-amber-800",
  rfi: "border-cyan-200 bg-cyan-50 text-cyan-700",
  submittal: "border-teal-200 bg-teal-50 text-teal-700",
  drawing: "border-blue-200 bg-blue-50 text-blue-700",
  specification: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  daily_report: "border-lime-200 bg-lime-50 text-lime-800",
  task: "border-orange-200 bg-orange-50 text-orange-700",
  risk: "border-rose-200 bg-rose-50 text-rose-700",
};

function formatLabel(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function evidenceCategory(evidence: InsightCardEvidence): string {
  const raw = `${evidence.sourceCategory ?? ""} ${evidence.sourceType ?? ""}`.toLowerCase();
  if (raw.includes("meeting") || raw.includes("fireflies") || raw.includes("transcript")) return "meeting";
  if (raw.includes("email") || raw.includes("outlook")) return "email";
  if (raw.includes("teams") || raw.includes("chat") || raw.includes("message")) return "teams";
  if (raw.includes("rfi")) return "rfi";
  if (raw.includes("submittal")) return "submittal";
  if (raw.includes("drawing")) return "drawing";
  if (raw.includes("spec")) return "specification";
  if (raw.includes("task")) return "task";
  if (raw.includes("risk")) return "risk";
  return "document";
}

function packetEvidence(packet: ClientProjectIntelligencePacket): EvidenceWithCard[] {
  return packet.cards.flatMap((card) =>
    card.evidence.map((evidence) => ({
      ...evidence,
      cardId: card.id,
      cardTitle: card.title,
      cardType: card.cardType,
    })),
  );
}

function evidenceMatchKeys(evidence: EvidenceWithCard): string[] {
  return [
    evidence.sourceDocumentId,
    evidence.sourceMessageId,
    evidence.sourceChunkId,
    evidence.id,
  ].filter((value): value is string => Boolean(value));
}

function buildSourceRows(
  sources: ProjectOperatingSummarySource[],
  evidenceRows: EvidenceWithCard[],
): SourceReferenceRow[] {
  const evidenceByKey = new Map<string, EvidenceWithCard>();
  for (const evidence of evidenceRows) {
    for (const key of evidenceMatchKeys(evidence)) {
      evidenceByKey.set(key, evidence);
      evidenceByKey.set(`document_metadata:${key}`, evidence);
    }
  }

  return sources.map((source) => ({
    ...source,
    packetEvidence:
      evidenceByKey.get(source.recordId) ??
      evidenceByKey.get(source.id) ??
      null,
  }));
}

function cardHref(projectId: number, evidence: EvidenceWithCard | null): string | null {
  if (!evidence) return null;
  return `/${projectId}/intelligence#insight-card-${encodeURIComponent(evidence.cardId)}`;
}

function FeedbackButtons({
  row,
  projectId,
  onRecorded,
}: {
  row: SourceReferenceRow;
  projectId: number;
  onRecorded: (evidenceId: string, signal: "useful" | "wrong" | "stale") => void;
}) {
  const [busySignal, setBusySignal] = useState<"useful" | "wrong" | "stale" | null>(null);
  const evidence = row.packetEvidence;

  async function submit(signal: "useful" | "wrong" | "stale") {
    if (!evidence) return;
    setBusySignal(signal);
    try {
      await apiFetch("/api/ai-assistant/packet-card-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          insightCardId: evidence.cardId,
          signal,
          reason:
            signal === "useful"
              ? `Source ${row.title ?? row.recordId} supports ${evidence.cardTitle}.`
              : `Source ${row.title ?? row.recordId} needs review before it supports ${evidence.cardTitle}.`,
          correction: null,
          cardSnapshot: {
            id: evidence.cardId,
            title: evidence.cardTitle,
            cardType: evidence.cardType,
            evidenceId: evidence.id,
            sourceId: row.recordId,
            sourceTitle: row.title,
          },
          metadata: {
            projectId,
            surface: "project_intelligence_source_cross_reference",
            evidenceId: evidence.id,
            sourceId: row.recordId,
            sourceCategory: row.category,
          },
        }),
      });
      onRecorded(evidence.id, signal);
      toast.success(signal === "useful" ? "Source approved" : "Source review queued");
    } catch (error) {
      toast.error("Could not save source review", {
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setBusySignal(null);
    }
  }

  if (!evidence) {
    return <span className="text-xs text-muted-foreground">Not in packet</span>;
  }

  return (
    <div className="flex items-center gap-1" data-row-interactive="true">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={busySignal !== null}
        onClick={() => void submit("useful")}
        aria-label="Approve source"
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={busySignal !== null}
        onClick={() => void submit("wrong")}
        aria-label="Reject source"
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={busySignal !== null}
        onClick={() => void submit("stale")}
        aria-label="Mark source stale"
      >
        <Clock className="h-4 w-4" />
      </Button>
    </div>
  );
}

function useLocalTableState(defaultView: ViewMode = "table") {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>(defaultView);
  const [filters, setFilters] = useState<Record<string, string | number | boolean | string[] | null | undefined>>({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  return { search, setSearch, view, setView, filters, setFilters, page, setPage, perPage, setPerPage };
}

export function ProjectIntelligenceSourceTables({
  projectId,
  packet,
  sources,
  coverage,
}: {
  projectId: number;
  packet: ClientProjectIntelligencePacket;
  sources: ProjectOperatingSummarySource[];
  coverage: ProjectOperatingSourceCoverage[];
}) {
  const evidenceRows = useMemo(() => packetEvidence(packet), [packet]);
  const [reviewedEvidence, setReviewedEvidence] = useState<Record<string, "useful" | "wrong" | "stale">>({});
  const coverageState = useLocalTableState();
  const sourceState = useLocalTableState();

  const packetCountsByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const evidence of evidenceRows) {
      const category = evidenceCategory(evidence);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return counts;
  }, [evidenceRows]);

  const coverageRows = useMemo<CoverageRow[]>(
    () =>
      coverage.map((row) => ({
        ...row,
        inPacketCount: packetCountsByCategory.get(row.category) ?? 0,
      })),
    [coverage, packetCountsByCategory],
  );

  const sourceRows = useMemo(
    () => buildSourceRows(sources, evidenceRows),
    [sources, evidenceRows],
  );

  const filteredCoverage = useMemo(() => {
    const query = coverageState.search.trim().toLowerCase();
    if (!query) return coverageRows;
    return coverageRows.filter((row) =>
      [row.label, row.tableNames.join(" "), row.sampleTitles.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [coverageRows, coverageState.search]);

  const filteredSources = useMemo(() => {
    const query = sourceState.search.trim().toLowerCase();
    const categoryFilter = sourceState.filters.category;
    const packetFilter = sourceState.filters.packet_status;
    return sourceRows.filter((row) => {
      if (typeof categoryFilter === "string" && categoryFilter && row.category !== categoryFilter) return false;
      if (packetFilter === "in_packet" && !row.packetEvidence) return false;
      if (packetFilter === "available_only" && row.packetEvidence) return false;
      if (!query) return true;
      return [row.title, row.text, row.category, row.packetEvidence?.cardTitle]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [sourceRows, sourceState.filters, sourceState.search]);

  const coverageColumns = useMemo<TableColumn<CoverageRow>[]>(
    () => [
      {
        id: "label",
        label: "Source group",
        alwaysVisible: true,
        render: (row) => <CellText value={row.label} className="font-medium" />,
        sortValue: (row) => row.label,
        sortable: true,
      },
      {
        id: "tableNames",
        label: "Data tables",
        render: (row) => <TruncatedCell value={row.tableNames.join(", ")} maxWidth={260} className="text-muted-foreground" />,
      },
      {
        id: "availableCount",
        label: "Available",
        render: (row) => <span className="text-sm text-foreground">{row.availableCount}</span>,
        sortValue: (row) => row.availableCount,
        sortable: true,
      },
      {
        id: "inPacketCount",
        label: "In packet",
        render: (row) => (
          <TableTagBadge
            label={`${row.inPacketCount} in packet`}
            variant={row.inPacketCount > 0 ? "default" : "outline"}
          />
        ),
        sortValue: (row) => row.inPacketCount,
        sortable: true,
      },
      {
        id: "latestAt",
        label: "Latest",
        render: (row) => <TableDateValue value={row.latestAt} />,
        sortValue: (row) => row.latestAt ?? "",
        sortable: true,
      },
      {
        id: "sampleTitles",
        label: "Examples",
        render: (row) => (
          <TruncatedCell
            value={row.sampleTitles.length > 0 ? row.sampleTitles.join("; ") : null}
            maxWidth={420}
            emptyLabel="No records found by source builder"
            className="text-muted-foreground"
          />
        ),
      },
    ],
    [],
  );

  const sourceColumns = useMemo<TableColumn<SourceReferenceRow>[]>(
    () => [
      {
        id: "category",
        label: "Source",
        render: (row) => (
          <TableTagBadge
            label={formatLabel(row.category)}
            variant="outline"
            className={sourceBadgeClass[row.category]}
          />
        ),
        sortValue: (row) => row.category,
        sortable: true,
      },
      {
        id: "title",
        label: "Record",
        alwaysVisible: true,
        render: (row) => (
          <CellLink
            value={row.title ?? row.recordId}
            href={row.href ?? null}
            className="block max-w-72 truncate font-medium"
          />
        ),
        sortValue: (row) => row.title ?? row.recordId,
        sortable: true,
      },
      {
        id: "projectName",
        label: "Project",
        render: (row) => (
          <TruncatedCell
            value={row.projectName}
            maxWidth={180}
            className="text-muted-foreground"
          />
        ),
        sortValue: (row) => row.projectName ?? "",
        sortable: true,
      },
      {
        id: "text",
        label: "Description",
        render: (row) => (
          <TruncatedCell
            value={row.text}
            maxWidth={420}
            className="text-muted-foreground"
          />
        ),
      },
      {
        id: "capturedAt",
        label: "Date",
        render: (row) => <TableDateValue value={row.capturedAt} />,
        sortValue: (row) => row.capturedAt ?? "",
        sortable: true,
      },
      {
        id: "packet_status",
        label: "Packet status",
        render: (row) => (
          <TableTagBadge
            label={row.packetEvidence ? "Linked" : "Available only"}
            variant={row.packetEvidence ? "default" : "outline"}
          />
        ),
        sortValue: (row) => (row.packetEvidence ? 1 : 0),
        sortable: true,
      },
      {
        id: "card",
        label: "Intelligence card",
        render: (row) => (
          <CellLink
            value={row.packetEvidence?.cardTitle}
            href={cardHref(projectId, row.packetEvidence)}
            emptyLabel="Not used by current packet"
            external
            className="block max-w-64 truncate text-muted-foreground"
          />
        ),
      },
      {
        id: "confidence",
        label: "Confidence",
        render: (row) =>
          row.packetEvidence ? (
            <TableTagBadge
              label={formatLabel(row.packetEvidence.confidence)}
              variant={confidenceVariant[row.packetEvidence.confidence]}
            />
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          ),
      },
      {
        id: "review",
        label: "Review",
        render: (row) => {
          const signal = row.packetEvidence ? reviewedEvidence[row.packetEvidence.id] : null;
          if (signal) {
            return (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {signal === "useful" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                {formatLabel(signal)}
              </span>
            );
          }
          return (
            <FeedbackButtons
              row={row}
              projectId={projectId}
              onRecorded={(evidenceId, nextSignal) =>
                setReviewedEvidence((current) => ({ ...current, [evidenceId]: nextSignal }))
              }
            />
          );
        },
      },
    ],
    [projectId, reviewedEvidence],
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(sourceRows.map((row) => row.category)))
        .sort()
        .map((category) => ({ value: category, label: formatLabel(category) })),
    [sourceRows],
  );

  return (
    <section className="space-y-8">
      <UnifiedTablePage<CoverageRow>
        header={{
          title: "Available Sources vs Packet Usage",
          description: "Cross-reference every source category the project intelligence builder can see against what the current packet actually used.",
          variant: "compact",
        }}
        toolbar={{
          totalItems: coverageRows.length,
          filteredItems: filteredCoverage.length,
          selectedCount: 0,
          searchValue: coverageState.search,
          onSearchChange: coverageState.setSearch,
          searchPlaceholder: "Search source groups...",
          currentView: coverageState.view,
          onViewChange: coverageState.setView,
          enabledViews: ["table"],
        }}
        data={{ items: filteredCoverage, isLoading: false, isFetching: false }}
        table={{
          columns: coverageColumns,
          getRowId: (row) => row.category,
          density: "compact",
        }}
        emptyState={{
          title: "No source coverage found",
          description: "The source builder did not return coverage rows for this project.",
          filteredDescription: "No source groups match the current search.",
          isFiltered: coverageState.search.trim().length > 0,
        }}
        layout={{ containerPadding: false, removeTableFrame: true }}
        features={{
          enableViews: false,
          enableRowSelection: false,
          enableRowActions: false,
          enableBulkDelete: false,
          enableColumnReorder: false,
          enableColumnPinning: false,
        }}
      />

      <UnifiedTablePage<SourceReferenceRow>
        header={{
          title: "Associated Source Records",
          description: "Meetings, emails, Teams messages, documents, tasks, RFIs, submittals, drawings, specs, financial rows, and daily reports available to project intelligence.",
          variant: "compact",
        }}
        toolbar={{
          totalItems: sourceRows.length,
          filteredItems: filteredSources.length,
          selectedCount: 0,
          searchValue: sourceState.search,
          onSearchChange: sourceState.setSearch,
          searchPlaceholder: "Search associated records...",
          currentView: sourceState.view,
          onViewChange: sourceState.setView,
          enabledViews: ["table"],
          filters: [
            { id: "category", label: "Source", type: "select", options: categoryOptions },
            {
              id: "packet_status",
              label: "Packet status",
              type: "select",
              options: [
                { value: "in_packet", label: "In packet" },
                { value: "available_only", label: "Available only" },
              ],
            },
          ],
          activeFilters: sourceState.filters,
          onFilterChange: sourceState.setFilters,
          onClearFilters: () => sourceState.setFilters({}),
        }}
        data={{ items: filteredSources, isLoading: false, isFetching: false }}
        table={{
          columns: sourceColumns,
          getRowId: (row) => row.id,
          density: "compact",
          defaultPinnedLeftColumns: ["category", "title"],
        }}
        emptyState={{
          title: "No associated records found",
          description: "No meetings, emails, documents, tasks, or operating records were returned for this project.",
          filteredDescription: "No associated records match the current filters.",
          isFiltered: sourceState.search.trim().length > 0 || Object.keys(sourceState.filters).length > 0,
        }}
        pagination={{
          page: sourceState.page,
          totalPages: Math.max(1, Math.ceil(filteredSources.length / sourceState.perPage)),
          perPage: sourceState.perPage,
          onPageChange: sourceState.setPage,
          onPerPageChange: (value) => {
            sourceState.setPerPage(Number(value));
            sourceState.setPage(1);
          },
          clientSide: true,
        }}
        layout={{ containerPadding: false, removeTableFrame: true }}
        features={{
          enableViews: false,
          enableRowSelection: false,
          enableBulkDelete: false,
          enableColumnReorder: false,
          enableColumnPinning: true,
        }}
      />
    </section>
  );
}

export function ProjectIntelligenceTasksTable({
  projectId,
  projectName,
}: {
  projectId: number;
  projectName: string | null;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TasksRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("table");
  const [filters, setFilters] = useState<Record<string, string | number | boolean | string[] | null | undefined>>({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      setLoading(true);
      try {
        const response = await apiFetch<{ data?: TasksRow[] }>(`/api/tasks?project_id=${projectId}&scope=all`);
        const projectTasks = (response.data ?? []).filter((task) => {
          if (task.project_id === projectId) return true;
          if (task.project_ids?.includes(projectId)) return true;
          if (projectName && task.project_name === projectName) return true;
          return false;
        });
        if (!cancelled) setTasks(projectTasks);
      } catch (error) {
        if (!cancelled) {
          toast.error("Failed to load project tasks", {
            description: error instanceof Error ? error.message : "Unexpected error",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchTasks();
    return () => {
      cancelled = true;
    };
  }, [projectId, projectName]);

  const taskFilters = useMemo(() => buildTasksFilters(tasks), [tasks]);
  const taskColumns = useMemo(() => buildTasksTableColumns(String(projectId)), [projectId]);
  const visibleColumns = useMemo(
    () => tasksDefaultVisibleColumns.filter((column) => column !== "assignee_email"),
    [],
  );

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const statusFilter = filters.status;
      const sourceFilter = filters.source_system;
      if (typeof statusFilter === "string" && statusFilter && task.status !== statusFilter) return false;
      if (typeof sourceFilter === "string" && sourceFilter && getTaskSourceLabel(task) !== sourceFilter) return false;
      if (!query) return true;
      return [
        task.title,
        task.description,
        task.assignee_name,
        task.project_name,
        task.source_title,
        task.status,
        task.priority,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [filters, search, tasks]);

  return (
    <UnifiedTablePage<TasksRow>
      header={{
        title: "Project Tasks",
        description: projectName
          ? `The same project task table filtered to ${projectName}.`
          : "The same project task table filtered to this project.",
        variant: "compact",
        actions: (
          <Button asChild size="sm" variant="outline">
            <Link href={`/${projectId}/tasks`}>Open task page</Link>
          </Button>
        ),
      }}
      toolbar={{
        totalItems: tasks.length,
        filteredItems: filteredTasks.length,
        selectedCount: 0,
        searchValue: search,
        onSearchChange: setSearch,
        searchPlaceholder: "Search project tasks...",
        currentView: view,
        onViewChange: setView,
        enabledViews: ["table"],
        filters: taskFilters,
        activeFilters: filters,
        onFilterChange: setFilters,
        onClearFilters: () => setFilters({}),
        columns: tasksColumns,
        visibleColumns,
      }}
      data={{ items: filteredTasks, isLoading: loading, isFetching: false }}
      table={{
        columns: taskColumns,
        getRowId: (task) => task.id ?? "",
        density: "compact",
        onRowClick: (task) => {
          if (task.id) router.push(`/${projectId}/tasks?task=${encodeURIComponent(task.id)}`);
        },
      }}
      emptyState={{
        title: "No project tasks found",
        description: "No generated or assigned tasks are currently linked to this project.",
        filteredDescription: "No project tasks match the current filters.",
        isFiltered: search.trim().length > 0 || Object.keys(filters).length > 0,
      }}
      pagination={{
        page,
        totalPages: Math.max(1, Math.ceil(filteredTasks.length / perPage)),
        perPage,
        onPageChange: setPage,
        onPerPageChange: (value) => {
          setPerPage(Number(value));
          setPage(1);
        },
        clientSide: true,
      }}
      layout={{ containerPadding: false, removeTableFrame: true }}
      features={{
        enableViews: false,
        enableRowSelection: false,
        enableRowActions: false,
        enableBulkDelete: false,
        enableColumnReorder: false,
        enableColumnPinning: false,
      }}
    />
  );
}
