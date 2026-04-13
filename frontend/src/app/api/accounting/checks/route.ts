import { NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const user = await getApiRouteUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("acumatica_checks")
    .select("id, external_key, reference_nbr, document_type, vendor_id, vendor_name, payment_ref, application_date, status, description, payment_method, cash_account, currency_id, payment_amount, last_modified_at, acumatica_sync_at")
    .order("application_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
