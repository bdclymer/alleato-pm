import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export const GET = withApiGuardrails("admin/feedback/board", async () => {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("admin_feedback_items")
    .select(
      "id, title, comment, request_type, board_status, severity, created_at, page_title, page_path, created_by"
    )
    .eq("request_type", "feature_request")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return NextResponse.json({ items: data ?? [] });
});
