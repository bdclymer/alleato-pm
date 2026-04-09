/**
 * /api/testing/runs/[runId]/results/[resultId]
 * PATCH — update status and/or notes for a single test result
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ runId: string; resultId: string }> }
) {
  const { resultId } = await params;
  const supabase = await createClient();

  const body = await req.json();
  const { status, notes, severity } = body as { status?: string; notes?: string; severity?: string | null };

  const validStatuses = ["pass", "fail", "skip", "not_tested"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const validSeverities = ["critical", "major", "minor", "cosmetic"];
  if (severity && !validSeverities.includes(severity)) {
    return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (severity !== undefined) updates.severity = severity ?? null;

  const { data, error } = await supabase
    .from("test_results")
    .update(updates)
    .eq("id", resultId)
    .select("id, status, notes, severity, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ result: data });
}
