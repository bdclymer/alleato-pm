import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { GuardrailError } from "@/lib/guardrails/errors";
import { validateResponseContract, withApiGuardrails } from "@/lib/guardrails/api";

/**
 * GET /api/users
 *
 * Returns all user profiles. Requires authenticated user.
 */
const UserSchema = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
});

export const GET = withApiGuardrails("/api/users#GET", async () => {
  const requestUser = await getApiRouteUser();
  if (!requestUser) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/users#GET",
      message: "Unauthorized users request.",
      status: 401,
      severity: "medium",
    });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, email, full_name")
    .order("full_name", { ascending: true });

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/users#GET",
      message: "Failed to fetch users.",
      details: { reason: error.message },
      cause: error,
    });
  }

  const payload = { users: data ?? [] };
  validateResponseContract(
    z.object({ users: z.array(UserSchema) }),
    payload,
    "/api/users#GET",
  );

  return NextResponse.json(payload);
});
