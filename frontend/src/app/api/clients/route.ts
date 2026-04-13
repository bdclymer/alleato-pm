import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

export const GET = withApiGuardrails(
  "clients#GET",
  async ({ request }) => {
  
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "clients#GET", message: "Authentication required." });
    }
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    let query = supabase
      .from("companies")
      .select("id, name, type, status, website, address, city, state, created_at")
      .eq("type", "client")
      .order("name", { ascending: true });

    if (search) query = query.ilike("name", `%${search}%`);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return apiErrorResponse(error);
    return NextResponse.json(data || []);
    },
);

export const POST = withApiGuardrails(
  "clients#POST",
  async ({ request }) => {
  
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "clients#POST", message: "Authentication required." });
    }
    const body = await request.json();

    const { data, error } = await supabase
      .from("companies")
      .insert({ name: body.name, type: "client", status: body.status || "active" })
      .select("id, name, type, status, website, address, city, state, created_at")
      .single();

    if (error) return apiErrorResponse(error);
    return NextResponse.json(data, { status: 201 });
    },
);
