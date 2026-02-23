/**
 * =============================================================================
 * CREATE DIRECT COST FORM WRAPPER
 * =============================================================================
 *
 * Simplified wrapper around DirectCostForm configured for create mode.
 * Handles navigation and toast notifications after successful creation.
 */

'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DirectCostForm } from './DirectCostForm'

// =============================================================================
// INTERFACES
// =============================================================================

interface CreateDirectCostFormProps {
  projectId: number
}

interface DirectCostCreateResponse {
  id: string
  [key: string]: unknown
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CreateDirectCostForm({ projectId }: CreateDirectCostFormProps) {
  const router = useRouter()

  const handleSuccess = (data: unknown) => {
    const response = data as DirectCostCreateResponse

    toast.success('Direct cost created successfully')

    // Navigate to the detail page for the new direct cost
    router.push(`/${projectId}/direct-costs/${response.id}`)
  }

  const handleCancel = () => {
    // Navigate back to the list page
    router.push(`/${projectId}/direct-costs`)
  }

  return (
    <DirectCostForm
      mode="create"
      projectId={projectId}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  )
}
