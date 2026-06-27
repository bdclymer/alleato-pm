'use client';

import * as React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChannelDistributionItem {
  /** Channel / segment label, e.g. "Direct sales". */
  channel: string;
  /** Share of the total, 0–100. Drives both the bar and the card. */
  share: number;
  /** Pre-formatted value string, e.g. "$100.5K". */
  value: string;
  /** Optional link — when present the card becomes clickable and shows an arrow. */
  href?: string;
}

export interface ChannelDistributionProps {
  /** Heading above the total, e.g. "Total sales". */
  title: string;
  /** Pre-formatted total, e.g. "$292,400". */
  total: string;
  /** Caption above the bar, e.g. "Sales channel distribution". */
  breakdownLabel?: string;
  items: ChannelDistributionItem[];
  className?: string;
}

// Segment colors pull from the design-system chart tokens (theme-aware,
// light + dark). Cycles if there are more items than tokens.
const CHART_TOKENS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const tokenFor = (index: number) => CHART_TOKENS[index % CHART_TOKENS.length];

// ─── CategoryBar ──────────────────────────────────────────────────────────────
// A single horizontal bar split into proportional, colored segments.

function CategoryBar({ items }: { items: ChannelDistributionItem[] }) {
  return (
    <div className="flex h-2 w-full items-center overflow-hidden rounded-full">
      {items.map((item, index) => (
        <div
          key={item.channel}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{ width: `${item.share}%`, backgroundColor: tokenFor(index) }}
          aria-hidden
        />
      ))}
    </div>
  );
}

// ─── ChannelDistribution ──────────────────────────────────────────────────────

export function ChannelDistribution({
  title,
  total,
  breakdownLabel,
  items,
  className,
}: ChannelDistributionProps) {
  return (
    <div className={cn('w-full', className)}>
      <h3 className="text-sm text-muted-foreground">{title}</h3>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{total}</p>

      {breakdownLabel && (
        <h4 className="mt-4 text-sm text-muted-foreground">{breakdownLabel}</h4>
      )}
      <CategoryBar items={items} />

      <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item, index) => {
          const dot = (
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: tokenFor(index) }}
              aria-hidden
            />
          );

          return (
            <div
              key={item.channel}
              className={cn(
                'group relative rounded-lg border border-border px-3 py-2.5',
                item.href && 'transition-colors hover:bg-muted/50',
              )}
            >
              <div className="flex items-center gap-2">
                {dot}
                <dt className="truncate text-sm text-muted-foreground">
                  {item.href ? (
                    <a href={item.href} className="focus:outline-none">
                      {/* Stretch the link over the whole card */}
                      <span className="absolute inset-0" aria-hidden />
                      {item.channel}
                    </a>
                  ) : (
                    item.channel
                  )}
                </dt>
              </div>
              <dd className="mt-1 text-sm text-foreground">
                <span className="font-semibold tabular-nums">{item.share}%</span>
                <span className="text-muted-foreground"> &middot; {item.value}</span>
              </dd>
              {item.href && (
                <ArrowUpRight
                  className="pointer-events-none absolute right-2 top-2 size-4 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground"
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
