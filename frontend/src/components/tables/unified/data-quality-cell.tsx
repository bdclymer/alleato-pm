"use client";

import { cn } from "@/lib/utils";

type DataQualitySeverity = "warning" | "info";

interface DataQualityCellIssue {
  id: string;
  label: string;
  severity: DataQualitySeverity;
}

interface DataQualityCellProps {
  issues: DataQualityCellIssue[];
}

export function DataQualityCell({ issues }: DataQualityCellProps) {
  if (issues.length === 0) {
    return <span className="text-xs text-muted-foreground">Ready</span>;
  }

  const visibleIssues = issues.slice(0, 2);
  const hiddenIssueCount = issues.length - visibleIssues.length;
  const summary = issues.map((issue) => issue.label).join(", ");

  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-1"
      title={summary}
      aria-label={`Data quality issues: ${summary}`}
    >
      {visibleIssues.map((issue) => (
        <span
          key={issue.id}
          className={cn(
            "inline-flex h-5 max-w-32 items-center truncate rounded-md px-1.5 text-[11px] font-medium",
            issue.severity === "warning"
              ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              : "bg-muted text-muted-foreground",
          )}
        >
          {issue.label}
        </span>
      ))}
      {hiddenIssueCount > 0 && (
        <span className="text-xs text-muted-foreground">+{hiddenIssueCount}</span>
      )}
    </div>
  );
}
