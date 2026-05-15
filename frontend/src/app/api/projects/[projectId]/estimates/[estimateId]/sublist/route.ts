import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const GET = withApiGuardrails<{ projectId: string; estimateId: string }>(
  "projects/[projectId]/estimates/[estimateId]/sublist#GET",
  async ({ params }) => {
    const { estimateId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "sublist#GET", message: "Authentication required." });
    }

    const estimateIdNum = parseInt(estimateId, 10);
    if (isNaN(estimateIdNum)) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "sublist#GET",
        message: "Invalid estimate ID.",
        details: { estimateId },
      });
    }

    const { data, error } = await supabase
      .from("estimate_sublist_subs")
      .select("*")
      .eq("estimate_id", estimateIdNum)
      .order("division_code", { ascending: true })
      .order("position", { ascending: true });

    if (error) {
      throw new GuardrailError({
        code: "DB_ERROR",
        where: "sublist#GET",
        message: error.message,
        cause: error,
      });
    }

    return NextResponse.json(data ?? []);
  }
);

export const POST = withApiGuardrails<{ projectId: string; estimateId: string }>(
  "projects/[projectId]/estimates/[estimateId]/sublist#POST",
  async ({ request, params }) => {
    const { estimateId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "sublist#POST", message: "Authentication required." });
    }

    const estimateIdNum = parseInt(estimateId, 10);
    if (isNaN(estimateIdNum)) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "sublist#POST",
        message: "Invalid estimate ID.",
        details: { estimateId },
      });
    }

    const body = await request.json();
    const { division_code, division_name, ...rest } = body;

    // Compute next position for this division (auto-increment per division)
    const { data: maxRow } = await supabase
      .from("estimate_sublist_subs")
      .select("position")
      .eq("estimate_id", estimateIdNum)
      .eq("division_code", division_code ?? "02")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (maxRow?.position ?? 0) + 1;

    const { data, error } = await supabase
      .from("estimate_sublist_subs")
      .insert({
        estimate_id: estimateIdNum,
        division_code: division_code ?? "02",
        division_name: division_name ?? "",
        position: nextPosition,
        ...rest,
      })
      .select()
      .single();

    if (error) {
      throw new GuardrailError({
        code: "DB_ERROR",
        where: "sublist#POST",
        message: error.message,
        cause: error,
      });
    }

    return NextResponse.json(data, { status: 201 });
  }
);
