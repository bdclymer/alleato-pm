"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout";
import { KpiRow } from "@/components/ds";
import { PaymentGuardrailAlerts } from "@/components/accounting/payment-guardrail-alerts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  ClipboardList,
  ScrollText,
  FolderKanban,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import type { FinancialGuardrailAlert } from "@/lib/accounting/aging-calculator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface DashboardResponse {
  arAging: AgingResult;
  apAging: AgingResult;
  cashPosition: CashPosition;
  revenueByProject: ProjectRevenue[];
  arByProject: ProjectRevenue[];
  recentActivity: {
    payments: RecentPayment[];
    checks: RecentCheck[];
  };
  guardrailAlerts: FinancialGuardrailAlert[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatCurrencyFull(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function agingToArray(
  aging: AgingResult,
): Array<{ label: string; count: number; amount: number }> {
  return [
    { label: "Current", count: aging.current.count, amount: aging.current.total },
    { label: "31–60 Days", count: aging.days31to60.count, amount: aging.days31to60.total },
    { label: "61–90 Days", count: aging.days61to90.count, amount: aging.days61to90.total },
    { label: "90+ Days", count: aging.days90plus.count, amount: aging.days90plus.total },
  ];
}

// ---------------------------------------------------------------------------
// Aging Donut Chart
// ---------------------------------------------------------------------------

const AGING_COLORS = [
  "hsl(var(--primary) / 0.65)",
  "#F59E0B",
  "#F97316",
  "hsl(var(--destructive))",
];

function AgingDonutChart({
  title,
  aging,
  href,
}: {
  title: string;
  aging: AgingResult;
  href?: string;
}) {
  const buckets = agingToArray(aging);
  const chartData = buckets.map((b) => ({
    name: b.label,
    value: b.amount,
    count: b.count,
  }));
  const total = aging.totalOutstanding;
  const overdueAmount =
    aging.days31to60.total + aging.days61to90.total + aging.days90plus.total;
  const overduePercent =
    total > 0 ? Math.round((overdueAmount / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={76}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={AGING_COLORS[index]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as {
                  name: string;
                  value: number;
                  count: number;
                };
                return (
                  <div className="rounded-lg bg-popover border border-border/50 px-3 py-2 shadow-sm text-xs space-y-1">
                    <div className="font-semibold text-foreground">{d.name}</div>
                    <div className="tabular-nums text-foreground">
                      {formatCurrencyFull(d.value)}
                    </div>
                    <div className="text-muted-foreground">{d.count} invoices</div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold tabular-nums text-foreground">
            {formatCurrency(total)}
          </span>
          {overduePercent > 0 && (
            <span className="text-[10px] font-medium text-destructive">
              {overduePercent}% overdue
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {buckets.map((bucket, index) => (
          <div key={bucket.label} className="flex items-center gap-1.5 text-[10px] min-w-0">
            <div
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ background: AGING_COLORS[index] }}
            />
            <span className="text-muted-foreground truncate">{bucket.label}</span>
            <span className="ml-auto tabular-nums font-medium text-foreground">
              {formatCurrency(bucket.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cash Flow Bar — received vs paid this month
// ---------------------------------------------------------------------------

function CashFlowBar({
  received,
  paid,
}: {
  received: number;
  paid: number;
}) {
  const data = [
    { name: "Received", value: received },
    { name: "Paid Out", value: paid },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-foreground">Cash Flow — This Month</p>
      <ResponsiveContainer width="100%" height={164}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
          barCategoryGap="35%"
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            className="stroke-border/30"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg bg-popover border border-border/50 px-3 py-2 shadow-sm text-xs space-y-1">
                  <div className="font-medium text-foreground">
                    {payload[0]?.payload?.name as string}
                  </div>
                  <div className="tabular-nums font-semibold text-foreground">
                    {formatCurrencyFull(payload[0]?.value as number)}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={52}>
            <Cell fill="#10B981" />
            <Cell fill="hsl(var(--primary) / 0.7)" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-sm bg-status-success" />
          <span className="text-muted-foreground">Received</span>
          <span className="tabular-nums font-semibold text-foreground ml-1">
            {formatCurrency(received)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-sm bg-primary/70" />
          <span className="text-muted-foreground">Paid Out</span>
          <span className="tabular-nums font-semibold text-foreground ml-1">
            {formatCurrency(paid)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity feed row
// ---------------------------------------------------------------------------

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
    <div className="flex items-center justify-between py-2 text-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
            type === "payment"
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-blue-500/10 text-blue-600",
          )}
        >
          {type === "payment" ? (
            <ArrowDownRight className="h-3 w-3" />
          ) : (
            <ArrowUpRight className="h-3 w-3" />
          )}
        </div>
        <div className="min-w-0">
          <span className="font-medium text-foreground">#{referenceNbr}</span>
          {label && (
            <span className="ml-1.5 text-muted-foreground truncate">
              {label}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-2">
        <span className="text-muted-foreground">{formatDate(date)}</span>
        <span className="tabular-nums font-medium text-foreground">
          {formatCurrencyFull(amount)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AR by Project horizontal bar chart
// ---------------------------------------------------------------------------

const BAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.8)",
  "hsl(var(--primary) / 0.65)",
  "hsl(var(--primary) / 0.5)",
  "hsl(var(--primary) / 0.38)",
  "hsl(var(--primary) / 0.28)",
];

function ArByProjectChart({ projects }: { projects: ProjectRevenue[] }) {
  const chartData = projects.slice(0, 12).map((p) => ({
    name: p.description
      ? `${p.projectCode} · ${p.description}`.slice(0, 30)
      : p.projectCode,
    outstanding: p.outstandingBalance,
    fullName: p.description ?? p.projectCode,
    customer: p.customer,
  }));

  if (chartData.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No outstanding AR by project</p>
    );
  }

  const total = projects.reduce((sum, d) => sum + d.outstandingBalance, 0);
  const barHeight = Math.max(chartData.length * 24, 80);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">
            AR Outstanding by Project
          </p>
          <p className="text-xs text-muted-foreground">
            {formatCurrencyFull(total)} across {projects.length} projects
          </p>
        </div>
        <Link
          href="/accounting/invoices?balance=positive"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div style={{ height: barHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            barCategoryGap={4}
          >
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              className="stroke-border/30"
            />
            <XAxis
              type="number"
              tickFormatter={(v: number) => formatCurrency(v)}
              tick={{ fontSize: 10 }}
              className="fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={170}
              tick={{ fontSize: 10 }}
              className="fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as {
                  fullName: string;
                  customer: string | null;
                  outstanding: number;
                };
                return (
                  <div className="rounded-lg bg-popover border border-border/50 px-3 py-2 shadow-sm text-xs space-y-1">
                    <div className="font-medium text-foreground">{d.fullName}</div>
                    {d.customer && (
                      <div className="text-muted-foreground">{d.customer}</div>
                    )}
                    <div className="font-semibold tabular-nums text-foreground">
                      {formatCurrencyFull(d.outstanding)}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="outstanding" radius={[0, 3, 3, 0]} maxBarSize={14}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revenue Bar Chart — grouped bars per project (replaces table)
// ---------------------------------------------------------------------------

const REVENUE_COLORS = {
  invoiced: "hsl(var(--primary) / 0.75)",
  collected: "#10B981",
  outstanding: "#F59E0B",
};

function RevenueBarChart({ projects }: { projects: ProjectRevenue[] }) {
  if (projects.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No project data available</p>
    );
  }

  const data = projects.slice(0, 10).map((p) => ({
    name: p.projectCode,
    fullName: p.description ?? p.projectCode,
    customer: p.customer,
    invoiced: p.totalInvoiced,
    collected: p.totalCollected,
    outstanding: p.outstandingBalance,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-5">
        {(["invoiced", "collected", "outstanding"] as const).map((key) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <div
              className="h-2 w-2 rounded-sm"
              style={{ background: REVENUE_COLORS[key] }}
            />
            <span className="text-muted-foreground capitalize">{key}</span>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 32, left: 0 }}
          barCategoryGap="28%"
          barGap={2}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            className="stroke-border/30"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload as {
                fullName: string;
                customer: string | null;
                invoiced: number;
                collected: number;
                outstanding: number;
              };
              return (
                <div className="rounded-lg bg-popover border border-border/50 px-3 py-2 shadow-sm text-xs space-y-1.5">
                  <div className="font-semibold text-foreground">{d.fullName}</div>
                  {d.customer && (
                    <div className="text-muted-foreground">{d.customer}</div>
                  )}
                  {payload.map((p) => (
                    <div
                      key={p.dataKey as string}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-2 w-2 rounded-sm"
                          style={{ background: p.color }}
                        />
                        <span className="text-muted-foreground capitalize">
                          {p.name}
                        </span>
                      </div>
                      <span className="tabular-nums font-medium text-foreground">
                        {formatCurrencyFull(p.value as number)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Bar
            dataKey="invoiced"
            name="Invoiced"
            fill={REVENUE_COLORS.invoiced}
            radius={[3, 3, 0, 0]}
            maxBarSize={10}
          />
          <Bar
            dataKey="collected"
            name="Collected"
            fill={REVENUE_COLORS.collected}
            radius={[3, 3, 0, 0]}
            maxBarSize={10}
          />
          <Bar
            dataKey="outstanding"
            name="Outstanding"
            fill={REVENUE_COLORS.outstanding}
            radius={[3, 3, 0, 0]}
            maxBarSize={10}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Featured Report Card
// ---------------------------------------------------------------------------

function ReportCard({
  href,
  icon,
  title,
  description,
  meta,
  accentClass,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  meta?: string;
  accentClass: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl p-5 transition-all duration-200 hover:bg-muted/40 hover:-translate-y-px active:translate-y-0 border border-transparent hover:border-border/50"
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          accentClass,
        )}
      >
        {icon}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
        {meta && (
          <p className="text-[11px] text-muted-foreground/70 font-medium pt-1">
            {meta}
          </p>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title ?? action) && (
        <div className="flex items-center justify-between">
          {title && (
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AccountingDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFetch<DashboardResponse>("/api/accounting/dashboard");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
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
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [fetchDashboard]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <PageShell variant="dashboard" title="Accounting">
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading accounting data…
          </span>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell variant="dashboard" title="Accounting">
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <AlertTriangle className="h-7 w-7 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchDashboard}>
            Retry
          </Button>
        </div>
      </PageShell>
    );
  }

  if (!data) return null;

  const {
    cashPosition,
    arAging,
    apAging,
    revenueByProject,
    arByProject,
    recentActivity,
    guardrailAlerts,
  } = data;

  const paymentsIn = recentActivity.payments.slice(0, 6).map((p) => ({
    referenceNbr: p.referenceNbr,
    label: p.customerName,
    amount: p.amount,
    date: p.date,
  }));
  const checksOut = recentActivity.checks.slice(0, 6).map((c) => ({
    referenceNbr: c.referenceNbr,
    label: c.vendorName ?? c.vendorId,
    amount: c.amount,
    date: c.date,
  }));

  return (
    <PageShell
      variant="dashboard"
      title="Accounting"
      actions={
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-xs text-muted-foreground">
            {new Date(data.generatedAt).toLocaleString()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSync}
            disabled={syncing}
            title={syncing ? "Syncing…" : "Sync from Acumatica"}
            className="h-8 w-8"
          >
            <RefreshCw
              className={cn("h-4 w-4", syncing && "animate-spin")}
            />
          </Button>
        </div>
      }
    >
      {/* ── KPI row ── */}
      <KpiRow
        metrics={[
          {
            label: "AR OUTSTANDING",
            value: formatCurrency(cashPosition.totalArOutstanding),
            context: "Receivables from customers",
            href: "/accounting/invoices",
          },
          {
            label: "AP OUTSTANDING",
            value: formatCurrency(cashPosition.totalApOutstanding),
            context: "Payables to vendors",
            href: "/accounting/bills",
          },
          {
            label: "NET POSITION",
            value: formatCurrency(cashPosition.netCashPosition),
            delta: {
              value: formatCurrency(Math.abs(cashPosition.netCashPosition)),
              positive: cashPosition.netCashPosition >= 0,
            },
          },
          {
            label: "RECEIVED THIS MONTH",
            value: formatCurrency(cashPosition.paymentsReceivedThisMonth),
            context: `${formatCurrency(cashPosition.checksIssuedThisMonth)} paid out`,
            href: "/accounting/payments",
          },
        ]}
      />

      {/* ── Featured Reports ── */}
      <Section title="Reports">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <ReportCard
            href="/accounting/wip"
            icon={<ClipboardList className="h-5 w-5 text-primary" />}
            title="WIP Report"
            description="Contract value, earned revenue, billing position, and forecast margin across all active projects."
            meta={`${arByProject.length} projects in scope`}
            accentClass="bg-primary/10"
          />
          <ReportCard
            href="/accounting/projects"
            icon={<ScrollText className="h-5 w-5 text-primary" />}
            title="Project Status Reports"
            description="Per-project PSR with schedule, budget, RFIs, submittals, and change orders in a single view."
            accentClass="bg-primary/10"
          />
          <ReportCard
            href="/accounting/projects"
            icon={<FolderKanban className="h-5 w-5 text-status-warning" />}
            title="Projects"
            description="All Acumatica projects with income, expenses, assets, and current status."
            meta="Synced from Acumatica"
            accentClass="bg-amber-500/10"
          />
        </div>
      </Section>

      {/* ── AR Outstanding by Project ── */}
      <Section
        title="AR by Project"
        action={
          <Link
            href="/accounting/invoices"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            All invoices <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <ArByProjectChart projects={arByProject} />
      </Section>

      {/* ── Financial Position — 3 charts: AR aging | cash flow | AP aging ── */}
      <Section title="Financial Position">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AgingDonutChart
            title="Accounts Receivable"
            aging={arAging}
            href="/accounting/invoices"
          />
          <CashFlowBar
            received={cashPosition.paymentsReceivedThisMonth}
            paid={cashPosition.checksIssuedThisMonth}
          />
          <AgingDonutChart
            title="Accounts Payable"
            aging={apAging}
            href="/accounting/bills"
          />
        </div>
      </Section>

      {/* ── Revenue by Project — grouped bar chart ── */}
      <Section
        title="Revenue by Project"
        action={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[11px] font-normal">
              Top {revenueByProject.length}
            </Badge>
            <Link
              href="/accounting/projects"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              All projects <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        }
      >
        <RevenueBarChart projects={revenueByProject} />
      </Section>

      {/* ── Recent Activity ── */}
      <Section title="Recent Activity">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground">
                Payments Received
              </p>
              <Link
                href="/accounting/payments"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {paymentsIn.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent activity</p>
            ) : (
              <div className="divide-y divide-border/40">
                {paymentsIn.map((item) => (
                  <ActivityRow key={item.referenceNbr} {...item} type="payment" />
                ))}
              </div>
            )}
          </div>

          <div className="md:border-l md:border-border/40 md:pl-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground">
                Checks Issued
              </p>
              <Link
                href="/accounting/checks"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {checksOut.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent activity</p>
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

      {/* ── Guardrail alerts ── */}
      {guardrailAlerts.length > 0 && (
        <Section>
          <PaymentGuardrailAlerts alerts={guardrailAlerts} />
        </Section>
      )}
    </PageShell>
  );
}
