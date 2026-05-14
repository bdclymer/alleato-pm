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
      return NextResponse.json({ error: "Invalid estimate ID" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("estimate_sublist_subs")
      .select("*")
      .eq("estimate_id", estimateIdNum)
      .order("division_code", { ascending: true })
      .order("position", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
      return NextResponse.json({ error: "Invalid estimate ID" }, { status: 400 });
    }

    const body = await request.json();
    const { division_code, division_name, position, ...rest } = body;

    // Upsert: if division_code + position already exists for this estimate, update it
    const { data, error } = await supabase
      .from("estimate_sublist_subs")
      .upsert(
        {
          estimate_id: estimateIdNum,
          division_code: division_code ?? "02",
          division_name: division_name ?? "",
          position: position ?? 1,
          ...rest,
        },
        { onConflict: "estimate_id,division_code,position" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  }
);
