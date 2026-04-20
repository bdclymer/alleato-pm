import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; drawingId: string }> }
) {
  const { projectId, drawingId } = await params;
  const projectIdNum = Number(projectId);
  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch change history ordered by most recent first
  const { data: history, error } = await supabase
    .from("drawing_change_history")
    .select("*")
    .eq("drawing_id", drawingId)
    .order("changed_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with user display info from profiles table if available
  const userIds = [...new Set((history ?? []).map((h) => h.changed_by).filter(Boolean) as string[])];
  const profileMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    for (const profile of (profiles ?? [])) {
      profileMap[profile.id] = profile.full_name ?? profile.email ?? profile.id;
    }
  }

  const enriched = (history ?? []).map((h) => ({
    ...h,
    changed_by_name: profileMap[h.changed_by ?? ""] ?? h.changed_by,
  }));

  return NextResponse.json({ history: enriched });
}
