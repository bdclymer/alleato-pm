"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink, MessageSquare } from "lucide-react";

import { EmptyState } from "@/components/ds/empty-state";
import { StatusBadge } from "@/components/ds/status-badge";
import { Text } from "@/components/ds/text";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/table-config/formatters";

interface CommitmentRfq {
  id: string;
  rfq_number: string;
  title: string;
  status: string;
  due_date: string;
  sent_at: string | null;
  response_received_at: string | null;
  created_at: string;
  change_event_id: string;
  change_event_number: string | null;
  change_event_title: string | null;
  response_count: number;
}

interface RfqsTabProps {
  commitmentId: string;
  projectId: number;
}

function formatDateOrDash(value: string | null | undefined): string {
  return value ? formatDate(value) : "—";
}

export function RfqsTab({ commitmentId, projectId }: RfqsTabProps) {
  const [rfqs, setRfqs] = useState<CommitmentRfq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchRfqs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/commitments/${commitmentId}/rfqs`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Failed to load RFQs");
        }

        const payload = await response.json();
        if (!active) return;
        setRfqs(Array.isArray(payload.data) ? payload.data : []);
      } catch (fetchError) {
        if (!active) return;
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load RFQs");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchRfqs();
    return () => {
      active = false;
    };
  }, [commitmentId]);

  const columns: Array<ColumnDef<CommitmentRfq>> = useMemo(
    () => [
      {
        accessorKey: "rfq_number",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            RFQ #
            <ArrowUpDown />
          </Button>
        ),
        cell: ({ row }) => (
          <Link
            href={`/${projectId}/change-events/${row.original.change_event_id}`}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {row.original.rfq_number}
            <ExternalLink className="h-3 w-3" />
          </Link>
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <Text size="sm">{row.original.title}</Text>
        ),
      },
      {
        accessorKey: "change_event_number",
        header: "Change Event",
        cell: ({ row }) => {
          const number = row.original.change_event_number || "—";
          return (
            <Text size="sm" className="text-muted-foreground">
              {number}
            </Text>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status || "Draft"} />
        ),
      },
      {
        accessorKey: "due_date",
        header: "Due",
        cell: ({ row }) => (
          <Text size="sm">{formatDateOrDash(row.original.due_date)}</Text>
        ),
      },
      {
        accessorKey: "response_count",
        header: "Responses",
        cell: ({ row }) => (
          <Text size="sm" className="tabular-nums">
            {row.original.response_count}
          </Text>
        ),
      },
      {
        accessorKey: "sent_at",
        header: "Sent",
        cell: ({ row }) => (
          <Text size="sm">{formatDateOrDash(row.original.sent_at)}</Text>
        ),
      },
    ],
    [projectId],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return <Text tone="destructive">{error}</Text>;
  }

  if (rfqs.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-5 w-5 text-muted-foreground" />}
        title="No RFQs"
        description="RFQs tied to this commitment will appear here."
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={rfqs}
      showToolbar={false}
      showPagination={rfqs.length > 10}
    />
  );
}
