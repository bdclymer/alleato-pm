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
  actionLabel?: string;
  muted?: boolean;
};

const OPEN_TASK_STATUSES = new Set(["open", "todo", "new", "pending", "in_progress"]);

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

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 space-y-3", className)}>
      <SectionRuleHeading label={title} className="mb-0 pb-0" />
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
      <p className="py-3 text-sm text-muted-foreground">
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
}: ActionRowProps) {
  const content = (
    <div className="flex min-h-12 items-center justify-between gap-4 py-3">
      <div className="min-w-0">
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
      {href ? (
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
    <Link href={href} className="block rounded-sm transition-colors hover:bg-muted/40">
      {content}
    </Link>
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
      description="Today, assigned work, and project entry points."
      contentClassName="space-y-8"
    >
      {errorMessage ? (
        <div
          role="alert"
          className="border-l-2 border-destructive py-2 pl-4 text-sm text-foreground"
        >
          <p className="font-medium">Homepage data failed to load.</p>
          <p className="mt-1 text-muted-foreground">{errorMessage}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Loading homepage actions...</p>
          <div className="h-px bg-border/60" />
        </div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <div className="min-w-0 space-y-8">
          <Section title="Today">
            <RowList empty="No dated tasks are due today from your current task feed.">
              {todayTasks.map((task) => (
                <ActionRow
                  key={task.id}
                  title={taskTitle(task)}
                  meta={taskMeta(task)}
                  href={task.project_id ? `/${task.project_id}/tasks` : "/tasks"}
                />
              ))}
            </RowList>
          </Section>

          <Section title="My Work">
            <RowList empty="No open assigned tasks were returned by the task feed.">
              {openTasks.map((task) => (
                <ActionRow
                  key={task.id}
                  title={taskTitle(task)}
                  meta={taskMeta(task)}
                  href={task.project_id ? `/${task.project_id}/tasks` : "/tasks"}
                />
              ))}
            </RowList>
          </Section>

          <Section title="AI Brief">
            <RowList>
              <ActionRow
                title="Open executive intelligence"
                meta="Uses the existing executive brief surface while homepage synthesis is wired."
                href="/executive"
                actionLabel="Review"
              />
              <SourcePendingRow
                title="Personal AI brief summary"
                owner="needs a homepage-specific brief API contract"
              />
            </RowList>
          </Section>
        </div>

        <div className="min-w-0 space-y-8">
          <Section title="My Projects">
            <RowList empty="No active projects were returned for this user.">
              {state.projects.slice(0, 6).map((project) => {
                const projectId = getProjectId(project);
                const jobNumber = getProjectJobNumber(project);
                return (
                  <ActionRow
                    key={projectId}
                    title={project.name ?? `Project #${projectId}`}
                    meta={[jobNumber ? `#${jobNumber}` : null, project.client, project.phase]
                      .filter((value): value is string => Boolean(value))
                      .join(" · ")}
                    href={`/${projectId}/home`}
                  />
                );
              })}
              <ActionRow
                title="View all projects"
                meta={state.isAdmin ? "Portfolio includes admin-visible projects." : "Portfolio is scoped to your memberships."}
                href="/"
                actionLabel="View"
              />
            </RowList>
          </Section>

          <Section title="Quiet Inbox">
            <RowList>
              <ActionRow
                title="AI approvals"
                meta={aiApprovalMeta}
                href="/ai/approvals"
                actionLabel="Review"
              />
              <ActionRow
                title="Assignment inbox"
                meta="Open the existing assignment queue."
                href="/assignment-inbox"
                actionLabel="View"
              />
              <ActionRow
                title="Notifications"
                meta="Open the existing notification center."
                href="/notifications"
                actionLabel="View"
              />
              <SourcePendingRow
                title="Inbox priority rollup"
                owner="needs a shared unread/priority inbox source"
              />
            </RowList>
          </Section>

          <Section title="Recent Activity">
            <RowList empty="No recent project or task activity was returned.">
              {recentActivity.map((item) => (
                <ActionRow
                  key={item.key}
                  title={item.title}
                  meta={item.meta}
                  href={item.href}
                />
              ))}
            </RowList>
          </Section>
        </div>
      </div>
    </PageShell>
  );
}
