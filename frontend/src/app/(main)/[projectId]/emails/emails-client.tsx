"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Mail, Plus } from "lucide-react";
import { toast } from "sonner";

import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";
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
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import {
  useAllEmails,
  useDeleteEmail,
  useEmails,
  type EmailSource,
  type ProjectEmail,
} from "@/hooks/use-emails";
import {
  buildEmailTableColumns,
  emailColumns,
  emailDefaultVisibleColumns,
  emailFilters,
  globalEmailColumns,
  globalEmailDefaultVisibleColumns,
  renderEmailCard,
  renderEmailList,
  renderEmailRowActions,
} from "@/features/emails/emails-table-config";
import { EmailComposeDialog } from "@/features/emails/email-compose-dialog";
import { MarkAsJunkDialog } from "@/features/emails/mark-as-junk-dialog";
import {
  EmailDetailPanel,
  projectEmailToDetailRecord,
} from "@/features/emails/email-detail-sheet";
import { ProjectEmailsWorkspace } from "@/features/emails/project-emails-workspace";
import { EmailAttachmentsClient } from "../email-attachments/email-attachments-client";

const EMPTY_FILTERS: Record<string, FilterValue> = {
  status: undefined,
};

type FilterState = Record<string, FilterValue>;

interface EmailClientTab {
  label: string;
  href: string;
  count?: number;
  isActive?: boolean;
  testId?: string;
  countTestId?: string;
}

interface EmailsClientProps {
  embedded?: boolean;
  navigationTabs?: EmailClientTab[];
  projectId?: number;
  scope?: "project" | "global";
  source?: EmailSource;
}

