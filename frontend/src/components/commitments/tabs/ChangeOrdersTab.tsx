'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DataTable } from '@/components/tables/DataTable'
import { Text } from '@/components/ui/text'
import { Stack } from '@/components/ui/stack'
import { formatCurrency } from '@/config/tables'
import { formatDate } from '@/lib/table-config/formatters'
import { Skeleton } from '@/components/ui/skeleton'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, ExternalLink, CheckCircle, Clock, FileEdit, TrendingUp } from 'lucide-react'
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

export function ChangeOrdersTab({ commitmentId, projectId }: ChangeOrdersTabProps) {
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

  const columns: ColumnDef<ChangeOrder>[] = [
    {
      accessorKey: 'number',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          href={`/${projectId}/change-orders/${row.original.id}`}
          className="text-primary hover:underline flex items-center gap-1"
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
          <ArrowUpDown className="ml-2 h-4 w-4" />
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
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <Text>{formatDate(row.original.created_at)}</Text>,
    },
  ]

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

  // Summary cards component
  const SummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-4">
          <Stack gap="xs">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <Text size="sm" tone="muted">Approved</Text>
            </div>
            <Text size="lg" weight="bold" className="text-green-600">
              {formatCurrency(totals.approved)}
            </Text>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <Stack gap="xs">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <Text size="sm" tone="muted">Pending</Text>
            </div>
            <Text size="lg" weight="bold" className="text-amber-600">
              {formatCurrency(totals.pending)}
            </Text>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <Stack gap="xs">
            <div className="flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-gray-500" />
              <Text size="sm" tone="muted">Draft</Text>
            </div>
            <Text size="lg" weight="bold" className="text-gray-500">
              {formatCurrency(totals.draft)}
            </Text>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <Stack gap="xs">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <Text size="sm" tone="muted">Total</Text>
            </div>
            <Text size="lg" weight="bold" className="text-blue-600">
              {formatCurrency(totals.total)}
            </Text>
          </Stack>
        </CardContent>
      </Card>
    </div>
  )

  if (changeOrders.length === 0) {
    return (
      <div className="space-y-4">
        <SummaryCards />
        <Card>
          <CardHeader>
            <CardTitle>Change Orders</CardTitle>
            <CardDescription>
              No change orders have been created for this commitment yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Text tone="muted" size="sm">
                Change orders will appear here when created.
              </Text>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SummaryCards />
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
}
