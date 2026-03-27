"use client";

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
}

export type { KpiBlockProps };

export function KpiBlock({
  label,
  value,
  delta,
  context,
  size = "prominent",
}: KpiBlockProps) {
  return (
    <div>
      {/* Tier 1: Eyebrow */}
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>

      {/* Tier 2: Value + optional delta */}
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            size === "prominent" ? "text-2xl" : "text-lg"
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

      {/* Tier 4: Context */}
      {context && (
        <span className="mt-0.5 block text-xs text-muted-foreground/60">
          {context}
        </span>
      )}
    </div>
  );
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
          "grid divide-x divide-border",
          metrics.length === 4 && "grid-cols-4",
          metrics.length === 3 && "grid-cols-3",
          metrics.length <= 2 && "grid-cols-2"
        )}
      >
        {metrics.map((metric, i) => (
          <div key={i} className="px-6 py-4">
            <KpiBlock {...metric} />
          </div>
        ))}
      </div>
    </div>
  );
}
