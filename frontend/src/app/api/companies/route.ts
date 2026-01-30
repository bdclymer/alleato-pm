import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Company } from "@/app/api/types";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type");
    const search = searchParams.get("search");

    let query = supabase
      .from("companies")
      .select("*")
      .order("name", { ascending: true });

    if (type) {
      // Allow filtering by multiple types using comma separation
      const types = type.split(",");
      query = query.in("type", types);
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return apiErrorResponse(error);
    }

    const companies: Company[] = data || [];
    return NextResponse.json(companies);
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
      .insert({
        name: body.name,
        address: body.address,
        city: body.city,
        state: body.state,
        website: body.website,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
