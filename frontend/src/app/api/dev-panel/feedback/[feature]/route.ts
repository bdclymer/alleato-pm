import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ feature: string }> },
) {
  const { feature } = await params;

  if (!/^[\w-]+$/.test(feature)) {
    return NextResponse.json({ error: "Invalid feature" }, { status: 400 });
  }

  const supabase = await createClient();

  // Find the tool id for this feature slug
  const { data: tool } = await supabase
    .from("procore_tools")
    .select("id, name")
    .eq("slug", `/${feature}`)
    .maybeSingle();

  let feedback: unknown[] = [];

  if (tool) {
    const { data } = await supabase
      .from("admin_feedback_items")
      .select(
        "id, title, comment, status, severity, request_type, page_url, page_path, created_at, github_issue_url, github_issue_state",
      )
      .eq("tool_id", tool.id)
      .order("created_at", { ascending: false })
      .limit(50);
    feedback = data ?? [];
  } else {
    // Fall back to path-based matching
    const { data } = await supabase
      .from("admin_feedback_items")
      .select(
        "id, title, comment, status, severity, request_type, page_url, page_path, created_at, github_issue_url, github_issue_state",
      )
      .ilike("page_path", `%${feature}%`)
      .order("created_at", { ascending: false })
      .limit(50);
    feedback = data ?? [];
  }

  return NextResponse.json({ feature, tool: tool ?? null, feedback });
}
