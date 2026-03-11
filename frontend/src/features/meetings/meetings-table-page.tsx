"use client";

import type { ReactElement } from "react";

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
import { DetailPanel, UnifiedTablePage } from "@/components/tables/unified";
import type { Meeting } from "@/lib/validation/meetings";
import {
  meetingColumns,
  renderMeetingCard,
  renderMeetingList,
  renderMeetingRowActions,
} from "@/features/meetings/meetings-table-config";
import { useMeetingsTable, EMPTY_FILTERS } from "@/features/meetings/use-meetings-table";
import { MeetingPreviewPane } from "@/features/meetings/meeting-preview-pane";

interface MeetingsTablePageProps {
  initialMeetings: Meeting[];
  projectId?: string;
}

export function MeetingsTablePage({ initialMeetings, projectId }: MeetingsTablePageProps): ReactElement {
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
    editingMeeting,
    detailPanelOpen,
    tableColumns,
    activeMeetingId,
    isFiltered,
    deleteDialogOpen,
    setDeleteDialogOpen,
    meetingToDelete,
    setMeetingToDelete,
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    handleFilterChange,
    handleRowClick,
    handleOpenMeetingPage,
    handleEdit,
    handleTableKeyDown,
    handlePanelOpenChange,
    handleSave,
    handleDeleteConfirm,
    handleBulkDeleteConfirm,
    handleSelectAll,
    handleSelectRow,
    handleOpenSource,
    handleOpenRecording,
    handleExport,
  } = useMeetingsTable(initialMeetings, projectId);

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Meetings",
          description: "View and manage all your meetings",
        }}
        layout={{
          headerAlignment: "left",
          toolbarInlineWithHeader: true,
          containerClassName: "pl-0 sm:pl-0 lg:pl-0",
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
          onBulkDelete: () => setBulkDeleteDialogOpen(true),
        }}
        data={{
          items: pagedMeetings,
          isLoading: false,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => item.id,
          activeRowId: activeMeetingId,
          autoFocusOnLoad: true,
          onTableKeyDown: handleTableKeyDown,
          onRowClick: handleRowClick,
          rowActions: (item) =>
            renderMeetingRowActions(
              item,
              handleOpenMeetingPage,
              handleEdit,
              (meeting) => {
                setMeetingToDelete(meeting);
                setDeleteDialogOpen(true);
              },
              handleOpenSource,
              handleOpenRecording,
            ),
        }}
        sidePanel={{
          content: (
            <MeetingPreviewPane
              meeting={selectedMeeting ?? pagedMeetings[0] ?? null}
              onOpenMeetingPage={handleOpenMeetingPage}
            />
          ),
          columnClassName: "lg:grid-cols-[minmax(0,1fr)_32rem] xl:grid-cols-[minmax(0,1fr)_36rem]",
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
        features={{
          enableBulkDelete: true,
          enableRowSelection: true,
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
        open={detailPanelOpen}
        onOpenChange={handlePanelOpenChange}
        item={editingMeeting}
        title={editingMeeting?.title ?? "Meeting"}
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

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected meetings</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {tableState.selectedIds.length} selected meeting
              {tableState.selectedIds.length === 1 ? "" : "s"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={tableState.selectedIds.length === 0}
            >
              Delete selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
