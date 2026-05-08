"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useDataTable } from "@/hooks/use-data-table";
import { AleatoDataTable } from "@/components/data-table/alleato-data-table";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { apiFetch, summarizeBulkResults } from "@/lib/api-client";
import { getRfiColumns } from "@/features/rfis/rfis-columns";
import type { RFI } from "@/types/database-extensions";

interface RfisTableProps {
  projectId: number;
}

type ActiveTab = "all" | "open" | "closed";

interface RfiListResponse {
  data: RFI[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    tab_counts: {
      all: number;
      open: number;
      closed: number;
    };
  };
}

const TAB_STATUS_MAP: Record<ActiveTab, string | null> = {
  all: null,
  open: "draft,open,answered",
  closed: "closed,closed-draft",
};

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
  const searchParamsRaw = useSearchParams()!;
  const searchParams = searchParamsRaw ?? new URLSearchParams();
  const queryClient = useQueryClient();
  const activeTabParam = searchParams.get("tab");
  const activeTab: ActiveTab =
    activeTabParam === "open" || activeTabParam === "closed" ? activeTabParam : "all";

  const page = Number(searchParams.get("page") ?? "1");
  const perPage = Number(searchParams.get("perPage") ?? "25");
  const sort = searchParams.get("sort");
  const search = searchParams.get("search");
  const status = TAB_STATUS_MAP[activeTab];

  const queryParams = React.useMemo(
    () => ({ page, perPage, sort, status, search }),
    [page, perPage, sort, status, search],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["rfis", projectId, queryParams],
    queryFn: () => fetchRfis(projectId, queryParams),
    placeholderData: (prev) => prev,
  });

  const rfis = data?.data ?? [];
  const pageCount = data?.meta.totalPages ?? 1;
  const tabCounts = data?.meta.tab_counts;

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
      const results = await Promise.allSettled(
        ids.map((id) =>
          apiFetch(`/api/projects/${projectId}/rfis/${id}`, { method: "DELETE" }),
        ),
      );
      const { succeeded, failed, firstError } = summarizeBulkResults(results);
      if (succeeded > 0) {
        toast.success(`${succeeded} RFI${succeeded !== 1 ? "s" : ""} deleted`);
        void queryClient.invalidateQueries({ queryKey: ["rfis", projectId] });
      }
      if (failed > 0) {
        toast.error(`${failed} RFI${failed !== 1 ? "s" : ""} failed: ${firstError}`);
      }
    },
    [projectId, queryClient],
  );

  React.useEffect(() => {
    if (data && page < pageCount) {
      void queryClient.prefetchQuery({
        queryKey: ["rfis", projectId, { ...queryParams, page: page + 1 }],
        queryFn: () => fetchRfis(projectId, { ...queryParams, page: page + 1 }),
      });
    }
  }, [data, page, pageCount, projectId, queryParams, queryClient]);

  const buildTabHref = React.useCallback(
    (tab: ActiveTab) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("tab", tab);
      next.delete("status");
      next.set("page", "1");
      const query = next.toString();
      return `/${projectId}/rfis${query ? `?${query}` : ""}`;
    },
    [projectId, searchParams],
  );

  const tabs = [
    {
      label: "All",
      href: buildTabHref("all"),
      count: tabCounts?.all,
      isActive: activeTab === "all",
      testId: "rfis-tab-all",
    },
    {
      label: "Open",
      href: buildTabHref("open"),
      count: tabCounts?.open,
      isActive: activeTab === "open",
      testId: "rfis-tab-open",
    },
    {
      label: "Closed",
      href: buildTabHref("closed"),
      count: tabCounts?.closed,
      isActive: activeTab === "closed",
      testId: "rfis-tab-closed",
    },
  ];

  return (
    <PageShell
      variant="table"
      title="RFIs"
      description="Requests for Information"
      actions={
        <Button
          size="sm"
          onClick={() => router.push(`/${projectId}/rfis/new`)}
          data-testid="rfis-create-button"
        >
          <Plus className="h-4 w-4" />
          Create RFI
        </Button>
      }
    >
      <AleatoDataTable
        table={table}
        isLoading={isLoading}
        storageKey={`rfis-${projectId}`}
        tabs={tabs}
        searchValue={search ?? ""}
        onSearchChange={handleSearchChange}
        searchPlaceholder={
          activeTab === "all" ? "Search RFIs…" : `Search ${activeTab} RFIs…`
        }
        onBulkDelete={handleBulkDelete}
      />
    </PageShell>
  );
}
