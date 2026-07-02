"use client";

import * as React from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  InlineTable,
  InlineTableBody,
  InlineTableCell,
  InlineTableHeader,
  InlineTableHeaderCell,
  InlineTableHeaderRow,
  InlineTableRow,
} from "@/components/ds/inline-table";
import { StatusBadge } from "@/components/ds";
import {
  TableExpandedRow,
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import { CreateMeetingDialog } from "@/components/domain/meetings/create-meeting-dialog";
import { getMeetingDetailHref } from "@/features/meetings/meeting-routes";
import {
  buildMeetingSeriesColumns,
  formatMeetingDate,
  meetingSeriesColumns,
  meetingSeriesDefaultVisibleColumns,
  meetingStatusFilters,
  meetingStatusLabel,
  meetingStatusVariant,
  renderMeetingRowActions,
  renderRestoreMeetingAction,
  toSeriesRows,
  type MeetingSeriesRow,
} from "@/features/meetings/meeting-series-table-config";
import {
  type MeetingListItem,
  type MeetingStatus,
  useDeleteMeeting,
  useMeetingSeriesList,
  useRestoreMeeting,
} from "@/hooks/use-meetings";

const EMPTY_FILTERS: Record<string, FilterValue> = {
  status: undefined,
};

function isMeetingStatus(value: unknown): value is MeetingStatus {
  return value === "draft" || value === "awaiting_minutes" || value === "minutes";
}

// ─── Expanded sub-row: meetings belonging to one series ───────────────────

interface SeriesMeetingsRowProps {
  meetings: MeetingListItem[];
  colSpan: number;
  projectId: string;
  isRecycleBin: boolean;
  onDeleteMeeting: (meeting: MeetingListItem) => void;
  onRestoreMeeting: (meeting: MeetingListItem) => void;
}

function SeriesMeetingsRow({
  meetings,
  colSpan,
  projectId,
  isRecycleBin,
  onDeleteMeeting,
  onRestoreMeeting,
}: SeriesMeetingsRowProps): React.ReactNode {
  const router = useRouter();

  if (meetings.length === 0) return null;

  return (
    <TableExpandedRow colSpan={colSpan}>
      <div className="px-6 py-3">
        <InlineTable variant="read">
          <InlineTableHeader>
            <InlineTableHeaderRow>
              <InlineTableHeaderCell>#</InlineTableHeaderCell>
              <InlineTableHeaderCell>Date</InlineTableHeaderCell>
              <InlineTableHeaderCell>Location</InlineTableHeaderCell>
              <InlineTableHeaderCell>Status</InlineTableHeaderCell>
              <InlineTableHeaderCell align="right">Agenda Items</InlineTableHeaderCell>
              <InlineTableHeaderCell>Template</InlineTableHeaderCell>
              <InlineTableHeaderCell aria-label="Actions" />
            </InlineTableHeaderRow>
          </InlineTableHeader>
          <InlineTableBody>
            {meetings.map((meeting) => (
              <InlineTableRow
                key={meeting.id}
                className="cursor-pointer"
                onClick={() =>
                  router.push(getMeetingDetailHref({ projectId, meetingId: meeting.id }))
                }
              >
                <InlineTableCell className="font-mono text-muted-foreground">
                  #{meeting.number}
                </InlineTableCell>
                <InlineTableCell>{formatMeetingDate(meeting.meeting_date)}</InlineTableCell>
                <InlineTableCell className="text-muted-foreground">
                  {meeting.location}
                </InlineTableCell>
                <InlineTableCell>
                  <StatusBadge
                    status={meetingStatusLabel[meeting.status]}
                    variant={meetingStatusVariant[meeting.status]}
                  />
                </InlineTableCell>
                <InlineTableCell align="right" numeric>
                  {meeting.agenda_item_count}
                </InlineTableCell>
                <InlineTableCell className="text-muted-foreground">
                  {meeting.template_name}
                </InlineTableCell>
                <InlineTableCell align="right">
                  {isRecycleBin
                    ? renderRestoreMeetingAction(meeting.id, () => onRestoreMeeting(meeting))
                    : renderMeetingRowActions(meeting.id, () => onDeleteMeeting(meeting))}
                </InlineTableCell>
              </InlineTableRow>
            ))}
          </InlineTableBody>
        </InlineTable>
      </div>
    </TableExpandedRow>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function ProjectMeetingsPage(): React.ReactElement {
  const params = useParams<{ projectId: string }>()! ?? { projectId: "" };
  const pathname = usePathname()!;
  const router = useRouter();
  const searchParams = (useSearchParams() ??
    new URLSearchParams()) as NonNullable<ReturnType<typeof useSearchParams>>;
  const projectId = params.projectId ?? "";

  const initialFilters: Record<string, FilterValue> = {
    status: searchParams.get("status") || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "meetings-v2",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "name",
      sortDirection: "asc",
      visibleColumns: meetingSeriesDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  const activeFilters = React.useMemo<Record<string, FilterValue>>(
    () => ({
      status: searchParams.get("status") || undefined,
      tab: searchParams.get("tab") || undefined,
    }),
    [searchParams],
  );

  const isRecycleBinTab = activeFilters.tab === "recycle-bin";

  const { data, isLoading, isFetching, error } = useMeetingSeriesList(projectId, {
    search: tableState.debouncedSearch || undefined,
    status: isMeetingStatus(activeFilters.status) ? activeFilters.status : undefined,
    deleted: isRecycleBinTab ? "only" : undefined,
  });

  const resolvedError =
    error instanceof Error ? error : error ? new Error("Failed to load meetings") : undefined;

  const seriesRows = React.useMemo(() => toSeriesRows(data?.series ?? []), [data?.series]);

  const totalMeetings = seriesRows.reduce((sum, group) => sum + group.meetings.length, 0);

  // Row expansion state — collapsed by default.
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const handleToggleExpand = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const tableColumns = React.useMemo(
    () => buildMeetingSeriesColumns(expandedIds, handleToggleExpand),
    [expandedIds, handleToggleExpand],
  );

  const sortedSeries = React.useMemo(() => {
    if (!tableState.sortBy) return seriesRows;
    const sortColumn = tableColumns.find((column) => column.id === tableState.sortBy);
    const getSortValue = sortColumn?.sortValue;
    if (!getSortValue) return seriesRows;

    return [...seriesRows].sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);
      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return tableState.sortDirection === "asc" ? -1 : 1;
      if (valueB == null) return tableState.sortDirection === "asc" ? 1 : -1;
      if (typeof valueA === "number" && typeof valueB === "number") {
        return tableState.sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }
      const comparison = String(valueA).localeCompare(String(valueB));
      return tableState.sortDirection === "asc" ? comparison : -comparison;
    });
  }, [seriesRows, tableColumns, tableState.sortBy, tableState.sortDirection]);

  const handleFilterChange = (nextFilters: Record<string, FilterValue>) => {
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const deleteMeeting = useDeleteMeeting(projectId);
  const restoreMeeting = useRestoreMeeting(projectId);

  const [meetingToDelete, setMeetingToDelete] = React.useState<MeetingListItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteMeetingIntent = React.useCallback((meeting: MeetingListItem) => {
    setMeetingToDelete(meeting);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteMeetingConfirm = async () => {
    if (!meetingToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMeeting.mutateAsync(meetingToDelete.id);
    } catch (error) {
      // User-visible toast comes from useDeleteMeeting's onError.
      console.error("[meetings] delete meeting failed", meetingToDelete.id, error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setMeetingToDelete(null);
    }
  };

  const handleRestoreMeeting = React.useCallback(
    async (meeting: MeetingListItem) => {
      try {
        await restoreMeeting.mutateAsync(meeting.id);
      } catch (error) {
        // User-visible toast comes from useRestoreMeeting's onError.
        console.error("[meetings] restore meeting failed", meeting.id, error);
      }
    },
    [restoreMeeting],
  );

  const handleCreated = React.useCallback(
    (meetingId: string) => {
      router.push(getMeetingDetailHref({ projectId, meetingId }));
    },
    [router, projectId],
  );

  const isFiltered = Boolean(tableState.searchInput) || Boolean(activeFilters.status);

  const tabs = [
    {
      label: "All",
      href: `/${projectId}/meetings`,
      isActive: !isRecycleBinTab,
    },
    {
      label: "Recycle Bin",
      href: `/${projectId}/meetings?tab=recycle-bin`,
      isActive: isRecycleBinTab,
    },
  ];

  const createTrigger = (
    <Button size="sm">
      <Plus className="h-4 w-4" />
      Create Meeting
    </Button>
  );

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Meetings",
          description:
            "Create structured meetings, build agendas, and keep minutes tied to the right project workflow.",
          actions: isRecycleBinTab ? undefined : (
            <CreateMeetingDialog
              projectId={projectId}
              onCreated={handleCreated}
              trigger={createTrigger}
            />
          ),
        }}
        tabs={tabs}
        layout={{ fullBleedTable: true }}
        toolbar={{
          totalItems: totalMeetings,
          filteredItems: totalMeetings,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search meetings or series...",
          currentView: tableState.currentView,
          onViewChange: tableState.setCurrentView,
          enabledViews: ["table"],
          filters: isRecycleBinTab ? undefined : meetingStatusFilters,
          activeFilters: { status: activeFilters.status },
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: meetingSeriesColumns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
        }}
        data={{
          items: sortedSeries,
          isLoading,
          isFetching,
          error: resolvedError,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item: MeetingSeriesRow) => item.series_id,
          renderExpandedRow: (item, colSpan) => {
            if (!expandedIds.has(item.series_id)) return null;
            return (
              <SeriesMeetingsRow
                meetings={item.meetings}
                colSpan={colSpan}
                projectId={projectId}
                isRecycleBin={isRecycleBinTab}
                onDeleteMeeting={handleDeleteMeetingIntent}
                onRestoreMeeting={handleRestoreMeeting}
              />
            );
          },
        }}
        sorting={{
          sortBy: tableState.sortBy,
          sortDirection: tableState.sortDirection,
          onSortChange: (sortBy, direction) => {
            tableState.setSortBy(sortBy);
            tableState.setSortDirection(direction);
            tableState.setSearchParams({ sort: sortBy, sort_dir: direction });
          },
        }}
        emptyState={{
          title: isRecycleBinTab ? "Recycle Bin is empty" : "No meetings yet",
          description: isRecycleBinTab
            ? "Deleted meetings will appear here."
            : "Create the first structured meeting for this project to start building agendas and minutes.",
          filteredDescription: "No meetings match these filters.",
          isFiltered,
          icon: <CalendarDays />,
          action: isRecycleBinTab ? undefined : (
            <CreateMeetingDialog
              projectId={projectId}
              onCreated={handleCreated}
              trigger={createTrigger}
            />
          ),
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete meeting{" "}
              <strong>
                #{meetingToDelete?.number} — {meetingToDelete?.name}
              </strong>
              ? It will move to the recycle bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMeetingConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Meeting"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
