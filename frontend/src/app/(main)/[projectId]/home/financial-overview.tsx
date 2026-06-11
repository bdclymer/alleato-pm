"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

/* ─────────────────────────────────────────────────────────────
   FinancialOverview — at-a-glance cost health for the project home.

   Three differentiated readouts:
     1. Budget vs committed bars.
     2. Open work queue.
     3. Change orders split.
───────────────────────────────────────────────────────────── */

interface ChangeOrderLike {
  status: string | null;
  amount?: number | null;
  total_amount?: number | null;
}

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
  changeOrders: ChangeOrderLike[];
  changeEventsCount: number;
  openRfisCount: number;
  openTasksCount: number;
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

const APPROVED_STATES = new Set([
  "approved",
  "executed",
  "closed",
  "complete",
  "completed",
]);

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.max(0, (part / whole) * 100));
}

type BudgetChartPayload = Array<{
  name?: string;
  value?: number | null;
  payload?: {
    label?: string;
  };
}>;

function BudgetChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: BudgetChartPayload;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-foreground">{payload[0]?.payload?.label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="font-medium tabular-nums text-foreground">
              {fmtFull(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetDivisionChart({
  divisions,
}: {
  divisions: BudgetDivisionSummary[];
}) {
  const chartRows = divisions
    .filter((division) => division.budget > 0 || division.committed > 0)
    .slice(0, 6);
  const chartHeight = Math.max(180, chartRows.length * 54);

  if (chartRows.length === 0) {
    return null;
  }

  return (
    <div className="min-h-0 w-full">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartRows}
          layout="vertical"
          barCategoryGap={12}
          margin={{ top: 4, right: 8, bottom: 0, left: 4 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="hsl(var(--border))"
            strokeOpacity={0.7}
          />
          <XAxis
            type="number"
            tickFormatter={(value) => fmtCompact(Number(value))}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={136}
            tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <Tooltip
            content={<BudgetChartTooltip />}
            cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
          />
          <Bar
            dataKey="budget"
            name="Budget"
            fill="hsl(var(--muted-foreground) / 0.35)"
            radius={[0, 3, 3, 0]}
            barSize={10}
          />
          <Bar
            dataKey="committed"
            name="Committed"
            fill="hsl(var(--primary))"
            radius={[0, 3, 3, 0]}
            barSize={10}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex items-center gap-4 pl-36 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/35" />
          Budget
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
          Committed
        </span>
      </div>
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
      className="group flex flex-col justify-between gap-5 rounded-lg bg-card p-4 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>Budget vs committed</Eyebrow>
          <p className="mt-2 text-2xl font-semibold leading-none tabular-nums text-foreground">
            {fmtFull(revisedBudget)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {fmtCompact(displayedCommittedCosts)} committed
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold tabular-nums",
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

/* ── Panel 2: Open work queue ──────────────────────────────── */

function WorkQueuePanel({
  projectId,
  changeEventsCount,
  openRfisCount,
  openTasksCount,
}: {
  projectId: string;
  changeEventsCount: number;
  openRfisCount: number;
  openTasksCount: number;
}) {
  const total = changeEventsCount + openRfisCount + openTasksCount;
  const rows = [
    { label: "Change events", value: changeEventsCount, href: `/${projectId}/change-events` },
    { label: "RFIs", value: openRfisCount, href: `/${projectId}/rfis` },
    { label: "Tasks", value: openTasksCount, href: `/${projectId}/tasks` },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Eyebrow>Open work</Eyebrow>
          <p className="mt-2 text-2xl font-semibold leading-none tabular-nums text-foreground">
            {total}
          </p>
        </div>
        <Link href={`/${projectId}/tasks`} prefetch={false} className="text-xs text-primary transition-colors hover:text-primary/80">
          View tasks
        </Link>
      </div>

      <div className="divide-y divide-border/50">
        {rows.map((row) => (
          <Link
            key={row.label}
            href={row.href}
            prefetch={false}
            className="flex items-center justify-between gap-3 py-2 text-sm transition-colors hover:text-primary"
          >
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium tabular-nums text-foreground">{row.value}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Panel 3: Change orders split ──────────────────────────── */

function ChangeOrdersPanel({
  projectId,
  changeOrders,
}: {
  projectId: string;
  changeOrders: ChangeOrderLike[];
}) {
  const total = changeOrders.length;
  const approved = changeOrders.filter((co) =>
    APPROVED_STATES.has((co.status ?? "").toLowerCase()),
  ).length;
  const pending = Math.max(0, total - approved);
  const value = changeOrders.reduce(
    (sum, co) => sum + (Number(co.total_amount ?? co.amount) || 0),
    0,
  );
  const approvedW = total > 0 ? (approved / total) * 100 : 0;

  return (
    <Link
      href={`/${projectId}/change-orders`}
      prefetch={false}
      className="group flex flex-col justify-between gap-4 rounded-lg bg-card p-4 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-2">
        <Eyebrow>Change Orders</Eyebrow>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      <div className="flex items-baseline gap-2.5">
        <span className="text-2xl font-semibold leading-none tabular-nums text-foreground">
          {total}
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {fmtCompact(value)} total
        </span>
      </div>

      <div>
        {total > 0 ? (
          <>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted-foreground/12">
              <div className="bg-success" style={{ width: `${approvedW}%` }} />
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-muted-foreground">Approved</span>
                <span className="font-medium tabular-nums text-foreground">
                  {approved}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                <span className="text-muted-foreground">Pending</span>
                <span className="font-medium tabular-nums text-foreground">
                  {pending}
                </span>
              </span>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No change orders yet.</p>
        )}
      </div>
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
  changeOrders,
  changeEventsCount,
  openRfisCount,
  openTasksCount,
}: FinancialOverviewProps) {
  // Nothing meaningful to show before a budget exists.
  if (revisedBudget <= 0 && committedCosts <= 0 && changeOrders.length === 0) {
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
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
        <BudgetVsCommittedPanel
          projectId={projectId}
          revisedBudget={revisedBudget}
          committedCosts={committedCosts}
          estimatedCostAtCompletion={estimatedCostAtCompletion}
          projectedOverUnder={projectedOverUnder}
          budgetDivisions={budgetDivisions}
        />
        <WorkQueuePanel
          projectId={projectId}
          changeEventsCount={changeEventsCount}
          openRfisCount={openRfisCount}
          openTasksCount={openTasksCount}
        />
        <ChangeOrdersPanel projectId={projectId} changeOrders={changeOrders} />
      </div>
    </section>
  );
}
