import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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

interface CashPositionSummary {
  totalArOutstanding: number;
  totalApOutstanding: number;
  netCashPosition: number;
  paymentsReceivedThisMonth: number;
  checksIssuedThisMonth: number;
}

interface RevenueByProject {
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
  cashPosition: CashPositionSummary;
  revenueByProject: RevenueByProject[];
  arByProject: RevenueByProject[];
  recentActivity: {
    payments: RecentPayment[];
    checks: RecentCheck[];
  };
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CLOSED_STATUSES = ["Closed", "Voided"];

function getDaysPastDue(dueDateStr: string | null): number {
  if (!dueDateStr) return 0; // treat null due_date as current
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - dueDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function classifyIntoAging(items: Array<{ due_date: string | null; balance: number | null }>): AgingResult {
  const buckets = {
    current:  { label: "Current (0–30 days)",  count: 0, total: 0 },
    days31to60: { label: "31–60 days",          count: 0, total: 0 },
    days61to90: { label: "61–90 days",          count: 0, total: 0 },
    days90plus: { label: "90+ days",            count: 0, total: 0 },
  };

  for (const item of items) {
    const days = getDaysPastDue(item.due_date);
    const amount = Number(item.balance ?? 0);

    if (days <= 30) {
      buckets.current.count++;
      buckets.current.total += amount;
    } else if (days <= 60) {
      buckets.days31to60.count++;
      buckets.days31to60.total += amount;
    } else if (days <= 90) {
      buckets.days61to90.count++;
      buckets.days61to90.total += amount;
    } else {
      buckets.days90plus.count++;
      buckets.days90plus.total += amount;
    }
  }

  const totalOutstanding =
    buckets.current.total +
    buckets.days31to60.total +
    buckets.days61to90.total +
    buckets.days90plus.total;

  // Round totals to 2 decimal places for cleanliness
  for (const b of Object.values(buckets)) {
    b.total = Math.round(b.total * 100) / 100;
  }

  return { ...buckets, totalOutstanding: Math.round(totalOutstanding * 100) / 100 };
}

function startOfCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

// ---------------------------------------------------------------------------
// GET /api/accounting/dashboard
// ---------------------------------------------------------------------------

export const GET = withApiGuardrails("/api/accounting/dashboard#GET", async () => {
  // Auth check
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/accounting/dashboard#GET",
      message: "Unauthorized accounting dashboard request.",
      status: 401,
      severity: "medium",
    });
  }

  const supabase = createServiceClient();
  const monthStart = startOfCurrentMonth();

  // Run all independent queries in parallel for performance
  const [
    arInvoicesResult,
    apBillsResult,
    paymentsThisMonthResult,
    checksThisMonthResult,
    arInvoicesForProjectsResult,
    paymentApplicationsResult,
    recentPaymentsResult,
    recentChecksResult,
  ] = await Promise.all([
    // 1. AR invoices — outstanding only, for aging + cash position
    supabase
      .from("acumatica_ar_invoices")
      .select("due_date, balance, status")
      .not("status", "in", `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(",")})`)
      .not("balance", "is", null),

    // 2. AP bills — outstanding only, for aging + cash position
    supabase
      .from("acumatica_ap_bills")
      .select("due_date, balance, status")
      .not("status", "in", `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(",")})`)
      .not("balance", "is", null),

    // 3. Payments received this month
    supabase
      .from("acumatica_payments")
      .select("payment_amount")
      .gte("application_date", monthStart),

    // 4. Checks issued this month
    supabase
      .from("acumatica_checks")
      .select("payment_amount")
      .gte("application_date", monthStart),

    // 5. All AR invoices with project code for revenue grouping
    supabase
      .from("acumatica_ar_invoices")
      .select("project, customer_name, amount, balance, status"),

    // 6. Payment applications for collected amounts per project
    supabase
      .from("acumatica_payment_applications")
      .select("resolved_project_code, amount_applied"),

    // 7. Recent 10 payments received
    supabase
      .from("acumatica_payments")
      .select("reference_nbr, customer_id, customer_name, payment_amount, application_date, status")
      .order("application_date", { ascending: false })
      .limit(10),

    // 8. Recent 10 checks issued (exclude null dates so we get real recent ones)
    supabase
      .from("acumatica_checks")
      .select("reference_nbr, vendor_id, vendor_name, payment_amount, application_date, status")
      .not("application_date", "is", null)
      .order("application_date", { ascending: false })
      .limit(10),
  ]);

