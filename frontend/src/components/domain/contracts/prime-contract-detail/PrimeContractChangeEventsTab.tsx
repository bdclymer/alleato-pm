"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/tables/DataTable";
import { EmptyState, StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useChangeEvents } from "@/hooks/use-change-events";
import type { ChangeEvent } from "@/types/change-events";

interface PrimeContractChangeEventsTabProps {
  projectId: string;
  contractId: string;
  formatCurrency: (value: number | null | undefined) => string;
}

export function PrimeContractChangeEventsTab({
  projectId,
  contractId,
  formatCurrency,
}: PrimeContractChangeEventsTabProps) {
  const router = useRouter();
  const { changeEvents, isLoading } = useChangeEvents({
    projectId: Number(projectId),
    limit: 200,
  });

  // Filter to events linked to this prime contract (or show all if none linked)
  const filtered = changeEvents.filter(
    (ce) => (ce as ChangeEvent & { prime_contract_id?: string | null }).prime_contract_id === contractId,
  );
  const rows = filtered.length > 0 ? filtered : changeEvents;

  const columns: ColumnDef<ChangeEvent>[] = [
    {
      accessorKey: "number",
      header: "#",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.number ?? "—"}</span>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <button
          type="button"
          className="text-left text-primary hover:underline"
          onClick={() => router.push(`/${projectId}/change-events/${row.original.id}`)}
        >
          {row.original.title || "Untitled"}
        </button>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.type || "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status ?? "Open"} />,
    },
    {
      accessorKey: "scope",
      header: "Scope",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.scope || "—"}</span>
      ),
    },
    {
      id: "cost_rom",
      header: "Cost ROM",
      cell: ({ row }) => (
        <span className="tabular-nums text-right block">
          {row.original.cost_rom != null ? formatCurrency(Number(row.original.cost_rom)) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Change Events</h3>
          <p className="text-sm text-muted-foreground">
            Change events associated with this prime contract
          </p>
        </div>
        <Button
          size="sm"
          onClick={() =>
            router.push(`/${projectId}/change-events/new?contractId=${contractId}`)
          }
        >
          <Plus />
          New Change Event
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Zap className="h-10 w-10 text-muted-foreground/50" />}
          title="No change events yet"
          description="Change events capture unforeseen conditions, owner requests, and design changes that may impact the contract."
          action={{
            label: "New Change Event",
            onClick: () =>
              router.push(`/${projectId}/change-events/new?contractId=${contractId}`),
          }}
        />
      ) : (
        <DataTable columns={columns} data={rows} showToolbar={false} />
      )}
    </div>
  );
}
