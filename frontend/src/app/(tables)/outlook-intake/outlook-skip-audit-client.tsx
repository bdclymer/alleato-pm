"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Inbox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  CellDate,
  CellText,
  TruncatedCell,
  UnifiedTablePage,
  useUnifiedTableState,
  type TableColumn,
} from "@/components/tables/unified";
import { StatusBadge } from "@/components/ds";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

interface OutlookSkipAuditEmail {
  id: string;
  graphMessageId: string;
  mailboxUserId: string | null;
  internetMessageId: string | null;
  conversationId: string | null;
  subject: string | null;
  bodyPreview: string | null;
  fromName: string | null;
  fromEmail: string | null;
  receivedAt: string | null;
  webLink: string | null;
  classificationAction: string;
  classificationCategory: string;
  classificationConfidence: number | null;
  classificationReason: string;
  classificationSignals: string[];
  sourceMetadata: Record<string, unknown> | null;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
}

const columnsConfig = [
  {
    id: "subject",
    label: "Subject",
    defaultVisible: true,
    alwaysVisible: true,
  },
  { id: "from", label: "From", defaultVisible: true },
  { id: "category", label: "Category", defaultVisible: true },
  { id: "reason", label: "Reason", defaultVisible: true },
  { id: "received", label: "Received", defaultVisible: true },
  { id: "lastSeen", label: "Last Seen", defaultVisible: true },
  { id: "mailbox", label: "Mailbox", defaultVisible: false },
  { id: "confidence", label: "Confidence", defaultVisible: false },
];

const CATEGORY_OPTIONS = [
  { value: "calendar_rsvp", label: "Calendar RSVP" },
  { value: "calendar_low_value", label: "Low-Value Calendar" },
];

type OutlookSkipAuditClientProps = {
  embedded?: boolean;
  navigationTabs?: {
    label: string;
    href: string;
    count?: number;
    isActive?: boolean;
    testId?: string;
    countTestId?: string;
  }[];
};

function senderLabel(email: OutlookSkipAuditEmail): string {
  if (email.fromName && email.fromEmail) {
    return `${email.fromName} <${email.fromEmail}>`;
  }
  return email.fromName || email.fromEmail || "Unknown sender";
}

