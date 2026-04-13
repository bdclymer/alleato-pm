"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { SectionHeader } from "@/components/ds/section-header";
import { StatusBadge } from "@/components/ds/status-badge";
import { EmptyState } from "@/components/ds/empty-state";
import { Text } from "@/components/ds/text";
import { DataTable } from "@/components/tables/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/table-config/formatters";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrimePco {
  id: string;
  pco_number: string | null;
  title: string;
  status: string;
  total_amount: number | null;
  description: string | null;
  schedule_impact: number | null;
  due_date: string | null;
  created_at: string;
  prime_contract_id: string;
  promoted_to_co_id: string | null;
}

interface PrimeContractPcosSectionProps {
  projectId: string;
  contractId: string;
  formatCurrency: (value: number | null | undefined) => string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PrimeContractPcosSection({
  projectId,
  contractId,
  formatCurrency,
}: PrimeContractPcosSectionProps) {
  const router = useRouter();
  const [pcos, setPcos] = useState<PrimePco[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPcos = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/prime-contract-pcos`,
        );
        if (!res.ok) throw new Error("Failed to fetch PCOs");
        const json = await res.json();
        const allPcos: PrimePco[] = json.data ?? json ?? [];
        // Filter to only PCOs for this specific contract
        const filtered = allPcos.filter(
          (p) => p.prime_contract_id === contractId,
        );
        setPcos(filtered);
      } catch {
        toast.error("Failed to load potential change orders");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPcos();
  }, [projectId, contractId]);

  const columns: ColumnDef<PrimePco>[] = useMemo(
    () => [
      {
        accessorKey: "pco_number",
        header: "PCO #",
        cell: ({ row }) => (
          <Link
            href={`/${projectId}/prime-contract-pcos/${row.original.id}`}
            className="flex items-center gap-1 text-primary hover:underline font-medium"
          >
            {row.original.pco_number ?? "—"}
            <ExternalLink className="h-3 w-3" />
          </Link>
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => <Text>{row.original.title}</Text>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "total_amount",
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <Text>{formatCurrency(row.original.total_amount)}</Text>
          </div>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => (
          <Text tone="muted">{formatDate(row.original.created_at)}</Text>
        ),
      },
      {
        accessorKey: "promoted_to_co_id",
        header: "Promoted",
        cell: ({ row }) => (
          <Text tone="muted">
            {row.original.promoted_to_co_id ? "Yes" : "—"}
          </Text>
        ),
      },
    ],
    [projectId, formatCurrency],
  );

  const totalAmount = useMemo(
    () => pcos.reduce((sum, p) => sum + (p.total_amount ?? 0), 0),
    [pcos],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Potential Change Orders"
        count={pcos.length}
        action={{
          label: "+ Create PCO",
          onClick: () =>
            router.push(
              `/${projectId}/prime-contract-pcos/new?contractId=${contractId}`,
            ),
        }}
      />
      {pcos.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No potential change orders yet"
          description="PCOs will appear here when created for this contract."
          action={{
            label: "Create PCO",
            onClick: () =>
              router.push(
                `/${projectId}/prime-contract-pcos/new?contractId=${contractId}`,
              ),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={pcos}
          showToolbar={false}
          showPagination={pcos.length > 10}
        />
      )}
    </section>
  );
}
