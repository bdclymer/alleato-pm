import { NextResponse } from "next/server";

import { validateResponseContract, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";

const CurrentUserProfileSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  avatarUrl: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  role: z.string().optional(),
  phone: z.string().optional(),
  profileCompleteness: z.number(),
  isAdmin: z.boolean(),
  onboardingCompletedAt: z.string().nullable(),
});

const joinName = (firstName?: string | null, lastName?: string | null) =>
  [firstName, lastName].map((part) => part?.trim()).filter(Boolean).join(" ");

function calculateProfileCompleteness(profile: {
  company?: string;
  title?: string;
  role?: string;
  phone?: string;
}) {
  const trackedFields = ["company", "title", "role", "phone"] as const;
  const completedFields = trackedFields.filter((field) => Boolean(profile[field]));
  const baseScore = Math.round((completedFields.length / trackedFields.length) * 100);
  return Math.min(100, Math.max(35, baseScore + 40));
}

export const GET = withApiGuardrails("/api/users/me/profile#GET", async () => {
  const user = await getApiRouteUser();

  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/users/me/profile#GET",
      message: "Sign in before loading your profile.",
      status: 401,
    });
  }

  const supabase = createServiceClient();
  const [
    { data: profileData, error: profileError },
    { data: personData, error: personError },
  ] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("is_admin, full_name, role, onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("people")
      .select(
        "first_name, last_name, profile_photo_url, company, job_title, phone_mobile, phone_business",
      )
      .eq("auth_user_id", user.id)
      .maybeSingle(),
  ]);

  const loadError = profileError ?? personError;
  if (loadError) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: "/api/users/me/profile#GET",
      message: `Failed to load current user profile: ${loadError.message}`,
    });
  }

  const directoryFullName = joinName(personData?.first_name, personData?.last_name);
  const profile = {
    id: user.id,
    fullName:
      directoryFullName ||
      profileData?.full_name ||
      user.email?.split("@")[0] ||
      "Your profile",
    email: user.email || "—",
    avatarUrl: personData?.profile_photo_url || undefined,
    company: personData?.company || undefined,
    title: personData?.job_title || undefined,
    role: profileData?.role || undefined,
    phone: personData?.phone_mobile || personData?.phone_business || undefined,
    profileCompleteness: 0,
    isAdmin: profileData?.is_admin === true,
    onboardingCompletedAt: profileData?.onboarding_completed_at ?? null,
  };

  const responsePayload = validateResponseContract(
    CurrentUserProfileSchema,
    {
      ...profile,
      profileCompleteness: calculateProfileCompleteness(profile),
    },
    "/api/users/me/profile#GET",
  );

  return NextResponse.json({ profile: responsePayload });
});
