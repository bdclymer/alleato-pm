"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCurrentUserName } from "@/hooks/use-current-user-name";
import { AnimatedOrb } from "./animated-orb";

interface WelcomeScreenProps {
  children?: ReactNode;
  beforeComposer?: ReactNode;
  composer?: ReactNode;
  error?: ReactNode;
  /** Omit the decorative animated orb (used by the compact floating widget). */
  hideOrb?: boolean;
}

export function WelcomeScreen({
  children,
  beforeComposer,
  composer,
  error,
  hideOrb = false,
}: WelcomeScreenProps) {
  const fullName = useCurrentUserName();
  const rawFirstName = fullName.split(" ")[0] ?? "";
  const firstName = rawFirstName
    ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1)
    : rawFirstName;

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
            <div className="mt-3 text-center">
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
