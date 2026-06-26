import { NextResponse } from "next/server";
import { z } from "zod";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RouteParams {
  params: Promise<{ personId: string }>;
}

const ProjectAccessBody = z.object({
  project_id: z.coerce.number().int().positive(),
  template_id: z.string().uuid().optional(),
});

async function requireAdmin(where: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where,
      message: "Authentication required.",
    });
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where,
      message: "Failed to verify admin access.",
      details: error,
    });
  }

  if (!profile?.is_admin) {
    throw new GuardrailError({
      code: "FORBIDDEN",
      where,
      message: "Access denied.",
    });
  }

  return user;
}

async function assertPersonExists(personId: string, where: string) {
  const service = createServiceClient();
  const { data: person, error } = await service
    .from("people")
    .select("id")
    .eq("id", personId)
    .maybeSingle();

  if (error) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where,
      message: "Failed to load employee.",
      details: error,
    });
  }

  if (!person) {
    throw new GuardrailError({
      code: "NOT_FOUND",
      where,
      message: "Employee not found.",
      status: 404,
    });
  }
}

async function assertProjectTemplate(templateId: string, where: string) {
  const service = createServiceClient();
  const { data: template, error } = await service
    .from("permission_templates")
    .select("id, name, scope")
    .eq("id", templateId)
    .maybeSingle();

  if (error) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where,
      message: "Failed to load permission template.",
      details: error,
    });
  }

  if (!template) {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where,
      message: "Selected permission template no longer exists.",
      status: 400,
    });
  }

  if (template.scope !== "project") {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where,
      message: "Project access requires a project permission template.",
      status: 400,
    });
  }

  return template;
}

export const POST = withApiGuardrails(
  "permissions/users/[personId]/project-access#POST",
  async ({ request, params }: { request: Request } & RouteParams) => {
    await requireAdmin("permissions/users/[personId]/project-access#POST");
    const { personId } = await params;
    const parsed = ProjectAccessBody.required({ template_id: true }).safeParse(await request.json());

    if (!parsed.success) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "permissions/users/[personId]/project-access#POST",
        message: "project_id and template_id are required.",
        details: parsed.error.issues,
      });
    }

    await assertPersonExists(personId, "permissions/users/[personId]/project-access#POST");
    const template = await assertProjectTemplate(
      parsed.data.template_id,
      "permissions/users/[personId]/project-access#POST",
    );

    const service = createServiceClient();
    const { error } = await service
      .from("project_directory_memberships")
      .upsert(
        {
          project_id: parsed.data.project_id,
          person_id: personId,
          permission_template_id: parsed.data.template_id,
          role: template.name,
          status: "active",
          user_type: "employee",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,person_id" },
      );

    if (error) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "permissions/users/[personId]/project-access#POST",
        message: `Could not assign project access: ${error.message}`,
        details: error,
      });
    }

    return NextResponse.json({ success: true });
  },
);

export const DELETE = withApiGuardrails(
  "permissions/users/[personId]/project-access#DELETE",
  async ({ request, params }: { request: Request } & RouteParams) => {
    await requireAdmin("permissions/users/[personId]/project-access#DELETE");
    const { personId } = await params;
    const parsed = ProjectAccessBody.pick({ project_id: true }).safeParse(await request.json());

    if (!parsed.success) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "permissions/users/[personId]/project-access#DELETE",
        message: "project_id is required.",
        details: parsed.error.issues,
      });
    }

    await assertPersonExists(personId, "permissions/users/[personId]/project-access#DELETE");
    const service = createServiceClient();

    const { error: membershipError } = await service
      .from("project_directory_memberships")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("person_id", personId)
      .eq("project_id", parsed.data.project_id);

    if (membershipError) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "permissions/users/[personId]/project-access#DELETE",
        message: `Could not remove project access: ${membershipError.message}`,
        details: membershipError,
      });
    }

    const { error: overridesError } = await service
      .from("user_granular_permission_overrides")
      .delete()
      .eq("person_id", personId)
      .eq("project_id", parsed.data.project_id);

    if (overridesError) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "permissions/users/[personId]/project-access#DELETE",
        message: `Could not remove project permission exceptions: ${overridesError.message}`,
        details: overridesError,
      });
    }

    return NextResponse.json({ success: true });
  },
);
