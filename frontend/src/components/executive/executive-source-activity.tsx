"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarIcon,
  EnvelopeClosedIcon,
  FileTextIcon,
  MixerHorizontalIcon,
} from "@radix-ui/react-icons";
import { SectionRuleHeading } from "@/components/layout";
import type { BrandonBriefSourceCoverage } from "@/lib/executive/brandon-daily-update";
import { cn } from "@/lib/utils";

const sourceIcons = {
  Email: EnvelopeClosedIcon,
  Teams: MixerHorizontalIcon,
  Meeting: CalendarIcon,
  Document: FileTextIcon,
} satisfies Record<
  BrandonBriefSourceCoverage["label"],
  React.ComponentType<{ className?: string }>
>;

function ExecutiveSourceActivityComponent({
  sources,
}: {
  sources: BrandonBriefSourceCoverage[];
}) {
  const prefersReducedMotion = useReducedMotion();
  const maxCount = Math.max(...sources.map((source) => source.count), 1);

  return (
    <section className="space-y-4">
      <div>
        <SectionRuleHeading label="Source health" className="mb-0 pb-0" />
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Recent coverage across the channels feeding the briefing.
        </p>
      </div>

      <div className="border border-border bg-background/80 p-4">
        <div className="space-y-4">
          {sources.map((source, index) => {
            const Icon = sourceIcons[source.label];
            const width = `${Math.max(12, Math.round((source.count / maxCount) * 100))}%`;

            return (
              <motion.div
                key={source.label}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion
                    ? undefined
                    : { duration: 0.32, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }
                }
                className="space-y-2"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">{source.label}</div>
                      <div className="text-sm font-semibold tabular-nums text-foreground">
                        {source.count}
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{source.detail}</span>
                      <span>Latest {source.latest}</span>
                    </div>
                  </div>
                </div>

                <div className="pl-11">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className={cn("h-full rounded-full bg-foreground/70")}
                      initial={prefersReducedMotion ? false : { scaleX: 0, transformOrigin: "left" }}
                      animate={prefersReducedMotion ? undefined : { scaleX: 1 }}
                      transition={
                        prefersReducedMotion
                          ? undefined
                          : { duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }
                      }
                      style={{ width }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export const ExecutiveSourceActivity = React.memo(ExecutiveSourceActivityComponent);
