import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const GET = withApiGuardrails<{ projectId: string; estimateId: string }>(
  "projects/[projectId]/estimates/[estimateId]/detail-items#GET",
  async ({ params }) => {
    const { estimateId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "detail-items#GET", message: "Authentication required." });
    }

    const estimateIdNum = parseInt(estimateId, 10);
    if (isNaN(estimateIdNum)) {
      return NextResponse.json({ error: "Invalid estimate ID" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("estimate_detail_items")
      .select("*")
      .eq("estimate_id", estimateIdNum)
      .order("division_code", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  }
);

export const POST = withApiGuardrails<{ projectId: string; estimateId: string }>(
  "projects/[projectId]/estimates/[estimateId]/detail-items#POST",
  async ({ request, params }) => {
    const { estimateId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "detail-items#POST", message: "Authentication required." });
    }

    const estimateIdNum = parseInt(estimateId, 10);
    if (isNaN(estimateIdNum)) {
      return NextResponse.json({ error: "Invalid estimate ID" }, { status: 400 });
    }

    const body = await request.json();
    const {
      division_code,
      division_name,
      cost_code,
      cost_type,
      cost_code_name,
      work_description,
      estimated_amount,
      sub_name,
      sort_order,
    } = body;

    const { data, error } = await supabase
      .from("estimate_detail_items")
      .insert({
        estimate_id: estimateIdNum,
        division_code: division_code ?? "02",
        division_name: division_name ?? "",
        cost_code: cost_code ?? null,
        cost_type: cost_type ?? null,
        cost_code_name: cost_code_name ?? null,
        work_description: work_description ?? null,
        estimated_amount: estimated_amount ?? 0,
        sub_name: sub_name ?? null,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  }
);
