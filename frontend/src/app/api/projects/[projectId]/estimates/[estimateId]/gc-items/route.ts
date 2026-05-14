import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const GET = withApiGuardrails<{ projectId: string; estimateId: string }>(
  "projects/[projectId]/estimates/[estimateId]/gc-items#GET",
  async ({ params }) => {
    const { estimateId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "gc-items#GET", message: "Authentication required." });
    }

    const estimateIdNum = parseInt(estimateId, 10);
    if (isNaN(estimateIdNum)) {
      return NextResponse.json({ error: "Invalid estimate ID" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("estimate_gc_items")
      .select("*")
      .eq("estimate_id", estimateIdNum)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  }
);

export const POST = withApiGuardrails<{ projectId: string; estimateId: string }>(
  "projects/[projectId]/estimates/[estimateId]/gc-items#POST",
  async ({ request, params }) => {
    const { estimateId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "gc-items#POST", message: "Authentication required." });
    }

    const estimateIdNum = parseInt(estimateId, 10);
    if (isNaN(estimateIdNum)) {
      return NextResponse.json({ error: "Invalid estimate ID" }, { status: 400 });
    }

    const body = await request.json();
    const {
      cost_code,
      description,
      cost_type,
      qty,
      qty_basis,
      unit,
      rate,
      allocation,
      sort_order,
    } = body;

    const { data, error } = await supabase
      .from("estimate_gc_items")
      .insert({
        estimate_id: estimateIdNum,
        cost_code: cost_code ?? "",
        description: description ?? "",
        cost_type: cost_type ?? "Expense",
        qty: qty ?? null,
        qty_basis: qty_basis ?? null,
        unit: unit ?? null,
        rate: rate ?? 0,
        allocation: allocation ?? 0,
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
