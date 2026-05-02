"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useDataTable } from "@/hooks/use-data-table";
import { AleatoDataTable } from "@/components/data-table/alleato-data-table";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { getRfiColumns } from "@/features/rfis/rfis-columns";
import type { RFI } from "@/types/database-extensions";

interface RfisTableProps {
  projectId: number;
}

interface RfiListResponse {
  data: RFI[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchRfis(
  projectId: number,
  params: {
    page: number;
    perPage: number;
    sort: string | null;
    status: string | null;
    search: string | null;
  },
): Promise<RfiListResponse> {
  const apiParams = new URLSearchParams();
  apiParams.set("page", String(params.page));
  apiParams.set("limit", String(params.perPage));
  if (params.status) apiParams.set("status", params.status);
  if (params.search) apiParams.set("search", params.search);

  return apiFetch<RfiListResponse>(
    `/api/projects/${projectId}/rfis?${apiParams.toString()}`,
  );
}

export function RfisTable({ projectId }: RfisTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const page = Number(searchParams.get("page") ?? "1");
  const perPage = Number(searchParams.get("perPage") ?? "25");
  const sort = searchParams.get("sort");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const queryParams = { page, perPage, sort, status, search };

  const { data, isLoading } = useQuery({
    queryKey: ["rfis", projectId, queryParams],
    queryFn: () => fetchRfis(projectId, queryParams),
    placeholderData: (prev) => prev,
  });

  const rfis = data?.data ?? [];
  const pageCount = data?.meta.totalPages ?? 1;

  const columns = React.useMemo(() => getRfiColumns({ projectId }), [projectId]);

  const { table } = useDataTable({
    data: rfis,
    columns,
    pageCount,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    initialState: {
      pagination: { pageIndex: 0, pageSize: 25 },
      columnVisibility: {
        responsible_contractor: false,
        received_from: false,
        location: false,
        rfi_stage: false,
        schedule_impact: false,
        cost_impact: false,
        created_at: false,
      },
    },
  });

  const handleSearchChange = React.useCallback(
    (val: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (val) next.set("search", val);
      else next.delete("search");
      next.set("page", "1");
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleBulkDelete = React.useCallback(
    async (ids: string[]) => {
      try {
        await Promise.all(
          ids.map((id) =>
            apiFetch(`/api/projects/${projectId}/rfis/${id}`, { method: "DELETE" }),
          ),
        );
        toast.success(`${ids.length} RFI${ids.length !== 1 ? "s" : ""} deleted`);
        void queryClient.invalidateQueries({ queryKey: ["rfis", projectId] });
      } catch {
        toast.error("Failed to delete selected RFIs");
      }
    },
    [projectId, queryClient],
  );

  // Prefetch next page
  React.useEffect(() => {
    if (data && page < pageCount) {
      void queryClient.prefetchQuery({
        queryKey: ["rfis", projectId, { ...queryParams, page: page + 1 }],
        queryFn: () => fetchRfis(projectId, { ...queryParams, page: page + 1 }),
      });
    }
  }, [data, page, pageCount, projectId, queryParams, queryClient]);

  return (
    <AleatoDataTable
      table={table}
      isLoading={isLoading}
      storageKey={`rfis-${projectId}`}
      title="RFIs"
      description="Requests for Information"
      actions={
        <Button
          size="sm"
          onClick={() => router.push(`/${projectId}/rfis/new`)}
          data-testid="rfis-create-button"
        >
          <Plus />
          Create RFI
        </Button>
      }
      searchValue={search ?? ""}
      onSearchChange={handleSearchChange}
      searchPlaceholder="Search RFIs…"
      onBulkDelete={handleBulkDelete}
    />
  );
}
