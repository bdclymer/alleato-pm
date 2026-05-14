import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const PATCH = withApiGuardrails<{ projectId: string; estimateId: string; subId: string }>(
  "projects/[projectId]/estimates/[estimateId]/sublist/[subId]#PATCH",
  async ({ request, params }) => {
    const { estimateId, subId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "sublist/[subId]#PATCH", message: "Authentication required." });
    }

    const estimateIdNum = parseInt(estimateId, 10);
    const subIdNum = parseInt(subId, 10);
    if (isNaN(estimateIdNum) || isNaN(subIdNum)) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "sublist/[subId]#PATCH",
        message: "Invalid estimate sublist ID.",
        details: { estimateId, subId },
      });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("estimate_sublist_subs")
      .update(body)
      .eq("id", subIdNum)
      .eq("estimate_id", estimateIdNum)
      .select()
      .single();

    if (error) {
      throw new GuardrailError({
        code: "DB_ERROR",
        where: "sublist/[subId]#PATCH",
        message: error.message,
        cause: error,
      });
    }

    return NextResponse.json(data);
  }
);

export const DELETE = withApiGuardrails<{ projectId: string; estimateId: string; subId: string }>(
  "projects/[projectId]/estimates/[estimateId]/sublist/[subId]#DELETE",
  async ({ params }) => {
    const { estimateId, subId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "sublist/[subId]#DELETE", message: "Authentication required." });
    }

    const estimateIdNum = parseInt(estimateId, 10);
    const subIdNum = parseInt(subId, 10);
    if (isNaN(estimateIdNum) || isNaN(subIdNum)) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "sublist/[subId]#DELETE",
        message: "Invalid estimate sublist ID.",
        details: { estimateId, subId },
      });
    }

    const { error } = await supabase
      .from("estimate_sublist_subs")
      .delete()
      .eq("id", subIdNum)
      .eq("estimate_id", estimateIdNum);

    if (error) {
      throw new GuardrailError({
        code: "DB_ERROR",
        where: "sublist/[subId]#DELETE",
        message: error.message,
        cause: error,
      });
    }

    return new Response(null, { status: 204 });
  }
);
