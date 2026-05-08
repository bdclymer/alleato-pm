"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { CalendarDays, ChevronDown, FileText, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

function displayProjectLabel(value: string) {
  const label = value.replace(/\s+/g, " ").trim() || "No project linked";
  return label.replace(/^\d{2,5}\s*[-:]?\s+/, "").trim() || label;
}

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
        className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 border-b border-border pb-0.5 text-muted-foreground hover:border-foreground hover:text-foreground"
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
  defaultOpen = false,
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
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [rawEvidenceOpen, setRawEvidenceOpen] = useState(false);
  const [isResolving, startResolveTransition] = useTransition();
  const router = useRouter();
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
  const projectLabel = displayProjectLabel(item.project);
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
      className="bg-background"
    >
      <CollapsibleTrigger className="group flex w-full items-start gap-4 py-5 text-left outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="text-base font-semibold leading-snug text-foreground">
            {item.title}
          </div>

          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {item.summary}
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5" />
              {item.date}
            </span>
            <span className="inline-flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              {item.source}
            </span>
            <span className="inline-flex items-center gap-2">
              <ListChecks className="h-3.5 w-3.5" />
              {citationCount} source{citationCount === 1 ? "" : "s"}
            </span>
            {actionLabel && <span>{actionLabel}</span>}
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

      <CollapsibleContent>
        <div className="pb-6">
          <div className="border-t border-border/60 pt-4">
            <DetailBlock label="Project">
              {item.sourceId ? (
                <ExecutiveProjectLinkForm
                  sourceId={item.sourceId}
                  projects={projects}
                  currentProjectId={currentProjectId}
                  label={projectLabel}
                />
              ) : projectHref ? (
                <a
                  href={projectHref}
                  className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                >
                  {projectLabel}
                </a>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {projectLabel}
                  </span>
                </>
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

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {followUpId && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 px-4 text-xs font-medium"
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
              </div>
            </DetailBlock>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
