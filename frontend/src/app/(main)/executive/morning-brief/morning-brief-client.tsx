"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import type { RailData, RailTask } from "@/lib/daily-briefs/morning-brief-tasks";

import { MBButton } from "./mb-button";
import { TaskCard } from "./task-card";
import type {
  MBIssue,
  MBRun,
  MBSource,
  MorningBriefModel,
} from "./morning-brief-view-model";

// ─────────────────────────────────────────────────────────────────────────────
// Morning Brief — interactive client.
//
// Left column renders the brief narrative (read-only + resolve/feedback/create-
// task actions). Right rail renders REAL tasks from the shared store; every
// mutation (resolve / edit / reassign / delete / create) hits the real task API
// and updates the same records the Tasks page serves.
// ─────────────────────────────────────────────────────────────────────────────

type PanelKind = "source" | "feedback" | "task" | null;
type Priority = "Normal" | "High";
type FeedbackKind = "inaccurate" | "unimportant" | "valuable";

interface ResolvedRow {
  id: string;
  project: string;
  text: string;
}

interface IssueMenuState {
  id: string;
  text: string;
  project: string;
  anchorMetadataId: string | null;
  x: number;
  y: number;
}

interface TaskForm {
  mode: "create" | "edit";
  taskId: string | null;
  text: string;
  projectId: number | null;
  assigneeKey: string; // "me" | "none" | personId
  due: string;
  priority: Priority;
  anchorMetadataId: string | null;
}

interface FeedbackItem {
  subjectId: string;
  project: string;
  text: string;
}

const ChipContext = React.createContext<(alias: string) => void>(() => {});

function SourceChip({
  alias,
  sources,
}: {
  alias: string;
  sources: Record<string, MBSource>;
}) {
  const openSource = React.useContext(ChipContext);
  if (!sources[alias]) return null;
  return (
    <MBButton className="mb-chip" onClick={() => openSource(alias)}>
      ↗ {alias}
    </MBButton>
  );
}

function Runs({ runs, sources }: { runs: MBRun[]; sources: Record<string, MBSource> }) {
  return (
    <>
      {runs.map((run, index) => {
        if ("chip" in run) {
          return <SourceChip key={index} alias={run.chip} sources={sources} />;
        }
        return run.bold ? <b key={index}>{run.text}</b> : <span key={index}>{run.text}</span>;
      })}
    </>
  );
}

