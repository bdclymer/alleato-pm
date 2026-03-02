"use client";

import type { ReactElement } from "react";
import { Download } from "lucide-react";

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
import { DetailPanel, UnifiedTablePage } from "@/components/tables/unified";
import type { Meeting } from "@/lib/validation/meetings";
import {
  meetingColumns,
  renderMeetingCard,
  renderMeetingList,
  renderMeetingRowActions,
} from "@/features/meetings/meetings-table-config";
import { useMeetingsTable, EMPTY_FILTERS } from "@/features/meetings/use-meetings-table";

interface MeetingsTablePageProps {
  initialMeetings: Meeting[];
}

export function MeetingsTablePage({ initialMeetings }: MeetingsTablePageProps): ReactElement {
  const {
    tableState,
    pagedMeetings,
    totalItems,
    unfilteredTotal,
    totalPages,
    filters,
    activeFilters,
    detailFields,
    selectedMeeting,
    tableColumns,
    isFiltered,
    deleteDialogOpen,
    setDeleteDialogOpen,
    meetingToDelete,
    setMeetingToDelete,
    handleFilterChange,
    handleRowClick,
    handleEdit,
    handlePanelOpenChange,
    handleSave,
    handleDeleteConfirm,
    handleSelectAll,
    handleSelectRow,
    handleOpenSource,
    handleOpenRecording,
    handleExport,
  } = useMeetingsTable(initialMeetings);

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Meetings",
          description: "View and manage all your meetings",
          actions: (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          ),
        }}
        toolbar={{
          totalItems: unfilteredTotal,
          filteredItems: totalItems,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search meetings...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          filters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: meetingColumns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          onExport: handleExport,
        }}
        data={{
          items: pagedMeetings,
          isLoading: false,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => item.id,
          onRowClick: handleRowClick,
          rowActions: (item) =>
            renderMeetingRowActions(
              item,
              handleEdit,
              (meeting) => {
                setMeetingToDelete(meeting);
                setDeleteDialogOpen(true);
              },
              handleOpenSource,
              handleOpenRecording,
            ),
        }}
        sorting={{
          sortBy: tableState.sortBy,
          sortDirection: tableState.sortDirection,
          onSortChange: (sortBy, direction) => {
            tableState.setSortBy(sortBy);
            tableState.setSortDirection(direction);
            tableState.setSearchParams({
              sort: sortBy,
              sort_dir: direction,
              page: "1",
            });
            tableState.setPage(1);
          },
        }}
        selection={{
          selectedIds: tableState.selectedIds,
          onSelectAll: handleSelectAll,
          onSelectRow: handleSelectRow,
        }}
        views={{
          card: (item) => renderMeetingCard(item, handleRowClick),
          list: (item) => renderMeetingList(item, handleRowClick),
        }}
        emptyState={{
          title: "No meetings found",
          description: "You have not added any meetings yet.",
          filteredDescription: "Try adjusting your search or filters",
          isFiltered,
        }}
        pagination={{
          page: tableState.page,
          totalPages,
          perPage: tableState.perPage,
          onPageChange: (nextPage) => {
            tableState.setPage(nextPage);
            tableState.setSearchParams({ page: String(nextPage) });
          },
          onPerPageChange: (nextPerPage) => {
            const parsed = Number(nextPerPage);
            if (!Number.isFinite(parsed) || parsed <= 0) return;
            tableState.setPerPage(parsed);
            tableState.setSearchParams({ per_page: String(parsed), page: "1" });
            tableState.setPage(1);
          },
        }}
      />

      <DetailPanel
        open={Boolean(tableState.detailParam)}
        onOpenChange={handlePanelOpenChange}
        item={selectedMeeting}
        title={selectedMeeting?.title ?? "Meeting"}
        fields={detailFields}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this meeting? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!meetingToDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
