"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

/* ─────────────────────────────────────────────────────────────
   FinancialOverview — at-a-glance cost health for the project home.

   Three differentiated readouts:
     1. Budget vs committed bars.
     2. Open work queue.
     3. Change orders split.
───────────────────────────────────────────────────────────── */

export interface BudgetDivisionSummary {
  id: string;
  label: string;
  budget: number;
  committed: number;
}

interface FinancialOverviewProps {
  projectId: string;
  revisedBudget: number;
  committedCosts: number;
  estimatedCostAtCompletion: number;
  projectedOverUnder: number;
  budgetDivisions: BudgetDivisionSummary[];
}

function fmtFull(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtCompact(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.max(0, (part / whole) * 100));
}

function niceTickStep(maxValue: number): number {
  if (maxValue <= 0) return 1;
  const roughStep = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const residual = roughStep / magnitude;

  if (residual <= 1) return magnitude;
  if (residual <= 1.5) return 1.5 * magnitude;
  if (residual <= 2) return 2 * magnitude;
  if (residual <= 2.5) return 2.5 * magnitude;
  if (residual <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function getDivisionCode(label: string): string {
  const match = label.match(/^(\d{1,2})\b/);
  return match?.[1] ?? label.slice(0, 2);
}

function getDivisionOrder(label: string): number {
  const code = Number.parseInt(getDivisionCode(label), 10);
  return Number.isFinite(code) ? code : Number.MAX_SAFE_INTEGER;
}

function getDivisionTitle(label: string): string {
  return label.replace(/^\d{1,2}\s*/, "").trim();
}

function BudgetDivisionChart({
  divisions,
}: {
  divisions: BudgetDivisionSummary[];
}) {
  const chartRows = divisions
    .filter((division) => division.budget > 0 || division.committed > 0)
    .sort((left, right) => {
      const orderDelta = getDivisionOrder(left.label) - getDivisionOrder(right.label);
      return orderDelta || left.label.localeCompare(right.label);
    });

  if (chartRows.length === 0) {
    return null;
  }

  const leftPadding = 52;
  const rightPadding = 20;
  const topPadding = 18;
  const plotHeight = 230;
  const axisHeight = 104;
  const legendHeight = 24;
  const groupWidth = 70;
  const chartWidth = Math.max(680, leftPadding + rightPadding + chartRows.length * groupWidth);
  const chartHeight = topPadding + plotHeight + axisHeight + legendHeight;
  const plotWidth = chartWidth - leftPadding - rightPadding;
  const maxValue = Math.max(...chartRows.flatMap((division) => [division.budget, division.committed]), 1);
  const tickStep = niceTickStep(maxValue);
  const axisMax = tickStep * 4;
  const ticks = Array.from({ length: 5 }, (_, index) => index * tickStep);
  const baselineY = topPadding + plotHeight;
  const yForValue = (value: number) =>
    baselineY - (Math.max(0, value) / axisMax) * plotHeight;

  return (
    <div className="min-h-0 w-full overflow-x-auto">
      <svg
        role="img"
        aria-label="Budget and committed costs by division"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="h-auto min-w-full text-xs"
      >
        <title>Budget and committed costs by division</title>
        {ticks.map((tick) => {
          const y = yForValue(tick);
          return (
            <g key={tick}>
              <line
                x1={leftPadding}
                x2={leftPadding + plotWidth}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeOpacity={0.65}
              />
              <text
                x={leftPadding - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground tabular-nums"
              >
                {fmtCompact(tick)}
              </text>
            </g>
          );
        })}
        {chartRows.map((division, index) => {
          const groupX = leftPadding + index * groupWidth + groupWidth / 2;
          const budgetY = yForValue(division.budget);
          const committedY = yForValue(division.committed);
          const budgetHeight = Math.max(2, baselineY - budgetY);
          const committedHeight = Math.max(2, baselineY - committedY);
          const divisionCode = getDivisionCode(division.label);
          const divisionTitle = getDivisionTitle(division.label);
          const label = `${divisionCode} ${divisionTitle}`.trim();

          return (
            <g key={division.id}>
              <title>
                {division.label}: Budget {fmtFull(division.budget)}, Committed {fmtFull(division.committed)}
              </title>
              <rect
                x={groupX - 18}
                y={budgetY}
                width={16}
                height={budgetHeight}
                rx={4}
                className="fill-muted-foreground/35"
              />
              <rect
                x={groupX + 2}
                y={committedY}
                width={16}
                height={committedHeight}
                rx={4}
                className="fill-primary"
              />
              <text
                x={groupX - 12}
                y={baselineY + 22}
                textAnchor="end"
                transform={`rotate(-45 ${groupX - 12} ${baselineY + 22})`}
                className="fill-foreground font-medium"
              >
                {label}
              </text>
            </g>
          );
        })}
        <line
          x1={leftPadding}
          x2={leftPadding + plotWidth}
          y1={baselineY}
          y2={baselineY}
          className="stroke-border"
        />
        <g transform={`translate(${leftPadding}, ${baselineY + axisHeight + 8})`}>
          <rect width={8} height={8} rx={2} className="fill-muted-foreground/35" />
          <text x={16} y={8} className="fill-muted-foreground">
            Budget
          </text>
          <rect x={80} width={8} height={8} rx={2} className="fill-primary" />
          <text x={96} y={8} className="fill-muted-foreground">
            Committed
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ── Eyebrow label ─────────────────────────────────────────── */

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </p>
  );
}

/* ── Panel 1: Budget vs committed bars ─────────────────────── */

function BudgetVsCommittedPanel({
  projectId,
  revisedBudget,
  committedCosts,
  estimatedCostAtCompletion,
  projectedOverUnder,
  budgetDivisions,
}: {
  projectId: string;
  revisedBudget: number;
  committedCosts: number;
  estimatedCostAtCompletion: number;
  projectedOverUnder: number;
  budgetDivisions: BudgetDivisionSummary[];
}) {
  const overBudget = projectedOverUnder < 0;
  const divisionRows = budgetDivisions.filter(
    (division) => division.budget > 0 || division.committed > 0,
  );
  const divisionCommittedCosts = divisionRows.reduce(
    (sum, division) => sum + division.committed,
    0,
  );
  const displayedCommittedCosts =
    committedCosts > 0 ? committedCosts : divisionCommittedCosts;
  const variancePctOfBudget =
    revisedBudget > 0 ? (projectedOverUnder / revisedBudget) * 100 : 0;

  return (
    <Link
      href={`/${projectId}/budget`}
      prefetch={false}
      className="group flex flex-col justify-between gap-5 rounded-md border border-border/60 p-4 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow>Budget vs committed</Eyebrow>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <div>
              <p className="text-xl font-semibold leading-none tabular-nums text-foreground">
                {fmtFull(revisedBudget)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Budget</p>
            </div>
            <div>
              <p className="text-sm font-medium leading-none tabular-nums text-foreground">
                {fmtCompact(displayedCommittedCosts)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Committed</p>
            </div>
          </div>
        </div>
        <span
          className={cn(
            "mt-4 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold tabular-nums",
            overBudget
              ? "bg-destructive/10 text-destructive"
              : "bg-success/10 text-success",
          )}
        >
          {overBudget ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <TrendingUp className="h-3 w-3" />
          )}
          {overBudget ? "" : "+"}
          {fmtCompact(projectedOverUnder)}
          <span className="opacity-60">
            {formatPercent(Math.abs(variancePctOfBudget), 1)}
          </span>
        </span>
      </div>

      <div className="space-y-3">
        {divisionRows.length > 0 ? (
          <BudgetDivisionChart divisions={divisionRows} />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Budget</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted-foreground/12">
                <div className="h-full rounded-full bg-muted-foreground/35" style={{ width: "100%" }} />
              </div>
              <span className="text-right text-xs font-medium tabular-nums text-foreground">
                {fmtCompact(revisedBudget)}
              </span>
            </div>
            <div className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Committed</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted-foreground/12">
                <div
                  className={cn(
                    "h-full rounded-full",
                    displayedCommittedCosts > revisedBudget ? "bg-destructive" : "bg-primary",
                  )}
                  style={{
                    width: `${pct(
                      displayedCommittedCosts,
                      Math.max(revisedBudget, displayedCommittedCosts, 1),
                    )}%`,
                  }}
                />
              </div>
              <span className="text-right text-xs font-medium tabular-nums text-foreground">
                {fmtCompact(displayedCommittedCosts)}
              </span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">ECAC</span>
          <div className="h-px bg-border" />
          <span className={cn("text-right text-xs font-medium tabular-nums", overBudget ? "text-destructive" : "text-foreground")}>
            {fmtCompact(estimatedCostAtCompletion)}
          </span>
        </div>
      </div>
      <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

/* ── Composite ─────────────────────────────────────────────── */

export function FinancialOverview({
  projectId,
  revisedBudget,
  committedCosts,
  estimatedCostAtCompletion,
  projectedOverUnder,
  budgetDivisions,
}: FinancialOverviewProps) {
  // Nothing meaningful to show before a budget exists.
  if (
    revisedBudget <= 0 &&
    committedCosts <= 0
  ) {
    return null;
  }

  return (
    <section aria-label="Financial overview">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Financials</p>
        <Link
          href={`/${projectId}/budget`}
          prefetch={false}
          className="text-xs text-primary transition-colors hover:text-primary/80"
        >
          View budget
        </Link>
      </div>
      <div>
        <BudgetVsCommittedPanel
          projectId={projectId}
          revisedBudget={revisedBudget}
          committedCosts={committedCosts}
          estimatedCostAtCompletion={estimatedCostAtCompletion}
          projectedOverUnder={projectedOverUnder}
          budgetDivisions={budgetDivisions}
        />
      </div>
    </section>
  );
}
