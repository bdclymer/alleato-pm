'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DataTable } from '@/components/tables/DataTable'
import { Text } from '@/components/ds/text'
import { EmptyState } from '@/components/ds/empty-state'
import { SummaryCardGrid } from '@/components/ds/summary-card-grid'
import { formatCurrency } from '@/config/tables'
import { formatDate } from '@/lib/table-config/formatters'
import { Skeleton } from '@/components/ui/skeleton'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, ExternalLink, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/misc/status-badge'
import Link from 'next/link'

interface ChangeOrder {
  id: string
  number: string
  title: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'executed' | 'void'
  amount: number
  created_at: string
  description?: string
  approved_date?: string
  requested_date?: string
}

interface ChangeOrderTotals {
  approved: number
  pending: number
  draft: number
  total: number
}

interface ChangeOrdersTabProps {
  commitmentId: string
  projectId: number
}

export const ChangeOrdersTab = memo(function ChangeOrdersTab({ commitmentId, projectId }: ChangeOrdersTabProps) {
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [totals, setTotals] = useState<ChangeOrderTotals>({ approved: 0, pending: 0, draft: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChangeOrders = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/commitments/${commitmentId}/change-orders`)

        if (!response.ok) {
          if (response.status === 404) {
            // No change orders found - this is not an error
            setChangeOrders([])
            setTotals({ approved: 0, pending: 0, draft: 0, total: 0 })
            return
          }
          throw new Error('Failed to fetch change orders')
        }

        const data = await response.json()
        const orders = data.data || data || []
        setChangeOrders(orders)

        // Calculate totals by status from the API meta or locally
        if (data.meta) {
          setTotals({
            approved: data.meta.approved_amount || 0,
            pending: orders.filter((co: ChangeOrder) => co.status === 'pending').reduce((sum: number, co: ChangeOrder) => sum + co.amount, 0),
            draft: orders.filter((co: ChangeOrder) => co.status === 'draft').reduce((sum: number, co: ChangeOrder) => sum + co.amount, 0),
            total: data.meta.total_amount || 0,
          })
        } else {
          // Calculate locally if meta not provided
          const calculated = orders.reduce(
            (acc: ChangeOrderTotals, co: ChangeOrder) => {
              acc.total += co.amount
              if (co.status === 'approved' || co.status === 'executed') {
                acc.approved += co.amount
              } else if (co.status === 'pending') {
                acc.pending += co.amount
              } else if (co.status === 'draft') {
                acc.draft += co.amount
              }
              return acc
            },
            { approved: 0, pending: 0, draft: 0, total: 0 }
          )
          setTotals(calculated)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load change orders')
        toast.error('Failed to load change orders')
      } finally {
        setIsLoading(false)
      }
    }

    fetchChangeOrders()
  }, [commitmentId])

  // Memoize columns to prevent recreation on every render
  const columns: ColumnDef<ChangeOrder>[] = useMemo(() => [
    {
      accessorKey: 'number',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Number
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          href={`/${projectId}/change-orders/commitment/${row.original.id}`}
          className="flex items-center gap-1 text-primary hover:underline"
        >
          {row.original.number}
          <ExternalLink className="h-3 w-3" />
        </Link>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => <Text>{row.original.title}</Text>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} type="change-order" />
      ),
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Amount
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => <Text>{formatCurrency(row.original.amount)}</Text>,
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Created Date
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => <Text>{formatDate(row.original.created_at)}</Text>,
    },
  ], [projectId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Change Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Change Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Text tone="destructive">{error}</Text>
        </CardContent>
      </Card>
    )
  }

  const summaryCards = [
    { id: 'approved', label: 'Approved', value: formatCurrency(totals.approved) },
    { id: 'pending', label: 'Pending', value: formatCurrency(totals.pending) },
    { id: 'draft', label: 'Draft', value: formatCurrency(totals.draft) },
    { id: 'total', label: 'Total', value: formatCurrency(totals.total) },
  ]

  if (changeOrders.length === 0) {
    return (
      <div className="space-y-6">
        <SummaryCardGrid cards={summaryCards} columns={4} size="sm" />
        <Card>
          <CardHeader>
            <CardTitle>Change Orders</CardTitle>
            <CardDescription>
              No change orders have been created for this commitment yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="No change orders yet"
              description="Change orders will appear here when created."
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SummaryCardGrid cards={summaryCards} columns={4} size="sm" />
      <Card>
        <CardHeader>
          <CardTitle>Change Orders ({changeOrders.length})</CardTitle>
          <CardDescription>
            Approved change orders automatically update the revised contract amount.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={changeOrders}
            showToolbar={false}
            showPagination={changeOrders.length > 10}
          />
        </CardContent>
      </Card>
    </div>
  )
})

ChangeOrdersTab.displayName = "ChangeOrdersTab"
