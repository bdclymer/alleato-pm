"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { Plus, ChevronDown, Eye, Edit, Trash2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/misc/status-badge";
import { DataTablePage } from "@/components/templates";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { Link } from "@/components/ui/link";
import { MobileCard } from "@/components/ui/mobile-card";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import {
  getDirectCostsColumns,
  directCostFilterOptions,
  directCostsMobileColumns,
  formatCurrency,
  formatDate,
  formatCostType,
  getDirectCostsSummaryCards,
  type DirectCost,
} from "@/config/tables";

/**
 * Project Direct Costs Page
 *
 * Displays and manages direct costs for a project (expenses, work orders, etc.).
 * Uses the standardized DataTablePage template for consistent styling.
 */
export default function ProjectDirectCostsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = parseInt(params.projectId as string);
  useProjectTitle("Direct Costs");

  const [directCosts, setDirectCosts] = useState<DirectCost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch direct costs
  const fetchDirectCosts = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/direct-costs?include_summary=false`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch direct costs");
      }

      const result = await response.json();
      // API returns { data: [], total: number, page: number, limit: number }
      setDirectCosts(result.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch direct costs",
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDirectCosts();
  }, [fetchDirectCosts]);

  // Navigation handlers
  const handleCreate = useCallback(() => {
    toast.info("Create direct cost coming soon");
  }, []);

  const handleView = useCallback(
    (cost: DirectCost) => {
      router.push(`/${projectId}/direct-costs/${cost.id}`);
    },
    [router, projectId],
  );

  const handleEdit = useCallback(
    (cost: DirectCost) => {
      router.push(`/${projectId}/direct-costs/${cost.id}`);
    },
    [router, projectId],
  );

  const handleDelete = useCallback(
    async (cost: DirectCost) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete direct cost ${cost.invoice_number || cost.id}?`,
      );
      if (!confirmed) {
        return;
      }

      try {
        const response = await fetch(
          `/api/projects/${projectId}/direct-costs/${cost.id}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to delete direct cost");
        }

        toast.success("Direct cost deleted successfully");
        fetchDirectCosts();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete direct cost",
        );
      }
    },
    [projectId, fetchDirectCosts],
  );

  // Column definitions with action handlers
  const columns: ColumnDef<DirectCost>[] = useMemo(
    () => [
      ...getDirectCostsColumns(handleView),
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const cost = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="sr-only">Open menu</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleView(cost)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEdit(cost)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(cost)}
                  className="text-destructive"
                  disabled={cost.status === "paid"}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [handleView, handleEdit, handleDelete],
  );

  // Generate summary cards
  const summaryCards = useMemo(
    () => getDirectCostsSummaryCards(directCosts),
    [directCosts],
  );

  // Mobile card renderer
  const mobileCardRenderer = useCallback(
    (cost: DirectCost) => (
      <MobileCard>
        <MobileCard.Header>
          <Stack gap="xs">
            <Link>
              {cost.invoice_number || `DC-${cost.id.slice(0, 8)}`}
            </Link>
            <Text size="sm" tone="muted">
              {formatCostType(cost.cost_type)}
            </Text>
            <Text size="sm" tone="muted">
              {formatDate(cost.date)}
            </Text>
            {cost.description && (
              <Text size="sm" tone="muted">
                {cost.description}
              </Text>
            )}
          </Stack>
          <StatusBadge status={cost.status} type="direct-cost" />
        </MobileCard.Header>
        <MobileCard.Footer>
          <Text size="sm" tone="muted">
            Total Amount
          </Text>
          <Text weight="medium">
            {formatCurrency(cost.total_amount || 0)}
          </Text>
        </MobileCard.Footer>
      </MobileCard>
    ),
    [],
  );

  // Create action button
  const createButton = (
    <Button size="sm" onClick={handleCreate}>
      <Plus className="h-4 w-4 mr-2" />
      Add Direct Cost
    </Button>
  );

  return (
    <DataTablePage<DirectCost>
      title="Direct Costs"
      description="Manage project direct costs including expenses, work orders, and equipment"
      actions={createButton}
      columns={columns}
      data={directCosts}
      loading={isLoading}
      error={error}
      onRetry={fetchDirectCosts}
      emptyMessage="No direct costs found"
      emptyAction={
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add your first direct cost
        </Button>
      }
      onRowClick={handleView}
      searchKey="description"
      searchPlaceholder="Search by description or invoice number..."
      filterOptions={directCostFilterOptions}
      mobileColumns={directCostsMobileColumns}
      mobileCardRenderer={mobileCardRenderer}
      showExportButton={true}
      onExportCSV={() => toast.info("CSV export coming soon")}
      onExportPDF={() => toast.info("PDF export coming soon")}
      summaryCards={summaryCards}
    />
  );
}
