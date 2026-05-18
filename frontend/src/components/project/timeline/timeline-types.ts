export const TIMELINE_EVENT_KINDS = [
  'project_created',
  'project_start',
  'meeting',
  'rfi',
  'submittal',
  'commitment',
  'commitment_executed',
  'change_event',
  'change_order',
  'prime_contract',
  'prime_contract_executed',
] as const;

export type TimelineEventKind = (typeof TIMELINE_EVENT_KINDS)[number];

export interface TimelineEvent {
  occurred_at: string;
  kind: TimelineEventKind;
  title: string;
  summary: string | null;
  status: string | null;
  entity_id: string;
  project_id: number;
}

export interface TimelineMonthGroup {
  /** "May 2026" */
  label: string;
  /** "YYYY-MM" — used for sort key */
  monthKey: string;
  events: TimelineEvent[];
}
