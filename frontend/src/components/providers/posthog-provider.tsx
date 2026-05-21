"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let posthogInitialized = false;

function initPostHog() {
  if (posthogInitialized || typeof window === "undefined" || !POSTHOG_KEY) {
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: {
      dom_event_allowlist: ["click", "submit", "change"],
    },
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '[data-ph-mask], [data-sensitive], input[type="password"]',
    },
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") {
        ph.debug(false);
      }
    },
  });

  posthogInitialized = true;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile } = useCurrentUserProfile({ enabled: Boolean(POSTHOG_KEY) });

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (!posthogInitialized || !pathname) return;
    const search = searchParams?.toString();
    const url = search ? `${pathname}?${search}` : pathname;
    posthog.capture("$pageview", { $current_url: window.location.origin + url });
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!posthogInitialized || !profile?.id) return;
    posthog.identify(profile.id, {
      email: profile.email ?? undefined,
      name: profile.fullName ?? undefined,
    });
  }, [profile?.id, profile?.email, profile?.fullName]);

  return <>{children}</>;
}
