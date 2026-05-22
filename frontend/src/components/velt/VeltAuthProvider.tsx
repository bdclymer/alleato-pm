"use client";

import { useMemo } from "react";
import { VeltProvider } from "@veltdev/react";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";

async function getVeltToken(payload: {
  userId: string;
  organizationId: string;
  email?: string;
  isAdmin?: boolean;
}): Promise<string> {
  const data = await apiFetch<{ token: string }>("/api/velt/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!data.token) throw new Error("No token returned from Velt token endpoint");
  return data.token;
}

export function VeltAuthProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useCurrentUserProfile();

  const authProvider = useMemo(() => {
    if (!profile) return undefined;

    const userId = profile.id;
    // Use company as org scope; fall back to "alleato" so all users share data
    const organizationId = "alleato";

    return {
      user: {
        userId,
        organizationId,
        name: profile.fullName ?? profile.email,
        email: profile.email,
        photoUrl: profile.avatarUrl,
      },
      retryConfig: { retryCount: 3, retryDelay: 1000 },
      generateToken: async () =>
        getVeltToken({
          userId,
          organizationId,
          email: profile.email,
          isAdmin: profile.isAdmin ?? false,
        }),
    };
  }, [profile]);

  if (!authProvider) return <>{children}</>;

  return (
    <VeltProvider
      apiKey={process.env.NEXT_PUBLIC_VELT_API_KEY!}
      authProvider={authProvider}
    >
      {children}
    </VeltProvider>
  );
}
