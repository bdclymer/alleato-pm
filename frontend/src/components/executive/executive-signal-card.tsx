"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogDescription,
  MorphingDialogClose,
} from "@/components/motion/morphing-dialog";
import {
  ExecutiveTaskDraftForm,
  type ExecutiveTaskAssigneeOption,
} from "@/components/executive/executive-task-draft-form";
import type { BrandonBriefItem } from "@/lib/executive/brandon-daily-update";

type Tone = NonNullable<BrandonBriefItem["tone"]>;

const toneProjectClass: Record<Tone, string> = {
  risk: "text-destructive",
  watch: "text-amber-600",
  good: "text-emerald-600",
  neutral: "text-muted-foreground",
};

const toneLabel: Record<Tone, string> = {
  risk: "Risk",
  watch: "Watch",
  good: "Good",
  neutral: "Update",
};

export function ExecutiveSignalCard({
  item,
  employees,
  hasMatchingTask,
}: {
  item: BrandonBriefItem;
  employees: ExecutiveTaskAssigneeOption[];
  hasMatchingTask: boolean;
}) {
  const tone = item.tone ?? "neutral";

  return (
    <MorphingDialog transition={{ type: "spring", bounce: 0.05, duration: 0.28 }}>
      {/* ── Card trigger ── */}
      <MorphingDialogTrigger
        className="w-full text-left"
        style={{ borderRadius: "12px" }}
      >
        <div className="group rounded-xl border border-border p-5 transition-shadow hover:shadow-sm">
          <p className={cn("mb-2 text-[11px] font-semibold uppercase tracking-widest", toneProjectClass[tone])}>
            {item.project}
          </p>
          <p className="mb-2 text-sm font-semibold leading-snug text-foreground">
            {item.title}
          </p>
          <p className="mb-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {item.summary}
          </p>
          <span className={cn("inline-flex items-center gap-1 text-sm font-medium transition-gap", toneProjectClass[tone])}>
            View Details
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </MorphingDialogTrigger>

      {/* ── Expanded modal ── */}
      <MorphingDialogContainer>
        <MorphingDialogContent
          style={{ borderRadius: "16px" }}
          className="pointer-events-auto relative flex w-full max-w-lg flex-col overflow-hidden bg-card shadow-lg"
        >
          <div className="space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("text-[11px] font-semibold uppercase tracking-widest", toneProjectClass[tone])}>
                {item.project}
              </span>
              <span className="text-[11px] text-muted-foreground">·</span>
              <span className={cn("text-[11px] font-semibold uppercase tracking-widest", toneProjectClass[tone])}>
                {toneLabel[tone]}
              </span>
              {item.status && (
                <>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground">{item.status}</span>
                </>
              )}
            </div>

            <MorphingDialogTitle className="text-base font-semibold leading-snug text-foreground">
              {item.title}
            </MorphingDialogTitle>

            <MorphingDialogDescription
              disableLayoutAnimation
              variants={{
                initial: { opacity: 0, y: 6 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: 6 },
              }}
            >
              <div className="space-y-3">
                <p className="text-sm leading-6 text-muted-foreground">{item.summary}</p>

                {item.recommendedAction && (
                  <p className="text-sm leading-6 text-foreground">
                    <span className="font-semibold">Next move: </span>
                    {item.recommendedAction}
                  </p>
                )}

                {item.bullets.length > 0 && (
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {item.bullets.slice(0, 3).map((bullet) => (
                      <li key={bullet} className="flex gap-2.5">
                        <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{item.source}</span>
                  <span>·</span>
                  <span>{item.sourceDetail}</span>
                  <span>·</span>
                  <span>{item.date}</span>
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Open source
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="pt-1">
                  <ExecutiveTaskDraftForm
                    sourceId={item.sourceId}
                    title={item.title}
                    description={item.recommendedAction ?? item.summary}
                    employees={employees}
                    hasMatchingTask={hasMatchingTask}
                  />
                </div>
              </div>
            </MorphingDialogDescription>
          </div>

          <MorphingDialogClose className="text-muted-foreground hover:text-foreground" />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}
