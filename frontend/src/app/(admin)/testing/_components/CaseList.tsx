"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ds";
import { FlaskConical } from "lucide-react";
import type { TestCase } from "./types";

// Premium hairline-divided list for test cases. No card wrappers, no
// border-on-row — just whitespace and a single divider between rows.
export function CaseList({
  cases,
  toolName,
  emptyTitle = "No test cases",
  emptyDescription = "Cases will appear here once added to this suite.",
}: {
  cases: TestCase[];
  toolName: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (cases.length === 0) {
    return (
      <EmptyState
        icon={<FlaskConical />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }
  return (
    <ul className="divide-y divide-border">
      {cases.map((c) => (
        <li key={c.id}>
          <Link
            href={`/testing/${toolName}/cases/${c.id}`}
            className="group flex items-start gap-4 px-1 py-4 transition-colors hover:bg-muted/40"
          >
            <span className="mt-0.5 w-14 shrink-0 font-mono text-xs text-muted-foreground">
              {c.test_number}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                {c.test_name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {c.category}
                {c.subcategory ? ` · ${c.subcategory}` : ""}
              </p>
            </div>
            <PriorityPill priority={c.priority} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PriorityPill({ priority }: { priority: "HIGH" | "MEDIUM" | "LOW" }) {
  const tone =
    priority === "HIGH"
      ? "bg-destructive/10 text-destructive"
      : priority === "MEDIUM"
      ? "bg-warning/10 text-warning"
      : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        tone,
      )}
    >
      {priority}
    </span>
  );
}
