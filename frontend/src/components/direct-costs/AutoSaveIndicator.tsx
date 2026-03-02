'use client'

import { CheckCircle2, CloudOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Text } from '@/components/ui/text'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error'
  lastSaved?: Date | string | null
  error?: string | null
  className?: string
}

/**
 * AutoSaveIndicator - Visual indicator for auto-save status
 *
 * @example
 * ```tsx
 * <AutoSaveIndicator
 *   status="saved"
 *   lastSaved={new Date()}
 * />
 * ```
 */
export function AutoSaveIndicator({
  status,
  lastSaved,
  error,
  className,
}: AutoSaveIndicatorProps) {
  // Format last saved timestamp
  const formatLastSaved = (timestamp: Date | string | null | undefined) => {
    if (!timestamp) return null

    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp

    if (isNaN(date.getTime())) return null

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)

    if (diffSecs < 60) return 'just now'
    if (diffMins === 1) return '1 minute ago'
    if (diffMins < 60) return `${diffMins} minutes ago`

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Don't render anything for idle state
  if (status === 'idle') {
    return null
  }

  // Determine badge variant and content
  const getBadgeConfig = () => {
    switch (status) {
      case 'saving':
        return {
          variant: 'secondary' as const,
          icon: <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />,
          text: 'Saving...',
          ariaLabel: 'Saving changes',
        }
      case 'saved':
        return {
          variant: 'default' as const,
          icon: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
          text: lastSaved ? `Saved ${formatLastSaved(lastSaved)}` : 'Saved',
          ariaLabel: lastSaved
            ? `Changes saved ${formatLastSaved(lastSaved)}`
            : 'Changes saved',
        }
      case 'error':
        return {
          variant: 'destructive' as const,
          icon: <CloudOff className="h-3 w-3" aria-hidden="true" />,
          text: 'Save failed',
          ariaLabel: error ? `Save failed: ${error}` : 'Save failed',
        }
      default:
        return null
    }
  }

  const config = getBadgeConfig()
  if (!config) return null

  const badgeContent = (
    <Badge
      variant={config.variant}
      className={cn('flex items-center gap-2 transition-opacity', className)}
      role="status"
      aria-label={config.ariaLabel}
    >
      {config.icon}
      <span className="text-xs">{config.text}</span>
    </Badge>
  )

  // Wrap in tooltip if there's an error message
  if (status === 'error' && error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
          <TooltipContent>
            <Text variant="sm">{error}</Text>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Wrap in tooltip for saved state with detailed timestamp
  if (status === 'saved' && lastSaved) {
    const date = typeof lastSaved === 'string' ? new Date(lastSaved) : lastSaved
    const fullTimestamp = date.toLocaleString()

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
          <TooltipContent>
            <Text variant="sm">Last saved: {fullTimestamp}</Text>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return badgeContent
}
