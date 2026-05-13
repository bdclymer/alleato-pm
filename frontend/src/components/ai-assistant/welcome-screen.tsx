"use client";

import type { ReactNode } from "react";
import { useCurrentUserName } from "@/hooks/use-current-user-name";

interface WelcomeScreenProps {
  children?: ReactNode;
  composer?: ReactNode;
  error?: ReactNode;
}

export function WelcomeScreen({
  children,
  composer,
  error,
}: WelcomeScreenProps) {
  const fullName = useCurrentUserName();
  const rawFirstName = fullName.split(" ")[0] ?? "";
  // Capitalize first letter so lowercase profile names render as "Megan", not "megan".
  const firstName = rawFirstName
    ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1)
    : rawFirstName;

  return (
    <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-8 sm:px-6 lg:items-center lg:py-12">
      <div className="w-full max-w-4xl space-y-7">
        <div className="space-y-2 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            Hi, {firstName}
          </p>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
            What do you want to work through today?
          </h1>
        </div>

        {composer && (
          <div className="mx-auto w-full max-w-3xl">
            {error && <div className="mb-2">{error}</div>}
            {composer}
          </div>
        )}

        {children && <div className="mx-auto w-full">{children}</div>}
      </div>
    </div>
  );
}
