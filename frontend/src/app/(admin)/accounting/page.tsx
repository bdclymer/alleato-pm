"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PaymentGuardrailAlerts } from "@/components/accounting/payment-guardrail-alerts";
import { KpiRow } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import type { FinancialGuardrailAlert } from "@/lib/accounting/aging-calculator";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface AgingBucket {
  label: string;
  count: number;
  total: number;
}

interface AgingResult {
  current: AgingBucket;
  days31to60: AgingBucket;
  days61to90: AgingBucket;
  days90plus: AgingBucket;
  totalOutstanding: number;
}

interface CashPosition {
  totalArOutstanding: number;
  totalApOutstanding: number;
  netCashPosition: number;
  paymentsReceivedThisMonth: number;
  checksIssuedThisMonth: number;
}

interface ProjectRevenue {
  projectCode: string;
  description: string | null;
  customer: string | null;
  totalInvoiced: number;
  totalCollected: number;
  outstandingBalance: number;
}

interface ProjectBalance {
  projectCode: string;
  description: string | null;
  customer: string | null;
  outstandingBalance: number;
}

interface ProjectNetMargin {
  projectCode: string;
  description: string | null;
  customer: string | null;
  revenue: number;
  cost: number;
  netMargin: number;
  netMarginPercent: number | null;
}

interface RecentPayment {
  referenceNbr: string;
  customerName: string | null;
  amount: number;
  date: string | null;
  status: string | null;
}

interface RecentCheck {
  referenceNbr: string;
  vendorId: string | null;
  vendorName: string | null;
  amount: number;
  date: string | null;
  status: string | null;
}

interface MonthlyRevenueMargin {
  month: string;
  revenue: number;
  cost: number;
  netMargin: number;
  netMarginPercent: number | null;
}

interface DashboardResponse {
  arAging: AgingResult;
  apAging: AgingResult;
  cashPosition: CashPosition;
  revenueByProject: ProjectRevenue[];
  arByProject: ProjectRevenue[];
  apByProject: ProjectBalance[];
  netMarginByProject: ProjectNetMargin[];
  monthlyRevenueMargin: MonthlyRevenueMargin[];
  recentActivity: {
    payments: RecentPayment[];
    checks: RecentCheck[];
  };
  guardrailAlerts: FinancialGuardrailAlert[];
  leadership: {
    neededSopCount: number;
    staleNeededSopCount: number;
    linkedSopCount: number;
    trailingFinanceSpend: number;
    financeSpendExceptionCount: number;
  };
  reconciliation: {
    duplicateCount: number;
    onHoldCount: number;
    syncIssueCount: number;
    dollarsAtRisk: number;
    lastRunAt: string | null;
  };
  retainage: {
    apOwedTotal: number;
    apOwedCount: number;
    byProject: Array<{ projectCode: string; projectName: string; total: number }>;
  };
  generatedAt: string;
}


const REPORT_LINKS: Array<{
  title: string;
  href: string;
  detail: (data: DashboardResponse) => string;
}> = [
  {
    title: "WIP Report",
    href: "/accounting/wip",
    detail: (data) =>
      `${data.arByProject.length} projects with billing position`,
  },
  {
    title: "Project Status Reports",
    href: "/accounting/projects",
    detail: () => "Income, expenses, assets, and project status",
  },
  {
    title: "SOP Backlog",
    href: "/accounting/sop-backlog",
    detail: (data) =>
      `${data.leadership.neededSopCount} needed, ${data.leadership.staleNeededSopCount} stale`,
  },
  {
    title: "Finance Spend",
    href: "/accounting/finance-spend",
    detail: (data) =>
      `${formatCurrency(data.leadership.trailingFinanceSpend)} trailing spend, ${data.leadership.financeSpendExceptionCount} exceptions`,
  },
];

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatCurrencyFull(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No date";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonthLabel(month: string): string {
  const date = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("en-US", { month: "short" });
}

function formatPercent(value: number | null): string {
  if (value === null) return "No revenue";
  return `${value.toFixed(1)}%`;
}

function overdueTotal(aging: AgingResult): number {
  return (
    aging.days31to60.total + aging.days61to90.total + aging.days90plus.total
  );
}

