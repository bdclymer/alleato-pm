"use client";

import * as React from "react";
import Link from "next/link";

import { PageShell, SectionRuleHeading } from "@/components/layout";
import { useCollaborationNotifications } from "@/hooks/use-collaboration-notifications";
import {
  AI_APPROVAL_QUEUE_NOTIFICATION_KIND,
  isAiApprovalQueueNotification,
} from "@/lib/collaboration/ai-approval-queue";
import { shouldInterruptAiWidget } from "@/lib/collaboration/ai-notification-routing";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { getHomeAiApprovalMeta } from "./home-action-routing";
import type {
  HomeOutlookCalendarMeeting,
  HomeOutlookCalendarResponse,
} from "@/app/api/home/outlook-calendar/types";

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

const OPEN_TASK_STATUSES = new Set([
  "open",
  "todo",
  "new",
  "pending",
  "in_progress",
]);
const HOME_REQUIRED_SECTIONS = [
  "Upcoming meetings",
  "Work queue",
  "Resume projects",
  "Review queue",
  "Recent movement",
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

function formatTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function meetingTimeRange(meeting: HomeOutlookCalendarMeeting): string {
  if (meeting.isAllDay) {
    return `${formatDate(meeting.startDateTime) ?? "Upcoming"} · All day`;
  }

  const startDate = formatDate(meeting.startDateTime);
  const startTime = formatTime(meeting.startDateTime);
  const endTime = formatTime(meeting.endDateTime);

  return [
    startDate,
    startTime && endTime ? `${startTime} - ${endTime}` : startTime,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}

function meetingMeta(meeting: HomeOutlookCalendarMeeting): string {
  return [
    meeting.location,
    meeting.organizerName ? `Organizer: ${meeting.organizerName}` : null,
    meeting.attendeeCount > 0
      ? `${meeting.attendeeCount} attendee${meeting.attendeeCount === 1 ? "" : "s"}`
      : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}

function startsTodayOrLater(value: string | null | undefined): boolean {
  if (!value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  const meetingDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return meetingDay.getTime() >= today.getTime();
}

function isDueTodayOrEarlier(value: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
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
    project.updated_at
      ? `Updated ${formatDate(project.updated_at) ?? project.updated_at}`
      : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
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
    <section className={cn("min-w-0 space-y-3", className)}>
      <div className="flex items-center justify-between gap-4">
        <SectionRuleHeading
          label={title}
          className="mb-0 pb-0 [&_span]:text-sm [&_span]:normal-case [&_span]:tracking-normal [&_span]:text-foreground"
        />
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
    <Link
      href={href}
      className="block rounded-md transition-colors hover:bg-muted/40"
    >
      {content}
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

function OutlookMeetingRow({
  meeting,
}: {
  meeting: HomeOutlookCalendarMeeting;
}) {
  const meta = meetingMeta(meeting);

  return (
    <div className="grid min-h-16 grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-4 py-3">
      <div className="text-sm font-medium text-foreground">
        {meeting.isAllDay
          ? "All day"
          : formatTime(meeting.startDateTime) || "Upcoming"}
      </div>
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {meeting.subject || "Untitled meeting"}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDate(meeting.startDateTime)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {[meetingTimeRange(meeting), meta].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs font-medium">
        {meeting.joinUrl ? (
          <a
            href={meeting.joinUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary transition-colors hover:text-primary/80"
          >
            Join
          </a>
        ) : null}
        {meeting.webLink ? (
          <a
            href={meeting.webLink}
            target="_blank"
            rel="noreferrer"
            className="text-primary transition-colors hover:text-primary/80"
          >
            Outlook
          </a>
        ) : null}
      </div>
    </div>
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
  const [calendarState, setCalendarState] =
    React.useState<HomeOutlookCalendarResponse | null>(null);
  const [isCalendarLoading, setIsCalendarLoading] = React.useState(true);
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
          apiFetch<TasksResponse>("/api/tasks?scope=mine", {
            cache: "no-store",
          }),
        ]);

        if (!isMounted) return;

        setState({
          projects: Array.isArray(projectsResponse.data)
            ? projectsResponse.data
            : [],
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

  React.useEffect(() => {
    let isMounted = true;

    async function loadCalendar() {
      setIsCalendarLoading(true);

      try {
        const response = await apiFetch<HomeOutlookCalendarResponse>(
          "/api/home/outlook-calendar",
          { cache: "no-store" },
        );

        if (isMounted) {
          setCalendarState(response);
        }
      } catch (error) {
        if (!isMounted) return;
        const message =
          error instanceof ApiError || error instanceof Error
            ? error.message
            : "Outlook Calendar could not be loaded.";
        setCalendarState({
          ok: false,
          source: "microsoft-graph-live",
          error: message,
          window: {
            startIso: new Date().toISOString(),
            endIso: new Date().toISOString(),
          },
        });
      } finally {
        if (isMounted) {
          setIsCalendarLoading(false);
        }
      }
    }

    void loadCalendar();

    return () => {
      isMounted = false;
    };
  }, []);

  const openTasks = React.useMemo(
    () => state.tasks.filter(isOpenTask).slice(0, 5),
    [state.tasks],
  );

  const todayTasks = React.useMemo(
    () =>
      openTasks
        .filter((task) => isDueTodayOrEarlier(task.due_date))
        .slice(0, 3),
    [openTasks],
  );

  const aiApprovalCount = React.useMemo(
    () => aiApprovalNotifications.filter(isAiApprovalQueueNotification).length,
    [aiApprovalNotifications],
  );

  const interruptingAiApprovalCount = React.useMemo(
    () =>
      aiApprovalNotifications.filter(
        (notification) =>
          isAiApprovalQueueNotification(notification) &&
          shouldInterruptAiWidget(notification),
      ).length,
    [aiApprovalNotifications],
  );

  const aiApprovalMeta = getHomeAiApprovalMeta({
    isLoading: isLoadingAiApprovals,
    aiApprovalCount,
    interruptCount: interruptingAiApprovalCount,
  });

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
        const leftTime = left.timestamp
          ? new Date(left.timestamp).getTime()
          : 0;
        const rightTime = right.timestamp
          ? new Date(right.timestamp).getTime()
          : 0;
        return rightTime - leftTime;
      })
      .slice(0, 5);
  }, [state.projects, state.tasks]);

  const visibleMeetings = React.useMemo(
    () =>
      calendarState?.ok
        ? calendarState.meetings
            .filter((meeting) => startsTodayOrLater(meeting.startDateTime))
            .slice(0, 8)
        : [],
    [calendarState],
  );

  return (
    <PageShell variant="dashboard" title="Home" contentClassName="space-y-8">
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

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_minmax(24rem,0.85fr)]">
        <div className="min-w-0 space-y-8">
          <Section title={HOME_REQUIRED_SECTIONS[0]}>
            {isCalendarLoading ? (
              <p className="py-4 text-sm text-muted-foreground">
                Checking Outlook Calendar.
              </p>
            ) : calendarState?.ok ? (
              <RowList empty="No upcoming Outlook meetings in the next 7 days.">
                {visibleMeetings.map((meeting) => (
                  <OutlookMeetingRow key={meeting.id} meeting={meeting} />
                ))}
              </RowList>
            ) : (
              <div role="status" className="py-4 text-sm">
                <p className="font-medium text-foreground">
                  Outlook Calendar is not available.
                </p>
                <p className="mt-1 text-muted-foreground">
                  {calendarState?.error ??
                    "Microsoft Graph calendar data could not be loaded."}
                </p>
              </div>
            )}
          </Section>

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
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Due now
                  </p>
                  <RowList>
                    {todayTasks.map((task) => (
                      <ActionRow
                        key={task.id}
                        title={taskTitle(task)}
                        meta={taskMeta(task)}
                        href={
                          task.project_id
                            ? `/${task.project_id}/tasks`
                            : "/tasks"
                        }
                        actionLabel="Open"
                      />
                    ))}
                  </RowList>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Open assignments
                  </p>
                  <RowList empty="No other open assigned tasks were returned.">
                    {openTasks
                      .filter((task) => !todayTasks.includes(task))
                      .slice(0, 4)
                      .map((task) => (
                        <ActionRow
                          key={task.id}
                          title={taskTitle(task)}
                          meta={taskMeta(task)}
                          href={
                            task.project_id
                              ? `/${task.project_id}/tasks`
                              : "/tasks"
                          }
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
                    href={
                      task.project_id ? `/${task.project_id}/tasks` : "/tasks"
                    }
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
        </div>

        <div className="min-w-0 space-y-8">
          <Section
            title={HOME_REQUIRED_SECTIONS[2]}
            action={
              <Link href="/" className="text-sm font-medium text-primary">
                Portfolio
              </Link>
            }
          >
            <RowList empty="No active projects were returned for this user.">
              {state.projects.slice(0, 6).map((project) => {
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
                title="AI actions"
                meta="Open the assistant action catalog and chat workspace."
                href="/ai"
                actionLabel="Open"
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
        </div>
      </div>
    </PageShell>
  );
}
