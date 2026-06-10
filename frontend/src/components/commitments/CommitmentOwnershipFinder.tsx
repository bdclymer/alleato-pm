"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";

import { SectionRuleHeading } from "@/components/layout/spacing";

import { useCommitmentScopeLookup } from "@/hooks/use-commitments-query";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function CommitmentOwnershipFinder({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const { data, isLoading, isFetching } = useCommitmentScopeLookup(projectId, deferredQuery, {
    limit: 8,
  });

  const results = data?.data ?? [];
  const hasQuery = deferredQuery.length >= 2;

  return (
    <section className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <SectionRuleHeading label="Who Does This?" />
        <p className="text-sm text-muted-foreground">
          Search contract scope, inclusions, exclusions, and SOV language to find the commitment owner.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
        <div className="border-b border-border/60 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for work like insulation, demo, framing, punch, or cleanup..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="divide-y divide-border/60">
          {!hasQuery ? (
            <div className="px-4 py-4 text-sm text-muted-foreground">
              Start with at least two characters. The finder checks contract descriptions, inclusions, exclusions, and line-item scope.
            </div>
          ) : isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-3 px-4 py-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))
          ) : results.length === 0 ? (
            <div className="px-4 py-4 text-sm text-muted-foreground">
              No matching commitments found for “{deferredQuery}”.
            </div>
          ) : (
            results.map((result) => {
              const title =
                [result.contract_number, result.title].filter(Boolean).join(" - ") ||
                "Untitled commitment";

              return (
                <Link
                  key={result.id}
                  href={`/${projectId}/commitments/${result.id}`}
                  className="block px-4 py-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium text-foreground">{title}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {result.contract_company_name || "Unknown company"}
                        {result.trade_names.length > 0 ? ` · ${result.trade_names.join(", ")}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                      {result.commitment_type === "subcontract" ? "Subcontract" : "Purchase Order"}
                    </span>
                  </div>

                  {result.scope_summary ? (
                    <p className="mt-2 text-sm text-foreground">{result.scope_summary}</p>
                  ) : null}

                  {result.matched_text ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {result.match_reason ? `${result.match_reason}: ` : ""}
                      {result.matched_text}
                    </p>
                  ) : null}

                  {(result.inclusion_summary || result.exclusion_summary) && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {result.inclusion_summary ? (
                        <span>Includes: {result.inclusion_summary}</span>
                      ) : null}
                      {result.exclusion_summary ? (
                        <span>Excludes: {result.exclusion_summary}</span>
                      ) : null}
                    </div>
                  )}
                </Link>
              );
            })
          )}
        </div>

        {isFetching && !isLoading && hasQuery ? (
          <div className="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
            Refreshing matches...
          </div>
        ) : null}
      </div>
    </section>
  );
}
