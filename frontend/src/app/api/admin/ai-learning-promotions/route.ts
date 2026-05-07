import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import {
  applyRetrievalWeightPromotion,
  updateRetrievalWeightStatus,
} from "@/lib/ai/services/feedback-event-service";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const reviewSchema = z.object({
  promotionId: z.string().uuid(),
  action: z.enum(["approve", "reject", "apply", "pause", "resume", "supersede"]),
  reviewNotes: z.string().trim().max(2000).optional(),
});

async function requireAdminUser(where: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where,
      message: "Sign in before reviewing AI learning promotions.",
      status: 401,
      details: userError?.message,
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    throw new GuardrailError({
      code: "FORBIDDEN",
      where,
      message: "Admin access is required to review AI learning promotions.",
      status: 403,
      details: profileError?.message,
    });
  }

  return user;
}

export const GET = withApiGuardrails(
  "api.admin.ai-learning-promotions.GET",
  async ({ request }) => {
    await requireAdminUser("api.admin.ai-learning-promotions.GET");

    const status = request.nextUrl.searchParams.get("status") ?? "candidate";
    const limit = Math.min(
      500,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 100)),
    );
    const serviceSupabase = createServiceClient();

    const { data, error } = await serviceSupabase
      .from("ai_learning_promotions")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "api.admin.ai-learning-promotions.GET",
        message: "Failed to load AI learning promotions.",
        details: error.message,
      });
    }

    const promotions = data ?? [];
    const promotionIds = promotions.map((promotion) => promotion.id);
    const retrievalWeightsByPromotionId = new Map<string, unknown>();

    if (promotionIds.length > 0) {
      const { data: retrievalWeights, error: retrievalWeightsError } =
        await serviceSupabase
          .from("ai_retrieval_weights")
          .select("*")
          .in("promotion_id", promotionIds);

      if (retrievalWeightsError) {
        throw new GuardrailError({
          code: "UPSTREAM_FAILURE",
          where: "api.admin.ai-learning-promotions.GET",
          message: "Failed to load applied retrieval weights.",
          details: retrievalWeightsError.message,
        });
      }

      for (const retrievalWeight of retrievalWeights ?? []) {
        retrievalWeightsByPromotionId.set(retrievalWeight.promotion_id, retrievalWeight);
      }
    }

    return NextResponse.json({
      promotions: promotions.map((promotion) => ({
        ...promotion,
        retrievalWeight: retrievalWeightsByPromotionId.get(promotion.id) ?? null,
      })),
    });
  },
);

export const POST = withApiGuardrails(
  "api.admin.ai-learning-promotions.POST",
  async ({ request }) => {
    const user = await requireAdminUser("api.admin.ai-learning-promotions.POST");
    const body = await parseJsonBody(
      request,
      reviewSchema,
      "api.admin.ai-learning-promotions.POST",
    );
    const serviceSupabase = createServiceClient();

    if (body.action === "apply") {
      const result = await applyRetrievalWeightPromotion({
        promotionId: body.promotionId,
      });

      return NextResponse.json({
        ok: true,
        action: body.action,
        promotion: result.promotion,
        retrievalWeight: result.retrievalWeight,
      });
    }

    if (
      body.action === "pause" ||
      body.action === "resume" ||
      body.action === "supersede"
    ) {
      const result = await updateRetrievalWeightStatus({
        promotionId: body.promotionId,
        status:
          body.action === "pause"
            ? "paused"
            : body.action === "resume"
              ? "active"
              : "superseded",
        reviewedBy: user.id,
        reviewNotes: body.reviewNotes,
      });

      return NextResponse.json({
        ok: true,
        action: body.action,
        promotion: result.promotion,
        retrievalWeight: result.retrievalWeight,
      });
    }

    const { data: promotion, error: promotionError } = await serviceSupabase
      .from("ai_learning_promotions")
      .select("id, status")
      .eq("id", body.promotionId)
      .single();

    if (promotionError || !promotion) {
      throw new GuardrailError({
        code: "ROUTE_BINDING_MISSING",
        where: "api.admin.ai-learning-promotions.POST",
        message: "AI learning promotion was not found.",
        status: 404,
        details: promotionError?.message,
      });
    }

    if (promotion.status !== "candidate") {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "api.admin.ai-learning-promotions.POST",
        message: "Only candidate AI learning promotions can be reviewed.",
        status: 409,
        details: { status: promotion.status },
      });
    }

    const status = body.action === "approve" ? "approved" : "rejected";
    const { data: updated, error: updateError } = await serviceSupabase
      .from("ai_learning_promotions")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        review_notes: body.reviewNotes ?? null,
      })
      .eq("id", body.promotionId)
      .select("*")
      .single();

    if (updateError || !updated) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "api.admin.ai-learning-promotions.POST",
        message: `Failed to ${body.action} AI learning promotion.`,
        details: updateError?.message,
      });
    }

    return NextResponse.json({ ok: true, action: body.action, promotion: updated });
  },
);
