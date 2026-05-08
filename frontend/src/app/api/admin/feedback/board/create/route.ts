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
  assignee_id: z.string().uuid().nullable().optional(),
});

export const POST = withApiGuardrails("admin/feedback/board/create", async ({ request }) => {
  const user = await getApiRouteUser();
  if (!user) throw new GuardrailError({ code: "FORBIDDEN", where: "board/create", message: "Sign in required.", status: 401 });

  const body = await request.json();
  const { title, description, board_status, severity, assignee_id } = createSchema.parse(body);

  const supabase = createServiceClient();

  // Place at the bottom of the target column
  const { data: maxRow } = await supabase
    .from("admin_feedback_items")
    .select("position")
    .eq("request_type", "feature_request")
    .eq("board_status", board_status)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (maxRow?.position ?? 0) + 1000;

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
      position,
      assignee_id: assignee_id ?? null,
      status: "open",
      target_selector: "product-board",
      metadata: {},
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error("Failed to create feedback item");
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
});
