import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createServiceClient } from "@/lib/supabase/service";
import { BOARD_STATUSES } from "@/lib/admin-feedback/constants";

const patchSchema = z.object({
  board_status: z.enum(BOARD_STATUSES),
});

export const PATCH = withApiGuardrails<{ itemId: string }>(
  "admin/feedback/board/[itemId]",
  async ({ request, params }) => {
    const body = await request.json();
    const { board_status } = patchSchema.parse(body);

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("admin_feedback_items")
      .update({ board_status, updated_at: new Date().toISOString() })
      .eq("id", params.itemId)
      .eq("request_type", "feature_request");

    if (error) throw error;

    return NextResponse.json({ success: true });
  }
);
