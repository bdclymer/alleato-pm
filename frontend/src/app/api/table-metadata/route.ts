import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Use authenticated client — table_metadata requires a logged-in user.
    // OWASP A01:2021 - Broken Access Control: removed unauthenticated service client.
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("table_metadata")
      .select("*")
      .eq("is_visible", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching table metadata:", error);
      return NextResponse.json(
        { error: "Failed to fetch table metadata" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
