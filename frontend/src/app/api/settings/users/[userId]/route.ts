import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseJsonBody, validateResponseContract, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";

const ParamsSchema = z.object({
  userId: z.string().min(1),
});

const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  is_admin: z.boolean().nullable().optional(),
  role: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

const UserEnvelopeSchema = z.object({
  data: UserProfileSchema,
});

const UserUpdateSchema = z.object({
  full_name: z.string().optional(),
  role: z.string().optional(),
  is_admin: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

async function requireAdmin(where: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where,
      message: "Unauthorized settings user request.",
      status: 401,
      severity: "medium",
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where,
      message: "Admin access required.",
      status: 403,
      severity: "medium",
    });
  }

  return supabase;
}

export const GET = withApiGuardrails<Promise<{ userId: string }>>(
  "/api/settings/users/[userId]#GET",
  async ({ params }) => {
    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "/api/settings/users/[userId]#GET",
        message: "Invalid user id.",
      });
    }
    const { userId } = parsedParams.data;

    const supabase = await requireAdmin("/api/settings/users/[userId]#GET");
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, email, full_name, is_admin, role, is_active, created_at, updated_at")
      .eq("id", userId)
      .single();

    if (error || !data) {
      throw new GuardrailError({
        code: "ROUTE_BINDING_MISSING",
        where: "/api/settings/users/[userId]#GET",
        message: "User not found.",
        status: 404,
        severity: "low",
      });
    }

    const payload = { data };
    validateResponseContract(
      UserEnvelopeSchema,
      payload,
      "/api/settings/users/[userId]#GET",
    );
    return NextResponse.json(payload);
  },
);

export const PATCH = withApiGuardrails<Promise<{ userId: string }>>(
  "/api/settings/users/[userId]#PATCH",
  async ({ request, params }) => {
    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "/api/settings/users/[userId]#PATCH",
        message: "Invalid user id.",
      });
    }
    const { userId } = parsedParams.data;

    const supabase = await requireAdmin("/api/settings/users/[userId]#PATCH");
    const body = await parseJsonBody(
      request,
      UserUpdateSchema,
      "/api/settings/users/[userId]#PATCH",
    );

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.full_name !== undefined) {
      updates.full_name = body.full_name;
    }
    if (body.role !== undefined) {
      updates.role = body.role;
    }
    if (body.is_admin !== undefined) {
      updates.is_admin = body.is_admin;
    }
    if (body.is_active !== undefined) {
      updates.is_active = body.is_active;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", userId)
      .select("id, email, full_name, is_admin, role, is_active, updated_at")
      .single();

    if (error || !data) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "/api/settings/users/[userId]#PATCH",
        message: "Failed to update user profile.",
        details: { reason: error?.message, userId },
        cause: error ?? undefined,
      });
    }

    const payload = { data };
    validateResponseContract(
      UserEnvelopeSchema,
      payload,
      "/api/settings/users/[userId]#PATCH",
    );
    return NextResponse.json(payload);
  },
);

export const DELETE = withApiGuardrails<Promise<{ userId: string }>>(
  "/api/settings/users/[userId]#DELETE",
  async ({ params }) => {
    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "/api/settings/users/[userId]#DELETE",
        message: "Invalid user id.",
      });
    }
    const { userId } = parsedParams.data;

    const supabase = await requireAdmin("/api/settings/users/[userId]#DELETE");
    const { error } = await supabase
      .from("user_profiles")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "/api/settings/users/[userId]#DELETE",
        message: "Failed to deactivate user.",
        details: { reason: error.message, userId },
        cause: error,
      });
    }

    return NextResponse.json({ success: true });
  },
);
