"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import {
  defaultMomentumStats,
  defaultOnboardingInsights,
  onboardingCopy,
  ONBOARDING_VISIBILITY_EVENT,
  WELCOME_ONBOARDING_STORAGE_KEY,
  type MomentumStats,
  type OnboardingInsight,
} from "@/lib/onboarding/copy";
import { findAlleatoAiProfile } from "@/config/aiPersonalization";
import { cn } from "@/lib/utils";
import { FoundationStep } from "./steps/FoundationStep";
import { MissionStep } from "./steps/MissionStep";
import { WidgetShowcaseStep } from "./steps/WidgetShowcaseStep";
import { WowStep } from "./steps/WowStep";

export type WelcomeOnboardingProps = {
  forceOpen?: boolean;
  insights?: OnboardingInsight[];
  stats?: MomentumStats;
  storageKey?: string;
};

const TOTAL_STEPS = 4;

export function WelcomeOnboarding({
  forceOpen,
  insights = defaultOnboardingInsights,
  stats = defaultMomentumStats,
  storageKey = WELCOME_ONBOARDING_STORAGE_KEY,
}: WelcomeOnboardingProps) {
  const searchParams = useSearchParams();
  const { profile: currentUserProfile } = useCurrentUserProfile();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const queryForceOpen = searchParams?.get("onboarding") === "1";

  const personalizationProfile = React.useMemo(
    () =>
      findAlleatoAiProfile({
        email: currentUserProfile?.email,
        displayName: currentUserProfile?.fullName,
      }),
    [currentUserProfile?.email, currentUserProfile?.fullName],
  );

  const userName = currentUserProfile?.fullName || personalizationProfile.displayName;

  React.useEffect(() => {
    const shouldForceOpen = forceOpen || queryForceOpen;
    if (shouldForceOpen) {
      setStep(0);
      setOpen(true);
      return;
    }

    const seen = window.localStorage.getItem(storageKey);
    if (!seen) {
      setStep(0);
      setOpen(true);
    }
  }, [forceOpen, queryForceOpen, storageKey]);

  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(ONBOARDING_VISIBILITY_EVENT, { detail: { open } }),
    );
    document.documentElement.dataset.alleatoOnboardingOpen = open ? "true" : "false";
    return () => {
      window.dispatchEvent(
        new CustomEvent(ONBOARDING_VISIBILITY_EVENT, { detail: { open: false } }),
      );
      document.documentElement.dataset.alleatoOnboardingOpen = "false";
    };
  }, [open]);

  const close = React.useCallback(
    (completed: boolean) => {
      if (completed) {
        window.localStorage.setItem(storageKey, new Date().toISOString());
      }
      setOpen(false);
    },
    [storageKey],
  );

  const next = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((current) => current + 1);
      return;
    }
    close(true);
  };

  const back = () => setStep((current) => Math.max(0, current - 1));

  const handleCreateTestProject = () => {
    close(true);
    window.location.assign("/create-project?testProject=1");
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close(false)}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-xl"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Welcome to Alleato AI</DialogTitle>
        <div className="flex items-center justify-between border-b px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {onboardingCopy.shell.eyebrow}
            </span>
          </div>
          <StepDots current={step} total={TOTAL_STEPS} />
        </div>

        <div className="min-h-96 overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
          {step === 0 && <FoundationStep stats={stats} />}
          {step === 1 && <WowStep userName={userName} insights={insights} />}
          {step === 2 && <WidgetShowcaseStep />}
          {step === 3 && <MissionStep onCreateTestProject={handleCreateTestProject} />}
        </div>

        <div className="flex items-center justify-between border-t bg-muted/30 px-5 py-4 sm:px-6">
          <Button
            type="button"
            onClick={() => close(true)}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[13px] text-muted-foreground hover:text-foreground"
          >
            {onboardingCopy.shell.skip}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={back} disabled={step === 0}>
              {onboardingCopy.shell.back}
            </Button>
            <Button
              size="sm"
              onClick={next}
              className={cn(step === TOTAL_STEPS - 1 && "bg-primary hover:bg-primary/90")}
            >
              {step === TOTAL_STEPS - 1
                ? onboardingCopy.shell.startExploring
                : onboardingCopy.shell.continue}
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-2 rounded-full transition-all",
            index === current
              ? "w-6 bg-primary"
              : index < current
                ? "w-2 bg-foreground/70"
                : "w-2 bg-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}
