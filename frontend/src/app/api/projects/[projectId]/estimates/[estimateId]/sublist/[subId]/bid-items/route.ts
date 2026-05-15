import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const WHERE = "projects/[projectId]/estimates/[estimateId]/sublist/[subId]/bid-items";
type Params = { projectId: string; estimateId: string; subId: string };

/**
 * GET /api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/bid-items
 * Returns all bid line items for a sub.
 */
export const GET = withApiGuardrails<Params>(WHERE + "#GET", async ({ params }) => {
  const { estimateId, subId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: WHERE, message: "Authentication required." });
  }

  const subIdNum = parseInt(subId, 10);
  const estimateIdNum = parseInt(estimateId, 10);
  if (isNaN(subIdNum) || isNaN(estimateIdNum)) {
    throw new GuardrailError({ code: "INVALID_PAYLOAD", where: WHERE, message: "Invalid sub or estimate ID." });
  }

  // Verify sub belongs to this estimate
  const { data: sub, error: subError } = await supabase
    .from("estimate_sublist_subs")
    .select("id")
    .eq("id", subIdNum)
    .eq("estimate_id", estimateIdNum)
    .single();

  if (subError || !sub) {
    throw new GuardrailError({ code: "NOT_FOUND", where: WHERE, message: "Sub not found in this estimate." });
  }

  const { data, error } = await supabase
    .from("estimate_sublist_bid_items")
    .select("*")
    .eq("sub_id", subIdNum)
    .order("created_at", { ascending: true });

  if (error) {
    throw new GuardrailError({ code: "DB_ERROR", where: WHERE, message: error.message, details: error });
  }

  return NextResponse.json(data ?? []);
});

/**
 * POST /api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/bid-items
 * Adds a bid line item.
 * Body: { description, amount, scope_item_id?, is_excluded?, notes? }
 */
export const POST = withApiGuardrails<Params>(WHERE + "#POST", async ({ request, params }) => {
  const { estimateId, subId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: WHERE, message: "Authentication required." });
  }

  const subIdNum = parseInt(subId, 10);
  const estimateIdNum = parseInt(estimateId, 10);
  if (isNaN(subIdNum) || isNaN(estimateIdNum)) {
    throw new GuardrailError({ code: "INVALID_PAYLOAD", where: WHERE, message: "Invalid sub or estimate ID." });
  }

  const body = await request.json().catch(() => ({})) as {
    description?: string;
    amount?: number;
    scope_item_id?: number;
    is_excluded?: boolean;
    notes?: string;
  };

  if (!body.description?.trim()) {
    throw new GuardrailError({ code: "INVALID_PAYLOAD", where: WHERE, message: "description is required." });
  }

  // Verify sub belongs to this estimate
  const { data: sub, error: subError } = await supabase
    .from("estimate_sublist_subs")
    .select("id")
    .eq("id", subIdNum)
    .eq("estimate_id", estimateIdNum)
    .single();

  if (subError || !sub) {
    throw new GuardrailError({ code: "NOT_FOUND", where: WHERE, message: "Sub not found in this estimate." });
  }

  const { data, error } = await supabase
    .from("estimate_sublist_bid_items")
    .insert({
      sub_id: subIdNum,
      scope_item_id: body.scope_item_id ?? null,
      description: body.description.trim(),
      amount: body.amount ?? 0,
      is_excluded: body.is_excluded ?? false,
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    throw new GuardrailError({ code: "DB_ERROR", where: WHERE, message: error.message, details: error });
  }

  // Recalculate and update price on the sub
  const { data: allItems } = await supabase
    .from("estimate_sublist_bid_items")
    .select("amount, is_excluded")
    .eq("sub_id", subIdNum);

  if (allItems) {
    const total = allItems.filter((i) => !i.is_excluded).reduce((sum, i) => sum + Number(i.amount), 0);
    await supabase
      .from("estimate_sublist_subs")
      .update({ price: total })
      .eq("id", subIdNum);
  }

  return NextResponse.json(data, { status: 201 });
});
