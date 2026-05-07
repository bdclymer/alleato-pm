import { NextResponse } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { createServiceClient } from "@/lib/supabase/service";
import { GuardrailError } from "@/lib/guardrails/errors";
import { requireAiLearningPromotionsAdmin } from "../_shared";

export const GET = withApiGuardrails(
  "api.admin.ai-learning-promotions.activity.GET",
  async ({ request }) => {
    await requireAiLearningPromotionsAdmin(
      "api.admin.ai-learning-promotions.activity.GET",
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 25)),
    );
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("ai_feedback_events")
      .select("*")
      .eq("surface", "admin_ai_learning_promotions")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "api.admin.ai-learning-promotions.activity.GET",
        message: "Failed to load AI learning activity.",
        details: error.message,
      });
    }

    return NextResponse.json({ events: data ?? [] });
  },
);