  // Surface any query errors
  const errors = [
    arInvoicesResult.error,
    apBillsResult.error,
    paymentsThisMonthResult.error,
    checksThisMonthResult.error,
    arInvoicesForProjectsResult.error,
    paymentApplicationsResult.error,
    recentPaymentsResult.error,
    recentChecksResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/accounting/dashboard#GET",
      message: "Failed to load accounting dashboard data.",
      details: { reasons: errors.map((error) => error?.message).filter(Boolean) },
    });
  }

  // ---------------------------------------------------------------------------
  // 1 & 2. AR and AP Aging
  // ---------------------------------------------------------------------------
  const arAging = classifyIntoAging(arInvoicesResult.data ?? []);
  const apAging = classifyIntoAging(apBillsResult.data ?? []);

  // ---------------------------------------------------------------------------
  // 3. Cash Position
  // ---------------------------------------------------------------------------
  const paymentsReceivedThisMonth = (paymentsThisMonthResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.payment_amount ?? 0),
    0,
  );

  const checksIssuedThisMonth = (checksThisMonthResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.payment_amount ?? 0),
    0,
  );

  const cashPosition: CashPositionSummary = {
    totalArOutstanding: arAging.totalOutstanding,
    totalApOutstanding: apAging.totalOutstanding,
    netCashPosition: Math.round((arAging.totalOutstanding - apAging.totalOutstanding) * 100) / 100,
    paymentsReceivedThisMonth: Math.round(paymentsReceivedThisMonth * 100) / 100,
    checksIssuedThisMonth: Math.round(checksIssuedThisMonth * 100) / 100,
  };

  // ---------------------------------------------------------------------------
  // 4. Revenue by Project (top 15)
  // ---------------------------------------------------------------------------

  // Group invoices by project code
  const invoicesByProject = new Map<
    string,
    { customer: string | null; totalInvoiced: number; totalBalance: number }
  >();

  for (const inv of arInvoicesForProjectsResult.data ?? []) {
    const code = inv.project ?? "(No Project)";
    const existing = invoicesByProject.get(code);
    const amount = Number(inv.amount ?? 0);
    const balance = Number(inv.balance ?? 0);

    if (existing) {
      existing.totalInvoiced += amount;
      existing.totalBalance += CLOSED_STATUSES.includes(inv.status ?? "") ? 0 : balance;
    } else {
      invoicesByProject.set(code, {
        customer: inv.customer_name ?? null,
        totalInvoiced: amount,
        totalBalance: CLOSED_STATUSES.includes(inv.status ?? "") ? 0 : balance,
      });
    }
  }

  // Sum collected amounts from payment applications per project
  const collectedByProject = new Map<string, number>();
  for (const pa of paymentApplicationsResult.data ?? []) {
    const code = pa.resolved_project_code ?? "(No Project)";
    collectedByProject.set(code, (collectedByProject.get(code) ?? 0) + Number(pa.amount_applied ?? 0));
  }

  // Fetch ALL project descriptions (small table — only ~80 rows)
  const projectDescriptionsResult = await supabase
    .from("acumatica_projects")
    .select("project_id, description, customer");

  if (projectDescriptionsResult.error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/accounting/dashboard#GET",
      message: "Failed to load project descriptions for accounting dashboard.",
      details: { reason: projectDescriptionsResult.error.message },
      cause: projectDescriptionsResult.error,
    });
  }

  const projectDescMap = new Map<string, { description: string | null; customer: string | null }>();
  for (const proj of projectDescriptionsResult.data ?? []) {
    projectDescMap.set(proj.project_id, {
      description: proj.description ?? null,
      customer: proj.customer ?? null,
    });
  }

  // Build full list for chart (all projects with outstanding balance) + top 15 by invoiced for table
  const allProjectEntries = [...invoicesByProject.entries()].map(([code, inv]) => {
    const projMeta = projectDescMap.get(code);
    const collected = collectedByProject.get(code) ?? 0;
    return {
      projectCode: code,
      description: projMeta?.description ?? null,
      customer: projMeta?.customer ?? inv.customer ?? null,
      totalInvoiced: Math.round(inv.totalInvoiced * 100) / 100,
      totalCollected: Math.round(collected * 100) / 100,
      outstandingBalance: Math.round(inv.totalBalance * 100) / 100,
    };
  });

  const revenueByProject: RevenueByProject[] = allProjectEntries
    .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
    .slice(0, 15);

  // ---------------------------------------------------------------------------
  // 5. Recent Activity
  // ---------------------------------------------------------------------------
  const recentPayments: RecentPayment[] = (recentPaymentsResult.data ?? []).map((p) => ({
    referenceNbr: p.reference_nbr,
    customerName: p.customer_name ?? p.customer_id ?? null,
    amount: Math.round(Number(p.payment_amount ?? 0) * 100) / 100,
    date: p.application_date ?? null,
    status: p.status ?? null,
  }));

  const recentChecks: RecentCheck[] = (recentChecksResult.data ?? []).map((c) => ({
    referenceNbr: c.reference_nbr,
    vendorId: c.vendor_id ?? null,
    vendorName: c.vendor_name ?? null,
    amount: Math.round(Number(c.payment_amount ?? 0) * 100) / 100,
    date: c.application_date ?? null,
    status: c.status ?? null,
  }));

  // ---------------------------------------------------------------------------
  // Response
  // ---------------------------------------------------------------------------
  // All projects with outstanding balance, sorted by outstanding desc — for bar chart
  const arByProject = allProjectEntries
    .filter((p) => p.outstandingBalance > 0)
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance);

  const response: DashboardResponse = {
    arAging,
    apAging,
    cashPosition,
    revenueByProject,
    arByProject,
    recentActivity: {
      payments: recentPayments,
      checks: recentChecks,
    },
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    headers: {
      // Allow CDN/edge caching for 60 seconds; revalidate in background for up to 5 minutes
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
});
