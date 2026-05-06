import { z } from "zod";
import { NextResponse } from "next/server";
import { withApiGuardrails, parseJsonBody } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";

const PatchSchema = z.object({
  project_id: z.number().int().positive().nullable(),
});

async function assertAdminAccess(where: string) {
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

export const PATCH = withApiGuardrails(
  "outlook-intake/[id]#PATCH",
  async ({ request, params }) => {
    const supabase = await assertAdminAccess("outlook-intake/[id]#PATCH");
    const { id } = await params;
    const intakeId = parseInt(id, 10);

    if (!Number.isFinite(intakeId) || intakeId <= 0) {
      throw new GuardrailError({
        code: "VALIDATION_ERROR",
        where: "outlook-intake/[id]#PATCH",
        message: "Invalid intake record ID.",
        status: 400,
      });
    }

    const body = await parseJsonBody(request);
    const parsed = PatchSchema.safeParse(body);

    if (!parsed.success) {
      throw new GuardrailError({
        code: "VALIDATION_ERROR",
        where: "outlook-intake/[id]#PATCH",
        message: parsed.error.issues.map((i) => i.message).join(", "),
        status: 400,
      });
    }

    const { project_id } = parsed.data;

    const { data, error } = await supabase
      .from("outlook_email_intake")
      .update({
        project_id,
        match_status: project_id ? "matched" : "unassigned",
        assignment_method: "manual",
        assignment_confidence: project_id ? 1.0 : null,
      })
      .eq("id", intakeId)
      .is("deleted_at", null)
      .select("id, project_id, match_status, assignment_method, assignment_confidence")
      .single();

    if (error) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "outlook-intake/[id]#PATCH",
        message: error.message,
      });
    }

    return NextResponse.json(data);
  },
);
