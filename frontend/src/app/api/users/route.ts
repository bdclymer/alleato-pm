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
  person_id: z.string().nullable().optional(),
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

  const users = data ?? [];
  const userIds = users.map((user) => user.id);
  const emails = users
    .map((user) => user.email)
    .filter((email): email is string => Boolean(email));

  const { data: peopleData, error: peopleError } = userIds.length > 0 || emails.length > 0
    ? await supabase
        .from("people")
        .select("id, auth_user_id, email")
        .or(
          [
            userIds.length > 0 ? `auth_user_id.in.(${userIds.join(",")})` : null,
            emails.length > 0 ? `email.in.(${emails.join(",")})` : null,
          ]
            .filter(Boolean)
            .join(","),
        )
    : { data: [], error: null };

  if (peopleError) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/users#GET",
      message: "Failed to fetch user directory links.",
      details: { reason: peopleError.message },
      cause: peopleError,
    });
  }

  const peopleByAuthId = new Map((peopleData ?? []).map((person) => [person.auth_user_id, person.id]));
  const peopleByEmail = new Map(
    (peopleData ?? [])
      .filter((person) => person.email)
      .map((person) => [person.email?.toLowerCase(), person.id]),
  );

  const payload = {
    users: users.map((user) => ({
      ...user,
      person_id:
        peopleByAuthId.get(user.id) ??
        (user.email ? peopleByEmail.get(user.email.toLowerCase()) : null) ??
        null,
    })),
  };
  validateResponseContract(
    z.object({ users: z.array(UserSchema) }),
    payload,
    "/api/users#GET",
  );

  return NextResponse.json(payload);
});
