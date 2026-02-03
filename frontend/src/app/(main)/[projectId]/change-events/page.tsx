"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { PageContainer, PageTabs } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";
import {
  SummaryCardGrid,
  formatCurrencyValue,
  formatNumberValue,
} from "@/components/ui/summary-card-grid";
import { ChangeEventsTableColumns } from "@/components/domain/change-events/ChangeEventsTableColumns";
import { useProjectChangeEvents, type ChangeEvent } from "@/hooks/use-change-events";
import { useProjectChangeEventRfqs, type ChangeEventRfqRecord } from "@/hooks/use-change-event-rfqs";
import { ChangeEventRfqForm, type ChangeEventRfqFormValues } from "@/components/domain/change-events/ChangeEventRfqForm";
import {
  ChangeEventRfqResponseForm,
  type ChangeEventRfqResponseFormValues,
} from "@/components/domain/change-events/ChangeEventRfqResponseForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

type TabValue = "detail" | "summary" | "rfqs" | "recycle";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  pending: "Pending Approval",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  closed: "Closed",
  converted: "Converted",
};

const getStatusKey = (status?: string | null) =>
  status?.toLowerCase().replace(/\s+/g, "_") ?? "unknown";

const getStatusLabel = (status?: string | null) => {
  if (!status) return "Unknown";
  return STATUS_LABELS[status.toLowerCase()] ?? status;
};

