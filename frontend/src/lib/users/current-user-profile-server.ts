import { GuardrailError } from "@/lib/guardrails/errors";
import type { createServiceClient } from "@/lib/supabase/service";

export type CurrentUserProfilePayload = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  company?: string;
  title?: string;
  role?: string;
  phone?: string;
  profileCompleteness: number;
  isAdmin: boolean;
  onboardingCompletedAt: string | null;
};

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

export async function loadCurrentUserProfilePayload({
  serviceClient,
  user,
  where,
}: {
  serviceClient: ReturnType<typeof createServiceClient>;
  user: { id: string; email?: string | null };
  where: string;
}): Promise<CurrentUserProfilePayload> {
  const [
    { data: profileData, error: profileError },
    { data: personData, error: personError },
  ] = await Promise.all([
    serviceClient
      .from("user_profiles")
      .select("is_admin, full_name, role, onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle(),
    serviceClient
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
      where,
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
    email: user.email || "-",
    avatarUrl: personData?.profile_photo_url || undefined,
    company: personData?.company || undefined,
    title: personData?.job_title || undefined,
    role: profileData?.role || undefined,
    phone: personData?.phone_mobile || personData?.phone_business || undefined,
    isAdmin: profileData?.is_admin === true,
    onboardingCompletedAt: profileData?.onboarding_completed_at ?? null,
  };

  return {
    ...profile,
    profileCompleteness: calculateProfileCompleteness(profile),
  };
}
