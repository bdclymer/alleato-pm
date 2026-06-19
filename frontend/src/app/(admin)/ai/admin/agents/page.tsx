"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

import {
  buildAiAgentColumns,
  aiAgentDefaultVisibleColumns,
  aiAgentFilters,
  type AiAgent,
} from "@/features/ai-agents/ai-agents-table-config";
import { AiAgentDetailPanel } from "@/features/ai-agents/ai-agent-detail-panel";

// ─── Data fetching ────────────────────────────────────────────────────────────

function useAiAgents(filters: Record<string, FilterValue>) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", String(filters.status));
  if (filters.domain) params.set("domain", String(filters.domain));
  if (filters.impact) params.set("impact", String(filters.impact));

  return useQuery({
    queryKey: ["admin", "ai-agents", filters],
    queryFn: async () => {
      const res = await apiFetch<{ agents: AiAgent[] }>(
        `/api/admin/ai-agents${params.size ? `?${params}` : ""}`,
      );
      return res.agents;
    },
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const EMPTY_FILTERS: Record<string, FilterValue> = {
  status: undefined,
  domain: undefined,
  impact: undefined,
};

export default function AiAgentsPage() {
  const pathname = usePathname()!;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedAgent, setSelectedAgent] = React.useState<AiAgent | null>(null);

  const tableState = useUnifiedTableState({
    entityKey: "ai-agents-admin",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "priority",
      sortDirection: "desc",
      visibleColumns: aiAgentDefaultVisibleColumns,
      filters: EMPTY_FILTERS,
    },
  });

  const activeFilters = React.useMemo<Record<string, FilterValue>>(
    () => ({
      status: searchParams?.get("status") ?? undefined,
      domain: searchParams?.get("domain") ?? undefined,
      impact: searchParams?.get("impact") ?? undefined,
    }),
    [searchParams],
  );

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);

  const { data: agents = [], isLoading, isFetching, error, refetch } = useAiAgents(activeFilters);

  const filteredAgents = React.useMemo(() => {
    if (!tableState.debouncedSearch) return agents;
    const q = tableState.debouncedSearch.toLowerCase();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        a.purpose?.toLowerCase().includes(q) ||
        a.domain?.toLowerCase().includes(q),
    );
  }, [agents, tableState.debouncedSearch]);

  const columns = React.useMemo(() => buildAiAgentColumns(), []);

  function handleFilterChange(filters: Record<string, FilterValue>) {
    tableState.setSearchParams({
      ...filters,
      page: "1",
    });
  }

  async function handleRefresh() {
    await refetch();
    toast.success("Agent registry refreshed");
  }

  const resolvedError =
    error instanceof Error ? error : error ? new Error(String(error)) : null;

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "AI Agent Registry",
          description: `${agents.length} agents — pipeline, chat, and write tools`,
          actions: (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          ),
        }}
        toolbar={{
          totalItems: agents.length,
          filteredItems: filteredAgents.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search agents...",
          currentView: tableState.currentView,
          onViewChange: tableState.setCurrentView,
          filters: aiAgentFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
        }}
        data={{
          items: filteredAgents,
          isLoading,
          isFetching,
          error: resolvedError,
        }}
        table={{
          columns,
          getRowId: (a) => a.id,
          onRowClick: (a) => setSelectedAgent(a),
          activeRowId: selectedAgent?.id ?? null,
          stickyHeader: true,
        }}
        emptyState={{
          title: "No agents found",
          description: "The AI agent registry is empty.",
          filteredDescription: "No agents match your current filters.",
          isFiltered: Boolean(tableState.debouncedSearch) || hasActiveFilters,
        }}
        layout={{ fullBleedTable: true }}
      />

      <AiAgentDetailPanel
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
    </>
  );
}
