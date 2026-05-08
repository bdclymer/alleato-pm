"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout";
import { KpiRow } from "@/components/ds";
import { PaymentGuardrailAlerts } from "@/components/accounting/payment-guardrail-alerts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  FileText,
  Receipt,
  CreditCard,
  FolderKanban,
  ClipboardList,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import type { FinancialGuardrailAlert } from "@/lib/accounting/aging-calculator";

// ---------------------------------------------------------------------------
// Types — mirrors API response from /api/accounting/dashboard
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

function agingToArray(aging: AgingResult): Array<{ label: string; count: number; amount: number }> {
  return [
    { label: "Current", count: aging.current.count, amount: aging.current.total },
    { label: "31-60 Days", count: aging.days31to60.count, amount: aging.days31to60.total },
    { label: "61-90 Days", count: aging.days61to90.count, amount: aging.days61to90.total },
    { label: "90+ Days", count: aging.days90plus.count, amount: aging.days90plus.total },
  ];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AgingChart({
  title,
  buckets,
  icon,
  href,
}: {
  title: string;
  buckets: Array<{ label: string; count: number; amount: number }>;
  icon: React.ReactNode;
  href?: string;
}) {
  const maxAmount = Math.max(...buckets.map((b) => b.amount), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
        </div>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-xs text-primary hover:underline">
            View all <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{bucket.label}</span>
              <span className="font-medium text-foreground">
                {formatCurrencyFull(bucket.amount)}{" "}
                <span className="text-muted-foreground">
                  ({bucket.count})
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  bucket.label === "Current"
                    ? "bg-primary/60"
                    : bucket.label === "31-60 Days"
                      ? "bg-amber-400"
                      : bucket.label === "61-90 Days"
                        ? "bg-orange-400"
                        : "bg-destructive",
                )}
                style={{
                  width: `${Math.max(2, (bucket.amount / maxAmount) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentList({
  title,
  items,
  type,
  href,
}: {
  title: string;
  items: Array<{ referenceNbr: string; label: string | null; amount: number; date: string | null }>;
  type: "payment" | "check";
  href?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {href && (
            <Link href={href} className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
        <p className="text-xs text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-xs text-primary hover:underline">
            View all <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.referenceNbr}
            className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full",
                  type === "payment"
                    ? "bg-green-500/10 text-green-600"
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
                <span className="font-medium text-foreground">
                  #{item.referenceNbr}
                </span>
                {item.label && (
                  <span className="ml-1.5 text-muted-foreground truncate">
                    {item.label}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-muted-foreground">
                {formatDate(item.date)}
              </span>
              <span className="font-medium text-foreground tabular-nums">
                {formatCurrencyFull(item.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectTable({ projects }: { projects: ProjectRevenue[] }) {
  if (projects.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No project data available</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="pb-2 font-medium">Project</th>
            <th className="pb-2 font-medium">Customer</th>
            <th className="pb-2 text-right font-medium">Invoiced</th>
            <th className="pb-2 text-right font-medium">Collected</th>
            <th className="pb-2 text-right font-medium">Outstanding</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((p) => (
            <tr key={p.projectCode} className="hover:bg-muted/30">
              <td className="py-2 pr-3">
                <div className="font-medium text-foreground">
                  {p.projectCode}
                </div>
                {p.description && (
                  <div className="text-muted-foreground truncate max-w-48">
                    {p.description}
                  </div>
                )}
              </td>
              <td className="py-2 pr-3 text-muted-foreground">
                {p.customer ?? "—"}
              </td>
              <td className="py-2 text-right font-medium tabular-nums text-foreground">
                {formatCurrencyFull(p.totalInvoiced)}
              </td>
              <td className="py-2 text-right tabular-nums text-green-600">
                {formatCurrencyFull(p.totalCollected)}
              </td>
              <td className="py-2 text-right tabular-nums">
                <span
                  className={cn(
                    p.outstandingBalance > 0 ? "text-amber-600" : "text-muted-foreground",
                  )}
                >
                  {formatCurrencyFull(p.outstandingBalance)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AR by Project Bar Chart
// ---------------------------------------------------------------------------

const BAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.8)",
  "hsl(var(--primary) / 0.65)",
  "hsl(var(--primary) / 0.5)",
  "hsl(var(--primary) / 0.4)",
  "hsl(var(--primary) / 0.3)",
];

function ArByProjectChart({ projects }: { projects: ProjectRevenue[] }) {
  // Use all projects — already filtered & sorted by API
  const chartData = projects.slice(0, 15).map((p) => ({
    name: p.description
      ? `${p.projectCode} ${p.description}`.slice(0, 28)
      : p.projectCode,
    outstanding: p.outstandingBalance,
    project: p.projectCode,
    customer: p.customer,
    fullName: p.description ?? p.projectCode,
  }));

  if (chartData.length === 0) {
    return <p className="text-xs text-muted-foreground">No outstanding AR by project</p>;
  }

  const total = projects.reduce((sum, d) => sum + d.outstandingBalance, 0);
  const barHeight = Math.max(chartData.length * 22, 80);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">
          AR Outstanding by Project
          <span className="ml-2 font-normal text-muted-foreground">
            {formatCurrencyFull(total)} · {projects.length} projects
          </span>
        </h3>
        <Link
          href="/accounting/invoices?balance=positive"
          className="flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          View all <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>
      <div style={{ height: barHeight }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            barCategoryGap={2}
          >
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              className="stroke-border/40"
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
              width={160}
              tick={{ fontSize: 10 }}
              className="fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg bg-background border border-border/50 px-3 py-2 shadow-sm text-xs space-y-1">
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
            <Bar dataKey="outstanding" radius={[0, 3, 3, 0]} maxBarSize={16}>
              {chartData.map((_, index) => (
                <Cell
                  key={index}
                  fill={BAR_COLORS[index % BAR_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
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
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading accounting data...
          </span>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell variant="dashboard" title="Accounting">
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <AlertTriangle className="h-8 w-8 text-destructive" />
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

  return (
    <PageShell
      variant="dashboard"
      title="Accounting"
      actions={
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {new Date(data.generatedAt).toLocaleString()}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                View Tables
                <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/accounting/invoices" className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  AR Invoices
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/accounting/payments" className="flex items-center gap-2">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  AR Payments
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/accounting/bills" className="flex items-center gap-2">
                  <Receipt className="h-3.5 w-3.5" />
                  AP Bills
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/accounting/checks" className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5" />
                  AP Checks
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/accounting/projects" className="flex items-center gap-2">
                  <FolderKanban className="h-3.5 w-3.5" />
                  Projects
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/accounting/wip" className="flex items-center gap-2">
                  <ClipboardList className="h-3.5 w-3.5" />
                  WIP Report
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSync}
            disabled={syncing}
            title={syncing ? "Syncing..." : "Sync from Acumatica"}
            className="h-8 w-8"
          >
            <RefreshCw
              className={cn("h-4 w-4", syncing && "animate-spin")}
            />
          </Button>
        </div>
      }
    >
      {/* ── KPI Row ── */}
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

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            Accounting reports
          </h2>
        </div>
        <div className="divide-y divide-border rounded-md border border-border bg-background">
          <Link
            href="/accounting/wip"
            className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">
                  WIP Report
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  Contract value, earned revenue, billing position, and forecast margin by project
                </div>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Link>
        </div>
      </section>

      {/* ── AR by Project Chart ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <ArByProjectChart projects={arByProject} />
          </CardContent>
        </Card>
      </div>

      {/* ── Aging Charts ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <AgingChart
              title="Accounts Receivable Aging"
              buckets={agingToArray(arAging)}
              icon={<TrendingUp className="h-4 w-4 text-green-600" />}
              href="/accounting/invoices"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <AgingChart
              title="Accounts Payable Aging"
              buckets={agingToArray(apAging)}
              icon={<TrendingDown className="h-4 w-4 text-blue-600" />}
              href="/accounting/bills"
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Revenue by Project ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Revenue by Project
              <Badge variant="secondary" className="ml-2 text-xs font-normal">
                Top {revenueByProject.length}
              </Badge>
            </CardTitle>
            <Link href="/accounting/projects" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <ProjectTable projects={revenueByProject} />
        </CardContent>
      </Card>

      {/* ── Recent Activity ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <PaymentList
              title="Recent Payments Received"
              items={recentActivity.payments.map((p) => ({
                referenceNbr: p.referenceNbr,
                label: p.customerName,
                amount: p.amount,
                date: p.date,
              }))}
              type="payment"
              href="/accounting/payments"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <PaymentList
              title="Recent Checks Issued"
              items={recentActivity.checks.map((c) => ({
                referenceNbr: c.referenceNbr,
                label: c.vendorName ?? c.vendorId,
                amount: c.amount,
                date: c.date,
              }))}
              type="check"
              href="/accounting/checks"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <PaymentGuardrailAlerts alerts={guardrailAlerts} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
