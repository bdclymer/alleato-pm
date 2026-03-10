import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_FIELDS = new Set([
  "title",
  "type",
  "category",
  "source",
  "status",
  "project_id",
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ docId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await params;
  const body = await request.json();

  // Filter to only allowed fields
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("document_metadata")
    .update(updates)
    .eq("id", docId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
