"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LinearIssueTable,
  LinearFilterBar,
  transformToLinearIssue,
  groupIssuesByStatus,
  type LinearIssue,
} from "@/components/ui/linear-issue-table";

interface IssuesClientPageProps {
  data: Record<string, unknown>[];
}

export function IssuesClientPage({ data }: IssuesClientPageProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"linear" | "table">("linear");

  // Transform database records to LinearIssue format
  const issues: LinearIssue[] = data.map(transformToLinearIssue);

  // Group issues by status
  const groups = groupIssuesByStatus(issues);

  const handleIssueClick = (issue: LinearIssue) => {
    router.push(`/issues/${issue.id}`);
  };

  const handleAddIssue = (_status: string) => {
    // TODO: Open create issue dialog
  };

  const handleFilterClick = () => {
    // TODO: Open filter popover
  };

  return (
    <div className="flex flex-col h-full">
      {/* View Mode Toggle + Filter Bar */}
      <div className="flex items-center justify-between border-b border-border/50 bg-background sticky top-0 z-10">
        <LinearFilterBar
          totalIssues={issues.length}
          onFilterClick={handleFilterClick}
        />
        <div className="flex items-center gap-1 px-4">
          <button
            onClick={() => setViewMode("linear")}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              viewMode === "linear"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Linear
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              viewMode === "table"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "linear" ? (
        <LinearIssueTable
          groups={groups}
          onIssueClick={handleIssueClick}
          onAddIssue={handleAddIssue}
        />
      ) : (
        <div className="p-4 text-muted-foreground text-sm">
          Table view coming soon. Switch to Linear view to see grouped issues.
        </div>
      )}
    </div>
  );
}
