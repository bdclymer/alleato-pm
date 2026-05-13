import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api-client";

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

type LoadProfileResult = {
  profile: CurrentUserProfile | null;
  error: string | null;
};

type CurrentUserProfileResponse = {
  profile: CurrentUserProfile;
};

const PROFILE_CACHE_TTL_MS = 30_000;

let profileCache:
  | {
      result: LoadProfileResult;
      expiresAt: number;
    }
  | null = null;
let profileInFlight: Promise<LoadProfileResult> | null = null;

async function loadCurrentUserProfile(): Promise<LoadProfileResult> {
  if (profileCache && profileCache.expiresAt > Date.now()) {
    return profileCache.result;
  }

  if (profileInFlight) {
    return profileInFlight;
  }

  profileInFlight = (async () => {
    const response = await apiFetch<CurrentUserProfileResponse>("/api/users/me/profile");
    const result: LoadProfileResult = {
      profile: response.profile,
      error: null,
    };

    profileCache = {
      result,
      expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
    };

    return result;
  })().finally(() => {
    profileInFlight = null;
  });

  return profileInFlight;
}

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
      try {
        const result = await loadCurrentUserProfile();
        if (!isMounted) {
          return;
        }
        setProfile(result.profile);
        setError(result.error);
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
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
