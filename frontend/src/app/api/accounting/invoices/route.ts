import { NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const user = await getApiRouteUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  // Fetch invoices, project descriptions, and payment applications in parallel
  const [invoicesResult, projectsResult, paymentsResult] = await Promise.all([
    supabase
      .from("acumatica_ar_invoices")
      .select(
        "id, external_key, reference_nbr, type, status, date, due_date, customer, customer_name, project, description, amount, balance, currency_id, last_modified_at, acumatica_sync_at",
      )
      .order("date", { ascending: false }),
    supabase
      .from("acumatica_projects")
      .select("project_id, description"),
    supabase
      .from("acumatica_payment_applications")
      .select("payment_reference_nbr, invoice_reference_nbr, amount_applied"),
  ]);

  if (invoicesResult.error) return NextResponse.json({ error: invoicesResult.error.message }, { status: 500 });

  // Build project description lookup
  const projectDescMap = new Map<string, string>();
  for (const p of projectsResult.data ?? []) {
    if (p.project_id && p.description) {
      projectDescMap.set(p.project_id, p.description);
    }
  }

  // Build payment lookup: invoice_reference_nbr → [{paymentRef, amount}]
  const paymentMap = new Map<string, Array<{ paymentRef: string; amount: number }>>();
  for (const pa of paymentsResult.data ?? []) {
    if (pa.invoice_reference_nbr && pa.payment_reference_nbr) {
      const key = pa.invoice_reference_nbr;
      if (!paymentMap.has(key)) paymentMap.set(key, []);
      paymentMap.get(key)!.push({
        paymentRef: pa.payment_reference_nbr,
        amount: pa.amount_applied ?? 0,
      });
    }
  }

  // Enrich invoices with project_description and linked_payments
  const enriched = (invoicesResult.data ?? []).map((inv) => ({
    ...inv,
    project_description: inv.project ? (projectDescMap.get(inv.project) ?? null) : null,
    linked_payments: paymentMap.get(inv.reference_nbr) ?? [],
  }));

  return NextResponse.json(enriched);
}
