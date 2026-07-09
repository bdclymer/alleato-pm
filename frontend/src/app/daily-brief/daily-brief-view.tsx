"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api-client";
import { handleFormError } from "@/lib/handle-form-error";
import { cn } from "@/lib/utils";

import {
  BriefFeedbackDialog,
  BriefTaskDialog,
  type FeedbackTarget,
  type TaskDialogState,
} from "./brief-dialogs";
import { BriefItemMenu } from "./brief-item-menu";
import { BriefSources } from "./brief-sources";
import type {
  BriefActionVM,
  BriefItemVM,
  BriefProjectVM,
  DailyBriefModel,
} from "./brief-model";

const TONE_ACCENT: Record<BriefItemVM["tone"], string> = {
  crit: "text-destructive",
  amber: "text-primary",
  info: "text-muted-foreground",
};

const STATUS_TONE: Record<string, string> = {
  "Needs your decision": "text-primary",
  "At risk": "text-destructive",
  Watch: "text-primary",
};

/** "Needs you today" is the executive read — a few top decisions. The rest stay
 *  fully visible in Project detail below. */
const TOP_DECISIONS = 6;

/** Anything that can be resolved or turned into a task carries these fields. */
type Actionable = Pick<
  BriefItemVM,
  "key" | "title" | "summary" | "project" | "projectId" | "sourceDocId"
>;

