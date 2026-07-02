"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { StatusBadge } from "@/components/ds";
import { SectionRuleHeading } from "@/components/layout/spacing";
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogDescription,
  MorphingDialogSubtitle,
  MorphingDialogTitle,
  MorphingDialogTrigger,
} from "@/components/motion/morphing-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type QuickViewField = {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
};

export interface QuickViewRecord {
  id: string;
  eyebrow: string;
  title: string;
  status?: string | null;
  summary?: string | null;
  meta: string[];
  href: string;
  linkLabel: string;
  fields: QuickViewField[];
}

interface PrimeContractQuickViewSectionProps {
  label: string;
  items: QuickViewRecord[];
  isLoading?: boolean;
  emptyMessage: string;
}

export function PrimeContractQuickViewSection({
  label,
  items,
  isLoading = false,
  emptyMessage,
}: PrimeContractQuickViewSectionProps) {
  return (
    <section className="space-y-3">
      <SectionRuleHeading label={label} />

      {isLoading ? (
        <div className="max-w-lg space-y-2.5">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={`${label}-skeleton-${index}`}
              className="rounded-md border border-border/50 px-3.5 py-3"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-6 w-2/3" />
              <Skeleton className="mt-3 h-4 w-4/5" />
              <Skeleton className="mt-2 h-4 w-3/5" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border-y border-border/60 py-4 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="max-w-lg space-y-2.5">
          {items.map((item) => (
            <MorphingDialog
              key={item.id}
              transition={{ type: "spring", bounce: 0.06, duration: 0.24 }}
            >
              <MorphingDialogTrigger className="w-full rounded-md border border-border/50 bg-background px-3.5 py-3 text-left transition-colors hover:bg-muted/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {item.eyebrow}
                    </div>
                    <MorphingDialogTitle className="line-clamp-2 text-[15px] font-semibold leading-5 text-foreground">
                      {item.title}
                    </MorphingDialogTitle>
                  </div>
                  {item.status ? <StatusBadge status={item.status} /> : null}
                </div>
                {item.summary ? (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-muted-foreground">
                    {item.summary}
                  </p>
                ) : null}
                {item.meta.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {item.meta.slice(0, 3).map((entry) => (
                      <span key={`${item.id}-${entry}`} className="whitespace-nowrap">
                        {entry}
                      </span>
                    ))}
                  </div>
                ) : null}
              </MorphingDialogTrigger>

              <MorphingDialogContainer>
                <MorphingDialogContent className="pointer-events-auto relative mx-4 w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-background">
                  <div className="space-y-6 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <MorphingDialogSubtitle className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {item.eyebrow}
                        </MorphingDialogSubtitle>
                        <MorphingDialogTitle className="text-2xl font-semibold text-foreground">
                          {item.title}
                        </MorphingDialogTitle>
                        {item.status ? <StatusBadge status={item.status} /> : null}
                      </div>
                    </div>

                    <MorphingDialogDescription
                      disableLayoutAnimation
                      className="space-y-6"
                    >
                      {item.summary ? (
                        <p className="text-sm leading-6 text-muted-foreground">
                          {item.summary}
                        </p>
                      ) : null}

                      <div className="grid gap-4 sm:grid-cols-2">
                        {item.fields.map((field) => (
                          <div
                            key={`${item.id}-${field.label}`}
                            className={field.fullWidth ? "sm:col-span-2" : undefined}
                          >
                            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                              {field.label}
                            </div>
                            <div className="mt-1 text-sm leading-6 text-foreground">
                              {field.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                        <div className="text-sm text-muted-foreground">
                          Open the canonical record for editing and full workflow actions.
                        </div>
                        <Button asChild size="sm">
                          <Link href={item.href}>
                            {item.linkLabel}
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </MorphingDialogDescription>
                  </div>

                  <MorphingDialogClose className="text-muted-foreground hover:text-foreground" />
                </MorphingDialogContent>
              </MorphingDialogContainer>
            </MorphingDialog>
          ))}
        </div>
      )}
    </section>
  );
}
