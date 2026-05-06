"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExecutiveProjectLinkForm,
  type ExecutiveProjectOption,
} from "@/components/executive/executive-project-link-form";
import {
  ExecutiveTaskDraftForm,
  type ExecutiveTaskAssigneeOption,
} from "@/components/executive/executive-task-draft-form";
import type { BrandonBriefItem } from "@/lib/executive/brandon-daily-update";
import { resolveExecutiveFollowUpAction } from "@/app/(main)/actions/executive-briefing-actions";

type Tone = NonNullable<BrandonBriefItem["tone"]>;

export type ExecutiveRelatedTask = {
  id: string;
  description: string;
  status: string;
  dueDate: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  metadataId: string;
  projectName: string | null;
};

const toneClass: Record<Tone, string> = {
  risk: "text-destructive",
  watch: "text-status-warning",
  good: "text-status-success",
  neutral: "text-muted-foreground",
};

const toneDotClass: Record<Tone, string> = {
  risk: "bg-destructive",
  watch: "bg-status-warning",
  good: "bg-status-success",
  neutral: "bg-muted-foreground",
};

const toneLabel: Record<Tone, string> = {
  risk: "Risk",
  watch: "Watch",
  good: "Good",
  neutral: "Update",
};

function DetailBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 border-t border-border/60 py-4 first:border-t-0 first:pt-0 md:grid-cols-[132px_1fr]">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="min-w-0 text-sm leading-6 text-foreground">
        {children}
      </div>
    </div>
  );
}

function SourceRow({
  source,
  sourceDetail,
  date,
  sourceUrl,
}: {
  source: BrandonBriefItem["source"];
  sourceDetail: string;
  date: string;
  sourceUrl?: string;
}) {
  const content = (
    <>
      <span className="font-medium text-foreground">{source}</span>
      <span>{sourceDetail}</span>
      <span>{date}</span>
    </>
  );

  if (sourceUrl) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
      {content}
    </div>
  );
}

