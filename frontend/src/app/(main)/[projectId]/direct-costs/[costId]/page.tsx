import { ProjectPageHeader } from "@/components/layout";
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FormLayout } from '@/components/layouts'
import { PageHeader } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/table-config/formatters'

interface DirectCostDetailPageProps {
  params: Promise<{
    projectId: string
    costId: string
  }>
}

interface DirectCost {
  id: string
  project_id: number
  description?: string
  cost_type?: string
  amount: number
  vendor_name?: string
  budget_code?: string
  budget_description?: string
  incurred_date?: string
  invoice_number?: string
  status?: string
  created_at: string
  updated_at?: string
}

export default function DirectCostDetailPage({ params }: DirectCostDetailPageProps) {
  const router = useRouter()
  const [directCost, setDirectCost] = useState<DirectCost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [resolvedParams, setResolvedParams] = useState<{ projectId: string; costId: string } | null>(null)

  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  useEffect(() => {
    if (resolvedParams) {
      fetchDirectCost()
    }
  }, [resolvedParams?.costId])

  const fetchDirectCost = async () => {
    try {
      setIsLoading(true)
      // Use project-specific API endpoint for proper RLS context
      const response = await fetch(`/api/projects/${resolvedParams?.projectId}/direct-costs/${resolvedParams?.costId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch direct cost')
      }

      const data = await response.json()
      setDirectCost(data)
    } catch (error) {
      toast.error('Failed to load direct cost details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this direct cost? This action cannot be undone.')) {
      return
    }

    try {
      setIsDeleting(true)
      // Use project-specific API endpoint for proper RLS context
      const response = await fetch(`/api/projects/${resolvedParams?.projectId}/direct-costs/${resolvedParams?.costId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete direct cost')
      }

      toast.success('Direct cost deleted successfully')

      router.push(`/${resolvedParams?.projectId}/direct-costs`)
    } catch (error) {
      toast.error('Failed to delete direct cost')
    } finally {
      setIsDeleting(false)
    }
  }

  const getCostTypeBadge = (type?: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants = {
      labor: 'default',
      materials: 'secondary',
      equipment: 'outline',
      other: 'destructive',
    } as const
    return variants[type as keyof typeof variants] || 'outline'
  }

  const getStatusBadge = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants = {
      draft: 'outline',
      pending: 'secondary',
      approved: 'default',
      paid: 'destructive',
      rejected: 'destructive',
    } as const
    return variants[status as keyof typeof variants] || 'outline'
  }

  if (!resolvedParams || isLoading) {
    return (
      <>
        <ProjectPageHeader
          title="Direct Cost Details"
          description="Loading direct cost information"
          breadcrumbs={[
            { label: 'Projects', href: '/' },
            { label: 'Project', href: `/${resolvedParams?.projectId || ''}` },
            { label: 'Direct Costs', href: `/${resolvedParams?.projectId || ''}/direct-costs` },
            { label: 'Details' }
          ]}
        />
        <FormLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading direct cost details...</div>
          </div>
        </FormLayout>
      </>
    )
  }

  if (!directCost) {
    return (
      <>
        <ProjectPageHeader
          title="Direct Cost Details"
          description="Direct cost not found"
          breadcrumbs={[
            { label: 'Projects', href: '/' },
            { label: 'Project', href: `/${resolvedParams?.projectId}` },
            { label: 'Direct Costs', href: `/${resolvedParams?.projectId}/direct-costs` },
            { label: 'Details' }
          ]}
        />
        <FormLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Direct cost not found</div>
          </div>
        </FormLayout>
      </>
    )
  }

  return (
    <>
      <ProjectPageHeader
        title="Direct Cost Details"
        description={`Direct cost #${directCost.id.slice(0, 8)}`}
        breadcrumbs={[
          { label: 'Projects', href: '/' },
          { label: 'Project', href: `/${resolvedParams?.projectId}` },
          { label: 'Direct Costs', href: `/${resolvedParams?.projectId}/direct-costs` },
          { label: 'Details' }
        ]}
      />
      <FormLayout>

      <div className="mt-8 space-y-6">
        {/* Main Details Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cost Information</CardTitle>
              <div className="flex gap-2">
                <Badge variant={getCostTypeBadge(directCost.cost_type)}>
                  {directCost.cost_type || 'Other'}
                </Badge>
                <Badge variant={getStatusBadge(directCost.status)}>
                  {directCost.status || 'Draft'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1">{directCost.description || 'No description'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <p className="mt-1 text-2xl font-semibold">{formatCurrency(directCost.amount)}</p>
              </div>

              {directCost.vendor_name && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Vendor</label>
                  <p className="mt-1">{directCost.vendor_name}</p>
                </div>
              )}

              {directCost.incurred_date && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date Incurred</label>
                  <p className="mt-1">{formatDate(directCost.incurred_date)}</p>
                </div>
              )}

              {directCost.invoice_number && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Invoice Number</label>
                  <p className="mt-1">{directCost.invoice_number}</p>
                </div>
              )}

              {directCost.budget_code && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Budget Code</label>
                  <p className="mt-1">{directCost.budget_code}</p>
                  {directCost.budget_description && (
                    <p className="text-sm text-muted-foreground">{directCost.budget_description}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metadata Card */}
        <Card>
          <CardHeader>
            <CardTitle>Record Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="mt-1">{formatDate(directCost.created_at, 'MMM d, yyyy HH:mm')}</p>
              </div>

              {directCost.updated_at && directCost.updated_at !== directCost.created_at && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="mt-1">{formatDate(directCost.updated_at, 'MMM d, yyyy HH:mm')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => router.push(`/${resolvedParams?.projectId}/direct-costs/${resolvedParams?.costId}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
      </FormLayout>
    </>
  )
}
