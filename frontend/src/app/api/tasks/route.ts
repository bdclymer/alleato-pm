import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // Tasks table contains mixed sources (tests/manual/system backfills).
  // This endpoint intentionally serves Fireflies-derived project tasks only.
  const { data: interviewMeetings, error: interviewError } = await supabase
    .from("document_metadata")
    .select("id")
    .or("type.eq.interview,title.ilike.%test%");

  if (interviewError) {
    return NextResponse.json(
      { error: interviewError.message },
      { status: 500 },
    );
  }

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("source_system", "fireflies")
    .not("metadata_id", "is", null)
    .or("project_id.not.is.null,project_ids.not.is.null")
    .order("created_at", { ascending: false });

  const interviewIds = (interviewMeetings ?? []).map((m) => m.id).filter(Boolean);
  if (interviewIds.length > 0) {
    query = query.not("metadata_id", "in", `(${interviewIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data ?? [] });
}
