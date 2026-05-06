"use client";

import * as React from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import { ExternalLink, Inbox, Mail, Paperclip } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  UnifiedTablePage,
  useUnifiedTableState,
  type TableColumn,
} from "@/components/tables/unified";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

interface OutlookIntakeAttachment {
  id: number;
  fileName: string;
  fileSize: number | null;
  contentType: string | null;
  createdAt: string | null;
}

interface OutlookIntakeEmail {
  id: number;
  graphMessageId: string;
  mailboxUserId: string;
  subject: string;
  fromName: string | null;
  fromEmail: string | null;
  toList: string[];
  matchStatus: string;
  assignmentMethod: string | null;
  assignmentConfidence: number | null;
  receivedAt: string | null;
  hasAttachments: boolean | null;
  webLink: string | null;
  createdAt: string | null;
  project: {
    id: number;
    name: string | null;
    projectNumber: string | null;
  } | null;
  attachments: OutlookIntakeAttachment[];
}

const columnsConfig = [
  { id: "subject", label: "Email", defaultVisible: true, alwaysVisible: true },
  { id: "match", label: "Match", defaultVisible: true },
  { id: "project", label: "Project", defaultVisible: true },
  { id: "attachments", label: "Attachments", defaultVisible: true },
  { id: "mailbox", label: "Mailbox", defaultVisible: true },
  { id: "received", label: "Received", defaultVisible: true },
];

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function senderLabel(email: OutlookIntakeEmail): string {
  if (email.fromName && email.fromEmail) return `${email.fromName} <${email.fromEmail}>`;
  return email.fromName || email.fromEmail || "Unknown sender";
}

function statusTone(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "matched") return "default";
  if (status === "error") return "destructive";
  if (status === "ignored") return "secondary";
  return "outline";
}

