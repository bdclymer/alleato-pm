"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { VeltProvider } from "@veltdev/react";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { shouldForceCollaborationRuntime } from "@/lib/performance/runtime-gates";
import { useCollaborationRuntimeStore } from "@/lib/stores/collaboration-runtime-store";

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
  const pathname = usePathname();
  const userEnabledRuntime = useCollaborationRuntimeStore(
    (state) => state.enabled,
  );
  const apiKey = process.env.NEXT_PUBLIC_VELT_API_KEY;
  const shouldMountRuntime =
    Boolean(apiKey) &&
    (userEnabledRuntime || shouldForceCollaborationRuntime(pathname));
  const { profile } = useCurrentUserProfile({
    enabled: shouldMountRuntime,
  });

  const authProvider = useMemo(() => {
    if (!shouldMountRuntime || !profile) return undefined;

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
  }, [profile, shouldMountRuntime]);

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[Velt] NEXT_PUBLIC_VELT_API_KEY is not configured.");
    }
    return <>{children}</>;
  }

  if (!shouldMountRuntime) {
    return <>{children}</>;
  }

  return (
    <VeltProvider
      apiKey={apiKey}
      authProvider={authProvider}
    >
      {children}
    </VeltProvider>
  );
}
