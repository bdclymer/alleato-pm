import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const WHERE = "projects/[projectId]/estimates/[estimateId]/sublist/[subId]/bid-items/[bidItemId]";
type Params = { projectId: string; estimateId: string; subId: string; bidItemId: string };

/**
 * PATCH /api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/bid-items/[bidItemId]
 * Updates a bid line item.
 */
export const PATCH = withApiGuardrails<Params>(WHERE + "#PATCH", async ({ request, params }) => {
  const { estimateId, subId, bidItemId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: WHERE, message: "Authentication required." });
  }

  const subIdNum = parseInt(subId, 10);
  const estimateIdNum = parseInt(estimateId, 10);
  const bidItemIdNum = parseInt(bidItemId, 10);
  if (isNaN(subIdNum) || isNaN(estimateIdNum) || isNaN(bidItemIdNum)) {
    throw new GuardrailError({ code: "INVALID_PAYLOAD", where: WHERE, message: "Invalid ID." });
  }

  const body = await request.json().catch(() => ({}));

  const { data, error } = await supabase
    .from("estimate_sublist_bid_items")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", bidItemIdNum)
    .eq("sub_id", subIdNum)
    .select()
    .single();

  if (error) {
    throw new GuardrailError({ code: "DB_ERROR", where: WHERE, message: error.message, details: error });
  }

  // Recalculate price on the sub
  const { data: allItems } = await supabase
    .from("estimate_sublist_bid_items")
    .select("amount, is_excluded")
    .eq("sub_id", subIdNum);

  if (allItems) {
    const total = allItems.filter((i) => !i.is_excluded).reduce((sum, i) => sum + Number(i.amount), 0);
    await supabase
      .from("estimate_sublist_subs")
      .update({ price: total })
      .eq("id", subIdNum)
      .eq("estimate_id", estimateIdNum);
  }

  return NextResponse.json(data);
});

/**
 * DELETE /api/projects/[projectId]/estimates/[estimateId]/sublist/[subId]/bid-items/[bidItemId]
 */
export const DELETE = withApiGuardrails<Params>(WHERE + "#DELETE", async ({ params }) => {
  const { estimateId, subId, bidItemId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: WHERE, message: "Authentication required." });
  }

  const subIdNum = parseInt(subId, 10);
  const estimateIdNum = parseInt(estimateId, 10);
  const bidItemIdNum = parseInt(bidItemId, 10);
  if (isNaN(subIdNum) || isNaN(estimateIdNum) || isNaN(bidItemIdNum)) {
    throw new GuardrailError({ code: "INVALID_PAYLOAD", where: WHERE, message: "Invalid ID." });
  }

  const { error } = await supabase
    .from("estimate_sublist_bid_items")
    .delete()
    .eq("id", bidItemIdNum)
    .eq("sub_id", subIdNum);

  if (error) {
    throw new GuardrailError({ code: "DB_ERROR", where: WHERE, message: error.message, details: error });
  }

  // Recalculate price on the sub
  const { data: allItems } = await supabase
    .from("estimate_sublist_bid_items")
    .select("amount, is_excluded")
    .eq("sub_id", subIdNum);

  if (allItems !== null) {
    const total = allItems.filter((i) => !i.is_excluded).reduce((sum, i) => sum + Number(i.amount), 0);
    await supabase
      .from("estimate_sublist_subs")
      .update({ price: total })
      .eq("id", subIdNum)
      .eq("estimate_id", estimateIdNum);
  }

  return new Response(null, { status: 204 });
});
