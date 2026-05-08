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
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  ExternalLink,
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
// Aging bar chart (inline — no card wrapper)
// ---------------------------------------------------------------------------

function AgingSection({
  title,
  buckets,
  icon,
  href,
  iconColorClass,
}: {
  title: string;
  buckets: Array<{ label: string; count: number; amount: number }>;
  icon: React.ReactNode;
  href?: string;
  iconColorClass?: string;
}) {
  const maxAmount = Math.max(...buckets.map((b) => b.amount), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex items-center gap-2 text-sm font-semibold",
            iconColorClass ?? "text-foreground",
          )}
        >
          {icon}
          {title}
        </div>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{bucket.label}</span>
              <span className="tabular-nums font-medium text-foreground">
                {formatCurrencyFull(bucket.amount)}
                <span className="ml-1.5 text-muted-foreground font-normal">
                  ({bucket.count})
                </span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  bucket.label === "Current"
                    ? "bg-primary/50"
                    : bucket.label === "31–60 Days"
                      ? "bg-amber-400"
                      : bucket.label === "61–90 Days"
                        ? "bg-orange-500"
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
// AR by project horizontal bar chart
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
                const d = payload[0].payload;
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
// Revenue table
// ---------------------------------------------------------------------------

function RevenueTable({ projects }: { projects: ProjectRevenue[] }) {
  if (projects.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No project data available</p>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs min-w-max">
        <thead>
          <tr className="border-b border-border/50">
            <th className="pb-2 pt-0 text-left font-medium text-muted-foreground pr-4">
              Project
            </th>
            <th className="pb-2 pt-0 text-left font-medium text-muted-foreground pr-4">
              Customer
            </th>
            <th className="pb-2 pt-0 text-right font-medium text-muted-foreground pr-4">
              Invoiced
            </th>
            <th className="pb-2 pt-0 text-right font-medium text-muted-foreground pr-4">
              Collected
            </th>
            <th className="pb-2 pt-0 text-right font-medium text-muted-foreground">
              Outstanding
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr
              key={p.projectCode}
              className="border-b border-border/30 hover:bg-muted/30 transition-colors"
            >
              <td className="py-2 pr-4">
                <div className="font-medium text-foreground">{p.projectCode}</div>
                {p.description && (
                  <div className="text-muted-foreground truncate max-w-48">
                    {p.description}
                  </div>
                )}
              </td>
              <td className="py-2 pr-4 text-muted-foreground">
                {p.customer ?? "—"}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums font-medium text-foreground">
                {formatCurrencyFull(p.totalInvoiced)}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums text-status-success">
                {formatCurrencyFull(p.totalCollected)}
              </td>
              <td className="py-2 text-right tabular-nums">
                <span
                  className={cn(
                    p.outstandingBalance > 0
                      ? "text-status-warning"
                      : "text-muted-foreground",
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
// Section wrapper — no border/card, just spacing + label
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
            meta={`Synced from Acumatica`}
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

      {/* ── Aging analysis — side by side ── */}
      <Section title="Aging Analysis">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AgingSection
            title="Accounts Receivable"
            buckets={agingToArray(arAging)}
            icon={<TrendingUp className="h-4 w-4" />}
            href="/accounting/invoices"
            iconColorClass="text-emerald-600"
          />
          <div className="md:border-l md:border-border/40 md:pl-8">
            <AgingSection
              title="Accounts Payable"
              buckets={agingToArray(apAging)}
              icon={<TrendingDown className="h-4 w-4" />}
              href="/accounting/bills"
              iconColorClass="text-blue-600"
            />
          </div>
        </div>
      </Section>

      {/* ── Revenue by Project ── */}
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
        <RevenueTable projects={revenueByProject} />
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
