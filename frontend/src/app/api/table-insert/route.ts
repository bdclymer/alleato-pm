import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { table, data } = body as { table?: string; data?: Record<string, unknown> };

  if (!table || !data) {
    return NextResponse.json(
      { error: "Missing required fields: table or data" },
      { status: 400 },
    );
  }
  const { data: inserted, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to insert record", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: inserted });
}

