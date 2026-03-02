import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: Fetch meeting title by ID (used for global breadcrumb resolution)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("document_metadata")
      .select("id, title")
      .eq("id", meetingId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ title: data.title });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
