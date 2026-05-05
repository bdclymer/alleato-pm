"use client";

import { ArrowTopRightIcon } from "@radix-ui/react-icons";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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

const toneDotClass: Record<Tone, string> = {
  risk: "bg-destructive",
  watch: "bg-amber-500",
  good: "bg-emerald-500",
  neutral: "bg-border",
};

const toneLabelClass: Record<Tone, string> = {
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
      {/* ── Compact row trigger ── */}
      <MorphingDialogTrigger
        className="group w-full rounded-md border-t border-border/50 px-2 py-2.5 text-left transition-colors first:border-t-0 hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", toneDotClass[tone])} />
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
            {item.title}
          </span>
          <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
            <Badge variant="secondary" className="rounded-full text-xs hidden sm:inline-flex">
              {item.project}
            </Badge>
            <span className="text-xs">{item.date}</span>
            <span className="text-xs font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">View</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </MorphingDialogTrigger>

      {/* ── Expanded modal ── */}
      <MorphingDialogContainer>
        <MorphingDialogContent
          style={{ borderRadius: "16px" }}
          className="pointer-events-auto relative flex w-full max-w-lg flex-col overflow-hidden bg-card shadow-sm"
        >
          <div className="space-y-4 p-6">
            {/* Tone + badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", toneDotClass[tone])} />
              <span className={cn("text-[10px] font-semibold uppercase tracking-widest", toneLabelClass[tone])}>
                {toneLabel[tone]}
              </span>
              <Badge variant="secondary" className="rounded-full text-xs">{item.project}</Badge>
              {item.status && (
                <Badge variant="outline" className="rounded-full text-xs">{item.status}</Badge>
              )}
            </div>

            {/* Title */}
            <MorphingDialogTitle className="text-base font-semibold leading-snug text-foreground">
              {item.title}
            </MorphingDialogTitle>

            {/* Animated body */}
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

                {/* Source meta */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{item.source}</span>
                  <span>{item.sourceDetail}</span>
                  <span>{item.date}</span>
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Open source
                      <ArrowTopRightIcon className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {/* Task form */}
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
