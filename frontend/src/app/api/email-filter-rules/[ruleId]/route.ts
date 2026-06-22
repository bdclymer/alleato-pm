import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  label: z.string().trim().min(1).max(120).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  action: z.enum(["skip", "review", "allow", "not_project"]).optional(),
});

async function assertAdmin(where: string) {
  const supabase = await createClient();
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where,
      message: "Authentication required.",
    });
  }
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (profileError) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where,
      message: profileError.message,
    });
  }
  if (!profile?.is_admin) {
    throw new GuardrailError({
      code: "FORBIDDEN",
      where,
      message: "Admin access required.",
      status: 403,
    });
  }
  return supabase;
}

export const PATCH = withApiGuardrails<Promise<{ ruleId: string }>>(
  "email-filter-rules#PATCH",
  async ({ request, params }) => {
    const supabase = await assertAdmin("email-filter-rules#PATCH");
    const { ruleId } = params;

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "email-filter-rules#PATCH",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
        status: 400,
      });
    }

    const { data, error } = await supabase
      .from("email_filter_rules")
      .update(parsed.data)
      .eq("id", ruleId)
      .select()
      .single();

    if (error) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "email-filter-rules#PATCH",
        message: error.message,
      });
    }
    return NextResponse.json(data);
  },
);

export const DELETE = withApiGuardrails<Promise<{ ruleId: string }>>(
  "email-filter-rules#DELETE",
  async ({ params }) => {
    const supabase = await assertAdmin("email-filter-rules#DELETE");
    const { ruleId } = params;

    const { error } = await supabase
      .from("email_filter_rules")
      .delete()
      .eq("id", ruleId);

    if (error) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "email-filter-rules#DELETE",
        message: error.message,
      });
    }
    return NextResponse.json({ ok: true });
  },
);
