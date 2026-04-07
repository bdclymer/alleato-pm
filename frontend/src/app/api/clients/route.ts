import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();

    const { data, error } = await supabase
      .from("companies")
      .insert({ name: body.name, type: "client", status: body.status || "active" })
      .select("id, name, type, status, website, address, city, state, created_at")
      .single();

    if (error) return apiErrorResponse(error);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
