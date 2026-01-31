import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

type UserMetadata = {
  full_name?: string;
  name?: string;
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
};

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

const buildProfile = (user: User): CurrentUserProfile => {
  const metadata = (user.user_metadata ?? {}) as UserMetadata;

  const profile: CurrentUserProfile = {
    fullName:
      metadata.full_name ||
      metadata.name ||
      user.email?.split("@")[0] ||
      "Your profile",
    email: user.email || metadata.name || "—",
    avatarUrl: metadata.avatar_url,
    company: metadata.company,
    title: metadata.job_title,
    role: metadata.role || metadata.job_role,
    phone: metadata.phone,
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

export const useCurrentUserProfile = () => {
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase.auth.getUser();

      if (fetchError) {
        if (isMounted) {
          setError(fetchError.message);
          setIsLoading(false);
        }
        return;
      }

      if (data.user && isMounted) {
        const baseProfile = buildProfile(data.user);

        // Fetch admin status from user_profiles table
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("is_admin")
          .eq("id", data.user.id)
          .maybeSingle();

        setProfile({
          ...baseProfile,
          isAdmin: profileData?.is_admin === true,
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
  }, []);

  return {
    profile,
    isLoading,
    error,
  };
};
