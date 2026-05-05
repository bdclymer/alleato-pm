import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { GuardrailError } from "@/lib/guardrails/errors";
import { BOARD_STATUSES } from "@/lib/admin-feedback/constants";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).default(""),
  board_status: z.enum(BOARD_STATUSES).default("submitted"),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
});

export const POST = withApiGuardrails("admin/feedback/board/create", async ({ request }) => {
  const user = await getApiRouteUser();
  if (!user) throw new GuardrailError({ code: "FORBIDDEN", where: "board/create", message: "Sign in required.", status: 401 });

  const body = await request.json();
  const { title, description, board_status, severity } = createSchema.parse(body);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("admin_feedback_items")
    .insert({
      created_by: user.id,
      title,
      comment: description,
      page_url: "/product-board",
      page_path: "/product-board",
      page_title: "Product Board",
      request_type: "feature_request",
      board_status,
      severity,
      status: "open",
      target_selector: "product-board",
      metadata: {},
    })
    .select("id")
    .single();

  if (error) throw error;

  return NextResponse.json({ id: data.id }, { status: 201 });
});
