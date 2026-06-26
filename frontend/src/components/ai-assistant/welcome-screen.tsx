"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCurrentUserName } from "@/hooks/use-current-user-name";
import { AnimatedOrb } from "./animated-orb";

interface WelcomeScreenProps {
  children?: ReactNode;
  beforeComposer?: ReactNode;
  afterComposer?: ReactNode;
  composer?: ReactNode;
  error?: ReactNode;
  /** Omit the decorative animated orb (used by the compact floating widget). */
  hideOrb?: boolean;
  variant?: "full" | "widget";
}

export function WelcomeScreen({
  children,
  beforeComposer,
  afterComposer,
  composer,
  error,
  hideOrb = false,
  variant = "full",
}: WelcomeScreenProps) {
  const fullName = useCurrentUserName();
  const rawFirstName = fullName.split(" ")[0] ?? "";
  const firstName = rawFirstName
    ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1)
    : rawFirstName;

  if (variant === "widget") {
    return (
      <div className="flex min-h-0 flex-1 items-end overflow-y-auto px-4 pb-3 pt-3">
        <div className="w-full space-y-3">
          {error}
          {beforeComposer}
          {composer}
          {children ? <div>{children}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 pb-40 pt-16 sm:px-6">
      <div className="w-full max-w-5xl">
        <div className="space-y-3 text-center">
          {!hideOrb && (
            <div className="orb-intro mx-auto flex h-24 w-24 items-center justify-center">
              <AnimatedOrb size={96} />
            </div>
          )}
          <h1 className="text-blur-intro text-xl font-semibold text-muted-foreground sm:text-2xl">
            Hello, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground/75 sm:text-base">
            How can I help?
          </p>
        </div>

        {(composer || children) && (
          <div className="mx-auto mt-8 max-w-3xl">
            {error && <div className="mb-2">{error}</div>}
            {beforeComposer}
            {composer}
            {afterComposer ? <div className="mt-4">{afterComposer}</div> : null}
            <div className="mt-3 flex items-center justify-center gap-4 text-center">
              <Link
                href="/ai/profile"
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                AI Profile
              </Link>
              <Link
                href="/ai/teach"
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Teach Alleato
              </Link>
            </div>
          </div>
        )}
        {children ? <div className="mx-auto max-w-5xl">{children}</div> : null}
      </div>
    </div>
  );
}
