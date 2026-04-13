"use client";

import { useEffect, useState, useCallback } from "react";
import { PageShell } from "@/components/layout";
import { KpiRow } from "@/components/ds";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";

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
  recentActivity: {
    payments: RecentPayment[];
    checks: RecentCheck[];
  };
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
}: {
  title: string;
  buckets: Array<{ label: string; count: number; amount: number }>;
  icon: React.ReactNode;
}) {
  const maxAmount = Math.max(...buckets.map((b) => b.amount), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
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
}: {
  title: string;
  items: Array<{ referenceNbr: string; label: string | null; amount: number; date: string | null }>;
  type: "payment" | "check";
}) {
  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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

  const { cashPosition, arAging, apAging, revenueByProject, recentActivity } = data;

  return (
    <PageShell
      variant="dashboard"
      title="Accounting"
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {new Date(data.generatedAt).toLocaleString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw
              className={cn("mr-1.5 h-3.5 w-3.5", syncing && "animate-spin")}
            />
            {syncing ? "Syncing..." : "Sync Now"}
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
          },
          {
            label: "AP OUTSTANDING",
            value: formatCurrency(cashPosition.totalApOutstanding),
            context: "Payables to vendors",
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
          },
        ]}
      />

      {/* ── Aging Charts ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <AgingChart
              title="Accounts Receivable Aging"
              buckets={agingToArray(arAging)}
              icon={<TrendingUp className="h-4 w-4 text-green-600" />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <AgingChart
              title="Accounts Payable Aging"
              buckets={agingToArray(apAging)}
              icon={<TrendingDown className="h-4 w-4 text-blue-600" />}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Revenue by Project ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Revenue by Project
            <Badge variant="secondary" className="ml-2 text-xs font-normal">
              Top {revenueByProject.length}
            </Badge>
          </CardTitle>
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
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
