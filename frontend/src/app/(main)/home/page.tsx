"use client";

import * as React from "react";
import Link from "next/link";

import { PageShell, SectionRuleHeading } from "@/components/layout";
import { useCollaborationNotifications } from "@/hooks/use-collaboration-notifications";
import {
  AI_APPROVAL_QUEUE_NOTIFICATION_KIND,
  isAiApprovalQueueNotification,
} from "@/lib/collaboration/ai-approval-queue";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type ProjectRow = {
  id: number | string;
  name: string | null;
  client?: string | null;
  phase?: string | null;
  state?: string | null;
  "job number"?: string | number | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type ProjectsResponse = {
  data?: ProjectRow[];
  meta?: {
    isAdmin?: boolean;
  };
};

type TaskRow = {
  id: string | null;
  title: string | null;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  project_id: number | null;
  project_name: string | null;
  source_system: string | null;
  source_title: string | null;
  source_date: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type TasksResponse = {
  data?: TaskRow[];
};

type LoadState = {
  projects: ProjectRow[];
  tasks: TaskRow[];
  isAdmin: boolean;
};

type ActionRowProps = {
  title: string;
  meta?: string;
  href?: string;
  actionLabel?: string | null;
  muted?: boolean;
  eyebrow?: string;
};

const OPEN_TASK_STATUSES = new Set(["open", "todo", "new", "pending", "in_progress"]);
const HOME_REQUIRED_SECTIONS = [
  "Start here",
  "Work queue",
  "Resume projects",
  "Review queue",
  "Recent movement",
  "Source wiring",
] as const;

function isOpenTask(task: TaskRow): boolean {
  const status = task.status?.trim().toLowerCase();
  return !status || OPEN_TASK_STATUSES.has(status);
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isDueTodayOrEarlier(value: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return dueDay.getTime() <= todayDay.getTime();
}

function getProjectId(project: ProjectRow): string {
  return String(project.id);
}

function getProjectJobNumber(project: ProjectRow): string | null {
  const value = project["job number"];
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function taskTitle(task: TaskRow): string {
  return task.title?.trim() || task.description?.trim() || "Untitled task";
}

function taskMeta(task: TaskRow): string {
  return [
    task.project_name,
    task.due_date ? `Due ${formatDate(task.due_date) ?? task.due_date}` : null,
    task.source_system ? `Source: ${task.source_system}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}

function projectMeta(project: ProjectRow): string {
  return [
    getProjectJobNumber(project) ? `#${getProjectJobNumber(project)}` : null,
    project.client,
    project.phase,
    project.updated_at ? `Updated ${formatDate(project.updated_at) ?? project.updated_at}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}

function queueSummary(todayCount: number, openCount: number, aiApprovalCount: number): string {
  if (todayCount > 0) {
    return `${todayCount} due today. ${openCount} open in your task feed.`;
  }
  if (openCount > 0) {
    return `${openCount} open task${openCount === 1 ? "" : "s"} in your feed.`;
  }
  if (aiApprovalCount > 0) {
    return `${aiApprovalCount} AI decision${aiApprovalCount === 1 ? "" : "s"} waiting for review.`;
  }
  return "No dated or assigned tasks are blocking the start of the day.";
}

function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 space-y-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <SectionRuleHeading label={title} className="mb-0 pb-0" />
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function RowList({
  children,
  empty,
}: {
  children: React.ReactNode;
  empty?: string;
}) {
  const items = React.Children.toArray(children).filter(Boolean);

  if (items.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        {empty ?? "Nothing needs attention from this source right now."}
      </p>
    );
  }

  return <div className="divide-y divide-border/50">{items}</div>;
}

function ActionRow({
  title,
  meta,
  href,
  actionLabel = "Open",
  muted,
  eyebrow,
}: ActionRowProps) {
  const content = (
    <div className="flex min-h-14 items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <p
          className={cn(
            "truncate text-sm font-medium",
            muted ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {title}
        </p>
        {meta ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {meta}
          </p>
        ) : null}
      </div>
      {href && actionLabel ? (
        <span className="shrink-0 text-xs font-medium text-primary">
          {actionLabel}
        </span>
      ) : null}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block rounded-md transition-colors hover:bg-muted/40">
      {content}
    </Link>
  );
}

function PrimaryActionRow({
  title,
  meta,
  href,
  actionLabel,
}: {
  title: string;
  meta: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg bg-muted/60 px-4 py-4 transition-colors hover:bg-muted"
    >
      <div className="flex min-h-12 items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
        </div>
        <span className="shrink-0 text-sm font-medium text-primary">{actionLabel}</span>
      </div>
    </Link>
  );
}

function EmptyQueueAction({
  title,
  meta,
  href,
  actionLabel,
}: {
  title: string;
  meta: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="space-y-3 py-2">
      <p className="text-sm text-muted-foreground">{meta}</p>
      <ActionRow title={title} href={href} actionLabel={actionLabel} />
    </div>
  );
}

function SourcePendingRow({
  title,
  owner,
}: {
  title: string;
  owner: string;
}) {
  return (
    <ActionRow
      title={title}
      meta={`Pending source wiring: ${owner}`}
      muted
    />
  );
}

export default function HomeActionDashboardPage() {
  const {
    notifications: aiApprovalNotifications,
    isLoading: isLoadingAiApprovals,
  } = useCollaborationNotifications({
    kind: AI_APPROVAL_QUEUE_NOTIFICATION_KIND,
    unreadOnly: true,
    limit: 10,
  });
  const [state, setState] = React.useState<LoadState>({
    projects: [],
    tasks: [],
    isAdmin: false,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [projectsResponse, tasksResponse] = await Promise.all([
          apiFetch<ProjectsResponse>(
            "/api/projects?archived=false&page=1&limit=8&includeClient=true",
            { cache: "no-store" },
          ),
          apiFetch<TasksResponse>("/api/tasks?scope=mine", { cache: "no-store" }),
        ]);

        if (!isMounted) return;

        setState({
          projects: Array.isArray(projectsResponse.data) ? projectsResponse.data : [],
          tasks: Array.isArray(tasksResponse.data) ? tasksResponse.data : [],
          isAdmin: projectsResponse.meta?.isAdmin === true,
        });
      } catch (error) {
        if (!isMounted) return;
        const message =
          error instanceof ApiError || error instanceof Error
            ? error.message
            : "Homepage data could not be loaded.";
        setErrorMessage(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const openTasks = React.useMemo(
    () => state.tasks.filter(isOpenTask).slice(0, 5),
    [state.tasks],
  );

  const todayTasks = React.useMemo(
    () => openTasks.filter((task) => isDueTodayOrEarlier(task.due_date)).slice(0, 3),
    [openTasks],
  );

  const aiApprovalCount = React.useMemo(
    () => aiApprovalNotifications.filter(isAiApprovalQueueNotification).length,
    [aiApprovalNotifications],
  );

  const aiApprovalMeta = isLoadingAiApprovals
    ? "Checking AI decisions."
    : aiApprovalCount > 0
      ? `${aiApprovalCount} AI decision${aiApprovalCount === 1 ? "" : "s"} waiting for review.`
      : "No AI decisions are waiting for review.";

  const startSummary = queueSummary(todayTasks.length, openTasks.length, aiApprovalCount);
  const primaryQueueHref =
    todayTasks[0]?.project_id
      ? `/${todayTasks[0].project_id}/tasks`
      : openTasks[0]?.project_id
        ? `/${openTasks[0].project_id}/tasks`
        : aiApprovalCount > 0
          ? "/ai/approvals"
          : "/tasks";
  const primaryQueueLabel =
    todayTasks.length > 0 || openTasks.length > 0
      ? "Open tasks"
      : aiApprovalCount > 0
        ? "Review AI"
        : "Open tasks";

  const recentActivity = React.useMemo(() => {
    const taskItems = state.tasks.slice(0, 3).map((task) => ({
      key: `task-${task.id}`,
      title: taskTitle(task),
      meta: [
        "Task",
        task.project_name,
        formatDate(task.updated_at ?? task.created_at),
      ]
        .filter((value): value is string => Boolean(value))
        .join(" · "),
      href: task.project_id ? `/${task.project_id}/tasks` : "/tasks",
      timestamp: task.updated_at ?? task.created_at,
    }));

    const projectItems = state.projects.slice(0, 3).map((project) => ({
      key: `project-${getProjectId(project)}`,
      title: project.name ?? `Project #${getProjectId(project)}`,
      meta: [
        "Project",
        project.client,
        formatDate(project.updated_at ?? project.created_at),
      ]
        .filter((value): value is string => Boolean(value))
        .join(" · "),
      href: `/${getProjectId(project)}/home`,
      timestamp: project.updated_at ?? project.created_at,
    }));

    return [...taskItems, ...projectItems]
      .sort((left, right) => {
        const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
        const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;
        return rightTime - leftTime;
      })
      .slice(0, 5);
  }, [state.projects, state.tasks]);

  return (
    <PageShell
      variant="dashboard"
      title="Home"
      contentClassName="space-y-10"
    >
      {errorMessage ? (
        <div
          role="alert"
          className="rounded-lg bg-danger-subtle p-4 text-sm text-danger"
        >
          <p className="font-medium">Homepage data failed to load.</p>
          <p className="mt-1 text-muted-foreground">{errorMessage}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Loading homepage actions.</p>
          <div className="h-px bg-border/60" />
        </div>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 space-y-3 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Start here
          </p>
          <p className="max-w-3xl text-2xl font-semibold tracking-tight text-foreground">
            {startSummary}
          </p>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Use this page to resume work, not monitor everything. Open the first queue that can change what happens next.
          </p>
        </div>
        <div className="min-w-0 self-end">
          <PrimaryActionRow
            title={aiApprovalCount > 0 ? "Review waiting decisions" : "Open the work queue"}
            meta={aiApprovalCount > 0 ? aiApprovalMeta : "Tasks, assignments, and project queues stay one click away."}
            href={primaryQueueHref}
            actionLabel={primaryQueueLabel}
          />
        </div>
      </section>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.75fr)]">
        <div className="min-w-0 space-y-10">
          <Section
            title={HOME_REQUIRED_SECTIONS[1]}
            action={
              <Link href="/tasks" className="text-sm font-medium text-primary">
                All tasks
              </Link>
            }
          >
            {todayTasks.length > 0 ? (
              <div className="space-y-6">
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Due now</p>
                  <RowList>
                    {todayTasks.map((task) => (
                      <ActionRow
                        key={task.id}
                        title={taskTitle(task)}
                        meta={taskMeta(task)}
                        href={task.project_id ? `/${task.project_id}/tasks` : "/tasks"}
                        actionLabel="Open"
                      />
                    ))}
                  </RowList>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Open assignments</p>
                  <RowList empty="No other open assigned tasks were returned.">
                    {openTasks
                      .filter((task) => !todayTasks.includes(task))
                      .slice(0, 4)
                      .map((task) => (
                        <ActionRow
                          key={task.id}
                          title={taskTitle(task)}
                          meta={taskMeta(task)}
                          href={task.project_id ? `/${task.project_id}/tasks` : "/tasks"}
                          actionLabel="Open"
                        />
                      ))}
                  </RowList>
                </div>
              </div>
            ) : (
              <RowList>
                {openTasks.map((task) => (
                  <ActionRow
                    key={task.id}
                    title={taskTitle(task)}
                    meta={taskMeta(task)}
                    href={task.project_id ? `/${task.project_id}/tasks` : "/tasks"}
                    actionLabel="Open"
                  />
                ))}
                {openTasks.length === 0 ? (
                  <EmptyQueueAction
                    title="Open all tasks"
                    meta="No open assigned tasks came back from your task feed."
                    href="/tasks"
                    actionLabel="Review"
                  />
                ) : null}
              </RowList>
            )}
          </Section>

          <Section
            title={HOME_REQUIRED_SECTIONS[2]}
            action={
              <Link href="/" className="text-sm font-medium text-primary">
                Portfolio
              </Link>
            }
          >
            <RowList empty="No active projects were returned for this user.">
              {state.projects.slice(0, 7).map((project) => {
                const projectId = getProjectId(project);
                return (
                  <ActionRow
                    key={projectId}
                    title={project.name ?? `Project #${projectId}`}
                    meta={projectMeta(project)}
                    href={`/${projectId}/home`}
                    actionLabel={null}
                  />
                );
              })}
            </RowList>
          </Section>
        </div>

        <div className="min-w-0 space-y-10">
          <Section title={HOME_REQUIRED_SECTIONS[3]}>
            <RowList>
              <ActionRow
                title="AI approvals"
                meta={aiApprovalMeta}
                href="/ai/approvals"
                actionLabel="Review"
              />
              <ActionRow
                title="AI profile"
                meta="Review what AI can use for role, memory, and approval context."
                href="/ai/profile"
                actionLabel="Manage"
              />
              <ActionRow
                title="Executive intelligence"
                meta="Open the existing source-backed executive surface."
                href="/executive"
                actionLabel="Review"
              />
              <ActionRow
                title="Assignment inbox"
                meta="Open the shared assignment queue."
                href="/assignment-inbox"
                actionLabel="View"
              />
              <ActionRow
                title="Notifications"
                meta="Open the notification center."
                href="/notifications"
                actionLabel="View"
              />
            </RowList>
          </Section>

          <Section title={HOME_REQUIRED_SECTIONS[4]}>
            <RowList empty="No recent project or task activity was returned.">
              {recentActivity.map((item) => (
                <ActionRow
                  key={item.key}
                  title={item.title}
                  meta={item.meta}
                  href={item.href}
                  actionLabel={null}
                />
              ))}
            </RowList>
          </Section>

          <Section title={HOME_REQUIRED_SECTIONS[5]}>
            <RowList>
              <SourcePendingRow
                title="Personal AI brief summary"
                owner="needs a homepage-specific brief API contract"
              />
              <SourcePendingRow
                title="Inbox priority rollup"
                owner="needs a shared unread/priority inbox source"
              />
            </RowList>
          </Section>
        </div>
      </div>
    </PageShell>
  );
}
