import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoAlert } from "@/components/ds/InfoAlert";
import { onboardingCopy } from "@/lib/onboarding/copy";

export function MissionStep({ onCreateTestProject }: { onCreateTestProject: () => void }) {
  return (
    <div>
      <Badge
        variant="outline"
        className="mb-4 border-status-info/20 bg-status-info/10 text-status-info hover:bg-status-info/10"
      >
        {onboardingCopy.mission.badge}
      </Badge>
      <h1 className="mb-2 text-[22px] font-semibold leading-snug tracking-tight text-foreground">
        {onboardingCopy.mission.headline}
      </h1>
      <p className="mb-5 text-[13.5px] leading-relaxed text-muted-foreground">
        {onboardingCopy.mission.body}
      </p>
      <Button
        type="button"
        onClick={onCreateTestProject}
        className="flex h-auto w-full items-center justify-between gap-3 rounded-2xl bg-foreground p-5 text-background shadow-sm transition-all hover:-translate-y-px hover:bg-foreground/90"
      >
        <div className="text-left">
          <div className="text-[15px] font-medium tracking-tight">
            {onboardingCopy.mission.cta}
          </div>
          <div className="mt-0.5 text-[12.5px] text-background/70">
            {onboardingCopy.mission.ctaMeta}
          </div>
        </div>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary">
          <ArrowRight className="size-4" />
        </div>
      </Button>
      <InfoAlert
        variant="info"
        icon={<Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />}
        className="mt-5 border-0 bg-muted/50 text-muted-foreground"
      >
        <div className="text-[12.5px] leading-relaxed">
          <strong className="font-medium text-foreground">{onboardingCopy.mission.helperTitle}</strong>{" "}
          {onboardingCopy.mission.helperBody}
        </div>
      </InfoAlert>
      <div className="mt-3.5 rounded-lg bg-primary/5 px-3.5 py-3 text-center text-[12px] text-muted-foreground">
        {onboardingCopy.mission.footer}
      </div>
    </div>
  );
}
