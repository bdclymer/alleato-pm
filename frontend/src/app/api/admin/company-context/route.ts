import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/company-context
 * Fetch the company context (singleton row).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("company_context")
    .select("*")
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? null });
}

/**
 * PUT /api/admin/company-context
 * Upsert the company context (singleton row).
 */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Check if a row exists
  const { data: existing } = await supabase
    .from("company_context")
    .select("id")
    .limit(1)
    .single();

  let result;
  if (existing) {
    // Update existing row
    const { data, error } = await supabase
      .from("company_context")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    result = { data, error };
  } else {
    // Insert new row
    const { data, error } = await supabase
      .from("company_context")
      .insert({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    result = { data, error };
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ data: result.data });
}