function categoryLabel(value: string): string {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

function confidenceLabel(value: number | null): string | null {
  if (value === null) return null;
  return `${Math.round(value * 100)}%`;
}

function SkipAuditDetail({
  email,
  onClose,
}: {
  email: OutlookSkipAuditEmail;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <StatusBadge status="Skipped" variant="neutral" />
              <StatusBadge
                status={categoryLabel(email.classificationCategory)}
                variant="warning"
              />
            </div>
            <div className="truncate text-base font-semibold text-foreground">
              {email.subject ?? "No subject"}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {senderLabel(email)}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-auto px-5 py-5">
        <section className="space-y-2">
          <SectionRuleHeading label="Classifier Reason" className="mb-0 pb-0" />
          <p className="text-sm leading-6 text-muted-foreground">
            {email.classificationReason}
          </p>
        </section>

        <section className="space-y-2">
          <SectionRuleHeading label="Preview" className="mb-0 pb-0" />
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {email.bodyPreview || "No preview was available."}
          </p>
        </section>

        <section className="space-y-2">
          <SectionRuleHeading label="Signals" className="mb-0 pb-0" />
          {email.classificationSignals.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {email.classificationSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  {signal}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No signals recorded.
            </p>
          )}
        </section>

        <section className="grid gap-3 border-t pt-5 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Mailbox
            </div>
            <div className="mt-1 truncate text-foreground">
              {email.mailboxUserId ?? "-"}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Confidence
            </div>
            <div className="mt-1 text-foreground">
              {confidenceLabel(email.classificationConfidence) ?? "-"}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground">
              First Seen
            </div>
            <div className="mt-1 text-foreground">
              {new Date(email.firstSeenAt).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Last Seen
            </div>
            <div className="mt-1 text-foreground">
              {new Date(email.lastSeenAt).toLocaleString()}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function OutlookSkipAuditClient({
  embedded,
  navigationTabs,
}: OutlookSkipAuditClientProps = {}): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname()! ?? "/emails";
  const searchParams = useSearchParams()!;
  const [selectedEmail, setSelectedEmail] =
    React.useState<OutlookSkipAuditEmail | null>(null);

  const tableState = useUnifiedTableState({
    entityKey: "outlook-skip-audit",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "lastSeen",
      sortDirection: "desc",
      visibleColumns: columnsConfig
        .filter((column) => column.defaultVisible !== false)
        .map((column) => column.id),
      filters: {
        classification_category:
          searchParams.get("classification_category") ?? undefined,
      },
    },
  });

  const categoryFilter = tableState.activeFilters.classification_category as
    | string
    | undefined;
  const params = new URLSearchParams();
  if (categoryFilter) {
    params.set("classification_category", categoryFilter);
  }
  const queryString = params.toString();

  const {
    data = [],
    isLoading,
    error,
  } = useQuery<OutlookSkipAuditEmail[]>({
    queryKey: ["outlook-skip-audit", categoryFilter ?? ""],
    queryFn: ({ signal }) =>
      apiFetch<OutlookSkipAuditEmail[]>(
        `/api/outlook-skip-audit${queryString ? `?${queryString}` : ""}`,
        { signal },
      ),
  });

  const searchTerm = tableState.debouncedSearch.trim().toLowerCase();
  const filtered = data.filter((email) => {
    if (!searchTerm) return true;
    const fields = [
      email.subject ?? "",
      email.bodyPreview ?? "",
      senderLabel(email),
      email.mailboxUserId ?? "",
      email.classificationReason,
      email.classificationSignals.join(" "),
      categoryLabel(email.classificationCategory),
    ];
    return fields.some((field) => field.toLowerCase().includes(searchTerm));
  });

  const columns = React.useMemo<TableColumn<OutlookSkipAuditEmail>[]>(
    () => [
      {
        id: "subject",
        label: "Subject",
        width: 300,
        render: (email) => (
          <TruncatedCell value={email.subject ?? "No subject"} maxWidth={280} />
        ),
        sortable: true,
        sortValue: (email) => email.subject ?? "",
      },
      {
        id: "from",
        label: "From",
        width: 210,
        render: (email) => <CellText value={senderLabel(email)} muted />,
        sortable: true,
        sortValue: (email) => senderLabel(email),
      },
      {
        id: "category",
        label: "Category",
        width: 170,
        render: (email) => (
          <StatusBadge
            status={categoryLabel(email.classificationCategory)}
            variant="warning"
          />
        ),
        sortable: true,
        sortValue: (email) => categoryLabel(email.classificationCategory),
      },
      {
        id: "reason",
        label: "Reason",
        width: 340,
        render: (email) => (
          <TruncatedCell value={email.classificationReason} maxWidth={320} />
        ),
        sortable: true,
        sortValue: (email) => email.classificationReason,
      },
      {
        id: "received",
        label: "Received",
        width: 180,
        render: (email) => <CellDate value={email.receivedAt} showTime />,
        sortable: true,
        sortValue: (email) => email.receivedAt ?? "",
      },
      {
        id: "lastSeen",
        label: "Last Seen",
        width: 180,
        render: (email) => <CellDate value={email.lastSeenAt} showTime />,
        sortable: true,
        sortValue: (email) => email.lastSeenAt,
      },
      {
        id: "mailbox",
        label: "Mailbox",
        width: 190,
        render: (email) => <CellText value={email.mailboxUserId} muted />,
        sortable: true,
        sortValue: (email) => email.mailboxUserId ?? "",
      },
      {
        id: "confidence",
        label: "Confidence",
        width: 120,
        render: (email) => (
          <CellText value={confidenceLabel(email.classificationConfidence)} />
        ),
        sortable: true,
        sortValue: (email) => email.classificationConfidence ?? 0,
      },
    ],
    [],
  );

  const sorted = React.useMemo(() => {
    const sortColumn = columns.find(
      (column) => column.id === tableState.sortBy,
    );
    const sortValue = sortColumn?.sortValue;
    if (!sortValue) return filtered;

    return [...filtered].sort((left, right) => {
      const leftValue = sortValue(left);
      const rightValue = sortValue(right);
      const comparison = String(leftValue ?? "").localeCompare(
        String(rightValue ?? ""),
      );
      return tableState.sortDirection === "asc" ? comparison : -comparison;
    });
  }, [columns, filtered, tableState.sortBy, tableState.sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / tableState.perPage));
  const pageStart = (tableState.page - 1) * tableState.perPage;
  const paged = sorted.slice(pageStart, pageStart + tableState.perPage);

  const updateFilters = (
    next: Record<
      string,
      string | number | boolean | string[] | null | undefined
    >,
  ) => {
    tableState.setActiveFilters(next);
    tableState.setSearchParams({
      classification_category: (next.classification_category ?? null) as
        | string
        | null,
      page: "1",
    });
    tableState.setPage(1);
  };

  return (
    <UnifiedTablePage
      header={
        embedded
          ? { title: "", variant: "compact" }
          : {
              title: "Skipped Outlook Emails",
              description:
                "Hard-skipped Outlook messages kept for classifier review.",
            }
      }
      tabs={navigationTabs}
      toolbar={{
        totalItems: data.length,
        filteredItems: filtered.length,
        selectedCount: 0,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search skipped emails...",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        enabledViews: ["table", "list"],
        filters: [
          {
            id: "classification_category",
            label: "Category",
            type: "select",
            options: CATEGORY_OPTIONS,
          },
        ],
        activeFilters: tableState.activeFilters,
        onFilterChange: (filters) =>
          updateFilters({
            classification_category: filters.classification_category as
              | string
              | undefined,
          }),
        onClearFilters: () => updateFilters({}),
        columns: columnsConfig,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: paged,
        isLoading,
        error: error instanceof Error ? error : null,
      }}
      table={{
        density: "compact",
        columns,
        getRowId: (email) => email.id,
        activeRowId: selectedEmail?.id ?? null,
        onRowClick: (email) => setSelectedEmail(email),
        rowActions: (email) =>
          email.webLink ? (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Open in Outlook"
              asChild
            >
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
          tableState.setSearchParams({
            sort: sortBy,
            sort_dir: direction,
            page: "1",
          });
          tableState.setPage(1);
        },
      }}
      views={{
        list: (email) => (
          <div
            className="space-y-2 border-b px-4 py-3"
            onClick={() => setSelectedEmail(email)}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {email.subject ?? "No subject"}
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  {senderLabel(email)}
                </div>
              </div>
              <StatusBadge
                status={categoryLabel(email.classificationCategory)}
                variant="warning"
              />
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {email.classificationReason}
            </p>
          </div>
        ),
      }}
      emptyState={{
        title: "No skipped emails found",
        description:
          "No messages have been hard-skipped by the classifier yet.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered: Boolean(tableState.searchInput) || Boolean(categoryFilter),
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
        containerPadding: !embedded,
      }}
      sidePanel={
        selectedEmail
          ? {
              content: (
                <SkipAuditDetail
                  email={selectedEmail}
                  onClose={() => setSelectedEmail(null)}
                />
              ),
              variant: "wide",
              defaultWidth: 560,
              minWidth: 440,
              storageKey: "outlook-skip-audit-detail",
              onClose: () => setSelectedEmail(null),
            }
          : undefined
      }
    />
  );
}
