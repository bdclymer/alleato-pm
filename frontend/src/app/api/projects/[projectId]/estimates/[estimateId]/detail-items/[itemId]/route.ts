import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const PATCH = withApiGuardrails<{ projectId: string; estimateId: string; itemId: string }>(
  "projects/[projectId]/estimates/[estimateId]/detail-items/[itemId]#PATCH",
  async ({ request, params }) => {
    const { estimateId, itemId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "detail-items/[itemId]#PATCH", message: "Authentication required." });
    }

    const estimateIdNum = parseInt(estimateId, 10);
    const itemIdNum = parseInt(itemId, 10);
    if (isNaN(estimateIdNum) || isNaN(itemIdNum)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("estimate_detail_items")
      .update(body)
      .eq("id", itemIdNum)
      .eq("estimate_id", estimateIdNum)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }
);

export const DELETE = withApiGuardrails<{ projectId: string; estimateId: string; itemId: string }>(
  "projects/[projectId]/estimates/[estimateId]/detail-items/[itemId]#DELETE",
  async ({ params }) => {
    const { estimateId, itemId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "detail-items/[itemId]#DELETE", message: "Authentication required." });
    }

    const estimateIdNum = parseInt(estimateId, 10);
    const itemIdNum = parseInt(itemId, 10);
    if (isNaN(estimateIdNum) || isNaN(itemIdNum)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("estimate_detail_items")
      .delete()
      .eq("id", itemIdNum)
      .eq("estimate_id", estimateIdNum);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new Response(null, { status: 204 });
  }
);
