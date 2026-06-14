'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { ExternalLink, FileText, Plus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

import { SectionHeader } from '@/components/ds/section-header'
import { StatusBadge } from '@/components/ds/status-badge'
import { EmptyState } from '@/components/ds/empty-state'
import { Text } from '@/components/ds/text'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, cn } from '@/lib/utils'
import { formatDate } from '@/lib/table-config/formatters'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChangeEvent {
  id: string
  number: string
  title: string
  status: string
  reason: string | null
  scope: string
  type: string
  created_at: string
}

interface ChangeOrder {
  id: string
  number: string
  title: string
  status: string
  amount: number
  created_at: string
  approved_date?: string
}

interface ChangeManagementTabProps {
  commitmentId: string
  projectId: number
}

// ---------------------------------------------------------------------------
// Change Events Section
// ---------------------------------------------------------------------------

function ChangeEventsSection({ commitmentId, projectId }: ChangeManagementTabProps) {
  const [changeEvents, setChangeEvents] = useState<ChangeEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCEs = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(
          `/api/projects/${projectId}/commitments/${commitmentId}/change-events`,
        )
        if (!res.ok) throw new Error('Failed to fetch change events')
        const json = await res.json()
        setChangeEvents(json.data ?? [])
      } catch {
        toast.error('Failed to load change events')
      } finally {
        setIsLoading(false)
      }
    }
    fetchCEs()
  }, [commitmentId, projectId])

  const columns: ColumnDef<ChangeEvent>[] = useMemo(
    () => [
      {
        accessorKey: 'number',
        header: 'Number',
        cell: ({ row }) => (
          <Link
            href={`/${projectId}/change-events/${row.original.id}`}
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
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        cell: ({ row }) => (
          <Text tone="muted">{row.original.reason ?? '—'}</Text>
        ),
      },
      {
        accessorKey: 'scope',
        header: 'Scope',
        cell: ({ row }) => <Text tone="muted">{row.original.scope}</Text>,
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => (
          <Text tone="muted">{formatDate(row.original.created_at)}</Text>
        ),
      },
    ],
    [projectId],
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <SectionHeader title="Change Events" count={changeEvents.length} />
      {changeEvents.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No change events linked"
          description="Change events will appear here when linked to this commitment's PCOs or change orders."
        />
      ) : (
        <DataTable
          columns={columns}
          data={changeEvents}
          showToolbar={false}
          showPagination={changeEvents.length > 10}
        />
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Change Orders Section
// ---------------------------------------------------------------------------

const APPROVED_STATUSES = new Set(['approved', 'executed'])
const PENDING_STATUSES = new Set(['pending', 'out_for_signature'])
const DRAFT_STATUSES = new Set(['draft'])

interface ChangeRollup {
  approvedCount: number
  pendingCount: number
  draftCount: number
  approvedTotal: number
  pendingTotal: number
  draftTotal: number
  netTotal: number
}

function summarizeChangeOrders(changeOrders: ChangeOrder[]): ChangeRollup {
  return changeOrders.reduce<ChangeRollup>(
    (acc, co) => {
      const status = (co.status ?? '').toLowerCase()
      const amount = Number(co.amount) || 0
      if (APPROVED_STATUSES.has(status)) {
        acc.approvedCount += 1
        acc.approvedTotal += amount
      } else if (PENDING_STATUSES.has(status)) {
        acc.pendingCount += 1
        acc.pendingTotal += amount
      } else if (DRAFT_STATUSES.has(status)) {
        acc.draftCount += 1
        acc.draftTotal += amount
      }
      return acc
    },
    {
      approvedCount: 0,
      pendingCount: 0,
      draftCount: 0,
      approvedTotal: 0,
      pendingTotal: 0,
      draftTotal: 0,
      netTotal: 0,
    },
  )
}

function ChangeRollupStrip({ rollup }: { rollup: ChangeRollup }) {
  const metrics = [
    {
      label: 'Net change to contract',
      value: formatCurrency(rollup.approvedTotal),
      caption: `${rollup.approvedCount} approved`,
      primary: true,
    },
    {
      label: 'Pending',
      value: formatCurrency(rollup.pendingTotal),
      caption: `${rollup.pendingCount} change order${rollup.pendingCount === 1 ? '' : 's'}`,
    },
    {
      label: 'Draft',
      value: formatCurrency(rollup.draftTotal),
      caption: `${rollup.draftCount} change order${rollup.draftCount === 1 ? '' : 's'}`,
    },
  ]

  return (
    <div className="rounded-md bg-muted/30 p-5 shadow-panel">
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </p>
            <p
              className={cn(
                'mt-1 truncate font-semibold tabular-nums text-foreground',
                metric.primary ? 'text-2xl' : 'text-lg',
              )}
            >
              {metric.value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{metric.caption}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChangeOrdersSection({ commitmentId, projectId }: ChangeManagementTabProps) {
  const router = useRouter()
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCOs = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/commitments/${commitmentId}/change-orders`)
        if (!res.ok) {
          if (res.status === 404) {
            setChangeOrders([])
            return
          }
          throw new Error('Failed to fetch change orders')
        }
        const json = await res.json()
        setChangeOrders(json.data ?? json ?? [])
      } catch {
        toast.error('Failed to load change orders')
      } finally {
        setIsLoading(false)
      }
    }
    fetchCOs()
  }, [commitmentId])

  const rollup = useMemo(() => summarizeChangeOrders(changeOrders), [changeOrders])
  const grandTotal = useMemo(
    () => changeOrders.reduce((sum, co) => sum + (Number(co.amount) || 0), 0),
    [changeOrders],
  )

  const columns: ColumnDef<ChangeOrder>[] = useMemo(
    () => [
      {
        accessorKey: 'number',
        header: 'Number',
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
          <StatusBadge status={row.original.status} />
        ),
      },
      {
        accessorKey: 'amount',
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium tabular-nums text-foreground">
            {formatCurrency(row.original.amount)}
          </div>
        ),
      },
      {
        accessorKey: 'approved_date',
        header: 'Approved',
        cell: ({ row }) => (
          <Text tone="muted">
            {row.original.approved_date ? formatDate(row.original.approved_date) : '—'}
          </Text>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => (
          <Text tone="muted">{formatDate(row.original.created_at)}</Text>
        ),
      },
    ],
    [projectId],
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Change Orders"
        count={changeOrders.length}
        action={{
          label: '+ Create',
          onClick: () =>
            router.push(`/${projectId}/change-orders/commitment/new`),
        }}
      />
      {changeOrders.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No change orders yet"
          description="Change orders will appear here when created for this commitment."
        />
      ) : (
        <>
          <ChangeRollupStrip rollup={rollup} />
          <DataTable
            columns={columns}
            data={changeOrders}
            showToolbar={false}
            showPagination={changeOrders.length > 10}
            footerRow={[
              {
                value: 'Total',
                colSpan: 3,
                align: 'left',
                className: 'font-medium text-muted-foreground',
              },
              { value: formatCurrency(grandTotal), align: 'right' },
              { value: '', colSpan: 2 },
            ]}
          />
        </>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Combined Tab
// ---------------------------------------------------------------------------

export const ChangeManagementTab = memo(function ChangeManagementTab({
  commitmentId,
  projectId,
}: ChangeManagementTabProps) {
  return (
    <div className="space-y-10">
      <ChangeOrdersSection commitmentId={commitmentId} projectId={projectId} />
      <ChangeEventsSection commitmentId={commitmentId} projectId={projectId} />
    </div>
  )
})

ChangeManagementTab.displayName = 'ChangeManagementTab'