function overdueCount(aging: AgingResult): number {
  return (
    aging.days31to60.count + aging.days61to90.count + aging.days90plus.count
  );
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
    >
      {children}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

function MetricPanel({
  label,
  value,
  context,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  context: string;
  href?: string;
  tone?: "default" | "risk" | "good";
}) {
  const content = (
    <div className="space-y-2 rounded-lg bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-2xl font-semibold tracking-tight tabular-nums text-foreground",
          tone === "risk" && "text-destructive",
          tone === "good" && "text-status-success",
        )}
      >
        {value}
      </p>
      <p className="text-xs leading-5 text-muted-foreground">{context}</p>
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block transition-colors hover:bg-muted/30">
      {content}
    </Link>
  );
}

function AttentionStrip({
  data,
  arLate,
}: {
  data: DashboardResponse;
  arLate: number;
}) {
  const items: Array<{ key: string; label: string; sub: string; href: string }> = [];

  if (arLate > 0) {
    items.push({
      key: "ar",
      label: `${formatCurrency(arLate)} AR overdue`,
      sub: `${overdueCount(data.arAging)} receivables`,
      href: "/accounting/invoices?balance=positive",
    });
  }
  if (data.reconciliation.duplicateCount > 0) {
    items.push({
      key: "dup",
      label: `${data.reconciliation.duplicateCount} duplicate bills`,
      sub: `${formatCurrency(data.reconciliation.dollarsAtRisk)} at risk`,
      href: "/accounting/reconciliation?view=duplicates",
    });
  }
  if (data.reconciliation.onHoldCount > 0) {
    items.push({
      key: "onhold",
      label: `${data.reconciliation.onHoldCount} bills on hold`,
      sub: "unreviewed",
      href: "/accounting/reconciliation?view=onhold",
    });
  }
  const underwater = data.netMarginByProject.filter((p) => p.netMargin < 0).length;
  if (underwater > 0) {
    items.push({
      key: "underwater",
      label: `${underwater} ${underwater === 1 ? "job" : "jobs"} underwater`,
      sub: "negative margin",
      href: "/accounting/wip",
    });
  }
  if (data.leadership.financeSpendExceptionCount > 0) {
    items.push({
      key: "spend",
      label: `${data.leadership.financeSpendExceptionCount} spend exceptions`,
      sub: "review",
      href: "/accounting/finance-spend",
    });
  }

  if (items.length === 0) return null;

  return (
    <section className="rounded-lg bg-warning/10 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <AlertTriangle className="h-4 w-4 text-warning" />
        Needs attention
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="group flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <span className="font-medium text-foreground">{item.label}</span>
            <span className="text-xs text-muted-foreground">{item.sub}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function AgingBarChart({
  title,
  aging,
  href,
}: {
  title: string;
  aging: AgingResult;
  href: string;
}) {
  const data = [
    { bucket: "Current", value: aging.current.total, count: aging.current.count, idx: 0 },
    { bucket: "31–60", value: aging.days31to60.total, count: aging.days31to60.count, idx: 1 },
    { bucket: "61–90", value: aging.days61to90.total, count: aging.days61to90.count, idx: 2 },
    { bucket: "90+", value: aging.days90plus.total, count: aging.days90plus.count, idx: 3 },
  ];
  const colors = [
    "hsl(var(--chart-2))",
    "hsl(var(--status-warning))",
    "hsl(var(--chart-5))",
    "hsl(var(--destructive))",
  ];

  return (
    <div className="rounded-lg bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrencyFull(aging.totalOutstanding)} outstanding ·{" "}
            {formatCurrencyFull(overdueTotal(aging))} overdue
          </p>
        </div>
        <TextLink href={href}>Open</TextLink>
      </div>

      <div className="mt-4 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 4, left: 8 }}
            barCategoryGap="24%"
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              className="stroke-border/40"
            />
            <XAxis
              dataKey="bucket"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCurrency}
              width={50}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0]?.payload as {
                  bucket: string;
                  value: number;
                  count: number;
                };
                return (
                  <div className="space-y-1 rounded-lg border border-border/50 bg-popover px-3 py-2 text-xs shadow-sm">
                    <p className="font-medium text-foreground">{item.bucket}</p>
                    <p className="text-muted-foreground">
                      {item.count} item{item.count === 1 ? "" : "s"}
                    </p>
                    <p className="tabular-nums text-foreground">
                      {formatCurrencyFull(item.value)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.bucket} fill={colors[d.idx]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CashFlowPanel({ cashPosition }: { cashPosition: CashPosition }) {
  const { paymentsReceivedThisMonth, checksIssuedThisMonth, netCashPosition } =
    cashPosition;
  const maxFlow = Math.max(paymentsReceivedThisMonth, checksIssuedThisMonth, 1);
  const inflowWidth = percent(paymentsReceivedThisMonth, maxFlow);
  const outflowWidth = percent(checksIssuedThisMonth, maxFlow);

  return (
    <div className="rounded-lg bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Cash Movement</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current-month receipts against checks issued
          </p>
        </div>
        <TextLink href="/accounting/payments">Payments</TextLink>
      </div>

      <div className="mt-6 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">Received</span>
            <span className="tabular-nums text-foreground">
              {formatCurrencyFull(paymentsReceivedThisMonth)}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-status-success"
              style={{ width: `${inflowWidth}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">Paid out</span>
            <span className="tabular-nums text-foreground">
              {formatCurrencyFull(checksIssuedThisMonth)}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${outflowWidth}%` }}
            />
          </div>
        </div>

        <div className="flex items-baseline justify-between border-t border-border/40 pt-4">
          <span className="text-xs font-medium text-muted-foreground">
            Net position
          </span>
          <span
            className={cn(
              "text-2xl font-semibold tracking-tight tabular-nums",
              netCashPosition >= 0 ? "text-status-success" : "text-destructive",
            )}
          >
            {formatCurrencyFull(netCashPosition)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ProjectNetMarginChart({ projects }: { projects: ProjectNetMargin[] }) {
  const topProjects = projects
    .filter((project) => project.revenue > 0 || project.cost > 0)
    .slice(0, 8);
  const totalNetMargin = projects.reduce(
    (sum, project) => sum + project.netMargin,
    0,
  );
  const chartData = topProjects.map((project) => ({
    projectCode: project.projectCode,
    projectName: project.description ?? project.projectCode,
    customer: project.customer,
    revenue: project.revenue,
    cost: project.cost,
    netMargin: project.netMargin,
    netMarginPercent: project.netMarginPercent,
  }));

  if (topProjects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No project margin data available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrencyFull(totalNetMargin)} net margin
          </p>
          <p className="text-xs text-muted-foreground">
            Largest project margins by absolute impact
          </p>
        </div>
        <TextLink href="/accounting/projects">All projects</TextLink>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 12, bottom: 48, left: 8 }}
            barCategoryGap="28%"
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              className="stroke-border/40"
            />
            <XAxis
              dataKey="projectCode"
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-32}
              textAnchor="end"
              height={52}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCurrency}
              width={58}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0]?.payload as {
                  projectCode: string;
                  projectName: string;
                  customer: string | null;
                  revenue: number;
                  cost: number;
                  netMargin: number;
                  netMarginPercent: number | null;
                };
                return (
                  <div className="space-y-1 rounded-lg border border-border/50 bg-popover px-3 py-2 text-xs shadow-sm">
                    <p className="font-medium text-foreground">
                      {item.projectCode}, {item.projectName}
                    </p>
                    <p className="text-muted-foreground">
                      {item.customer ?? "No customer listed"}
                    </p>
                    <div className="grid grid-cols-[4rem_auto] gap-x-4 gap-y-1">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="text-right tabular-nums text-foreground">
                        {formatCurrencyFull(item.revenue)}
                      </span>
                      <span className="text-muted-foreground">Cost</span>
                      <span className="text-right tabular-nums text-foreground">
                        {formatCurrencyFull(item.cost)}
                      </span>
                      <span className="text-muted-foreground">Margin</span>
                      <span className="text-right tabular-nums text-foreground">
                        {formatCurrencyFull(item.netMargin)}
                      </span>
                      <span className="text-muted-foreground">Rate</span>
                      <span className="text-right tabular-nums text-foreground">
                        {formatPercent(item.netMarginPercent)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="netMargin"
              name="Net margin"
              radius={[4, 4, 0, 0]}
              maxBarSize={44}
              isAnimationActive={false}
            >
              {chartData.map((project) => (
                <Cell
                  key={project.projectCode}
                  fill={
                    project.netMargin >= 0
                      ? "hsl(var(--status-success))"
                      : "hsl(var(--destructive))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RevenueRows({ projects }: { projects: ProjectRevenue[] }) {
  const rows = projects.slice(0, 6);
  const maxValue = Math.max(
    ...rows.flatMap((project) => [
      project.totalInvoiced,
      project.totalCollected,
      project.outstandingBalance,
    ]),
    1,
  );

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No project revenue data available.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {rows.map((project) => (
        <div
          key={project.projectCode}
          className="grid gap-3 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)]"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {project.projectCode}
              {project.description ? `, ${project.description}` : ""}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {project.customer ?? "No customer listed"}
            </p>
          </div>
          <div className="grid gap-2 text-xs">
            {[
              {
                label: "Invoiced",
                value: project.totalInvoiced,
                className: "bg-primary",
              },
              {
                label: "Collected",
                value: project.totalCollected,
                className: "bg-status-success",
              },
              {
                label: "Open",
                value: project.outstandingBalance,
                className: "bg-status-warning",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-center gap-2"
              >
                <span className="text-muted-foreground">{item.label}</span>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", item.className)}
                    style={{
                      width: `${Math.max(percent(item.value, maxValue), item.value > 0 ? 3 : 0)}%`,
                    }}
                  />
                </div>
                <span className="text-right tabular-nums text-foreground">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthlyRevenueMarginChart({
  series,
}: {
  series: MonthlyRevenueMargin[];
}) {
  const chartData = series.map((point) => ({
    ...point,
    label: formatMonthLabel(point.month),
  }));

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No monthly revenue data available.
      </p>
    );
  }

  const latest = chartData[chartData.length - 1];

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="space-y-5">
        {latest && (
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Latest revenue
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {formatCurrencyFull(latest.revenue)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Net margin
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {formatCurrencyFull(latest.netMargin)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Margin rate
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {formatPercent(latest.netMarginPercent)}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Revenue
          </span>
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-status-success" />
            Net margin
          </span>
        </div>
      </div>

      <div className="h-80 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 12, bottom: 8, left: 8 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              className="stroke-border/40"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <YAxis
              yAxisId="amount"
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCurrency}
              width={58}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--border))" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0]?.payload as MonthlyRevenueMargin & {
                  label: string;
                };
                return (
                  <div className="space-y-1.5 rounded-lg border border-border/50 bg-popover px-3 py-2 text-xs shadow-sm">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <div className="flex items-center justify-between gap-5">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="tabular-nums text-foreground">
                        {formatCurrencyFull(item.revenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-5">
                      <span className="text-muted-foreground">Cost</span>
                      <span className="tabular-nums text-foreground">
                        {formatCurrencyFull(item.cost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-5">
                      <span className="text-muted-foreground">Net margin</span>
                      <span className="tabular-nums text-foreground">
                        {formatCurrencyFull(item.netMargin)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-5">
                      <span className="text-muted-foreground">Margin rate</span>
                      <span className="tabular-nums text-foreground">
                        {formatPercent(item.netMarginPercent)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Line
              yAxisId="amount"
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
            <Line
              yAxisId="amount"
              type="monotone"
              dataKey="netMargin"
              name="Net margin"
              stroke="hsl(var(--status-success))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ActivityRow({
  referenceNbr,
  label,
  amount,
  date,
  type,
}: {
  referenceNbr: string;
  label: string | null;
  amount: number;
  date: string | null;
  type: "payment" | "check";
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_minmax(6.5rem,auto)] gap-2 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
            type === "payment"
              ? "bg-status-success/10 text-status-success"
              : "bg-primary/10 text-primary",
          )}
        >
          {type === "payment" ? (
            <ArrowDownRight className="h-3 w-3" />
          ) : (
            <ArrowUpRight className="h-3 w-3" />
          )}
        </span>
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="shrink-0 text-sm font-medium text-foreground">
            #{referenceNbr}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {label ?? "No name"}
          </p>
        </div>
      </div>
      <p className="self-center text-xs text-muted-foreground">
        {formatDate(date)}
      </p>
      <p className="self-center text-right text-sm font-semibold tabular-nums text-foreground">
        {formatCurrencyFull(amount)}
      </p>
    </div>
  );
}

function ReportList({ data }: { data: DashboardResponse }) {
  return (
    <div className="divide-y divide-border/40">
      {REPORT_LINKS.map((report) => (
        <Link
          key={report.href}
          href={report.href}
          className="grid gap-1 py-3 transition-colors hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <p className="text-sm font-medium text-foreground">{report.title}</p>
          <p className="text-xs text-muted-foreground sm:text-right">
            {report.detail(data)}
          </p>
        </Link>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <PageShell
      variant="dashboard"
      title="Accounting"
      contentClassName="space-y-8"
    >
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-56 animate-pulse rounded-lg bg-muted" />
          <div className="h-56 animate-pulse rounded-lg bg-muted" />
          <div className="h-56 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </PageShell>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <PageShell variant="dashboard" title="Accounting">
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <AlertTriangle className="h-7 w-7 text-destructive" />
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {message}
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </PageShell>
  );
}

function RetainageSection({
  retainage,
}: {
  retainage: DashboardResponse["retainage"];
}) {
  const max = Math.max(...retainage.byProject.map((p) => p.total), 1);
  return (
    <div className="rounded-lg bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {formatCurrencyFull(retainage.apOwedTotal)} owed to subcontractors across{" "}
          {retainage.apOwedCount} subcontracts — released as their work completes.
        </p>
        <TextLink href="/accounting/bills">Open</TextLink>
      </div>
      <div className="mt-4 space-y-2.5">
        {retainage.byProject.map((project) => (
          <div key={project.projectCode} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-foreground">{project.projectName}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatCurrency(project.total)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Math.max((project.total / max) * 100, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        AR retainage (held from us by owners) isn&apos;t in the synced data yet.
      </p>
    </div>
  );
}

export default function AccountingDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFetch<DashboardResponse>(
        "/api/accounting/dashboard",
      );
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Accounting dashboard failed to load.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSync = useCallback(async () => {
    try {
      setSyncing(true);
      await apiFetch("/api/sync/acumatica/mirror", {
        method: "POST",
        body: JSON.stringify({ mode: "incremental" }),
      });
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Acumatica sync failed.");
    } finally {
      setSyncing(false);
    }
  }, [fetchDashboard]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;
  if (!data) return null;

  const {
    arAging,
    apAging,
    cashPosition,
    guardrailAlerts,
    monthlyRevenueMargin,
    netMarginByProject,
    recentActivity,
    revenueByProject,
  } = data;
  const arLate = overdueTotal(arAging);
  const apLate = overdueTotal(apAging);
  const paymentsIn = recentActivity.payments.slice(0, 5).map((payment) => ({
    referenceNbr: payment.referenceNbr,
    label: payment.customerName,
    amount: payment.amount,
    date: payment.date,
  }));
  const checksOut = recentActivity.checks.slice(0, 5).map((check) => ({
    referenceNbr: check.referenceNbr,
    label: check.vendorName ?? check.vendorId,
    amount: check.amount,
    date: check.date,
  }));

  return (
    <PageShell
      variant="dashboard"
      title="Accounting"
      contentClassName="space-y-8"
      actions={
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground md:inline">
            Updated {new Date(data.generatedAt).toLocaleString()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSync}
            disabled={syncing}
            title={syncing ? "Syncing from Acumatica" : "Sync from Acumatica"}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          </Button>
        </div>
      }
    >
      <p className="text-xs text-muted-foreground">
        Synced from Acumatica.{" "}
        {data.reconciliation.onHoldCount > 0
          ? `${data.reconciliation.onHoldCount} bills still on hold (unreviewed) — figures may shift as they're cleared.`
          : "No bills on hold — figures are stable."}
      </p>

      <AttentionStrip data={data} arLate={arLate} />

      <section className="grid gap-4 lg:grid-cols-4">
        <MetricPanel
          label="Working capital (AR − AP)"
          value={formatCurrencyFull(cashPosition.netCashPosition)}
          context="Receivables minus payables — a paper position, not cash on hand"
        />
        <MetricPanel
          label="AR past current"
          value={formatCurrencyFull(arLate)}
          context={`${overdueCount(arAging)} receivables need collection review`}
          href="/accounting/invoices?balance=positive"
          tone={arLate > 0 ? "risk" : "default"}
        />
        <MetricPanel
          label="AP past current"
          value={formatCurrencyFull(apLate)}
          context={`${overdueCount(apAging)} payables need payment planning`}
          href="/accounting/bills"
          tone={apLate > 0 ? "risk" : "default"}
        />
        <MetricPanel
          label="At risk · JP ↔ Acumatica"
          value={formatCurrency(data.reconciliation.dollarsAtRisk)}
          context={`${data.reconciliation.duplicateCount} duplicate bills · ${data.reconciliation.onHoldCount} on hold`}
          href="/accounting/reconciliation"
          tone={data.reconciliation.dollarsAtRisk > 0 ? "risk" : "default"}
        />
      </section>

      <Section title="Financial Position">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
          <div className="grid gap-4 lg:grid-cols-2">
            <AgingBarChart
              title="Accounts Receivable aging"
              aging={arAging}
              href="/accounting/invoices"
            />
            <AgingBarChart
              title="Accounts Payable aging"
              aging={apAging}
              href="/accounting/bills"
            />
          </div>
          <CashFlowPanel cashPosition={cashPosition} />
        </div>
      </Section>

      <Section title="Retainage owed to subcontractors">
        <RetainageSection retainage={data.retainage} />
      </Section>

      <Section title="Net Margin by Project">
        <ProjectNetMarginChart projects={netMarginByProject} />
      </Section>

      <Section title="Revenue and Net Margin">
        <MonthlyRevenueMarginChart series={monthlyRevenueMargin} />
      </Section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <Section
          title="Revenue by Project"
          action={<TextLink href="/accounting/projects">All projects</TextLink>}
        >
          <RevenueRows projects={revenueByProject} />
        </Section>

        <Section title="Reports">
          <ReportList data={data} />
        </Section>
      </div>

      <Section title="Recent Activity">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <p className="text-xs font-semibold text-muted-foreground">
                Payments Received
              </p>
              <TextLink href="/accounting/payments">All payments</TextLink>
            </div>
            {paymentsIn.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                No recent payments.
              </p>
            ) : (
              <div className="divide-y divide-border/40">
                {paymentsIn.map((item) => (
                  <ActivityRow
                    key={item.referenceNbr}
                    {...item}
                    type="payment"
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <p className="text-xs font-semibold text-muted-foreground">
                Checks Issued
              </p>
              <TextLink href="/accounting/checks">All checks</TextLink>
            </div>
            {checksOut.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                No recent checks.
              </p>
            ) : (
              <div className="divide-y divide-border/40">
                {checksOut.map((item) => (
                  <ActivityRow key={item.referenceNbr} {...item} type="check" />
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {guardrailAlerts.length > 0 && (
        <Section title="Payment Guardrails">
          <PaymentGuardrailAlerts
            alerts={guardrailAlerts}
            title="Duplicate Payment Patterns"
          />
        </Section>
      )}

      <Section title="Ledger Totals">
        <KpiRow
          size="small"
          metrics={[
            {
              label: "AR OUTSTANDING",
              value: formatCurrency(cashPosition.totalArOutstanding),
              context: "Receivables",
              href: "/accounting/invoices",
            },
            {
              label: "AP OUTSTANDING",
              value: formatCurrency(cashPosition.totalApOutstanding),
              context: "Payables",
              href: "/accounting/bills",
            },
            {
              label: "RECEIVED THIS MONTH",
              value: formatCurrency(cashPosition.paymentsReceivedThisMonth),
              context: "Customer payments",
              href: "/accounting/payments",
            },
            {
              label: "PAID THIS MONTH",
              value: formatCurrency(cashPosition.checksIssuedThisMonth),
              context: "Vendor checks",
              href: "/accounting/checks",
            },
          ]}
        />
      </Section>
    </PageShell>
  );
}
