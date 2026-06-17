import { z } from "zod";
import { NextResponse } from "next/server";
import { withApiGuardrails, parseJsonBody } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { createOutlookIntakeServiceClient } from "@/lib/supabase/service";

const PatchSchema = z.union([
  // Project assignment
  z.object({
    project_id: z.number().int().positive().nullable(),
    match_status: z.undefined(),
  }),
  // Explicit status override (e.g. "ignored" / "filtered")
  z.object({
    project_id: z.undefined(),
    match_status: z.enum(["ignored", "unassigned"]),
  }),
]);

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
  "outlook-intake/[intakeId]#PATCH",
  async ({ request, params }) => {
    await assertAdminAccess("outlook-intake/[intakeId]#PATCH");
    const intakeService = createOutlookIntakeServiceClient();
    const { intakeId: rawIntakeId } = await params;
    const intakeId = parseInt(rawIntakeId, 10);

    if (!Number.isFinite(intakeId) || intakeId <= 0) {
      throw new GuardrailError({
        code: "VALIDATION_ERROR",
        where: "outlook-intake/[intakeId]#PATCH",
        message: "Invalid intake record ID.",
        status: 400,
      });
    }

    const parsed = await parseJsonBody(request, PatchSchema, "outlook-intake/[intakeId]#PATCH");

    let update: Record<string, unknown>;

    if ("match_status" in parsed && parsed.match_status !== undefined) {
      // Explicit status override — preserve project_id, just change status
      update = {
        match_status: parsed.match_status,
        assignment_method: "manual",
      };
    } else {
      // Project assignment
      const { project_id } = parsed as { project_id: number | null };
      update = {
        project_id,
        match_status: project_id ? "matched" : "unassigned",
        assignment_method: "manual",
        assignment_confidence: project_id ? 1.0 : null,
      };
    }

    const { data, error } = await intakeService
      .from("outlook_email_intake")
      .update(update)
      .eq("id", intakeId)
      .is("deleted_at", null)
      .select("id, project_id, match_status, assignment_method, assignment_confidence")
      .single();

    if (error) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "outlook-intake/[intakeId]#PATCH",
        message: error.message,
      });
    }

    return NextResponse.json(data);
  },
);
