"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { onboardingCopy, type OnboardingInsight } from "@/lib/onboarding/copy";
import { cn } from "@/lib/utils";

export function WowStep({
  userName,
  insights,
}: {
  userName?: string;
  insights: OnboardingInsight[];
}) {
  const [shown, setShown] = React.useState(0);

  React.useEffect(() => {
    setShown(0);
    const timers = insights.map((_, i) =>
      window.setTimeout(() => setShown((n) => Math.max(n, i + 1)), 250 + i * 350),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [insights]);

  const greeting = userName
    ? onboardingCopy.wow.headlineWithName(userName)
    : onboardingCopy.wow.headlineFallback;

  return (
    <div>
      <Badge
        variant="outline"
        className="mb-4 border-primary/20 bg-primary/5 text-primary hover:bg-primary/5"
      >
        <Sparkles className="mr-1.5 size-3" />
        {onboardingCopy.wow.badge}
      </Badge>
      <h1 className="mb-2 text-[22px] font-semibold leading-snug tracking-tight text-foreground">
        {greeting}
      </h1>
      <p className="mb-5 text-[13.5px] leading-relaxed text-muted-foreground">
        {onboardingCopy.wow.body}
      </p>

      <div className="mb-5 flex flex-col gap-2.5">
        {insights.slice(0, 3).map((insight, i) => (
          <InsightRow key={`${insight.kind}-${i}`} insight={insight} visible={i < shown} />
        ))}
      </div>

      <div className="rounded-lg border-l-2 border-primary bg-muted/50 p-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">This isn't a one-time demo.</span>{" "}
        Your AI assistant lives in the bottom-right of every page — ask it anything, anytime.
      </div>
    </div>
  );
}

function InsightRow({ insight, visible }: { insight: OnboardingInsight; visible: boolean }) {
  const meta = {
    pattern: { label: "Pattern", fg: "text-status-success", bg: "bg-status-success/10" },
    risk: { label: "Risk", fg: "text-status-error", bg: "bg-status-error/10" },
    decision: { label: "Decision", fg: "text-status-info", bg: "bg-status-info/10" },
  }[insight.kind];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border bg-background p-3.5 transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
      )}
    >
      <span
        className={cn(
          "h-fit shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
          meta.fg,
          meta.bg,
        )}
      >
        {meta.label}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] leading-relaxed text-foreground">{insight.text}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">{insight.meta}</div>
      </div>
    </div>
  );
}
