'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { SectionHeader } from '@/components/ds/section-header'
import { StatusBadge } from '@/components/ds/status-badge'
import { EmptyState } from '@/components/ds/empty-state'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import { formatDate } from '@/lib/table-config/formatters'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PcoStatus = 'open' | 'pending' | 'approved' | 'rejected' | 'void'

interface CommitmentPco {
  id: string
  number: string
  title: string
  status: PcoStatus
  amount: number
  description: string | null
  change_reason: string | null
  cco_id: string | null
  created_at: string
  updated_at: string
}

interface PotentialChangeOrdersTabProps {
  commitmentId: string
  projectId: number
  isReadOnly?: boolean
}

const PCO_STATUSES: PcoStatus[] = ['open', 'pending', 'approved', 'rejected', 'void']

const STATUS_LABELS: Record<PcoStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  void: 'Void',
}

// ---------------------------------------------------------------------------
// Inline form
// ---------------------------------------------------------------------------

interface PcoFormState {
  number: string
  title: string
  amount: string
  description: string
  change_reason: string
  status: PcoStatus
}

const DEFAULT_FORM: PcoFormState = {
  number: '',
  title: '',
  amount: '',
  description: '',
  change_reason: '',
  status: 'open',
}

interface PcoFormProps {
  initial?: PcoFormState
  onSave: (values: PcoFormState) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}

function PcoForm({ initial = DEFAULT_FORM, onSave, onCancel, isSaving }: PcoFormProps) {
  const [form, setForm] = useState<PcoFormState>(initial)

  const set = useCallback((key: keyof PcoFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!form.number.trim()) {
        toast.error('PCO number is required.')
        return
      }
      if (!form.title.trim()) {
        toast.error('PCO title is required.')
        return
      }
      await onSave(form)
    },
    [form, onSave],
  )

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-lg bg-muted/40 p-4 space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pco-number">PCO Number *</Label>
          <Input
            id="pco-number"
            value={form.number}
            onChange={(e) => set('number', e.target.value)}
            placeholder="e.g. PCO-001"
            disabled={isSaving}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pco-title">Title *</Label>
          <Input
            id="pco-title"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Short description of the change"
            disabled={isSaving}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pco-amount">Amount</Label>
          <Input
            id="pco-amount"
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder=""
            disabled={isSaving}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pco-status">Status</Label>
          <Select
            value={form.status}
            onValueChange={(val) => set('status', val)}
            disabled={isSaving}
          >
            <SelectTrigger id="pco-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PCO_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pco-change-reason">Change Reason</Label>
          <Input
            id="pco-change-reason"
            value={form.change_reason}
            onChange={(e) => set('change_reason', e.target.value)}
            placeholder="Reason for this potential change"
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pco-description">Description</Label>
        <Textarea
          id="pco-description"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Detailed description (optional)"
          rows={3}
          disabled={isSaving}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save PCO'}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