export function OutlookIntakeClient(): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname() ?? "/outlook-intake";
  const rawSearchParams = useSearchParams();
  const searchParams =
    rawSearchParams ?? (new URLSearchParams() as unknown as ReadonlyURLSearchParams);
  const initialMatchStatus = searchParams.get("match_status") ?? "";

  const tableState = useUnifiedTableState({
    entityKey: "outlook-intake",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "received",
      sortDirection: "desc",
      visibleColumns: columnsConfig.map((column) => column.id),
      filters: {
        match_status: initialMatchStatus || undefined,
      },
    },
  });

  const matchStatus = tableState.activeFilters.match_status as string | undefined;
  const vectorizedFilter = tableState.activeFilters.vectorized as string | undefined;
  const params = new URLSearchParams();
  if (matchStatus) params.set("match_status", matchStatus);
  const queryString = params.toString();

  const { data = [], isLoading, error } = useQuery<OutlookIntakeEmail[]>({
    queryKey: ["outlook-intake", matchStatus ?? ""],
    queryFn: ({ signal }) =>
      apiFetch<OutlookIntakeEmail[]>(
        `/api/outlook-intake${queryString ? `?${queryString}` : ""}`,
        { signal },
      ),
  });

  const searchTerm = tableState.debouncedSearch.trim().toLowerCase();
  const filtered = data.filter((email) => {
    if (vectorizedFilter === "yes" && !email.documentMetadataId) return false;
    if (vectorizedFilter === "no" && email.documentMetadataId) return false;
    if (!searchTerm) return true;
    const fields = [
      email.subject,
      senderLabel(email),
      email.mailboxUserId,
      email.project?.name ?? "",
      email.project?.projectNumber ?? "",
      email.attachments.map((attachment) => attachment.fileName).join(" "),
    ];
    return fields.some((field) => field.toLowerCase().includes(searchTerm));
  });

  const columns = React.useMemo<TableColumn<OutlookIntakeEmail>[]>(
    () => [
      {
        id: "subject",
        label: "Email",
        render: (email) => (
          <div className="min-w-0 space-y-1">
            <div className="truncate font-medium text-foreground">{email.subject}</div>
            <div className="truncate text-xs text-muted-foreground">{senderLabel(email)}</div>
          </div>
        ),
        sortable: true,
        sortValue: (email) => email.subject,
      },
      {
        id: "match",
        label: "Match",
        render: (email) => (
          <Badge variant={statusTone(email.matchStatus)}>{email.matchStatus}</Badge>
        ),
        sortable: true,
        sortValue: (email) => email.matchStatus,
      },
      {
        id: "project",
        label: "Project",
        render: (email) =>
          email.project ? (
            <Link
              href={`/${email.project.id}/outlook-emails`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {email.project.name || email.project.projectNumber || `Project ${email.project.id}`}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">Unassigned</span>
          ),
        sortable: true,
        sortValue: (email) => email.project?.name ?? "",
      },
      {
        id: "attachments",
        label: "Attachments",
        render: (email) => (
          <div className="flex min-w-0 items-center gap-2">
            <Paperclip className="size-4 text-muted-foreground" />
            <span className="text-sm">{email.attachments.length}</span>
            {email.attachments[0] ? (
              <a
                href={`/api/outlook-intake/attachments/${email.attachments[0].id}/download?disposition=inline`}
                target="_blank"
                rel="noreferrer"
                className="truncate text-xs text-primary hover:underline"
              >
                {email.attachments[0].fileName}
              </a>
            ) : null}
          </div>
        ),
        sortable: true,
        sortValue: (email) => email.attachments.length,
      },
      {
        id: "mailbox",
        label: "Mailbox",
        render: (email) => (
          <span className="text-sm text-muted-foreground">{email.mailboxUserId}</span>
        ),
        sortable: true,
        sortValue: (email) => email.mailboxUserId,
      },
      {
        id: "received",
        label: "Received",
        render: (email) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(email.receivedAt || email.createdAt)}
          </span>
        ),
        sortable: true,
        sortValue: (email) => email.receivedAt || email.createdAt || "",
      },
    ],
    [],
  );

  const sorted = React.useMemo(() => {
    const sortColumn = columns.find((column) => column.id === tableState.sortBy);
    const sortValue = sortColumn?.sortValue;
    if (!sortValue) return filtered;

    return [...filtered].sort((left, right) => {
      const leftValue = sortValue(left);
      const rightValue = sortValue(right);
      const comparison = String(leftValue ?? "").localeCompare(String(rightValue ?? ""));
      return tableState.sortDirection === "asc" ? comparison : -comparison;
    });
  }, [columns, filtered, tableState.sortBy, tableState.sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / tableState.perPage));
  const pageStart = (tableState.page - 1) * tableState.perPage;
  const paged = sorted.slice(pageStart, pageStart + tableState.perPage);

  const updateFilters = (next: Record<string, string | undefined>) => {
    tableState.setActiveFilters(next);
    tableState.setSearchParams({
      match_status: next.match_status ?? null,
      vectorized: next.vectorized ?? null,
      page: "1",
    });
    tableState.setPage(1);
  };

  return (
    <UnifiedTablePage
      header={{
        title: "Outlook Intake",
        description: "All synced Outlook emails and attachments before and after project matching.",
        actions: (
          <Button size="sm" variant="outline" asChild>
            <Link href="/outlook-emails">
              <Mail />
              Project Emails
            </Link>
          </Button>
        ),
      }}
      toolbar={{
        totalItems: data.length,
        filteredItems: filtered.length,
        selectedCount: 0,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search Outlook intake...",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        filters: [
          {
            id: "match_status",
            label: "Match",
            type: "select",
            options: [
              { label: "Unassigned", value: "unassigned" },
              { label: "Matched", value: "matched" },
              { label: "Ignored", value: "ignored" },
              { label: "Error", value: "error" },
            ],
          },
          {
            id: "vectorized",
            label: "Vectorized",
            type: "select",
            options: [
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ],
          },
        ],
        activeFilters: tableState.activeFilters,
        onFilterChange: (filters) =>
          updateFilters({
            match_status: filters.match_status as string | undefined,
            vectorized: filters.vectorized as string | undefined,
          }),
        onClearFilters: () => updateFilters({}),
        columns: columnsConfig,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: paged,
        isLoading,
        error: error ?? undefined,
      }}
      table={{
        columns,
        getRowId: (email) => String(email.id),
        rowActions: (email) =>
          email.webLink ? (
            <Button size="icon" variant="ghost" asChild aria-label="Open in Outlook">
              <a href={email.webLink} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : null,
      }}
      sorting={{
        sortBy: tableState.sortBy,
        sortDirection: tableState.sortDirection,
        onSortChange: (sortBy, direction) => {
          tableState.setSortBy(sortBy);
          tableState.setSortDirection(direction);
          tableState.setSearchParams({ sort: sortBy, sort_dir: direction, page: "1" });
          tableState.setPage(1);
        },
      }}
      views={{
        list: (email) => (
          <div className="space-y-2 border-b px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{email.subject}</div>
                <div className="truncate text-sm text-muted-foreground">{senderLabel(email)}</div>
              </div>
              <Badge variant={statusTone(email.matchStatus)}>{email.matchStatus}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{email.attachments.length} attachments</span>
              <span>{email.project?.name ?? "Unassigned"}</span>
              <span>{formatDate(email.receivedAt || email.createdAt)}</span>
            </div>
          </div>
        ),
      }}
      emptyState={{
        title: "No Outlook intake found",
        description: "No synced Outlook intake records are stored yet.",
        filteredDescription: "Try adjusting your search or match filter.",
        isFiltered: Boolean(tableState.searchInput) || Boolean(matchStatus),
        icon: <Inbox className="size-10 text-muted-foreground" />,
      }}
      pagination={{
        page: tableState.page,
        totalPages,
        perPage: tableState.perPage,
        onPageChange: (page) => {
          tableState.setPage(page);
          tableState.setSearchParams({ page: String(page) });
        },
        onPerPageChange: (perPage) => {
          tableState.setPerPage(Number(perPage));
          tableState.setPage(1);
          tableState.setSearchParams({ per_page: perPage, page: "1" });
        },
      }}
      layout={{
        fullBleedTable: false,
      }}
    />
  );
}
