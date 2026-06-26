"use client";

import { useMemo } from "react";
import { VeltProvider } from "@veltdev/react";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { useDeferredMount } from "@/hooks/use-deferred-mount";

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
  const apiKey = process.env.NEXT_PUBLIC_VELT_API_KEY;
  // Defer booting the Velt SDK past the critical render window. VeltProvider
  // loads velt.js (~1.4 MB) and inits the SDK in a useEffect gated on `apiKey`;
  // passing the key only after a delay + browser idle moves that cost off the
  // LCP path. The provider stays mounted at the same tree position the whole
  // time, so page children never remount — only the SDK script load is delayed.
  // Velt's React hooks are null-safe until the client exists, so the header's
  // comment button no-ops gracefully during the brief pre-boot window.
  const sdkReady = useDeferredMount(3_000);

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

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[Velt] NEXT_PUBLIC_VELT_API_KEY is not configured.");
    }
    return <>{children}</>;
  }

  return (
    <VeltProvider
      apiKey={sdkReady ? apiKey : ""}
      authProvider={authProvider}
    >
      {children}
    </VeltProvider>
  );
}
