"use client";

import type { ReactNode } from "react";
import { AnimatedOrb } from "./animated-orb";
import { AssistantShortcutPanel } from "./assistant-shortcut-panel";
import { useCurrentUserName } from "@/hooks/use-current-user-name";

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  children?: ReactNode;
}

export function WelcomeScreen({
  onSelectPrompt,
  children,
}: WelcomeScreenProps) {
  const fullName = useCurrentUserName();
  const rawFirstName = fullName.split(" ")[0] ?? "";
  // Capitalize first letter so lowercase profile names render as "Megan", not "megan".
  const firstName = rawFirstName
    ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1)
    : rawFirstName;

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 pb-40 pt-12 sm:px-6">
      <div className="w-full max-w-3xl">
        <div className="space-y-3 text-center">
          <div className="orb-intro mx-auto flex h-24 w-24 items-center justify-center">
            <AnimatedOrb size={96} />
          </div>
          <h1 className="text-blur-intro text-xl font-semibold text-muted-foreground sm:text-2xl">
            Hi, {firstName}. How can I help?
          </h1>
        </div>

        <AssistantShortcutPanel
          onSelectPrompt={onSelectPrompt}
          className="mx-auto mt-8 w-full"
        />

        {children && <div className="mx-auto mt-8 w-full">{children}</div>}
      </div>
    </div>
  );
}
