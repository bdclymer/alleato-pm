"use client";

import * as React from "react";
import { PageContainer, PageTabs } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";
import {
  SummaryCardGrid,
  type SummaryCard,
} from "@/components/ui/summary-card-grid";
import { DataTableResponsive } from "@/components/tables";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";

/**
 * Tab configuration for page navigation
 */
export interface TabConfig {
  label: string;
  href: string;
  count?: number;
  isActive?: boolean;
}

/**
 * Filter option for the data table
 */
export interface FilterOption {
  column: string;
  title: string;
  options: { label: string; value: string }[];
}

/**
 * Props for the DataTablePage template
 */
export interface DataTablePageProps<TData> {
  /** Page title displayed in the header */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Summary cards to display above the table */
  summaryCards?: SummaryCard[];
  /** Tab navigation configuration */
  tabs?: TabConfig[];
  /** Action buttons for the header (e.g., "Create New" button) */
  actions?: React.ReactNode;
  /** TanStack Table column definitions */
  columns: ColumnDef<TData, unknown>[];
  /** Data to display in the table */
  data: TData[];
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string | null;
  /** Retry callback for error state */
  onRetry?: () => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state action */
  emptyAction?: React.ReactNode;
  /** Row click handler */
  onRowClick?: (row: TData) => void;
  /** Search configuration */
  searchKey?: string;
  searchPlaceholder?: string;
  /** Filter options */
  filterOptions?: FilterOption[];
  /** Columns to show on mobile */
  mobileColumns?: string[];
  /** Custom mobile card renderer */
  mobileCardRenderer?: (row: TData) => React.ReactNode;
  /** Show export button in header */
  showExportButton?: boolean;
  /** CSV export handler */
  onExportCSV?: () => void;
  /** PDF export handler */
  onExportPDF?: () => void;
  /** Additional content between summary cards and tabs */
  beforeTabs?: React.ReactNode;
  /** Additional content between tabs and table */
  beforeTable?: React.ReactNode;
  /** Additional className for the page container */
  className?: string;
  /** Whether to show the summary cards section */
  showSummaryCards?: boolean;
}

/**
 * DataTablePage - A standardized template for data table pages
 *
 * This template ensures consistent structure across all table-based pages:
 * - PageHeader with title, description, and actions
 * - Optional summary cards for key metrics
 * - Optional tab navigation for filtering
 * - DataTableResponsive with search, filters, and pagination
 *
 * @example
 * ```tsx
 * <DataTablePage
 *   title="Commitments"
 *   description="Manage purchase orders and subcontracts"
 *   summaryCards={[
 *     { id: 'total', label: 'Total Value', value: '$125,000' },
 *   ]}
 *   tabs={[
 *     { label: 'All', href: '/commitments', count: 10 },
 *     { label: 'Active', href: '/commitments?status=active' },
 *   ]}
 *   columns={columns}
 *   data={data}
 *   actions={<Button>Create New</Button>}
 * />
 * ```
 */
export function DataTablePage<TData>({
  title,
  description,
  summaryCards,
  tabs,
  actions,
  columns,
  data,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = "No data found",
  emptyAction,
  onRowClick,
  searchKey,
  searchPlaceholder,
  filterOptions,
  mobileColumns,
  mobileCardRenderer,
  showExportButton = false,
  onExportCSV,
  onExportPDF,
  beforeTabs,
  beforeTable,
  className,
  showSummaryCards = true,
}: DataTablePageProps<TData>) {
  // Error state
  if (error) {
    return (
      <>
        <PageHeader
          title={title}
          description={description}
          actions={actions}
          showExportButton={showExportButton}
          onExportCSV={onExportCSV}
          onExportPDF={onExportPDF}
        />
        <PageContainer>
          <Card className="p-6">
            <p className="text-muted-foreground mb-2">Unable to load data</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            {onRetry && (
              <Button onClick={onRetry} size="sm">
                Retry
              </Button>
            )}
          </Card>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      {/* Page Header */}
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        showExportButton={showExportButton}
        onExportCSV={onExportCSV}
        onExportPDF={onExportPDF}
      />

      {/* Summary Cards - Above Tabs */}
      {showSummaryCards && summaryCards && summaryCards.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 py-6 bg-background border-b">
          <SummaryCardGrid cards={summaryCards} />
        </div>
      )}

      {/* Before Tabs Content */}
      {beforeTabs}

      {/* Tab Navigation */}
      {tabs && tabs.length > 0 && <PageTabs tabs={tabs} />}

      {/* Main Content */}
      <PageContainer className={cn("space-y-6", className)}>
        {/* Before Table Content */}
        {beforeTable}

        {/* Loading State */}
        {loading ? (
          <DataTablePageSkeleton />
        ) : data.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{emptyMessage}</p>
            {emptyAction}
          </div>
        ) : (
          /* Data Table */
          <DataTableResponsive
            columns={columns}
            data={data}
            onRowClick={onRowClick}
            searchKey={searchKey}
            searchPlaceholder={searchPlaceholder}
            filterOptions={filterOptions}
            mobileColumns={mobileColumns}
            mobileCardRenderer={mobileCardRenderer}
          />
        )}
      </PageContainer>
    </>
  );
}

/**
 * Loading skeleton for the data table page
 */
function DataTablePageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="p-4">
          {/* Header row */}
          <div className="flex gap-4 mb-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          {/* Data rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 py-4 border-t">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

/**
 * Export the skeleton separately for use in other contexts
 */
export { DataTablePageSkeleton };
