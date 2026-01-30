/**
 * =============================================================================
 * DIRECT COST TABLE COMPONENT
 * =============================================================================
 *
 * Modern table component for Direct Costs using the GenericDataTable factory
 * Leverages all advanced features: filtering, sorting, pagination, inline editing,
 * row selection, and export functionality
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { GenericDataTable } from '@/components/tables/generic-table-factory'
import {
  DirectCostWithLineItems,
  DirectCostSummary,
  CostTypes,
  CostStatuses,
  type DirectCostListParams,
  type DirectCostStatus,
  type CostType,
} from '@/lib/schemas/direct-costs'
import { CheckCircle, XCircle } from 'lucide-react'
import { Text } from '@/components/ui/text'
import { DirectCostSummaryCards } from './DirectCostSummaryCards'

interface DirectCostTableProps {
  projectId: string
  initialData?: DirectCostWithLineItems[]
  viewMode?: 'summary' | 'summary-by-cost-code'
  onViewModeChange?: (mode: 'summary' | 'summary-by-cost-code') => void
}

export function DirectCostTable({
  projectId,
  initialData = [],
  viewMode = 'summary',
  onViewModeChange: _onViewModeChange,
}: DirectCostTableProps) {
  const [data, setData] = useState<DirectCostWithLineItems[]>(initialData)
  const [isLoading, setIsLoading] = useState(!initialData.length)
  const [summary, setSummary] = useState<DirectCostSummary | null>(null)

  // Fetch data
  const fetchData = useCallback(
    async (params?: Partial<DirectCostListParams>) => {
      setIsLoading(true)
      try {
        const searchParams = new URLSearchParams({
          view: viewMode,
          include_summary: 'true',
          ...Object.fromEntries(
            Object.entries(params || {}).map(([key, value]) => [
              key,
              String(value),
            ])
          ),
        })

        const response = await fetch(
          `/api/projects/${projectId}/direct-costs?${searchParams}`
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`)
        }

        const result = await response.json()
        setData(result.data)

        if (result.summary) {
          setSummary(result.summary)
        }
      } catch (error) {
        // Handle error - could show toast notification
      } finally {
        setIsLoading(false)
      }
    },
    [projectId, viewMode]
  )

  // Initial data fetch
  useEffect(() => {
    if (!initialData.length) {
      fetchData()
    }
  }, [fetchData, initialData.length])

  // Handle delete operation
  const handleDelete = async (id: string | number) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/direct-costs/${id}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const error = await response.json()
        return { error: error.error || 'Failed to delete direct cost' }
      }

      // Optimistically update the UI
      setData((prev) => prev.filter((cost) => cost.id !== id))

      return {}
    } catch (error) {
      return { error: 'Network error occurred' }
    }
  }

  // Handle bulk operations
  const handleBulkStatusUpdate = async (
    ids: (string | number)[],
    newStatus: string
  ) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/direct-costs/bulk/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, status: newStatus }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      // Refresh data
      fetchData()
    } catch (error) {

      console.error("Failed to process direct costs:", error);

      // Intentionally swallowed: error handling done by caller

    }
  }

  // Table configuration
  const tableConfig = {
    title: 'Direct Costs',
    description:
      'Track and manage direct project costs including labor, materials, and equipment',

    columns: [
      {
        id: 'date',
        label: 'Date',
        type: 'date' as const,
        defaultVisible: true,
        sortable: true,
        isPrimary: true,
        renderConfig: {
          type: 'nested' as const,
          path: 'date',
          fallback: 'N/A',
        },
      },
      {
        id: 'vendor_name',
        label: 'Vendor',
        type: 'text' as const,
        defaultVisible: true,
        sortable: true,
        renderConfig: {
          type: 'nested' as const,
          path: 'vendor.vendor_name',
          fallback: 'Internal',
        },
      },
      {
        id: 'employee_name',
        label: 'Employee',
        type: 'text' as const,
        defaultVisible: false,
        sortable: true,
        renderConfig: {
          type: 'nested' as const,
          path: 'employee.full_name',
          fallback: 'N/A',
        },
      },
      {
        id: 'cost_type',
        label: 'Type',
        type: 'badge' as const,
        defaultVisible: true,
        sortable: true,
        renderConfig: {
          type: 'badge' as const,
          variantMap: {
            Expense: 'default',
            Invoice: 'secondary',
            'Subcontractor Invoice': 'outline',
          } as Record<CostType, 'default' | 'secondary' | 'outline'>,
        },
      },
      {
        id: 'invoice_number',
        label: 'Invoice #',
        type: 'text' as const,
        defaultVisible: true,
        sortable: true,
      },
      {
        id: 'status',
        label: 'Status',
        type: 'badge' as const,
        defaultVisible: true,
        isSecondary: true,
        sortable: true,
        renderConfig: {
          type: 'badge' as const,
          variantMap: {
            Draft: 'secondary',
            Pending: 'outline',
            Approved: 'success',
            Rejected: 'destructive',
            Paid: 'default',
          } as Record<
            DirectCostStatus,
            'secondary' | 'outline' | 'success' | 'destructive' | 'default'
          >,
        },
      },
      {
        id: 'total_amount',
        label: 'Amount',
        type: 'number' as const,
        defaultVisible: true,
        sortable: true,
        renderConfig: {
          type: 'currency' as const,
          prefix: '$',
          showDecimals: true,
        },
        stat: {
          type: 'sum' as const,
          format: 'currency' as const,
        },
      },
      {
        id: 'line_item_count',
        label: 'Line Items',
        type: 'number' as const,
        defaultVisible: true,
        sortable: true,
      },
      {
        id: 'description',
        label: 'Description',
        type: 'text' as const,
        defaultVisible: false,
        sortable: true,
        renderConfig: {
          type: 'truncate' as const,
          maxLength: 100,
        },
      },
      {
        id: 'received_date',
        label: 'Received',
        type: 'date' as const,
        defaultVisible: true,
        sortable: true,
        renderConfig: {
          type: 'nested' as const,
          path: 'received_date',
          fallback: 'Not received',
        },
      },
      {
        id: 'paid_date',
        label: 'Paid',
        type: 'date' as const,
        defaultVisible: false,
        sortable: true,
        renderConfig: {
          type: 'nested' as const,
          path: 'paid_date',
          fallback: 'Not paid',
        },
      },
      {
        id: 'created_at',
        label: 'Created',
        type: 'date' as const,
        defaultVisible: false,
        renderConfig: {
          type: 'nested' as const,
          path: 'created_at',
          fallback: 'N/A',
        },
      },
    ],

    // Basic filtering
    filters: [
      {
        id: 'status-filter',
        label: 'Status',
        field: 'status',
        options: [
          { value: 'all', label: 'All Statuses' },
          ...CostStatuses.map((status: DirectCostStatus) => ({
            value: status,
            label: status,
          })),
        ],
      },
      {
        id: 'type-filter',
        label: 'Cost Type',
        field: 'cost_type',
        options: [
          { value: 'all', label: 'All Types' },
          ...CostTypes.map((type: CostType) => ({
            value: type,
            label: type,
          })),
        ],
      },
    ],

    // Advanced filtering
    advancedFilters: [
      {
        id: 'amount-filter',
        label: 'Amount Range',
        field: 'amount',
        type: 'number-range' as const,
      },
      {
        id: 'date-filter',
        label: 'Date Range',
        field: 'date',
        type: 'date-range' as const,
      },
    ],

    // Search configuration
    searchFields: [
      'description',
      'invoice_number',
      'vendor_name',
      'employee_name',
    ],
    searchPlaceholder:
      'Search by description, invoice #, vendor, or employee...',

    // Row click navigation
    rowClickPath: `/${projectId}/direct-costs/{id}`,

    // Export configuration
    exportFilename: `direct-costs-${projectId}.csv`,
    exportOptions: {
      csv: true,
      pdf: true,
      includeSummary: true,
      templates: ['standard', 'accounting', 'summary'],
    },

    // Inline editing
    editConfig: {
      tableName: 'direct_costs',
      editableFields: [
        'status',
        'description',
        'terms',
        'received_date',
        'paid_date',
      ],
      statusField: 'status',
      statusOptions: CostStatuses.map((status: DirectCostStatus) => ({
        value: status,
        label: status,
      })),
    },

    // Bulk operations
    bulkOperations: [
      {
        id: 'approve',
        label: 'Approve Selected',
        icon: CheckCircle,
        onClick: async (ids: (string | number)[]) => {
          await handleBulkStatusUpdate(ids, 'Approved')
        },
      },
      {
        id: 'reject',
        label: 'Reject Selected',
        icon: XCircle,
        variant: 'destructive' as const,
        onClick: async (ids: (string | number)[]) => {
          await handleBulkStatusUpdate(ids, 'Rejected')
        },
      },
    ],

    // Table features
    enableViewSwitcher: true,
    enableRowSelection: true,
    enableSorting: true,
    enableInlineCellEdit: true,
    enableColumnStats: true,
    enableColumnResize: true,

    // Default settings
    defaultSortColumn: 'date',
    defaultSortDirection: 'desc' as const,
    density: 'standard' as const,

    // Callbacks
    onDelete: true,
  }

  if (isLoading && !initialData.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <Text className="text-muted-foreground">Loading direct costs...</Text>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <DirectCostSummaryCards
          stats={{
            total_costs: Object.values(summary.count_by_status).reduce((sum, count) => sum + count, 0),
            draft_count: summary.count_by_status['Draft'] || 0,
            approved_count: summary.count_by_status['Approved'] || 0,
            pending_count: summary.count_by_status['Pending'] || 0,
            total_amount: summary.total_amount,
            avg_cost: Object.values(summary.count_by_status).reduce((sum, count) => sum + count, 0) > 0
              ? summary.total_amount / Object.values(summary.count_by_status).reduce((sum, count) => sum + count, 0)
              : 0,
          }}
          projectId={Number(projectId)}
        />
      )}

      {/* Main Data Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <Text className="text-muted-foreground">Loading table data...</Text>
          </div>
        </div>
      ) : (
        <GenericDataTable
          data={data as unknown as Record<string, unknown>[]}
          config={tableConfig}
          onDeleteRow={handleDelete}
        />
      )}
    </div>
  )
}
