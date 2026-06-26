"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { useDeferredMount } from "@/hooks/use-deferred-mount";

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
  // Defer analytics init past the critical render/hydration window. PostHog's
  // init (incl. the rrweb session recorder) costs ~260ms of main-thread time;
  // running it eagerly on mount competes for the main thread during LCP. The
  // shared deferred-mount hook waits for a delay + browser idle before firing.
  const analyticsReady = useDeferredMount(2_000);

  useEffect(() => {
    if (!analyticsReady) return;
    initPostHog();
  }, [analyticsReady]);

  useEffect(() => {
    if (!analyticsReady || !posthogInitialized || !pathname) return;
    const search = searchParams?.toString();
    const url = search ? `${pathname}?${search}` : pathname;
    posthog.capture("$pageview", { $current_url: window.location.origin + url });
  }, [analyticsReady, pathname, searchParams]);

  useEffect(() => {
    if (!analyticsReady || !posthogInitialized || !profile?.id) return;
    posthog.identify(profile.id, {
      email: profile.email ?? undefined,
      name: profile.fullName ?? undefined,
    });
  }, [analyticsReady, profile?.id, profile?.email, profile?.fullName]);

  // Sentry user attribution stays independent of analytics init so error
  // reports keep their user context even before PostHog has booted.
  useEffect(() => {
    if (!profile?.id) return;
    Sentry.setUser({
      id: profile.id,
      email: profile.email ?? undefined,
      username: profile.fullName ?? undefined,
    });
  }, [profile?.id, profile?.email, profile?.fullName]);

  return <>{children}</>;
}
