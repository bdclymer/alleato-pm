import { NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const user = await getApiRouteUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("acumatica_projects")
    .select("id, external_key, project_id, description, status, customer, hold, income, expenses, assets, liabilities, template_id, external_ref_nbr, last_modified_at, acumatica_sync_at")
    .order("project_id", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