export function EmailsClient({
  projectId,
  navigationTabs,
  scope = "project",
  source = "app",
  embedded = false,
}: EmailsClientProps): ReactElement {
  const router = useRouter();
  const pathname = usePathname()!;
  const searchParams = (useSearchParams() ?? new URLSearchParams()) as NonNullable<ReturnType<typeof useSearchParams>>;
  const isGlobal = scope === "global" || !projectId;
  const isOutlook = source === "outlook";
  const activeTab =
    isOutlook && searchParams.get("tab") === "attachments"
      ? "attachments"
      : "emails";
  const emailsHref = isGlobal
    ? isOutlook
      ? "/outlook-emails"
      : "/emails"
    : isOutlook
      ? `/${projectId}/outlook-emails`
      : `/${projectId}/emails`;
  const outlookTabs = isOutlook
    ? [
        {
          label: "Outlook Emails",
          href: emailsHref,
          isActive: activeTab === "emails",
        },
        {
          label: "Attachments",
          href: `${emailsHref}?tab=attachments`,
          isActive: activeTab === "attachments",
        },
      ]
    : undefined;
  const tabs = navigationTabs ?? outlookTabs;
  const title = isOutlook ? "Outlook Emails" : "Emails";
  const description = isOutlook
    ? isGlobal
      ? "All Microsoft Outlook emails synced across projects."
      : "Microsoft Outlook emails synced to this project."
    : isGlobal
      ? "Application and Resend emails across projects."
      : undefined;
  // Outlook emails can be bulk-deleted from our system even though they can't be edited
  const noWriteActions = isGlobal || isOutlook;
  const allowBulkDelete = !isGlobal;
  const initialStatus = searchParams.get("status") ?? "";
  const initialFilters: FilterState = {
    status: initialStatus || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: isGlobal ? "emails-global" : "emails",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "sent_at",
      sortDirection: "desc",
      visibleColumns: isGlobal
        ? globalEmailDefaultVisibleColumns
        : emailDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  const projectEmailsQuery = useEmails(projectId ?? 0, undefined, source);
  const globalEmailsQuery = useAllEmails(undefined, isGlobal, source);
  const activeQuery = isGlobal ? globalEmailsQuery : projectEmailsQuery;
  const {
    data: emails = [],
    isLoading,
    error: fetchError,
  } = activeQuery;
  const deleteEmail = useDeleteEmail(projectId ?? 0);

  const [composeOpen, setComposeOpen] = React.useState(false);
  const [editingEmail, setEditingEmail] = React.useState<ProjectEmail | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [emailToDelete, setEmailToDelete] = React.useState<ProjectEmail | null>(null);
  const [selectedEmail, setSelectedEmail] = React.useState<ProjectEmail | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [junkDialogOpen, setJunkDialogOpen] = React.useState(false);
  const [emailToMarkAsJunk, setEmailToMarkAsJunk] = React.useState<ProjectEmail | null>(null);

  // Sync URL status filter
  React.useEffect(() => {
    const nextStatus = searchParams.get("status") ?? "";
    const normalizedStatus = nextStatus || undefined;

    tableState.setActiveFilters((prev) => {
      if (prev.status === normalizedStatus) return prev;
      return { status: normalizedStatus };
    });
  }, [searchParams, tableState.setActiveFilters]);

  // Set default visible columns
  React.useEffect(() => {
    if (tableState.visibleColumns.length === 0) {
      tableState.setVisibleColumns(
        isGlobal ? globalEmailDefaultVisibleColumns : emailDefaultVisibleColumns,
      );
    }
  }, [isGlobal, tableState.visibleColumns.length, tableState.setVisibleColumns]);

  // Auto-switch to list view on mobile
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;
    if (tableState.currentView !== "table") return;

    tableState.setCurrentView("list");
    tableState.setSearchParams({ view: "list" });
  }, [tableState.currentView, tableState.setCurrentView, tableState.setSearchParams]);

  const activeFilters = tableState.activeFilters as FilterState;
  const statusFilter = activeFilters.status as string | undefined;
  const searchTerm = tableState.debouncedSearch.trim().toLowerCase();

  const filteredEmails = emails.filter((email) => {
    if (statusFilter && email.status !== statusFilter) return false;
    if (!searchTerm) return true;

    const fields = [
      email.subject ?? "",
      email.from_name ?? "",
      email.from_email ?? "",
      email.to_list?.join(" ") ?? "",
      email.body ?? "",
      email.project?.name ?? "",
      email.project?.project_number ?? "",
    ];

    return fields.some((field) => field.toLowerCase().includes(searchTerm));
  });

  const tableColumns = buildEmailTableColumns({ showProject: isGlobal });
  const sortedEmails = React.useMemo(() => {
    if (!tableState.sortBy) return filteredEmails;
    const sortColumn = tableColumns.find((col) => col.id === tableState.sortBy);
    const getSortValue = sortColumn?.sortValue;
    if (!getSortValue) return filteredEmails;

    const sorted = [...filteredEmails].sort((a, b) => {
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

    return sorted;
  }, [filteredEmails, tableColumns, tableState.sortBy, tableState.sortDirection]);

  const totalItems = filteredEmails.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / tableState.perPage));
  const pageStart = (tableState.page - 1) * tableState.perPage;
  const pageEnd = pageStart + tableState.perPage;
  const pagedEmails = sortedEmails.slice(pageStart, pageEnd);

  React.useEffect(() => {
    if (tableState.page > totalPages) {
      tableState.setPage(1);
      tableState.setSearchParams({ page: "1" });
    }
  }, [tableState.page, tableState.setPage, tableState.setSearchParams, totalPages]);

  const handleFilterChange = (nextFilters: FilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleOpenEmail = (item: ProjectEmail) => {
    setSelectedEmail(item);
  };

  const handleEdit = (item: ProjectEmail) => {
    if (noWriteActions) return;
    setEditingEmail(item);
    setComposeOpen(true);
  };

  const handleDeleteIntent = (item: ProjectEmail) => {
    if (noWriteActions) return;
    setEmailToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleMarkAsJunkIntent = (item: ProjectEmail) => {
    if (noWriteActions) return;
    setEmailToMarkAsJunk(item);
    setJunkDialogOpen(true);
  };

  const handleJunkRuleCreated = async (item: ProjectEmail) => {
    // On project views with write access, optimistically delete the email
    // that prompted the rule. On read-only views (Outlook intake, global
    // inbox) we can't delete — the rule only applies to future emails, so
    // we just leave the source email in place and let the next sync clean
    // up any future duplicates.
    if (noWriteActions || !projectId) return;
    try {
      await deleteEmail.mutateAsync(String(item.id));
    } catch (err) {
      reportNonCriticalFailure({
        area: "emails-client",
        operation: "handleJunkRuleCreated",
        error: err,
        userVisibleFallback: "Rule was created but the source email could not be deleted automatically.",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!emailToDelete) return;

    try {
      await deleteEmail.mutateAsync(String(emailToDelete.id));
    } catch (error) {
      reportNonCriticalFailure({
        area: "project-emails",
        operation: "delete-email",
        error,
        userVisibleFallback: "Email deletion failed and the row remains visible.",
        metadata: { projectId, emailId: emailToDelete.id },
      });
    } finally {
      setDeleteDialogOpen(false);
      setEmailToDelete(null);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    const ids = tableState.selectedIds;
    if (ids.length === 0) return;

    setIsBulkDeleting(true);
    const errors: string[] = [];

    for (const id of ids) {
      try {
        await deleteEmail.mutateAsync(id);
      } catch {
        errors.push(`${id}: Failed to delete`);
      }
    }

    tableState.setSelectedIds([]);

    if (errors.length > 0) {
      toast.error(`${ids.length - errors.length} deleted, ${errors.length} failed`);
    } else {
      toast.success(`${ids.length} email${ids.length === 1 ? "" : "s"} deleted`);
    }

    setIsBulkDeleting(false);
    setBulkDeleteDialogOpen(false);
  };

  const handleExport = () => {
    if (filteredEmails.length === 0) {
      toast.info("No emails to export");
      return;
    }

    const cols = buildEmailTableColumns({ showProject: isGlobal });
    const visibleCols = cols.filter((col) =>
      tableState.visibleColumns.includes(col.id),
    );

    const headers = visibleCols.map((col) => col.label);
    const rows = filteredEmails.map((email) =>
      visibleCols
        .map((col) =>
          col.csvValue ? col.csvValue(email) : String(col.render(email) ?? ""),
        )
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${isGlobal ? "all" : "project"}-emails-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds(pagedEmails.map((item) => String(item.id)));
    } else {
      tableState.setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds((prev) => [...prev, id]);
    } else {
      tableState.setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  const isFiltered = Boolean(tableState.searchInput) || Boolean(activeFilters.status);

  if (isOutlook && activeTab === "attachments") {
    return (
      <EmailAttachmentsClient
        projectId={projectId}
        scope={isGlobal ? "global" : "project"}
        title={title}
        tabs={tabs}
      />
    );
  }

  if (!noWriteActions) {
    return (
      <>
        <ProjectEmailsWorkspace
          emails={sortedEmails}
          isLoading={isLoading}
          error={fetchError ?? undefined}
          tabs={tabs ?? []}
          searchValue={tableState.searchInput}
          onSearchChange={tableState.setSearchInput}
          statusFilter={statusFilter}
          onStatusFilterChange={(status) => handleFilterChange({ status })}
          onCompose={() => {
            setEditingEmail(null);
            setComposeOpen(true);
          }}
          onEdit={handleEdit}
          onDelete={handleDeleteIntent}
        />

        {projectId ? (
          <EmailComposeDialog
            open={composeOpen}
            onOpenChange={setComposeOpen}
            projectId={projectId}
            email={editingEmail}
          />
        ) : null}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Email</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the email{" "}
                <strong>{emailToDelete?.subject}</strong>?
                <br />
                <br />
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteEmail.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleteEmail.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteEmail.isPending ? "Deleting..." : "Delete Email"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <UnifiedTablePage
        header={embedded ? { title: "" } : {
          title,
          description,
          actions: noWriteActions ? undefined : (
            <Button
              size="sm"
              onClick={() => {
                setEditingEmail(null);
                setComposeOpen(true);
              }}
              aria-label="Compose new email"
            >
              <Plus />
              Compose
            </Button>
          ),
        }}
        tabs={embedded && !navigationTabs ? undefined : tabs}
        layout={{
          fullBleedTable: false,
          containerPadding: !embedded,
        }}
        toolbar={{
          totalItems,
          filteredItems: totalItems,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search emails...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          filters: emailFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: isGlobal ? globalEmailColumns : emailColumns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          onExport: handleExport,
          onBulkDelete: allowBulkDelete && tableState.selectedIds.length > 0
            ? () => setBulkDeleteDialogOpen(true)
            : undefined,
        }}
        data={{
          items: pagedEmails,
          isLoading,
          error: fetchError ?? undefined,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => String(item.id),
          activeRowId: selectedEmail ? String(selectedEmail.id) : null,
          onRowClick: handleOpenEmail,
          rowActions: (item) =>
            renderEmailRowActions(
              item,
              noWriteActions ? null : handleEdit,
              noWriteActions ? null : handleDeleteIntent,
              // "Mark as junk" creates a filter rule — it doesn't mutate the
              // email itself, so we expose it even on read-only views
              // (Outlook intake, global inbox) where it's most useful.
              isOutlook ? handleMarkAsJunkIntent : null,
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
          card: (item) => renderEmailCard(item, handleOpenEmail),
          list: (item) => renderEmailList(item, handleOpenEmail),
        }}
        emptyState={{
          title: "No emails found",
          description: isOutlook
            ? "No synced Outlook emails are stored yet."
            : isGlobal
              ? "No application or Resend emails are stored yet."
              : "You have not sent or received any project emails yet.",
          filteredDescription: "Try adjusting your search or filters",
          isFiltered,
          icon: <Mail className="h-10 w-10 text-muted-foreground" />,
          action: noWriteActions ? undefined : (
            <Button
              size="sm"
              onClick={() => {
                setEditingEmail(null);
                setComposeOpen(true);
              }}
            >
              Compose your first email
            </Button>
          ),
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
        sidePanel={
          selectedEmail
            ? {
                content: (
                  <EmailDetailPanel
                    email={projectEmailToDetailRecord(selectedEmail)}
                    onClose={() => setSelectedEmail(null)}
                    actions={
                      !noWriteActions ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(selectedEmail)}
                        >
                          Edit
                        </Button>
                      ) : null
                    }
                  />
                ),
                variant: "wide",
                defaultWidth: 560,
                minWidth: 440,
                storageKey: isGlobal ? "global-email-detail" : "project-email-detail",
                onClose: () => setSelectedEmail(null),
              }
            : undefined
        }
      />

      {projectId ? (
        <EmailComposeDialog
          open={composeOpen}
          onOpenChange={setComposeOpen}
          projectId={projectId}
          email={editingEmail}
        />
      ) : null}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the email{" "}
              <strong>{emailToDelete?.subject}</strong>?
              <br />
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEmail.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteEmail.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEmail.isPending ? "Deleting..." : "Delete Email"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {tableState.selectedIds.length} Email
              {tableState.selectedIds.length === 1 ? "" : "s"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{tableState.selectedIds.length}</strong> selected email
              {tableState.selectedIds.length === 1 ? "" : "s"}?
              <br />
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting
                ? "Deleting..."
                : `Delete ${tableState.selectedIds.length} Email${tableState.selectedIds.length === 1 ? "" : "s"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MarkAsJunkDialog
        email={emailToMarkAsJunk}
        open={junkDialogOpen}
        onOpenChange={(open) => {
          setJunkDialogOpen(open);
          if (!open) setEmailToMarkAsJunk(null);
        }}
        onRuleCreated={handleJunkRuleCreated}
      />
    </>
  );
}
