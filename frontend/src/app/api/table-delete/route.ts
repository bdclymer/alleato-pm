import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { table, id } = body as { table?: string; id?: string | number };

    if (!table || !id) {
      return NextResponse.json(
        { error: "Missing required fields: table or id" },
        { status: 400 },
      );
    }
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete record", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

