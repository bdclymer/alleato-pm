import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

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
