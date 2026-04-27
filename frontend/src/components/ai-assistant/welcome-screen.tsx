"use client";

import type { ReactNode } from "react";
import { AnimatedOrb } from "./animated-orb";

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  children?: ReactNode;
}

export function WelcomeScreen({
  onSelectPrompt: _onSelectPrompt,
  children,
}: WelcomeScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 pb-40 pt-16 sm:px-6">
      <div className="w-full max-w-xl">
        <div className="space-y-3 text-center">
          <div className="orb-intro mx-auto flex h-24 w-24 items-center justify-center">
            <AnimatedOrb size={96} />
          </div>
          <h1 className="text-blur-intro text-xl font-semibold text-muted-foreground sm:text-2xl">
            Hi, my name is Jarvis
          </h1>
          <p className="text-sm text-muted-foreground/75 sm:text-base">
            Send a message to begin chatting with the AI assistant
          </p>
        </div>

        {children && <div className="mx-auto mt-8 max-w-3xl">{children}</div>}
      </div>
    </div>
  );
}
