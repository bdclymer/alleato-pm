import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

export const GET = withApiGuardrails(
  "clients#GET",
  async ({ request }) => {
    // Identify the user from the cookie JWT — no Supabase Auth network call.
    // Calling supabase.auth.getUser() here races other parallel route handlers
    // on refresh-token rotation, which trips reuse detection and revokes the
    // user's whole session (symptom: pages render but every API says
    // "Authentication required"). See getApiRouteUser docs.
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "clients#GET", message: "Authentication required." });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const supabase = createServiceClient();
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
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "clients#POST", message: "Authentication required." });
    }
    const body = await request.json();

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("companies")
      .insert({ name: body.name, type: "client", status: body.status || "active" })
      .select("id, name, type, status, website, address, city, state, created_at")
      .single();

    if (error) return apiErrorResponse(error);
    return NextResponse.json(data, { status: 201 });
    },
);