export function ExecutiveSignalCard({
  item,
  employees,
  hasMatchingTask,
  relatedTasks,
  followUpId,
  actionLabel,
  projectHref,
  currentProjectId,
  projects,
}: {
  item: BrandonBriefItem;
  employees: ExecutiveTaskAssigneeOption[];
  hasMatchingTask: boolean;
  relatedTasks: ExecutiveRelatedTask[];
  followUpId?: string;
  actionLabel?: string;
  projectHref?: string | null;
  currentProjectId?: number | null;
  projects: ExecutiveProjectOption[];
}) {
  const [open, setOpen] = useState(false);
  const [rawEvidenceOpen, setRawEvidenceOpen] = useState(false);
  const [isResolving, startResolveTransition] = useTransition();
  const router = useRouter();
  const tone = item.tone ?? "neutral";
  const primaryEvidence = item.evidence ?? item.citations[0]?.evidence;
  const evidenceCitations = item.citations.filter((citation) =>
    citation.evidence?.trim(),
  );
  const packetEvidenceFacts = item.evidenceFacts?.filter(Boolean) ?? [];
  const evidenceFacts =
    packetEvidenceFacts.length > 0
      ? packetEvidenceFacts
      : item.bullets.filter(Boolean).slice(0, 6);
  const citationCount = item.citations.length;
  const projectLabel = item.project.trim() || "No project linked";
  const isUnlinkedProject = /no project linked/i.test(projectLabel);
  const resolveFollowUp = () => {
    if (!followUpId) return;
    const formData = new FormData();
    formData.set("followUpId", followUpId);
    startResolveTransition(async () => {
      await resolveExecutiveFollowUpAction(formData);
      router.refresh();
    });
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-border bg-background"
    >
      <CollapsibleTrigger className="group flex w-full items-start gap-4 p-5 text-left outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <span
          className={cn(
            "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
            toneDotClass[tone],
          )}
        />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("font-semibold", toneClass[tone])}>
              {toneLabel[tone]}
            </span>
            {actionLabel && (
              <Badge
                variant="secondary"
                className="h-5 rounded-md px-1.5 text-[11px] font-normal"
              >
                {actionLabel}
              </Badge>
            )}
            {item.status && (
              <Badge
                variant="outline"
                className="h-5 rounded-md px-1.5 text-[11px] font-normal"
              >
                {item.status}
              </Badge>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                isUnlinkedProject ? "text-destructive" : "text-foreground",
              )}
            >
              {isUnlinkedProject && <AlertTriangle className="h-3 w-3" />}
              {projectLabel}
            </span>
          </div>

          <div className="text-base font-semibold leading-snug text-foreground">
            {item.title}
          </div>

          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {item.summary}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{item.source}</span>
            <span>{item.date}</span>
            <span>
              {citationCount} source{citationCount === 1 ? "" : "s"}
            </span>
            {relatedTasks.length > 0 && (
              <span>
                {relatedTasks.length} related task
                {relatedTasks.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-0.5 text-xs font-medium text-muted-foreground">
          <span>{open ? "Hide details" : "Show details"}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </div>
      </CollapsibleTrigger>

      {item.sourceId && (
        <div className="flex items-center gap-3 px-5 pb-4 pl-11 text-xs text-muted-foreground">
          <span>
            {isUnlinkedProject
              ? "Assign this source to a project."
              : "Wrong project?"}
          </span>
          <ExecutiveProjectLinkForm
            sourceId={item.sourceId}
            projects={projects}
            currentProjectId={currentProjectId}
            label={isUnlinkedProject ? "Link project" : "Change project"}
          />
        </div>
      )}

      <CollapsibleContent>
        <div className="px-5 pb-5">
          <div className="border-t border-border/70 pt-4">
            <DetailBlock label="Project">
              {isUnlinkedProject ? (
                <div className="space-y-3">
                  <span className="font-medium text-destructive">
                    {projectLabel}
                  </span>
                  <ExecutiveProjectLinkForm
                    sourceId={item.sourceId}
                    projects={projects}
                    currentProjectId={currentProjectId}
                    label="Link project"
                  />
                </div>
              ) : projectHref ? (
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={projectHref}
                    className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                  >
                    {projectLabel}
                  </a>
                  <ExecutiveProjectLinkForm
                    sourceId={item.sourceId}
                    projects={projects}
                    currentProjectId={currentProjectId}
                    label="Change project"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium text-foreground">
                    {projectLabel}
                  </span>
                  <ExecutiveProjectLinkForm
                    sourceId={item.sourceId}
                    projects={projects}
                    currentProjectId={currentProjectId}
                    label="Change project"
                  />
                </div>
              )}
            </DetailBlock>

            <DetailBlock label="Why it matters">
              {item.whyItMatters ?? item.summary}
            </DetailBlock>

            {item.recommendedAction && (
              <DetailBlock label="Next move">
                {item.recommendedAction}
              </DetailBlock>
            )}

            {evidenceFacts.length > 0 && (
              <DetailBlock label="Evidence">
                <ul className="space-y-2">
                  {evidenceFacts.map((fact) => (
                    <li key={fact} className="flex gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </DetailBlock>
            )}

            {(primaryEvidence || evidenceCitations.length > 0) && (
              <DetailBlock label="Raw evidence">
                <Collapsible
                  open={rawEvidenceOpen}
                  onOpenChange={setRawEvidenceOpen}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-0 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
                    >
                      {rawEvidenceOpen
                        ? "Hide raw evidence"
                        : "Show raw evidence"}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    {evidenceCitations.length > 0 ? (
                      <div className="space-y-4">
                        {evidenceCitations.map((citation, index) => (
                          <div
                            key={`${citation.source}-${citation.sourceId ?? citation.sourceDetail}-${index}`}
                            className="space-y-2"
                          >
                            {citationCount > 1 && (
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  {citation.source}
                                </span>
                                <span>{citation.sourceDetail}</span>
                                <span>{citation.date}</span>
                              </div>
                            )}
                            <p className="whitespace-pre-wrap text-muted-foreground">
                              {citation.evidence}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {primaryEvidence}
                      </p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </DetailBlock>
            )}

            <DetailBlock label="Source">
              <div className="space-y-2">
                <SourceRow
                  source={item.source}
                  sourceDetail={item.sourceDetail}
                  date={item.date}
                  sourceUrl={item.sourceUrl}
                />

                {citationCount > 1 && (
                  <div className="space-y-2 text-sm">
                    {item.citations.slice(1).map((citation) => (
                      <SourceRow
                        key={`${citation.source}-${citation.sourceId ?? citation.sourceDetail}`}
                        source={citation.source}
                        sourceDetail={citation.sourceDetail}
                        date={citation.date}
                        sourceUrl={citation.sourceUrl}
                      />
                    ))}
                  </div>
                )}
              </div>
            </DetailBlock>

            <DetailBlock label="Follow-up">
              <div className="space-y-4">
                {relatedTasks.length > 0 && (
                  <div className="space-y-2">
                    {relatedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="space-y-1 border-l-2 border-border pl-3"
                      >
                        <div className="text-sm font-medium text-foreground">
                          {task.description}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{task.status.replace(/_/g, " ")}</span>
                          <span>{task.assigneeName ?? "Unassigned"}</span>
                          {task.dueDate && <span>Due {task.dueDate}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {followUpId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    disabled={isResolving}
                    onClick={resolveFollowUp}
                  >
                    {isResolving ? "Resolving..." : "Mark resolved"}
                  </Button>
                )}

                <ExecutiveTaskDraftForm
                  sourceId={item.sourceId}
                  title={item.title}
                  description={item.recommendedAction ?? item.summary}
                  employees={employees}
                  hasMatchingTask={hasMatchingTask}
                />
              </div>
            </DetailBlock>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