export function DailyBriefView({ model }: { model: DailyBriefModel }) {
  const [resolvedKeys, setResolvedKeys] = useState<Set<string>>(
    () => new Set(model.resolvedKeys),
  );
  const [taskedKeys, setTaskedKeys] = useState<Set<string>>(() => new Set());
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackTarget | null>(null);
  const [taskDialog, setTaskDialog] = useState<TaskDialogState | null>(null);
  const [showAlsoMoving, setShowAlsoMoving] = useState(false);

  // Index every item by key so the "Resolved today" list can be reconstructed
  // from whatever the user (or the feedback loop) has resolved.
  const itemIndex = useMemo(() => {
    const index = new Map<string, { title: string; project: string | null; summary: string }>();
    const add = (item: { key: string; title: string; project: string | null; summary?: string }) => {
      if (!index.has(item.key)) {
        index.set(item.key, {
          title: item.title,
          project: item.project,
          summary: item.summary ?? "",
        });
      }
    };
    model.decisions.forEach(add);
    model.projects.forEach((project) => project.items.forEach(add));
    model.yourActions.forEach(add);
    model.teamActions.forEach(add);
    model.resolvedSeed.forEach((seed) =>
      add({ key: seed.key, title: seed.title, project: seed.project, summary: seed.summary }),
    );
    return index;
  }, [model]);

  const isResolved = useCallback((key: string) => resolvedKeys.has(key), [resolvedKeys]);

  const resolveItem = useCallback(
    async (item: Actionable) => {
      setResolvedKeys((current) => new Set(current).add(item.key));
      try {
        await apiFetch("/api/executive/daily-brief/feedback", {
          method: "POST",
          body: JSON.stringify({
            subjectId: item.key,
            signal: "completed",
            title: item.title,
            project: item.project,
          }),
        });
        toast.success("Resolved — moved to Resolved today.");
      } catch (error) {
        setResolvedKeys((current) => {
          const next = new Set(current);
          next.delete(item.key);
          return next;
        });
        handleFormError(error, { entity: "item", action: "update" });
      }
    },
    [],
  );

  const restoreItem = useCallback((key: string) => {
    setResolvedKeys((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    toast.success("Reopened — back on today's brief.");
  }, []);

  const openFeedback = useCallback((item: Actionable) => {
    setFeedbackTarget({ subjectId: item.key, title: item.title, project: item.project });
  }, []);

  const openCreateTask = useCallback((item: Actionable) => {
    setTaskDialog({
      mode: "create",
      title: item.title,
      description: item.summary || item.title,
      projectId: item.projectId,
      metadataId: item.sourceDocId,
      subjectId: item.key,
      assigneePersonId: null,
      dueDate: null,
      priority: "medium",
    });
  }, []);

  const resolvedList = useMemo(
    () =>
      Array.from(resolvedKeys)
        .map((key) => {
          const entry = itemIndex.get(key);
          return entry ? { key, ...entry } : null;
        })
        .filter((entry): entry is { key: string; title: string; project: string | null; summary: string } =>
          Boolean(entry),
        ),
    [resolvedKeys, itemIndex],
  );

  const activeDecisions = model.decisions.filter((item) => !isResolved(item.key));
  const activeProjects = model.projects
    .map((project) => ({
      ...project,
      items: project.items.filter((item) => !isResolved(item.key)),
    }))
    .filter((project) => project.items.length > 0);
  const yourActions = model.yourActions.filter((item) => !isResolved(item.key));
  const teamActions = model.teamActions.filter((item) => !isResolved(item.key));

  const menuFor = (item: Actionable) => (
    <BriefItemMenu
      onFeedback={() => openFeedback(item)}
      onResolve={() => void resolveItem(item)}
      onCreateTask={() => openCreateTask(item)}
      canCreateTask={Boolean(item.sourceDocId)}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Masthead */}
      <header className="border-b-2 border-foreground pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {model.masthead.eyebrow}
            </p>
            <h1 className="mt-1 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {model.masthead.dateLabel}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Prepared for {model.masthead.preparedFor}
              {"  ·  "}
              {model.masthead.decisionsCount} decision
              {model.masthead.decisionsCount === 1 ? "" : "s"}
              {"  ·  "}
              {model.masthead.projectsCount} project
              {model.masthead.projectsCount === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setFeedbackTarget({
                subjectId: "daily-brief-general",
                title: "Daily brief — overall feedback",
                project: null,
              })
            }
          >
            Submit feedback
          </Button>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Left column ─────────────────────────────────────────────── */}
        <main className="min-w-0 space-y-12">
          {/* The read */}
          {model.read.thesis ? (
            <section>
              <SectionEyebrow>The read</SectionEyebrow>
              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-foreground">
                {model.read.thesis}
              </p>
            </section>
          ) : null}

          {/* Needs you today */}
          {activeDecisions.length > 0 ? (
            <section>
              <EditorialHeading level={2} className="text-2xl font-bold tracking-tight text-foreground">
                Needs you today
              </EditorialHeading>
              <p className="mt-1 text-sm text-muted-foreground">
                The decisions and approvals only you can make.
              </p>
              <ol className="mt-5 space-y-5">
                {activeDecisions.slice(0, TOP_DECISIONS).map((item, index) => (
                  <li key={`${item.key}-${index}`} className="group/item flex gap-4">
                    <span className="w-6 shrink-0 pt-0.5 text-sm font-bold tabular-nums text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] leading-snug text-foreground">
                        {item.project ? (
                          <span className="font-semibold">{item.project} — </span>
                        ) : null}
                        {item.summary || item.title}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <BriefSources sources={item.sources} />
                        {item.carried ? <CarriedTag /> : null}
                      </div>
                    </div>
                    {menuFor(item)}
                  </li>
                ))}
              </ol>
              {activeDecisions.length > TOP_DECISIONS ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  +{activeDecisions.length - TOP_DECISIONS} more{" "}
                  {activeDecisions.length - TOP_DECISIONS === 1 ? "decision" : "decisions"}{" "}
                  in project detail below.
                </p>
              ) : null}
            </section>
          ) : null}

          {/* Project detail */}
          {activeProjects.length > 0 ? (
            <section>
              <SectionEyebrow>Project detail</SectionEyebrow>
              <div className="mt-4 space-y-10">
                {activeProjects.map((project) => (
                  <ProjectBlock
                    key={project.key}
                    project={project}
                    renderMenu={menuFor}
                    tasked={taskedKeys}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* Also moving + Resolved today */}
          <section className="border-t border-border pt-8">
            <div className="flex items-baseline justify-between gap-4">
              <EditorialHeading level={2} className="text-2xl font-bold tracking-tight text-foreground">
                Also moving — nothing needed from you
              </EditorialHeading>
              {model.alsoMoving.length > 0 ? (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto shrink-0 p-0"
                  onClick={() => setShowAlsoMoving((value) => !value)}
                >
                  {showAlsoMoving ? "Hide" : `Show ${model.alsoMoving.length}`}
                </Button>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {model.alsoMoving.length} project
              {model.alsoMoving.length === 1 ? "" : "s"} on track. Status only.
            </p>

            {showAlsoMoving && model.alsoMoving.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {model.alsoMoving.map((project) => (
                  <li key={project.key} className="text-sm">
                    <span className="font-semibold text-foreground">{project.label}</span>
                    <span className="text-muted-foreground"> — {project.oneLine}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <ResolvedToday items={resolvedList} onRestore={restoreItem} />
          </section>

          <footer className="pt-2 text-xs text-muted-foreground">
            End of brief · source window {model.masthead.generatedLabel} · continues tomorrow
          </footer>
        </main>

        {/* ── Right column: action items ──────────────────────────────── */}
        <aside className="min-w-0 space-y-8 lg:border-l lg:border-border lg:pl-8">
          <div>
            <EditorialHeading level={2} className="text-xl font-bold tracking-tight text-foreground">
              Action items
            </EditorialHeading>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {yourActions.length} yours · {teamActions.length} team
            </p>
          </div>

          <ActionGroup
            title="Your action items"
            count={yourActions.length}
            items={yourActions}
            resolveItem={resolveItem}
            renderMenu={menuFor}
            tasked={taskedKeys}
          />
          <ActionGroup
            title="Team action items"
            count={teamActions.length}
            items={teamActions}
            resolveItem={resolveItem}
            renderMenu={menuFor}
            tasked={taskedKeys}
            showOwner
          />
        </aside>
      </div>

      <BriefFeedbackDialog
        target={feedbackTarget}
        onOpenChange={(open) => !open && setFeedbackTarget(null)}
      />
      <BriefTaskDialog
        state={taskDialog}
        onOpenChange={(open) => !open && setTaskDialog(null)}
        onSaved={() => {
          const subjectId = taskDialog?.subjectId;
          if (subjectId) {
            setTaskedKeys((keys) => new Set(keys).add(subjectId));
          }
        }}
      />
    </div>
  );
}

// ── small presentational pieces ───────────────────────────────────────────────

/**
 * A semantic section heading for the editorial brief. Rendered as an accessible
 * `role="heading"` element (not a raw `<h2>/<h3>`) so this bespoke masthead
 * surface can keep its large editorial type — the same reason the page's `<h1>`
 * masthead is bespoke — while staying screen-reader-correct.
 */
function EditorialHeading({
  level,
  className,
  children,
}: {
  level: 2 | 3;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="heading" aria-level={level} className={className}>
      {children}
    </div>
  );
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
      {children}
    </p>
  );
}

function CarriedTag() {
  return (
    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      Carried
    </span>
  );
}

function TaskedTag() {
  return (
    <span className="text-[11px] font-medium text-primary">Task created</span>
  );
}

function ProjectBlock({
  project,
  renderMenu,
  tasked,
}: {
  project: BriefProjectVM;
  renderMenu: (item: Actionable) => ReactNode;
  tasked: Set<string>;
}) {
  return (
    <div>
      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.2em]",
          STATUS_TONE[project.statusLabel] ?? TONE_ACCENT[project.tone],
        )}
      >
        {project.statusLabel}
      </p>
      <EditorialHeading level={3} className="mt-1 text-xl font-bold tracking-tight text-foreground">
        {project.projectId ? (
          <a href={`/${project.projectId}/home`} className="hover:underline">
            {project.label}
          </a>
        ) : (
          project.label
        )}
      </EditorialHeading>
      {project.oneLine ? (
        <p className="mt-1 text-sm text-muted-foreground">{project.oneLine}</p>
      ) : null}
      <ul className="mt-3 space-y-3">
        {project.items.map((item, index) => (
          <li key={`${item.key}-${index}`} className="group/item flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-foreground">
                <span className="font-medium">{item.title}</span>
                {item.summary ? (
                  <span className="text-muted-foreground"> — {item.summary}</span>
                ) : null}
              </p>
              <div className="mt-1 flex items-center gap-3">
                <BriefSources sources={item.sources} />
                {item.carried ? <CarriedTag /> : null}
                {tasked.has(item.key) ? <TaskedTag /> : null}
              </div>
            </div>
            {renderMenu(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionGroup({
  title,
  count,
  items,
  resolveItem,
  renderMenu,
  tasked,
  showOwner,
}: {
  title: string;
  count: number;
  items: BriefActionVM[];
  resolveItem: (item: Actionable) => void | Promise<void>;
  renderMenu: (item: Actionable) => ReactNode;
  tasked: Set<string>;
  showOwner?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <EditorialHeading level={3} className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {title}
        </EditorialHeading>
        <span className="text-xs font-medium text-muted-foreground">{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item, index) => (
            <li key={`${item.key}-${index}`} className="group/item flex gap-3 py-3">
              <Checkbox
                className="mt-0.5 shrink-0"
                aria-label="Mark resolved"
                onCheckedChange={(checked) => {
                  if (checked) void resolveItem(item);
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-foreground">{item.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {item.project ? (
                    <span className="font-medium uppercase tracking-wide text-primary">
                      {item.project}
                    </span>
                  ) : null}
                  {showOwner && item.owner ? <span>{item.owner}</span> : null}
                  {item.due ? <DuePill due={item.due} /> : null}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <BriefSources sources={item.sources} />
                  {tasked.has(item.key) ? <TaskedTag /> : null}
                </div>
              </div>
              {renderMenu(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DuePill({ due }: { due: string }) {
  const urgent = /overdue|due today|asap|was due/i.test(due);
  return (
    <span
      className={cn(
        "font-medium uppercase tracking-wide",
        urgent ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {due}
    </span>
  );
}

function ResolvedToday({
  items,
  onRestore,
}: {
  items: Array<{ key: string; title: string; project: string | null; summary: string }>;
  onRestore: (key: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-8 rounded-lg bg-muted/50 p-4">
      <div className="flex items-baseline gap-2">
        <EditorialHeading level={3} className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Resolved today
        </EditorialHeading>
        <span className="text-xs font-medium text-muted-foreground">{items.length}</span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Kept out of tomorrow&apos;s brief. History is preserved — restore anything that reopens.
      </p>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {item.project ? (
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {item.project}
                </span>
              ) : null}
              <p className="text-sm leading-snug text-foreground line-through decoration-muted-foreground/50">
                {item.title}
              </p>
            </div>
            <Button
              variant="link"
              size="sm"
              className="h-auto shrink-0 gap-1 p-0 text-xs"
              onClick={() => onRestore(item.key)}
            >
              <RotateCcw className="size-3" aria-hidden /> Restore
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
