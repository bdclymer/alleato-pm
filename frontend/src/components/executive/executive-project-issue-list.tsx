"use client";

import { useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import { EmptyState, InfoAlert } from "@/components/ds";
import {
  ExecutiveSignalCard,
  type ExecutiveRelatedTask,
} from "@/components/executive/executive-signal-card";
import type { ExecutiveProjectOption } from "@/components/executive/executive-project-link-form";
import type { ExecutiveTaskAssigneeOption } from "@/components/executive/executive-task-draft-form";
import { SectionRuleHeading } from "@/components/layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BrandonBriefItem } from "@/lib/executive/brandon-daily-update";

export type ExecutiveProjectIssueEntry = {
  id: string;
  section: "needsBrandon" | "waitingOnOthers" | "importantUpdates" | "carryForward";
  item: BrandonBriefItem;
  relatedTasks: ExecutiveRelatedTask[];
  followUpId?: string;
  actionLabel?: string;
  projectHref?: string | null;
  currentProjectId?: number | null;
};

type ProjectIssueGroup = {
  key: string;
  label: string;
  entries: ExecutiveProjectIssueEntry[];
  unlinked: boolean;
};

function normalizeProjectLabel(value: string) {
  return value.replace(/\s+/g, " ").trim() || "No project linked";
}

function projectGroupKey(value: string) {
  return normalizeProjectLabel(value).toLowerCase();
}

function isUnlinkedProject(value: string) {
  return /no project linked/i.test(normalizeProjectLabel(value));
}

function groupIssuesByProject(entries: ExecutiveProjectIssueEntry[]): ProjectIssueGroup[] {
  const groups = new Map<string, ProjectIssueGroup>();

  for (const entry of entries) {
    const label = normalizeProjectLabel(entry.item.project);
    const key = projectGroupKey(label);
    const existing = groups.get(key);

    if (existing) {
      existing.entries.push(entry);
    } else {
      groups.set(key, {
        key,
        label,
        entries: [entry],
        unlinked: isUnlinkedProject(label),
      });
    }
  }

  return Array.from(groups.values()).sort((left, right) => {
    if (left.unlinked !== right.unlinked) return left.unlinked ? -1 : 1;
    return left.label.localeCompare(right.label);
  });
}

function ProjectFilterRow({
  groups,
  selectedProjectKey,
  onSelectProject,
}: {
  groups: ProjectIssueGroup[];
  selectedProjectKey: string;
  onSelectProject: (projectKey: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <SectionRuleHeading
            label="Project Issues"
            actions={
              <span className="text-xs tabular-nums text-muted-foreground">
                {groups.reduce((total, group) => total + group.entries.length, 0)}
              </span>
            }
          />
        </div>
        <Select value={selectedProjectKey} onValueChange={onSelectProject}>
          <SelectTrigger className="w-full md:w-80">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">All projects with issues</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.key} value={group.key}>
                {group.label} ({group.entries.length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

    </div>
  );
}

function ProjectIssueGroupSection({
  group,
  employees,
  projects,
}: {
  group: ProjectIssueGroup;
  employees: ExecutiveTaskAssigneeOption[];
  projects: ExecutiveProjectOption[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 border-b border-border pb-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <FolderOpen className="h-4 w-4" />
            <span className="truncate">{group.label}</span>
          </div>
        </div>
        {group.unlinked && (
          <span className="text-xs font-medium text-destructive">
            Project link required
          </span>
        )}
      </div>

      <div className="space-y-3">
        {group.entries.map((entry) => (
          <ExecutiveSignalCard
            key={entry.id}
            item={entry.item}
            employees={employees}
            hasMatchingTask={entry.relatedTasks.length > 0}
            relatedTasks={entry.relatedTasks}
            followUpId={entry.followUpId}
            actionLabel={entry.actionLabel}
            projectHref={entry.projectHref}
            currentProjectId={entry.currentProjectId}
            projects={projects}
          />
        ))}
      </div>
    </section>
  );
}

export function ExecutiveProjectIssueList({
  entries,
  employees,
  projects,
}: {
  entries: ExecutiveProjectIssueEntry[];
  employees: ExecutiveTaskAssigneeOption[];
  projects: ExecutiveProjectOption[];
}) {
  const groups = useMemo(() => groupIssuesByProject(entries), [entries]);
  const [selectedProjectKey, setSelectedProjectKey] = useState("all");
  const visibleGroups =
    selectedProjectKey === "all"
      ? groups
      : groups.filter((group) => group.key === selectedProjectKey);
  const unlinkedCount = entries.filter((entry) =>
    isUnlinkedProject(entry.item.project),
  ).length;

  if (entries.length === 0) {
    return (
      <section className="space-y-4">
        <SectionRuleHeading label="Project Issues" />
        <EmptyState
          icon={<FolderOpen />}
          title="No active executive issues"
          description="Nothing high-confidence surfaced in the current packet."
          className="py-8"
        />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <ProjectFilterRow
        groups={groups}
        selectedProjectKey={selectedProjectKey}
        onSelectProject={setSelectedProjectKey}
      />

      {unlinkedCount > 0 && (
        <InfoAlert variant="error" className="text-xs leading-5">
          {unlinkedCount} item{unlinkedCount === 1 ? "" : "s"} need project
          linkage before they can become reliable project work.
        </InfoAlert>
      )}

      <div className="space-y-8">
        {visibleGroups.map((group) => (
          <ProjectIssueGroupSection
            key={group.key}
            group={group}
            employees={employees}
            projects={projects}
          />
        ))}
      </div>
    </section>
  );
}
