"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { onboardingCopy, type MomentumStats } from "@/lib/onboarding/copy";

export function FoundationStep({ stats }: { stats: MomentumStats }) {
  return (
    <div className="flex h-full flex-col">
      <Badge
        variant="outline"
        className="mb-5 w-fit border-primary/20 bg-primary/5 text-primary hover:bg-primary/5"
      >
        <span className="mr-1.5 size-1.5 rounded-full bg-primary" />
        {onboardingCopy.foundation.badge}
      </Badge>

      <h1 className="mb-3 text-2xl font-semibold leading-tight tracking-tight text-foreground">
        You're not testing software.
        <br />
        You're shaping it.
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        {onboardingCopy.foundation.body}
      </p>

      <div className="rounded-xl border-l-2 border-primary bg-muted/50 p-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {onboardingCopy.foundation.pact.title}
        </div>
        <div className="flex flex-col gap-2.5">
          {onboardingCopy.foundation.pact.items.map((item) => (
            <PactItem key={item} text={item} />
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-5 text-xs text-muted-foreground">
        <Stat n={stats.fixesShipped} label={onboardingCopy.foundation.statLabels.fixesShipped} />
        <Stat n={stats.activeTesters} label={onboardingCopy.foundation.statLabels.activeTesters} />
        <Stat n={stats.launchesThisWeek} label={onboardingCopy.foundation.statLabels.launchesThisWeek} />
      </div>
    </div>
  );
}

function PactItem({ text }: { text: string }) {
  const [checked, setChecked] = React.useState(true);
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-snug text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="mt-1 accent-primary"
      />
      <span>{text}</span>
    </label>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span>
      <span className="font-medium text-foreground">{n}</span> {label}
    </span>
  );
}