export const PotentialChangeOrdersTab = memo(function PotentialChangeOrdersTab({
  commitmentId,
  projectId,
  isReadOnly = false,
}: PotentialChangeOrdersTabProps) {
  const [pcos, setPcos] = useState<CommitmentPco[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const baseUrl = `/api/projects/${projectId}/commitments/${commitmentId}/pcos`

  const fetchPcos = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(baseUrl)
      if (!res.ok) throw new Error('Failed to load PCOs')
      const json = (await res.json()) as { data: CommitmentPco[] }
      setPcos(json.data ?? [])
    } catch {
      toast.error('Failed to load potential change orders')
    } finally {
      setIsLoading(false)
    }
  }, [baseUrl])

  useEffect(() => {
    void fetchPcos()
  }, [fetchPcos])

  const handleCreate = useCallback(
    async (values: PcoFormState) => {
      setIsSaving(true)
      try {
        const res = await fetch(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            number: values.number,
            title: values.title,
            amount: values.amount ? parseFloat(values.amount) : 0,
            description: values.description || undefined,
            change_reason: values.change_reason || undefined,
            status: values.status,
          }),
        })
        if (!res.ok) {
          const err = (await res.json()) as { error?: string }
          throw new Error(err.error ?? 'Failed to create PCO')
        }
        toast.success('PCO created')
        setShowCreateForm(false)
        await fetchPcos()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create PCO')
      } finally {
        setIsSaving(false)
      }
    },
    [baseUrl, fetchPcos],
  )

  const handleUpdate = useCallback(
    async (pcoId: string, values: PcoFormState) => {
      setIsSaving(true)
      try {
        const res = await fetch(`${baseUrl}/${pcoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: values.title,
            amount: values.amount ? parseFloat(values.amount) : 0,
            description: values.description || undefined,
            change_reason: values.change_reason || undefined,
            status: values.status,
          }),
        })
        if (!res.ok) {
          const err = (await res.json()) as { error?: string }
          throw new Error(err.error ?? 'Failed to update PCO')
        }
        toast.success('PCO updated')
        setEditingId(null)
        await fetchPcos()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update PCO')
      } finally {
        setIsSaving(false)
      }
    },
    [baseUrl, fetchPcos],
  )

  const handleDelete = useCallback(
    async (pco: CommitmentPco) => {
      if (!confirm(`Delete PCO ${pco.number}? This action cannot be undone.`)) return
      try {
        const res = await fetch(`${baseUrl}/${pco.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const err = (await res.json()) as { error?: string }
          throw new Error(err.error ?? 'Failed to delete PCO')
        }
        toast.success('PCO deleted')
        await fetchPcos()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete PCO')
      }
    },
    [baseUrl, fetchPcos],
  )

  const editFormFor = useCallback(
    (pco: CommitmentPco): PcoFormState => ({
      number: pco.number,
      title: pco.title,
      amount: String(pco.amount),
      description: pco.description ?? '',
      change_reason: pco.change_reason ?? '',
      status: pco.status,
    }),
    [],
  )

  const totalAmount = useMemo(
    () => pcos.reduce((sum, p) => sum + Number(p.amount ?? 0), 0),
    [pcos],
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Potential Change Orders"
        count={pcos.length}
        action={
          !isReadOnly && !showCreateForm
            ? {
                label: '+ Add PCO',
                onClick: () => setShowCreateForm(true),
              }
            : undefined
        }
      />

      {showCreateForm && (
        <PcoForm
          onSave={handleCreate}
          onCancel={() => setShowCreateForm(false)}
          isSaving={isSaving}
        />
      )}

      {pcos.length === 0 && !showCreateForm ? (
        <EmptyState
          icon={<Plus className="h-5 w-5" />}
          title="No potential change orders yet"
          description="Add a PCO to track potential scope changes before they become commitment change orders."
          action={
            !isReadOnly
              ? {
                  label: 'Add PCO',
                  onClick: () => setShowCreateForm(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Number</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground tabular-nums">Amount</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Change Reason</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Created</th>
                {!isReadOnly && (
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pcos.map((pco) => (
                <>
                  <tr key={pco.id} className="bg-card hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{pco.number}</td>
                    <td className="px-4 py-3 text-foreground">{pco.title}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={STATUS_LABELS[pco.status] ?? pco.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {formatCurrency(pco.amount)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {pco.change_reason || <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(pco.created_at)}
                    </td>
                    {!isReadOnly && (
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">PCO actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                setEditingId(editingId === pco.id ? null : pco.id)
                              }
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => void handleDelete(pco)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                  {editingId === pco.id && (
                    <tr key={`${pco.id}-edit`}>
                      <td colSpan={isReadOnly ? 6 : 7} className="px-4 py-3">
                        <PcoForm
                          initial={editFormFor(pco)}
                          onSave={(values) => handleUpdate(pco.id, values)}
                          onCancel={() => setEditingId(null)}
                          isSaving={isSaving}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
            {pcos.length > 0 && (
              <tfoot>
                <tr className="border-t border-border bg-muted/50">
                  <td colSpan={3} className="px-4 py-2.5 text-sm font-medium text-muted-foreground">
                    Total ({pcos.length} PCO{pcos.length !== 1 ? 's' : ''})
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm font-semibold text-foreground tabular-nums">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td colSpan={isReadOnly ? 2 : 3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </section>
  )
})

PotentialChangeOrdersTab.displayName = 'PotentialChangeOrdersTab'