export default function ProjectChangeEventsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const projectIdParamRaw = params.projectId;
  const projectIdParam =
    typeof projectIdParamRaw === "string"
      ? projectIdParamRaw
      : Array.isArray(projectIdParamRaw)
      ? projectIdParamRaw[0]
      : undefined;
  const parsedProjectId = projectIdParam ? parseInt(projectIdParam, 10) : NaN;
  const hasValidProjectId = Number.isFinite(parsedProjectId) && parsedProjectId > 0;
  const projectId = hasValidProjectId ? parsedProjectId : 0;
  const statusParam = searchParams.get("status") ?? "";

  const [searchValue, setSearchValue] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("detail");
  const [isCreateRfqOpen, setIsCreateRfqOpen] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<ChangeEventRfqRecord | null>(null);
  const [isRfqSubmitting, setIsRfqSubmitting] = useState(false);
  const [isResponseSubmitting, setIsResponseSubmitting] = useState(false);

  const detailOptions = useMemo(
    () => ({
      status: statusParam || undefined,
      limit: 500,
      enabled: hasValidProjectId,
    }),
    [statusParam, hasValidProjectId],
  );

  const { changeEvents = [], isLoading, error, refetch: refetchChangeEvents } =
    useProjectChangeEvents(projectId, detailOptions);
  const {
    rfqs,
    isLoading: isRfqsLoading,
    error: rfqError,
    createRfq,
    createResponse,
  } = useProjectChangeEventRfqs(projectId, { enabled: hasValidProjectId });

  const {
    changeEvents: deletedEvents = [],
    isLoading: isRecycleLoading,
    refetch: refetchDeletedEvents,
  } = useProjectChangeEvents(projectId, {
    includeDeleted: true,
    enabled: hasValidProjectId,
  });

  const recycleList = useMemo(
    () => deletedEvents.filter((event) => Boolean(event.deleted_at)),
    [deletedEvents],
  );

  const handleView = useCallback(
    (changeEventId: number) => {
      router.push(`/${projectId}/change-events/${changeEventId}`);
    },
    [projectId, router],
  );

  const handleEdit = useCallback(
    (changeEventId: number) => {
      router.push(`/${projectId}/change-events/${changeEventId}/edit`);
    },
    [projectId, router],
  );

  const handleDelete = useCallback(
    async (changeEventId: number) => {
      const confirmed = window.confirm(
        "Move this change event to the recycle bin? You can restore it later manually.",
      );
      if (!confirmed) {
        return;
      }

      try {
        const response = await fetch(
          `/api/projects/${projectId}/change-events/${changeEventId}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          const message = await response.text();
          throw new Error(
            message || "Unable to delete change event. Check permissions and try again.",
          );
        }

        toast.success("Change event moved to recycle bin");
        refetchChangeEvents();
        refetchDeletedEvents();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete change event";
        toast.error(message);
      }
    },
    [projectId, refetchChangeEvents, refetchDeletedEvents],
  );

  const detailColumns = useMemo(
    () =>
      ChangeEventsTableColumns({
        onView: handleView,
        onEdit: handleEdit,
        onDelete: handleDelete,
      }),
    [handleView, handleEdit, handleDelete],
  );

  const detailTable = useReactTable({
    data: changeEvents
      .filter((event) => !event.deleted_at)
      .filter((event) => {
        const term = searchValue.trim().toLowerCase();
        if (!term) return true;

        const number = event.number ?? `CE-${event.id}`;
        return (
          number.toLowerCase().includes(term) ||
          event.title?.toLowerCase().includes(term) ||
          event.reason?.toLowerCase().includes(term) ||
          event.notes?.toLowerCase().includes(term)
        );
      }),
    columns: detailColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    changeEvents.forEach((event) => {
      const key = getStatusKey(event.status);
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [changeEvents]);

  const totalEvents = changeEvents.length;
  const openCount = statusCounts.open ?? 0;
  const pendingCount = (statusCounts.pending ?? 0) + (statusCounts.pending_approval ?? 0);
  const approvedCount = statusCounts.approved ?? 0;
  const rejectedCount = statusCounts.rejected ?? 0;
  const closedCount = statusCounts.closed ?? 0;

  const totalImpact = changeEvents.reduce(
    (sum, event) => sum + (event.estimated_impact ?? 0),
    0,
  );

  const rfqSummary = useMemo(() => {
    const total = rfqs.length;
    const awaitingResponse = rfqs.filter((rfq) => (rfq.response_count ?? 0) === 0).length;
    const closed = rfqs.filter((rfq) => rfq.status?.toLowerCase().includes("closed")).length;
    return { total, awaitingResponse, closed };
  }, [rfqs]);

  const handleCreateRfq = useCallback(
    async (values: ChangeEventRfqFormValues) => {
      setIsRfqSubmitting(true);
      try {
        await createRfq({
          changeEventId: values.changeEventId,
          title: values.title,
          dueDate: values.dueDate,
          includeAttachments: values.includeAttachments,
          notes: values.notes,
        });
        toast.success("RFQ created");
        setIsCreateRfqOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create RFQ");
      } finally {
        setIsRfqSubmitting(false);
      }
    },
    [createRfq],
  );

  const handleCreateResponse = useCallback(
    async (values: ChangeEventRfqResponseFormValues) => {
      if (!selectedRfq) return;
      setIsResponseSubmitting(true);
      try {
        await createResponse(selectedRfq.id, {
          changeEventId: selectedRfq.change_event_id,
          lineItemId: values.lineItemId,
          unitPrice: values.unitPrice,
          notes: values.notes,
        });
        toast.success("Response submitted");
        setSelectedRfq(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to submit response");
      } finally {
        setIsResponseSubmitting(false);
      }
    },
    [selectedRfq, createResponse],
  );

  const mostRecentUpdate = useMemo(() => {
    let timestamp = 0;
    changeEvents.forEach((event) => {
      const candidate = event.updated_at ?? event.created_at;
      if (!candidate) return;
      const millis = new Date(candidate).getTime();
      if (!Number.isNaN(millis) && millis > timestamp) {
        timestamp = millis;
      }
    });
    return timestamp ? new Date(timestamp).toISOString() : null;
  }, [changeEvents]);

  const topImpactEvents = useMemo(() => {
    return [...changeEvents]
      .sort((a, b) => (b.estimated_impact ?? 0) - (a.estimated_impact ?? 0))
      .slice(0, 3);
  }, [changeEvents]);

  const summaryCards = useMemo(
    () => [
      {
        id: "total-events",
        label: "Change Events",
        value: formatNumberValue(totalEvents),
      },
      {
        id: "open",
        label: "Open",
        value: formatNumberValue(openCount),
      },
      {
        id: "pending",
        label: "Pending Approval",
        value: formatNumberValue(pendingCount),
      },
      {
        id: "approved",
        label: "Approved",
        value: formatNumberValue(approvedCount),
      },
      {
        id: "impact",
        label: "Estimated Impact",
        value: formatCurrencyValue(totalImpact),
      },
    ],
    [totalEvents, openCount, pendingCount, approvedCount, totalImpact],
  );

  const recycleColumns = useMemo<ColumnDef<ChangeEvent>[]>(() => {
    return [
      {
        accessorKey: "number",
        header: "#",
        cell: ({ row }) => {
          const number = row.getValue("number") as string | null;
          return <span className="font-mono text-sm">{number ?? `CE-${row.original.id}`}</span>;
        },
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <span className="max-w-xs truncate font-medium">{row.getValue("title") as string}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="outline">
            {getStatusLabel(row.getValue("status") as string | null)}
          </Badge>
        ),
      },
      {
        accessorKey: "deleted_at",
        header: "Deleted On",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.getValue("deleted_at") as string)}
          </span>
        ),
      },
    ];
  }, []);

  const recycleTable = useReactTable({
    data: recycleList,
    columns: recycleColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!hasValidProjectId) {
    return (
      <>
        <PageHeader
          title="Change Events"
          description="Provide a valid project identifier to access change events."
        />
        <PageContainer>
          <Card>
            <CardHeader>
              <CardTitle>Invalid Project</CardTitle>
              <CardDescription>
                Change events require a numeric project identifier. Navigate through the
                project workspace to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Text tone="muted">Missing or malformed `{projectIdParam}` parameter.</Text>
            </CardContent>
          </Card>
        </PageContainer>
      </>
    );
  }

  const basePath = `/${projectId}/change-events`;
  const statusTabs = [
    {
      label: "All Change Events",
      href: basePath,
      count: totalEvents,
      testId: "change-events-tab-all",
      countTestId: "change-events-count-all",
    },
    {
      label: "Open",
      href: `${basePath}?status=open`,
      count: openCount,
      testId: "change-events-tab-open",
      countTestId: "change-events-count-open",
    },
    {
      label: "Pending",
      href: `${basePath}?status=pending`,
      count: pendingCount,
      testId: "change-events-tab-pending",
      countTestId: "change-events-count-pending",
    },
    {
      label: "Approved",
      href: `${basePath}?status=approved`,
      count: approvedCount,
      testId: "change-events-tab-approved",
      countTestId: "change-events-count-approved",
    },
  ];

  return (
    <>
      <PageHeader
        title="Change Events"
        description="Track scope changes, approvals, line items, and financial impact."
        actions={
          <Button
            size="sm"
            onClick={() => router.push(`/${projectId}/change-events/new`)}
            className="gap-2"
            data-testid="change-events-new-button"
          >
            <Plus className="h-4 w-4" />
            New Change Event
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        <TabsList>
          <TabsTrigger value="detail" data-testid="change-events-tab-detail">
            Detail
          </TabsTrigger>
          <TabsTrigger value="summary" data-testid="change-events-tab-summary">
            Summary
          </TabsTrigger>
          <TabsTrigger value="rfqs" data-testid="change-events-tab-rfqs">
            RFQs
          </TabsTrigger>
          <TabsTrigger value="recycle" data-testid="change-events-tab-recycle">
            Recycle Bin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detail">
          <PageContainer className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Input
                placeholder="Search change events..."
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                className="max-w-md"
                data-testid="change-events-search-input"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refetchChangeEvents}
                  className="gap-2"
                  data-testid="change-events-refresh-button"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Text size="sm" tone="muted">
                  Showing {detailTable.getRowModel().rows.length} / {totalEvents}
                </Text>
              </div>
            </div>

            <PageTabs tabs={statusTabs} />

            {error ? (
              <Card>
                <CardHeader>
                  <CardTitle>Unable to load change events</CardTitle>
                  <CardDescription>{error.message}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    onClick={refetchChangeEvents}
                    data-testid="change-events-retry-button"
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : isLoading && !detailTable.getRowModel().rows.length ? (
              <Card className="space-y-3 p-6">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className="h-4 w-full rounded-full bg-muted/40 animate-pulse"
                  />
                ))}
              </Card>
            ) : detailTable.getRowModel().rows.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No change events yet</CardTitle>
                  <CardDescription>
                    Create your first change event to begin tracking scope changes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/${projectId}/change-events/new`)}
                  >
                    Add change event
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    {detailTable.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} colSpan={header.colSpan}>
                            {!header.isPlaceholder &&
                              flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {detailTable.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-testid={`change-event-row-${row.original.id}`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </PageContainer>
        </TabsContent>

        <TabsContent value="summary">
          <PageContainer className="space-y-6">
            {changeEvents.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                  <CardDescription>No data available yet.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <>
                <SummaryCardGrid cards={summaryCards} columns={3} />
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Status breakdown</CardTitle>
                      <CardDescription>
                        Updated {mostRecentUpdate ? formatDate(mostRecentUpdate) : "—"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[{
                        label: "Open",
                        value: openCount,
                      }, {
                        label: "Pending Approval",
                        value: pendingCount,
                      }, {
                        label: "Approved",
                        value: approvedCount,
                      }, {
                        label: "Rejected",
                        value: rejectedCount,
                      }, {
                        label: "Closed",
                        value: closedCount,
                      }].map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                          <span className="text-sm">{item.label}</span>
                          <Badge variant="outline">{item.value}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Top estimated impacts</CardTitle>
                      <CardDescription>
                        Ranked by preliminary estimate across active change events.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {topImpactEvents.length === 0 ? (
                        <Text tone="muted" size="sm">
                          Add change events to see financial highlights.
                        </Text>
                      ) : (
                        topImpactEvents.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <div>
                              <p className="text-sm font-medium">{event.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {(event.number ?? `CE-${event.id}`)} • {getStatusLabel(event.status)}
                              </p>
                            </div>
                            <span className="text-sm font-medium">
                              {formatCurrencyValue(event.estimated_impact ?? 0)}
                            </span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </PageContainer>
        </TabsContent>

        <TabsContent value="rfqs">
          <PageContainer className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Request for Quotes</h2>
                <p className="text-sm text-muted-foreground">
                  Generate RFQs directly from change events and track collaborator responses.
                </p>
              </div>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setIsCreateRfqOpen(true)}
                data-testid="change-events-new-rfq-button"
              >
                <Plus className="h-4 w-4" />
                New RFQ
              </Button>
            </div>

            {rfqError ? (
              <Card>
                <CardHeader>
                  <CardTitle>Unable to load RFQs</CardTitle>
                  <CardDescription>{rfqError.message}</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total RFQs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">{rfqSummary.total}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Awaiting Response</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">{rfqSummary.awaitingResponse}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Closed RFQs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">{rfqSummary.closed}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>RFQ Log</CardTitle>
                <CardDescription>Change event RFQs and collaborator response history.</CardDescription>
              </CardHeader>
              <CardContent>
                {isRfqsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, index) => (
                      <div key={index} className="h-10 w-full animate-pulse rounded-md bg-muted/40" />
                    ))}
                  </div>
                ) : rfqs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No RFQs yet. Create your first RFQ to kick off the quote process.
                  </div>
                ) : (
                  <div className="overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>RFQ</TableHead>
                          <TableHead>Change Event</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Responses</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rfqs.map((rfq) => (
                          <TableRow key={rfq.id}>
                            <TableCell className="font-mono text-sm">
                              {rfq.rfq_number || rfq.id}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">
                                {rfq.change_event_title || "Untitled"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {rfq.change_event_number || rfq.change_event_id}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{rfq.status || "Draft"}</Badge>
                            </TableCell>
                            <TableCell>
                              {rfq.due_date ? formatDate(rfq.due_date) : "-"}
                            </TableCell>
                            <TableCell>{rfq.response_count}</TableCell>
                            <TableCell>
                              {formatCurrencyValue(Number(rfq.estimated_total_amount) || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRfq(rfq)}
                              >
                                Add Response
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </PageContainer>

          <Dialog open={isCreateRfqOpen} onOpenChange={setIsCreateRfqOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create RFQ</DialogTitle>
                <DialogDescription>
                  Choose a change event and define the RFQ details.
                </DialogDescription>
              </DialogHeader>
              <ChangeEventRfqForm
                changeEvents={changeEvents.filter((event) => !event.deleted_at)}
                isSubmitting={isRfqSubmitting}
                onCancel={() => setIsCreateRfqOpen(false)}
                onSubmit={handleCreateRfq}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={Boolean(selectedRfq)} onOpenChange={(open) => {
            if (!open) {
              setSelectedRfq(null);
            }
          }}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit RFQ Response</DialogTitle>
                <DialogDescription>
                  Record collaborator pricing for {(selectedRfq?.change_event_title) ?? "the change event"}.
                </DialogDescription>
              </DialogHeader>
              {selectedRfq ? (
                <ChangeEventRfqResponseForm
                  projectId={projectId}
                  changeEventId={selectedRfq.change_event_id}
                  isSubmitting={isResponseSubmitting}
                  onSubmit={handleCreateResponse}
                  onCancel={() => setSelectedRfq(null)}
                />
              ) : null}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="recycle">
          <PageContainer className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recycle Bin</CardTitle>
                <CardDescription>
                  Soft-deleted change events are retained for compliance. They can currently be
                  restored through the Supabase dashboard.
                </CardDescription>
              </CardHeader>
            </Card>
            {isRecycleLoading && recycleList.length === 0 ? (
              <Card className="space-y-3 p-6">
                {[...Array(3)].map((_, index) => (
                  <div
                    key={index}
                    className="h-4 w-full rounded-full bg-muted/40 animate-pulse"
                  />
                ))}
              </Card>
            ) : recycleList.length === 0 ? (
              <Card>
                <CardContent className="text-center text-sm text-muted-foreground">
                  No items in the recycle bin.
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    {recycleTable.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} colSpan={header.colSpan}>
                            {!header.isPlaceholder &&
                              flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {recycleTable.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-testid={`change-event-recycle-row-${row.original.id}`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </PageContainer>
        </TabsContent>
      </Tabs>
    </>
  );
}
