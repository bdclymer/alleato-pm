"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Mail, Plus, Star, StarOff } from "lucide-react";
import { toast } from "sonner";

import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";
import { apiFetch } from "@/lib/api-client";
import type {
  EmailImportanceFeedbackState,
  EmailImportanceSignal,
} from "@/lib/ai/email-importance-feedback-types";
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
  buildEmailFilters,
  emailColumns,
  emailDefaultVisibleColumns,
  globalEmailColumns,
  globalEmailDefaultVisibleColumns,
  renderEmailCard,
  renderEmailList,
  renderEmailRowActions,
} from "@/features/emails/emails-table-config";
import { EmailComposeDialog } from "@/features/emails/email-compose-dialog";
import { EmailImportanceFeedbackDialog } from "@/features/emails/email-importance-feedback-dialog";
import { MarkAsJunkDialog } from "@/features/emails/mark-as-junk-dialog";
import {
  EmailDetailPanel,
  projectEmailToDetailRecord,
} from "@/features/emails/email-detail-sheet";
import { ProjectEmailsWorkspace } from "@/features/emails/project-emails-workspace";
import { EmailAttachmentsClient } from "../email-attachments/email-attachments-client";

const EMPTY_FILTERS: Record<string, FilterValue> = {
  status: undefined,
  project_id: undefined,
  from: undefined,
  to: undefined,
  has_attachments: undefined,
  is_starred: undefined,
  sent_at_from: undefined,
  sent_at_to: undefined,
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
  const initialProjectId = searchParams.get("project_id") ?? "";
  const initialFrom = searchParams.get("from") ?? "";
  const initialTo = searchParams.get("to") ?? "";
  const initialHasAttachments = searchParams.get("has_attachments") === "true";
  const initialIsStarred = searchParams.get("is_starred") === "true";
  const initialSentAtFrom = searchParams.get("sent_at_from") ?? "";
  const initialSentAtTo = searchParams.get("sent_at_to") ?? "";
  const initialFilters: FilterState = {
    status: initialStatus || undefined,
    project_id: initialProjectId || undefined,
    from: initialFrom || undefined,
    to: initialTo || undefined,
    has_attachments: initialHasAttachments || undefined,
    is_starred: initialIsStarred || undefined,
    sent_at_from: initialSentAtFrom || undefined,
    sent_at_to: initialSentAtTo || undefined,
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
  const [importanceDialogOpen, setImportanceDialogOpen] = React.useState(false);
  const [emailToRateImportance, setEmailToRateImportance] =
    React.useState<ProjectEmail | null>(null);
  const [importanceSignal, setImportanceSignal] =
    React.useState<EmailImportanceSignal | null>(null);
  const [importanceFeedbackByEmailId, setImportanceFeedbackByEmailId] =
    React.useState<Record<string, EmailImportanceFeedbackState>>({});

  // Sync URL status filter
  React.useEffect(() => {
    const nextFilters: FilterState = {
      status: searchParams.get("status") || undefined,
      project_id: searchParams.get("project_id") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      has_attachments:
        searchParams.get("has_attachments") === "true" ? true : undefined,
      is_starred: searchParams.get("is_starred") === "true" ? true : undefined,
      sent_at_from: searchParams.get("sent_at_from") || undefined,
      sent_at_to: searchParams.get("sent_at_to") || undefined,
    };

    tableState.setActiveFilters((prev) => {
      const changed = Object.keys(nextFilters).some(
        (key) => prev[key] !== nextFilters[key],
      );
      if (!changed) return prev;
      return nextFilters;
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
  const projectFilter = activeFilters.project_id as string | undefined;
  const fromFilter = (activeFilters.from as string | undefined)?.trim().toLowerCase();
  const toFilter = (activeFilters.to as string | undefined)?.trim().toLowerCase();
  const hasAttachmentsFilter = activeFilters.has_attachments === true;
  const isStarredFilter = activeFilters.is_starred === true;
  const sentAtFromFilter = activeFilters.sent_at_from as string | undefined;
  const sentAtToFilter = activeFilters.sent_at_to as string | undefined;
  const searchTerm = tableState.debouncedSearch.trim().toLowerCase();

  const filteredEmails = emails.filter((email) => {
    if (statusFilter && email.status !== statusFilter) return false;
    if (projectFilter && String(email.project_id) !== projectFilter) return false;
    if (fromFilter) {
      const sender =
        `${email.from_name ?? ""} ${email.from_email ?? ""}`.toLowerCase();
      if (!sender.includes(fromFilter)) return false;
    }
    if (toFilter) {
      const recipients = (email.to_list ?? []).join(" ").toLowerCase();
      if (!recipients.includes(toFilter)) return false;
    }
    if (hasAttachmentsFilter && !email.has_attachments) return false;
    if (isStarredFilter && !email.is_starred) return false;
    if (sentAtFromFilter || sentAtToFilter) {
      const emailDateRaw = email.sent_at || email.received_at || email.created_at;
      if (!emailDateRaw) return false;
      const emailDate = new Date(emailDateRaw);
      if (Number.isNaN(emailDate.getTime())) return false;
      if (sentAtFromFilter) {
        const fromDate = new Date(`${sentAtFromFilter}T00:00:00`);
        if (emailDate < fromDate) return false;
      }
      if (sentAtToFilter) {
        const toDate = new Date(`${sentAtToFilter}T23:59:59.999`);
        if (emailDate > toDate) return false;
      }
    }
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
  const pagedEmails = React.useMemo(
    () => sortedEmails.slice(pageStart, pageEnd),
    [pageEnd, pageStart, sortedEmails],
  );
  const importanceFeedbackEmailIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          [selectedEmail, ...pagedEmails]
            .filter((email): email is ProjectEmail => Boolean(email))
            .map((email) => String(email.id)),
        ),
      ),
    [pagedEmails, selectedEmail],
  );

  React.useEffect(() => {
    if (tableState.page > totalPages) {
      tableState.setPage(1);
      tableState.setSearchParams({ page: "1" });
    }
  }, [tableState.page, tableState.setPage, tableState.setSearchParams, totalPages]);

  React.useEffect(() => {
    if (!isOutlook) return;
    if (importanceFeedbackEmailIds.length === 0) return;

    const controller = new AbortController();
    const params = new URLSearchParams();
    for (const emailId of importanceFeedbackEmailIds) {
      params.append("emailId", emailId);
    }

    void (async () => {
      try {
        const response = await apiFetch<{
          feedbackByEmailId?: Record<string, EmailImportanceFeedbackState>;
        }>(
          `/api/ai-assistant/email-importance-feedback?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        if (controller.signal.aborted || !response.feedbackByEmailId) return;

        setImportanceFeedbackByEmailId((prev) => ({
          ...prev,
          ...response.feedbackByEmailId,
        }));
      } catch (error) {
        if (controller.signal.aborted) return;
        reportNonCriticalFailure({
          area: "emails-client",
          operation: "load-email-importance-feedback",
          error,
          userVisibleFallback:
            "Importance training state could not be loaded for these emails.",
          metadata: {
            emailIds: importanceFeedbackEmailIds,
            projectId,
            scope,
          },
        });
      }
    })();

    return () => controller.abort();
  }, [importanceFeedbackEmailIds, isOutlook, projectId, scope]);

  const handleFilterChange = (nextFilters: FilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      project_id:
        typeof nextFilters.project_id === "string"
          ? nextFilters.project_id
          : null,
      from: typeof nextFilters.from === "string" ? nextFilters.from : null,
      to: typeof nextFilters.to === "string" ? nextFilters.to : null,
      has_attachments: nextFilters.has_attachments === true ? "true" : null,
      is_starred: nextFilters.is_starred === true ? "true" : null,
      sent_at_from:
        typeof nextFilters.sent_at_from === "string"
          ? nextFilters.sent_at_from
          : null,
      sent_at_to:
        typeof nextFilters.sent_at_to === "string"
          ? nextFilters.sent_at_to
          : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const emailFilters = React.useMemo(() => {
    const projects = Array.from(
      new Map(
        emails
          .filter(
            (email): email is ProjectEmail & {
              project: NonNullable<ProjectEmail["project"]>;
            } => Boolean(email.project),
          )
          .map((email) => [
            email.project_id,
            {
              id: email.project_id,
              label:
                [
                  email.project.project_number?.trim(),
                  email.project.name?.trim(),
                ]
                  .filter(Boolean)
                  .join(" - ") || `Project ${email.project_id}`,
            },
          ]),
      ).values(),
    ).sort((a, b) => a.label.localeCompare(b.label));

    return buildEmailFilters({
      showProject: isGlobal,
      projects,
    });
  }, [emails, isGlobal]);

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
    setEmailToMarkAsJunk(item);
    setJunkDialogOpen(true);
  };

  const handleImportanceIntent = (
    item: ProjectEmail,
    signal: EmailImportanceSignal,
  ) => {
    setEmailToRateImportance(item);
    setImportanceSignal(signal);
    setImportanceDialogOpen(true);
  };

  const handleImportanceRecorded = (
    emailId: number,
    feedback: EmailImportanceFeedbackState,
  ) => {
    setImportanceFeedbackByEmailId((prev) => ({
      ...prev,
      [String(emailId)]: feedback,
    }));
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

  const isFiltered =
    Boolean(tableState.searchInput) ||
    Object.values(activeFilters).some((value) => value !== undefined);

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
              isOutlook
                ? (email) => handleImportanceIntent(email, "important")
                : null,
              isOutlook
                ? (email) => handleImportanceIntent(email, "not_important")
                : null,
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
                      <>
                        {isOutlook ? (
                          <>
                            <Button
                              type="button"
                              variant={
                                importanceFeedbackByEmailId[String(selectedEmail.id)]
                                  ?.signal === "important"
                                  ? "secondary"
                                  : "ghost"
                              }
                              size="sm"
                              onClick={() =>
                                handleImportanceIntent(selectedEmail, "important")
                              }
                            >
                              <Star className="h-4 w-4" />
                              Important
                            </Button>
                            <Button
                              type="button"
                              variant={
                                importanceFeedbackByEmailId[String(selectedEmail.id)]
                                  ?.signal === "not_important"
                                  ? "secondary"
                                  : "ghost"
                              }
                              size="sm"
                              onClick={() =>
                                handleImportanceIntent(
                                  selectedEmail,
                                  "not_important",
                                )
                              }
                            >
                              <StarOff className="h-4 w-4" />
                              Not important
                            </Button>
                          </>
                        ) : null}
                        {!noWriteActions ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(selectedEmail)}
                          >
                            Edit
                          </Button>
                        ) : null}
                      </>
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

      <EmailImportanceFeedbackDialog
        email={emailToRateImportance}
        open={importanceDialogOpen}
        signal={importanceSignal}
        existingFeedback={
          emailToRateImportance
            ? importanceFeedbackByEmailId[String(emailToRateImportance.id)] ?? null
            : null
        }
        onOpenChange={(open) => {
          setImportanceDialogOpen(open);
          if (!open) {
            setEmailToRateImportance(null);
            setImportanceSignal(null);
          }
        }}
        onRecorded={handleImportanceRecorded}
      />
    </>
  );
}
