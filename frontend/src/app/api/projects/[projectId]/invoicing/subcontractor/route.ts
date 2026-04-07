import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId } = await context.params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectIdNum = parseInt(projectId, 10);

    const { data, error } = await supabase
      .from("subcontracts_with_totals")
      .select(
        "id, contract_number, title, status, company_name, total_sov_amount, total_billed_to_date, total_amount_remaining, default_retainage_percent, contract_date, created_at",
      )
      .eq("project_id", projectIdNum)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (data ?? []).map((s) => ({
      id: s.id,
      contract_number: s.contract_number,
      title: s.title,
      status: s.status,
      company_name: s.company_name,
      total_contract_amount: s.total_sov_amount ?? 0,
      total_billed_to_date: s.total_billed_to_date ?? 0,
      percent_billed:
        s.total_sov_amount && s.total_sov_amount > 0
          ? Math.round(((s.total_billed_to_date ?? 0) / s.total_sov_amount) * 100)
          : 0,
      contract_date: s.contract_date,
      created_at: s.created_at,
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
