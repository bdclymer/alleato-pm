import Link from 'next/link';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ds/status-badge';
import { ArrowRight } from 'lucide-react';
import type { TimelineEvent, TimelineEventKind } from './timeline-types';
import { resolveTimelineLink } from './timeline-link';

// Dot color per kind. Follows the same pattern as StatusBadge in ds/.
const DOT_COLOR: Record<TimelineEventKind, string> = {
  project_created:          'bg-primary',
  project_start:            'bg-primary',
  meeting:                  'bg-muted-foreground',
  rfi:                      'bg-orange-500',
  submittal:                'bg-violet-500',
  commitment:               'bg-green-600',
  commitment_executed:      'bg-green-600',
  change_event:             'bg-amber-500',
  change_order:             'bg-destructive',
  prime_contract:           'bg-blue-600',
  prime_contract_executed:  'bg-blue-600',
};

interface Props {
  event: TimelineEvent;
  isLast: boolean;
}

export function TimelineEventItem({ event, isLast }: Props) {
  const link = resolveTimelineLink(event.project_id, event.kind, event.entity_id);
  const date = new Date(event.occurred_at);
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex gap-3">
      {/* Dot + vertical connector line */}
      <div className="flex flex-col items-center">
        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', DOT_COLOR[event.kind])} />
        {!isLast && <span className="mt-1 w-px flex-1 bg-border" />}
      </div>

      {/* Date */}
      <span className="w-14 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
        {dateLabel}
      </span>

      {/* Content */}
      <div className="min-w-0 pb-5">
        <p className="text-sm font-medium leading-snug">{event.title}</p>

        {(event.summary || event.status) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {event.summary && (
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {event.summary}
              </span>
            )}
            {event.status && (
              <StatusBadge status={event.status} className="text-[11px]" />
            )}
          </div>
        )}

        {link && (
          <Link
            href={link}
            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
