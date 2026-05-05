import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createServiceClient } from "@/lib/supabase/service";
import { BOARD_STATUSES } from "@/lib/admin-feedback/constants";

const patchSchema = z.object({
  board_status: z.enum(BOARD_STATUSES).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  comment: z.string().trim().max(5000).optional(),
  severity: z.enum(["low", "medium", "high"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const PATCH = withApiGuardrails<{ itemId: string }>(
  "admin/feedback/board/[itemId]",
  async ({ request, params }) => {
    const body = await request.json();
    const updates = patchSchema.parse(body);

    const supabase = createServiceClient();

    // Merge metadata if provided (don't overwrite whole object)
    if (updates.metadata) {
      const { data: existing } = await supabase
        .from("admin_feedback_items")
        .select("metadata")
        .eq("id", params.itemId)
        .single();

      updates.metadata = {
        ...(existing?.metadata as Record<string, unknown> ?? {}),
        ...updates.metadata,
      };
    }

    const { error } = await supabase
      .from("admin_feedback_items")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", params.itemId)
      .eq("request_type", "feature_request");

    if (error) throw error;

    return NextResponse.json({ success: true });
  }
);
