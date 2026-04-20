"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardList } from "lucide-react";
import { ProjectPageHeader } from "@/components/layout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import {
  EstimateTypes,
  EstimateTypeLabels,
  EstimateTypeDescriptions,
  EstimateTypeToSlug,
  type EstimateTypeStat,
  type EstimateType,
} from "@/lib/schemas/estimates";

interface Props {
  stats: EstimateTypeStat[];
}

export function EstimatesHubClient({ stats }: Props) {
  const router = useRouter();

  function getStatForType(type: EstimateType): EstimateTypeStat {
    return (
      stats.find((s) => s.type === type) ?? {
        type,
        total: 0,
        draft: 0,
        pending_review: 0,
        approved: 0,
        rejected: 0,
      }
    );
  }

  return (
    <>
      <PageContainer>
        <ProjectPageHeader
        title="Estimates"
        description="Company-wide estimate hub — ASRS sprinkler design and construction projects"
      />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {EstimateTypes.map((type) => {
            const stat = getStatForType(type);
            const slug = EstimateTypeToSlug[type];

            return (
              <Button
                key={type}
                variant="outline"
                onClick={() => router.push(`/estimates/${slug}`)}
                className="group relative flex h-auto flex-col rounded-lg bg-background p-6 text-left transition-all hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>

                {/* eslint-disable-next-line design-system/no-raw-heading */}
                <h3 className="text-base font-semibold text-foreground">
                  {EstimateTypeLabels[type]}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {EstimateTypeDescriptions[type]}
                </p>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-foreground">
                      {stat.total}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stat.total === 1 ? "estimate" : "estimates"}
                    </p>
                  </div>

                  {stat.total > 0 && (
                    <div className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground">
                      {stat.pending_review > 0 && (
                        <span className="font-medium text-warning">
                          {stat.pending_review} pending review
                        </span>
                      )}
                      {stat.draft > 0 && (
                        <span>{stat.draft} draft</span>
                      )}
                      {stat.approved > 0 && (
                        <span className="text-success">{stat.approved} approved</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-primary hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/estimates/${slug}`);
                    }}
                  >
                    View all {EstimateTypeLabels[type]} estimates
                    <ArrowRight />
                  </Button>
                </div>
              </Button>
            );
          })}
        </div>
      </PageContainer>
    </>
  );
}
