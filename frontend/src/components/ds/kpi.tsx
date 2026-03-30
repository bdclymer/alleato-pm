"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// KpiBlock — Single metric display with 3-tier text hierarchy
// ---------------------------------------------------------------------------

interface KpiBlockProps {
  label: string;
  value: string;
  delta?: {
    value: string;
    positive: boolean;
  };
  context?: string;
  size?: "prominent" | "compact";
  href?: string;
}

export type { KpiBlockProps };

export function KpiBlock({
  label,
  value,
  delta,
  context,
  size = "prominent",
  href,
}: KpiBlockProps) {
  const content = (
    <>
      {/* Tier 1: Eyebrow */}
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>

      {/* Tier 2: Value + optional delta */}
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            size === "prominent" ? "text-lg sm:text-2xl" : "text-base sm:text-lg"
          )}
        >
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
              delta.positive
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-600"
            )}
          >
            {delta.positive ? "\u2191" : "\u2193"} {delta.value}
          </span>
        )}
      </div>

      {/* Tier 3: Context */}
      {context && (
        <span className="mt-0.5 block text-xs text-muted-foreground/60">
          {context}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="block group">
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}

// ---------------------------------------------------------------------------
// KpiRow — Shared container for 2-4 KpiBlocks with dividers
// ---------------------------------------------------------------------------

export function KpiRow({ metrics }: { metrics: KpiBlockProps[] }) {
  return (
    /* eslint-disable-next-line design-system/no-design-violations -- KPI bento container uses intentional shared border */
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div
        className={cn(
          "grid",
          // Mobile: 2-col grid with both x and y dividers
          "grid-cols-2 divide-x divide-border",
          // Desktop: full row
          metrics.length === 4 && "md:grid-cols-4",
          metrics.length === 3 && "md:grid-cols-3",
          metrics.length <= 2 && "grid-cols-2"
        )}
      >
        {metrics.map((metric, i) => (
          <div
            key={i}
            className={cn(
              "px-4 py-3 sm:px-6 sm:py-4",
              // On mobile 2-col layout, add top border to items in the second row
              metrics.length > 2 && i >= 2 && "border-t border-border md:border-t-0",
              // Reset left divider for first item in each mobile row
              metrics.length > 2 && i === 2 && "[&]:border-l-0 md:[&]:border-l"
            )}
          >
            <KpiBlock {...metric} />
          </div>
        ))}
      </div>
    </div>
  );
}