export function MorningBriefClient({
  model,
  rail,
}: {
  model: MorningBriefModel;
  rail: RailData;
}) {
  const [yourTasks, setYourTasks] = React.useState<RailTask[]>(rail.your);
  const [teamTasks, setTeamTasks] = React.useState<RailTask[]>(rail.team);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [resolvedLog, setResolvedLog] = React.useState<ResolvedRow[]>(model.resolvedSeed);
  const [hiddenIssues, setHiddenIssues] = React.useState<Record<string, boolean>>({});
  const [issueMenu, setIssueMenu] = React.useState<IssueMenuState | null>(null);
  const [panel, setPanel] = React.useState<PanelKind>(null);
  const [sourceAlias, setSourceAlias] = React.useState<string | null>(null);
  const [railExpanded, setRailExpanded] = React.useState(false);
  const [alsoOpen, setAlsoOpen] = React.useState(false);
  const [toast, setToast] = React.useState<{ msg: string; undo: boolean } | null>(null);
  const [form, setForm] = React.useState<TaskForm | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [fbTags, setFbTags] = React.useState<Record<string, FeedbackKind>>({});
  const [fbReasons, setFbReasons] = React.useState<Record<string, string>>({});
  const [fbNote, setFbNote] = React.useState("");

  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDelete = React.useRef<{ task: RailTask; wasYours: boolean } | null>(null);

  const flashToast = React.useCallback((msg: string, undo = false, ms = 2600) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);

  // ── option sets (real ids drawn from the loaded tasks) ──────────────────────
  const projectOptions = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const task of [...rail.your, ...rail.team, ...yourTasks, ...teamTasks]) {
      if (task.projectId != null && task.project) map.set(task.projectId, task.project);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [rail.your, rail.team, yourTasks, teamTasks]);

  const assigneeOptions = React.useMemo(() => {
    const options: { key: string; name: string; personId: string | null }[] = [
      { key: "me", name: "Myself", personId: rail.brandonPersonId },
    ];
    const seen = new Set<string>();
    for (const task of [...rail.team, ...teamTasks]) {
      if (task.assigneePersonId && !seen.has(task.assigneePersonId)) {
        seen.add(task.assigneePersonId);
        options.push({ key: task.assigneePersonId, name: task.owner, personId: task.assigneePersonId });
      }
    }
    options.push({ key: "none", name: "Unassigned", personId: null });
    return options;
  }, [rail.team, rail.brandonPersonId, teamTasks]);

  const openSource = React.useCallback((alias: string) => {
    setSourceAlias(alias);
    setPanel("source");
  }, []);

  const closePanel = React.useCallback(() => {
    setPanel(null);
    setSourceAlias(null);
    setForm(null);
  }, []);

  // ── task rail actions (all real) ────────────────────────────────────────────
  const removeTask = (id: string): { task: RailTask; wasYours: boolean } | null => {
    const inYour = yourTasks.find((task) => task.id === id);
    const inTeam = teamTasks.find((task) => task.id === id);
    const removed = inYour
      ? { task: inYour, wasYours: true }
      : inTeam
        ? { task: inTeam, wasYours: false }
        : null;
    if (removed) {
      setYourTasks((prev) => prev.filter((task) => task.id !== id));
      setTeamTasks((prev) => prev.filter((task) => task.id !== id));
    }
    return removed;
  };

  const restoreTask = (task: RailTask, wasYours: boolean) => {
    if (wasYours) setYourTasks((prev) => [task, ...prev]);
    else setTeamTasks((prev) => [task, ...prev]);
  };

  const resolveTask = async (id: string) => {
    const removed = removeTask(id);
    setOpenMenu(null);
    if (!removed) return;
    const { task, wasYours } = removed;
    setResolvedLog((prev) => [
      { id, project: task.project ?? "General", text: task.text },
      ...prev,
    ]);
    flashToast("Resolved — moved to today's log");
    try {
      await apiFetch(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "done" }),
      });
    } catch (error) {
      restoreTask(task, wasYours);
      setResolvedLog((prev) => prev.filter((row) => row.id !== id));
      flashToast(error instanceof Error ? error.message : "Could not resolve the task");
    }
  };

  const restoreResolved = (id: string) => {
    setResolvedLog((prev) => prev.filter((row) => row.id !== id));
    // Left-column issues carry an "issue-" id and re-show locally; real tasks
    // are re-opened via the API. Seeded rows are display-only.
    if (id.startsWith("issue-")) {
      setHiddenIssues((prev) => {
        const next = { ...prev };
        delete next[id.slice("issue-".length)];
        return next;
      });
      return;
    }
    if (!id.startsWith("seed-")) {
      void apiFetch(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "open" }),
      }).catch(() => flashToast("Could not reopen the task"));
    }
  };

  const deleteTask = (id: string) => {
    const removed = removeTask(id);
    setOpenMenu(null);
    if (!removed) return;
    pendingDelete.current = removed;
    flashToast("Task deleted", true, 4200);
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    deleteTimer.current = setTimeout(() => {
      const target = pendingDelete.current;
      pendingDelete.current = null;
      if (!target) return;
      void apiFetch(`/api/tasks/${id}`, { method: "DELETE" }).catch(() => {
        restoreTask(target.task, target.wasYours);
        flashToast("Could not delete the task");
      });
    }, 4000);
  };

  const undoDelete = () => {
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    const target = pendingDelete.current;
    pendingDelete.current = null;
    if (target) restoreTask(target.task, target.wasYours);
    setToast(null);
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleMenu = (id: string) =>
    setOpenMenu((prev) => (prev === id ? null : id));

  // ── create / edit panel ─────────────────────────────────────────────────────
  const openCreate = (prefillText = "", anchorMetadataId: string | null = null) => {
    setForm({
      mode: "create",
      taskId: null,
      text: prefillText,
      projectId: projectOptions[0]?.id ?? null,
      assigneeKey: "me",
      due: "",
      priority: "Normal",
      anchorMetadataId: anchorMetadataId ?? model.defaultAnchorMetadataId,
    });
    setPanel("task");
  };

  const openEdit = (id: string) => {
    const task = [...yourTasks, ...teamTasks].find((item) => item.id === id);
    if (!task) return;
    setForm({
      mode: "edit",
      taskId: id,
      text: task.text,
      projectId: task.projectId,
      assigneeKey: task.you ? "me" : task.assigneePersonId ?? "none",
      due: "",
      priority: task.priority === "high" || task.priority === "urgent" ? "High" : "Normal",
      anchorMetadataId: null,
    });
    setOpenMenu(null);
    setPanel("task");
  };

  const applyEdit = (
    id: string,
    isYou: boolean,
    ownerName: string,
    text: string,
    projectId: number | null,
    priority: string,
  ) => {
    const task = [...yourTasks, ...teamTasks].find((item) => item.id === id);
    if (!task) return;
    const updated: RailTask = {
      ...task,
      text,
      you: isYou,
      owner: isYou ? "Brandon" : ownerName,
      showOwner: !isYou,
      projectId,
      project: projectOptions.find((option) => option.id === projectId)?.name ?? task.project,
      priority,
      reasoning: text,
    };
    removeTask(id);
    if (isYou) setYourTasks((prev) => [updated, ...prev.filter((item) => item.id !== id)]);
    else setTeamTasks((prev) => [updated, ...prev.filter((item) => item.id !== id)]);
  };

  const submitTask = async () => {
    if (!form || saving) return;
    const text = form.text.trim();
    if (!text) {
      flashToast("Add a task description first");
      return;
    }
    const dueValue = form.due.trim();
    if (dueValue && !/^\d{4}-\d{2}-\d{2}$/.test(dueValue)) {
      flashToast("Enter the due date as YYYY-MM-DD");
      return;
    }
    const assignee = assigneeOptions.find((option) => option.key === form.assigneeKey);
    const priority = form.priority === "High" ? "high" : "medium";
    setSaving(true);
    try {
      if (form.mode === "create") {
        const anchor = form.anchorMetadataId ?? model.defaultAnchorMetadataId;
        if (!anchor) {
          flashToast("This brief has no linked document to anchor a task to.");
          setSaving(false);
          return;
        }
        const result = await apiFetch<{ taskId: string }>(
          "/api/executive/daily-brief/tasks",
          {
            method: "POST",
            body: JSON.stringify({
              title: text.slice(0, 200),
              description: text,
              metadataId: anchor,
              projectId: form.projectId,
              assigneePersonId: assignee?.personId ?? null,
              dueDate: dueValue || null,
              priority,
            }),
          },
        );
        const isYou = form.assigneeKey === "me";
        const newTask: RailTask = {
          id: result.taskId,
          text,
          project: projectOptions.find((option) => option.id === form.projectId)?.name ?? null,
          projectId: form.projectId,
          href: form.projectId ? `/${form.projectId}/tasks` : "/tasks",
          you: isYou,
          owner: isYou ? "Brandon" : assignee?.name ?? "Unassigned",
          showOwner: !isYou,
          urgent: false,
          dueNormal: Boolean(dueValue),
          dueLabel: dueValue ? `Due ${dueValue}` : "",
          carried: false,
          since: "",
          priority,
          assigneePersonId: assignee?.personId ?? null,
          reasoning: text,
        };
        if (isYou) setYourTasks((prev) => [newTask, ...prev]);
        else setTeamTasks((prev) => [newTask, ...prev]);
        flashToast("Task created");
      } else if (form.taskId) {
        await apiFetch(`/api/tasks/${form.taskId}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: text,
            description: text,
            project_id: form.projectId,
            assignee_person_id: assignee?.personId ?? null,
            priority,
            ...(dueValue ? { due_date: dueValue } : {}),
          }),
        });
        const isYou = form.assigneeKey === "me";
        applyEdit(form.taskId, isYou, assignee?.name ?? "Unassigned", text, form.projectId, priority);
        flashToast("Task updated");
      }
      closePanel();
    } catch (error) {
      flashToast(error instanceof Error ? error.message : "Could not save the task");
    } finally {
      setSaving(false);
    }
  };

  // ── left-column issue menu ──────────────────────────────────────────────────
  const openIssueMenu = (event: React.SyntheticEvent, issue: MBIssue, project: string) => {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const anchorMetadataId =
      issue.sources.map((alias) => model.sources[alias]?.metadataId).find(Boolean) ?? null;
    setIssueMenu({
      id: issue.id,
      text: issue.plain,
      project,
      anchorMetadataId,
      x: Math.round(rect.right),
      y: Math.round(rect.bottom),
    });
  };

  const issueResolve = () => {
    const menu = issueMenu;
    if (!menu) return;
    setHiddenIssues((prev) => ({ ...prev, [menu.id]: true }));
    setResolvedLog((prev) => [
      { id: `issue-${menu.id}`, project: menu.project, text: menu.text },
      ...prev,
    ]);
    setIssueMenu(null);
    flashToast("Resolved — kept out of tomorrow's brief");
    // Persist into the shared learning loop so it's excluded from future briefs.
    void apiFetch("/api/executive/daily-brief/feedback", {
      method: "POST",
      body: JSON.stringify({
        subjectId: menu.id,
        signal: "completed",
        title: menu.text.slice(0, 240),
        project: menu.project,
      }),
    }).catch(() => {});
  };

  const issueCreateTask = () => {
    const menu = issueMenu;
    setIssueMenu(null);
    openCreate(menu?.text ?? "", menu?.anchorMetadataId ?? null);
  };

  const issueFeedback = () => {
    setIssueMenu(null);
    setPanel("feedback");
  };

  // ── feedback panel ──────────────────────────────────────────────────────────
  const feedbackItems: FeedbackItem[] = React.useMemo(() => {
    const items: FeedbackItem[] = model.calls.map((call) => ({
      subjectId: `call-${call.anchor}`,
      project: call.project,
      text: call.question.map((run) => ("text" in run ? run.text : "")).join(""),
    }));
    for (const project of model.projects) {
      for (const issue of project.issues) {
        items.push({
          subjectId: `issue-${issue.id}`,
          project: project.name,
          text: issue.plain,
        });
      }
    }
    return items.slice(0, 12);
  }, [model.calls, model.projects]);

  const cycleFbTag = (subjectId: string, kind: FeedbackKind) => {
    setFbTags((prev) => {
      const next = { ...prev };
      if (next[subjectId] === kind) delete next[subjectId];
      else next[subjectId] = kind;
      return next;
    });
  };

  const submitFeedback = async () => {
    if (saving) return;
    setSaving(true);
    const tagged = Object.entries(fbTags);
    try {
      await Promise.all(
        tagged.map(([subjectId, kind]) => {
          const item = feedbackItems.find((entry) => entry.subjectId === subjectId);
          const signal = kind === "valuable" ? "positive" : "negative";
          const reasonPrefix = kind === "unimportant" ? "Not important. " : "";
          const note = `${reasonPrefix}${fbReasons[subjectId] ?? ""}`.trim();
          return apiFetch("/api/executive/daily-brief/feedback", {
            method: "POST",
            body: JSON.stringify({
              subjectId,
              signal,
              title: item?.text.slice(0, 240) ?? null,
              project: item?.project ?? null,
              note: note || null,
            }),
          });
        }),
      );
      if (fbNote.trim()) {
        await apiFetch("/api/executive/daily-brief/feedback", {
          method: "POST",
          body: JSON.stringify({
            subjectId: `brief-${model.businessDate}`,
            signal: "negative",
            note: fbNote.trim(),
          }),
        });
      }
      flashToast("Feedback sent — thanks");
      setFbTags({});
      setFbReasons({});
      setFbNote("");
      closePanel();
    } catch (error) {
      flashToast(error instanceof Error ? error.message : "Could not send feedback");
    } finally {
      setSaving(false);
    }
  };

  React.useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
    },
    [],
  );

  const activeSource = sourceAlias ? model.sources[sourceAlias] : null;

  const updateForm = (patch: Partial<TaskForm>) =>
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));

  const renderTaskList = (tasks: RailTask[]) =>
    tasks.map((task) => (
      <TaskCard
        key={task.id}
        task={task}
        expanded={Boolean(expanded[task.id])}
        menuOpen={openMenu === task.id}
        onResolve={resolveTask}
        onExpand={toggleExpand}
        onMenu={toggleMenu}
        onEdit={openEdit}
        onReassign={openEdit}
        onDelete={deleteTask}
      />
    ));

  return (
    <ChipContext.Provider value={openSource}>
      <div className="mb-wrap">
        {/* MASTHEAD */}
        <header className="mb-masthead">
          <div className="mb-masthead__row">
            <div>
              <div className="mb-eyebrow">Alleato Group · Executive Brief</div>
              <h1 className="mb-title">The Morning Brief</h1>
              <div className="mb-dateline">
                <b>
                  {model.weekday ? `${model.weekday}, ` : ""}
                  {model.dateLabel}
                </b>
                <span className="mb-dot">·</span>
                <span>Prepared for {model.preparedFor}</span>
                <span className="mb-dot">·</span>
                <span>
                  {model.decisionCount} decision{model.decisionCount === 1 ? "" : "s"} ·{" "}
                  {model.projectCount} project{model.projectCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <MBButton className="mb-btn-outline" onClick={() => setPanel("feedback")}>
              <span aria-hidden>✎</span> Submit feedback
            </MBButton>
          </div>
        </header>

        {model.empty ? (
          <div style={{ padding: "60px 0" }} className="mb-read">
            <div className="mb-read-eyebrow">The read</div>
            <p>
              No structured brief is available for {model.dateLabel}. Generate the daily
              executive brief to populate this view.
            </p>
          </div>
        ) : (
          <div className="mb-body">
            {/* LEFT: THE BRIEF */}
            <main className="mb-main">
              <div className="mb-read">
                <div className="mb-read-eyebrow">The read</div>
                <p>
                  <Runs runs={model.read} sources={model.sources} />
                </p>
              </div>

              {model.calls.length ? (
                <section className="mb-section">
                  <div className="mb-h2" role="heading" aria-level={2}>
                    Needs you today
                  </div>
                  <p className="mb-subhead">
                    The decisions only you can make. Detail lives in each project block below.
                  </p>
                  <ol className="mb-calls">
                    {model.calls.map((call) => (
                      <li className="mb-call" key={call.anchor + call.index}>
                        <span className="mb-call__idx">{call.index}</span>
                        <div className="mb-call__body">
                          <a href={`#${call.anchor}`} className="mb-call__proj">
                            {call.project}
                          </a>{" "}
                          — <Runs runs={call.question} sources={model.sources} />
                          {call.sources.map((alias) => (
                            <SourceChip key={alias} alias={alias} sources={model.sources} />
                          ))}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {model.projects.length ? <div className="mb-label">Project detail</div> : null}

              {model.projects.map((project) => (
                <section id={project.anchor} className="mb-project" key={project.key}>
                  <div className="mb-project__kicker">{project.kicker}</div>
                  <div className="mb-project__name" role="heading" aria-level={2}>
                    {project.name}
                  </div>
                  {project.context.length ? (
                    <p className="mb-project__context">
                      <Runs runs={project.context} sources={model.sources} />
                    </p>
                  ) : null}
                  <ul className="mb-issues">
                    {project.issues
                      .filter((issue) => !hiddenIssues[issue.id])
                      .map((issue) => (
                        <li className="mb-issue" key={issue.id}>
                          <span className={`mb-issue__marker ${issue.marker}`} />
                          <div className="mb-issue__text">
                            <Runs runs={issue.runs} sources={model.sources} />
                            {issue.sources.map((alias) => (
                              <SourceChip key={alias} alias={alias} sources={model.sources} />
                            ))}
                          </div>
                          <MBButton
                            className="mb-issue__dots"
                            title="Actions"
                            aria-label="Item actions"
                            onClick={(event) => openIssueMenu(event, issue, project.name)}
                          >
                            ⋮
                          </MBButton>
                        </li>
                      ))}
                  </ul>
                </section>
              ))}

              {model.onTrack.length ? (
                <section id="also" className="mb-also">
                  <MBButton
                    className="mb-also__toggle"
                    onClick={() => setAlsoOpen((open) => !open)}
                  >
                    <div>
                      <div role="heading" aria-level={2}>
                        Also moving — nothing needed from you
                      </div>
                      <p>
                        {model.onTrack.length} project{model.onTrack.length === 1 ? "" : "s"} on
                        track. Status only — team tasks are on the right.
                      </p>
                    </div>
                    <span className="mb-also__label">{alsoOpen ? "Hide" : "Show"}</span>
                  </MBButton>
                  {alsoOpen ? (
                    <div style={{ marginTop: 6 }}>
                      {model.onTrack.map((project) => (
                        <div className="mb-also__row" key={project.name}>
                          <div className="mb-also__row-head">
                            <span className="mb-also__dot" />
                            <div role="heading" aria-level={3}>
                              {project.name}
                            </div>
                          </div>
                          <p className="mb-also__status">{project.status}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="mb-resolved">
                <div className="mb-resolved__head">
                  <div role="heading" aria-level={2}>
                    Resolved today
                  </div>
                  <span className="mb-resolved__count">{resolvedLog.length}</span>
                </div>
                <p className="mb-resolved__note">
                  Kept out of tomorrow&apos;s brief. Restore anything that reopens.
                </p>
                <div className="mb-resolved__list">
                  {resolvedLog.length === 0 ? (
                    <div className="mb-rail__empty">Nothing resolved yet today.</div>
                  ) : (
                    resolvedLog.map((row) => (
                      <div className="mb-resolved__row" key={row.id}>
                        <span className="mb-resolved__check">✓</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="mb-resolved__proj">{row.project}</div>
                          <div className="mb-resolved__text">{row.text}</div>
                        </div>
                        <MBButton className="mb-restore" onClick={() => restoreResolved(row.id)}>
                          Restore
                        </MBButton>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <div className="mb-endnote">
                End of brief
                {model.generatedLabel ? ` · generated ${model.generatedLabel}` : ""} · continues
                tomorrow
              </div>
            </main>

            {/* RIGHT: ACTION RAIL */}
            <aside className="mb-rail">
              <div className="mb-rail__head">
                <div>
                  <div className="mb-rail__title" role="heading" aria-level={2}>
                    Action items
                  </div>
                  <div className="mb-rail__count">
                    {yourTasks.length} yours · {teamTasks.length} team
                  </div>
                </div>
                <div className="mb-rail__actions">
                  <MBButton
                    className="mb-icon-btn"
                    title="Expand to full screen"
                    aria-label="Expand action items"
                    onClick={() => setRailExpanded(true)}
                  >
                    ⤢
                  </MBButton>
                  <MBButton className="mb-btn-primary" onClick={() => openCreate()}>
                    <span aria-hidden>+</span> Task
                  </MBButton>
                </div>
              </div>

              <div className="mb-rail__group">
                <span className="mb-rail__square you" />
                <div role="heading" aria-level={3}>
                  Your action items
                </div>
                <span className="mb-rail__pill you">{yourTasks.length}</span>
              </div>
              <div className="mb-tasklist">{renderTaskList(yourTasks)}</div>
              {yourTasks.length === 0 ? (
                <div className="mb-rail__empty">Nothing on your plate. Cleared.</div>
              ) : null}

              <div className="mb-rail__group team">
                <span className="mb-rail__square team" />
                <div role="heading" aria-level={3}>
                  Team action items
                </div>
                <span className="mb-rail__pill team">{teamTasks.length}</span>
              </div>
              <div className="mb-tasklist">{renderTaskList(teamTasks)}</div>
              {teamTasks.length === 0 ? (
                <div className="mb-rail__empty">No open team tasks.</div>
              ) : null}
            </aside>
          </div>
        )}
      </div>

      {/* click-away for task menus */}
      {openMenu ? <div className="mb-scrim" onClick={() => setOpenMenu(null)} /> : null}

      {/* ISSUE MENU */}
      {issueMenu ? (
        <>
          <div className="mb-scrim" style={{ zIndex: 44 }} onClick={() => setIssueMenu(null)} />
          <div className="mb-menu mb-menu--issue" style={{ top: issueMenu.y, left: issueMenu.x }}>
            <MBButton onClick={issueCreateTask}>
              <span aria-hidden style={{ color: "var(--mb-orange)" }}>
                +
              </span>{" "}
              Create a new task
            </MBButton>
            <MBButton className="resolve" onClick={issueResolve}>
              <span aria-hidden style={{ color: "var(--mb-green)" }}>
                ✓
              </span>{" "}
              Mark as resolved
            </MBButton>
            <div className="mb-menu__divider" />
            <MBButton onClick={issueFeedback}>
              <span aria-hidden style={{ color: "var(--mb-muted-2)" }}>
                ✎
              </span>{" "}
              Provide feedback
            </MBButton>
          </div>
        </>
      ) : null}

      {/* FULLSCREEN ACTION ITEMS */}
      {railExpanded ? (
        <div className="mb-fullscreen">
          <div className="mb-fullscreen__head">
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
              <div className="mb-fullscreen__title" role="heading" aria-level={2}>
                Action items
              </div>
              <span className="mb-rail__count">
                {yourTasks.length} yours · {teamTasks.length} team
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <MBButton className="mb-btn-primary" onClick={() => openCreate()}>
                <span aria-hidden>+</span> Task
              </MBButton>
              <MBButton className="mb-btn-outline" onClick={() => setRailExpanded(false)}>
                <span aria-hidden>✕</span> Close
              </MBButton>
            </div>
          </div>
          <div className="mb-fullscreen__body">
            <div className="mb-fullscreen__grid">
              <div>
                <div className="mb-rail__group">
                  <span className="mb-rail__square you" />
                  <div role="heading" aria-level={3}>
                    Your action items
                  </div>
                  <span className="mb-rail__pill you">{yourTasks.length}</span>
                </div>
                <div className="mb-tasklist">{renderTaskList(yourTasks)}</div>
              </div>
              <div>
                <div className="mb-rail__group">
                  <span className="mb-rail__square team" />
                  <div role="heading" aria-level={3}>
                    Team action items
                  </div>
                  <span className="mb-rail__pill team">{teamTasks.length}</span>
                </div>
                <div className="mb-tasklist">{renderTaskList(teamTasks)}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* SOURCE DRAWER */}
      {panel === "source" && activeSource ? (
        <>
          <div className="mb-overlay" onClick={closePanel} />
          <aside className="mb-drawer">
            <div className="mb-drawer__head">
              <div className="mb-drawer__head-row">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="mb-src-id">{activeSource.alias}</span>
                  <span className="mb-src-type">{activeSource.typeLabel}</span>
                </div>
                <MBButton className="mb-drawer__x" aria-label="Close" onClick={closePanel}>
                  ×
                </MBButton>
              </div>
              <div className="mb-src-title" role="heading" aria-level={2}>
                {activeSource.title}
              </div>
              {activeSource.meta ? <div className="mb-src-meta">{activeSource.meta}</div> : null}
            </div>
            <div className="mb-drawer__body">
              <div className="mb-drawer__eyebrow">How this source was used</div>
              <div className="mb-src-note">
                Cited in today&apos;s brief for {activeSource.project ?? "a cross-project"} item.
                Open the original to read it in full context.
              </div>
              {activeSource.url ? (
                <a className="mb-src-open" href={activeSource.url} target="_blank" rel="noreferrer">
                  Open in {activeSource.app} ↗
                </a>
              ) : (
                <span className="mb-src-open disabled">No direct link ({activeSource.app})</span>
              )}
            </div>
          </aside>
        </>
      ) : null}

      {/* CREATE / EDIT TASK PANEL */}
      {panel === "task" && form ? (
        <>
          <div className="mb-overlay" onClick={closePanel} />
          <aside className="mb-drawer" style={{ width: "min(438px,100vw)" }}>
            <div className="mb-drawer__head mb-drawer__head-row">
              <div>
                <div className="mb-drawer__kicker">
                  {form.mode === "create" ? "New action item" : "Update action item"}
                </div>
                <div className="mb-drawer__title" role="heading" aria-level={2}>
                  {form.mode === "create" ? "Create task" : "Edit task"}
                </div>
              </div>
              <MBButton className="mb-drawer__x" aria-label="Close" onClick={closePanel}>
                ×
              </MBButton>
            </div>
            <div className="mb-drawer__body">
              <label className="mb-field-label" htmlFor="mb-task-text">
                Task
              </label>
              <Textarea
                id="mb-task-text"
                className="mb-textarea"
                value={form.text}
                onChange={(event) => updateForm({ text: event.target.value })}
              />

              <div className="mb-field-block">
                <label className="mb-field-label">Project</label>
                <div className="mb-chip-row">
                  <MBButton
                    className={`mb-choice${form.projectId === null ? " active" : ""}`}
                    onClick={() => updateForm({ projectId: null })}
                  >
                    No project
                  </MBButton>
                  {projectOptions.map((option) => (
                    <MBButton
                      key={option.id}
                      className={`mb-choice${form.projectId === option.id ? " active" : ""}`}
                      onClick={() => updateForm({ projectId: option.id })}
                    >
                      {option.name}
                    </MBButton>
                  ))}
                </div>
              </div>

              <div className="mb-field-block">
                <label className="mb-field-label">Assign to</label>
                <div className="mb-chip-row">
                  {assigneeOptions.map((option) => (
                    <MBButton
                      key={option.key}
                      className={`mb-choice${form.assigneeKey === option.key ? " active" : ""}`}
                      onClick={() => updateForm({ assigneeKey: option.key })}
                    >
                      {option.name}
                    </MBButton>
                  ))}
                </div>
              </div>

              <div className="mb-form-row">
                <div className="mb-form-col">
                  <label className="mb-field-label" htmlFor="mb-task-due">
                    Due
                  </label>
                  <Input
                    id="mb-task-due"
                    placeholder="YYYY-MM-DD"
                    className="mb-input"
                    value={form.due}
                    onChange={(event) => updateForm({ due: event.target.value })}
                  />
                </div>
                <div className="mb-form-col">
                  <label className="mb-field-label">Priority</label>
                  <div className="mb-chip-row">
                    {(["Normal", "High"] as Priority[]).map((option) => (
                      <MBButton
                        key={option}
                        className={`mb-choice${form.priority === option ? " active" : ""}`}
                        onClick={() => updateForm({ priority: option })}
                      >
                        {option}
                      </MBButton>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mb-drawer__foot">
              <MBButton className="mb-btn-submit" onClick={submitTask} disabled={saving}>
                {form.mode === "create" ? "Create task" : "Save changes"}
              </MBButton>
              <MBButton className="mb-btn-cancel" onClick={closePanel}>
                Cancel
              </MBButton>
            </div>
          </aside>
        </>
      ) : null}

      {/* FEEDBACK PANEL */}
      {panel === "feedback" ? (
        <>
          <div className="mb-overlay" onClick={closePanel} />
          <aside className="mb-drawer" style={{ width: "min(470px,100vw)" }}>
            <div className="mb-drawer__head">
              <div className="mb-drawer__head-row">
                <div>
                  <div className="mb-drawer__kicker">Teach the brief</div>
                  <div className="mb-drawer__title" role="heading" aria-level={2}>
                    Submit feedback
                  </div>
                </div>
                <MBButton className="mb-drawer__x" aria-label="Close" onClick={closePanel}>
                  ×
                </MBButton>
              </div>
              <p className="mb-drawer__sub">
                Flag what missed and highlight what landed. This tunes tomorrow&apos;s
                prioritization.
              </p>
            </div>
            <div className="mb-drawer__body">
              <div className="mb-drawer__eyebrow">Rate the items in today&apos;s brief</div>
              {feedbackItems.map((item) => {
                const tag = fbTags[item.subjectId];
                const showReason = tag === "inaccurate" || tag === "unimportant";
                return (
                  <div className="mb-fb-item" key={item.subjectId}>
                    <div className="mb-fb-item__proj">{item.project}</div>
                    <div className="mb-fb-item__text">{item.text}</div>
                    <div className="mb-fb-tags">
                      <MBButton
                        className={`mb-fb-tag${tag === "inaccurate" ? " active-neg" : ""}`}
                        onClick={() => cycleFbTag(item.subjectId, "inaccurate")}
                      >
                        Inaccurate
                      </MBButton>
                      <MBButton
                        className={`mb-fb-tag${tag === "unimportant" ? " active-neg" : ""}`}
                        onClick={() => cycleFbTag(item.subjectId, "unimportant")}
                      >
                        Not important
                      </MBButton>
                      <MBButton
                        className={`mb-fb-tag${tag === "valuable" ? " active-pos" : ""}`}
                        onClick={() => cycleFbTag(item.subjectId, "valuable")}
                      >
                        ★ Valuable
                      </MBButton>
                    </div>
                    {showReason ? (
                      <Textarea
                        className="mb-fb-reason"
                        placeholder="Why? (trains the model)"
                        value={fbReasons[item.subjectId] ?? ""}
                        onChange={(event) =>
                          setFbReasons((prev) => ({
                            ...prev,
                            [item.subjectId]: event.target.value,
                          }))
                        }
                      />
                    ) : null}
                  </div>
                );
              })}
              <div className="mb-field-block">
                <label className="mb-field-label" htmlFor="mb-fb-note">
                  Anything else
                </label>
                <Textarea
                  id="mb-fb-note"
                  className="mb-fb-reason"
                  style={{ minHeight: 74 }}
                  placeholder="General note for tomorrow's brief"
                  value={fbNote}
                  onChange={(event) => setFbNote(event.target.value)}
                />
              </div>
            </div>
            <div className="mb-drawer__foot">
              <MBButton className="mb-btn-submit" onClick={submitFeedback} disabled={saving}>
                Send feedback
              </MBButton>
              <MBButton className="mb-btn-cancel" onClick={closePanel}>
                Cancel
              </MBButton>
            </div>
          </aside>
        </>
      ) : null}

      {/* TOAST */}
      {toast ? (
        <div className="mb-toast">
          <span>{toast.msg}</span>
          {toast.undo ? (
            <MBButton className="mb-toast__undo" onClick={undoDelete}>
              Undo
            </MBButton>
          ) : null}
        </div>
      ) : null}
    </ChipContext.Provider>
  );
}
