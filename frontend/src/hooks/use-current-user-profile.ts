import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { getCurrentBrowserUser } from "@/lib/supabase/current-user";

type UserMetadata = {
  full_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  given_name?: string;
  family_name?: string;
  avatar_url?: string;
  company?: string;
  job_title?: string;
  role?: string;
  job_role?: string;
  phone?: string;
  location?: string;
  timezone?: string;
  region?: string;
  license_number?: string;
  specialties?: string[];
  work_hours?: string;
  communication_preference?: string;
  preferred_communication?: string;
};

export type CurrentUserProfile = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  company?: string;
  title?: string;
  role?: string;
  phone?: string;
  location?: string;
  timezone?: string;
  region?: string;
  licenseNumber?: string;
  specialties?: string[];
  workHours?: string;
  communicationPreference?: string;
  profileCompleteness: number;
  isAdmin?: boolean;
  onboardingCompletedAt?: string | null;
};

type ProfileOverrides = Partial<
  Pick<
    CurrentUserProfile,
    | "fullName"
    | "avatarUrl"
    | "company"
    | "title"
    | "phone"
    | "role"
  >
>;

const joinName = (firstName?: string | null, lastName?: string | null) =>
  [firstName, lastName].map((part) => part?.trim()).filter(Boolean).join(" ");

const calculateProfileCompleteness = (profile: CurrentUserProfile) => {
  const trackedFields: (keyof CurrentUserProfile)[] = [
    "company",
    "title",
    "role",
    "phone",
    "location",
    "timezone",
    "region",
    "licenseNumber",
  ];

  const completedFields = trackedFields.filter((field) =>
    Boolean(profile[field]),
  );

  // Keep the score in a sensible range so users without optional metadata
  // still see meaningful feedback.
  const baseScore = Math.round(
    (completedFields.length / trackedFields.length) * 100,
  );
  return Math.min(100, Math.max(35, baseScore + 40));
};

const buildProfile = (
  user: User,
  overrides: ProfileOverrides = {},
): CurrentUserProfile => {
  const metadata = (user.user_metadata ?? {}) as UserMetadata;
  const metadataName =
    metadata.full_name ||
    metadata.name ||
    joinName(
      metadata.first_name || metadata.given_name,
      metadata.last_name || metadata.family_name,
    );

  const profile: CurrentUserProfile = {
    id: user.id,
    fullName:
      overrides.fullName ||
      metadataName ||
      user.email?.split("@")[0] ||
      "Your profile",
    email: user.email || metadata.name || "—",
    avatarUrl: overrides.avatarUrl || metadata.avatar_url,
    company: overrides.company || metadata.company,
    title: overrides.title || metadata.job_title,
    role: overrides.role || metadata.role || metadata.job_role,
    phone: overrides.phone || metadata.phone,
    location: metadata.location,
    timezone: metadata.timezone,
    region: metadata.region,
    licenseNumber: metadata.license_number,
    specialties: Array.isArray(metadata.specialties)
      ? metadata.specialties
      : undefined,
    workHours: metadata.work_hours,
    communicationPreference:
      metadata.communication_preference || metadata.preferred_communication,
    profileCompleteness: 0,
  };

  return {
    ...profile,
    profileCompleteness: calculateProfileCompleteness(profile),
  };
};

export const useCurrentUserProfile = (options?: { enabled?: boolean }) => {
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    let isMounted = true;

    const loadProfile = async () => {
      const supabase = createClient();

      let user: User | null = null;
      try {
        user = await getCurrentBrowserUser(supabase);
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
          setIsLoading(false);
        }
        return;
      }

      if (user && isMounted) {
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

        if (profileError && isMounted) {
          setError(profileError.message);
        }

        if (personError && isMounted) {
          setError(personError.message);
        }

        const directoryFullName = joinName(
          personData?.first_name,
          personData?.last_name,
        );
        const baseProfile = buildProfile(user, {
          fullName: directoryFullName || profileData?.full_name || undefined,
          avatarUrl: personData?.profile_photo_url || undefined,
          company: personData?.company || undefined,
          title: personData?.job_title || undefined,
          phone: personData?.phone_mobile || personData?.phone_business || undefined,
          role: profileData?.role || undefined,
        });

        setProfile({
          ...baseProfile,
          isAdmin: profileData?.is_admin === true,
          onboardingCompletedAt: profileData?.onboarding_completed_at ?? null,
        });
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return {
    profile,
    isLoading,
    error,
  };
};
