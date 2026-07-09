"use client";

import { ArrowUpRight, FileText } from "lucide-react";
import type { BriefSourceChip } from "./brief-model";

/**
 * The linked source chips under a brief item. Each chip opens the real source
 * (transcript / email / document / in-app meeting). A chip with no resolvable
 * link renders as muted, non-interactive text — we never fabricate a link.
 */
export function BriefSources({
  sources,
  className,
}: {
  sources: BriefSourceChip[];
  className?: string;
}) {
  if (sources.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className ?? ""}`}>
      {sources.map((source, index) =>
        source.href ? (
          <a
            key={`${source.label}-${index}`}
            href={source.href}
            {...(source.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <FileText className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{source.label}</span>
            {source.external ? (
              <ArrowUpRight className="size-2.5 shrink-0 opacity-70" aria-hidden />
            ) : null}
          </a>
        ) : (
          <span
            key={`${source.label}-${index}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
          >
            <FileText className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{source.label}</span>
          </span>
        ),
      )}
    </div>
  );
}
