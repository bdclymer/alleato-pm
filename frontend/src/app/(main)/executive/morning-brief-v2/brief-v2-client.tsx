"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { MBButton } from "../morning-brief/mb-button";
import {
  BRIEF_CONTENT,
  type BriefSourceLink,
  type BriefTask,
} from "./brief-content";

// ─────────────────────────────────────────────────────────────────────────────
// Morning Brief v2 — standalone, interactive preview.
//
// Renders the scannable July 9 brief and lets the reader mark decisions and
// tasks resolved, edit / add / delete tasks, and restore anything resolved.
// State is client-local for now (this surface is a design + interaction proof);
// wiring these mutations to the real task API + brief packet is the next step.
// ─────────────────────────────────────────────────────────────────────────────

interface EditableTask extends BriefTask {
  done: boolean;
}

interface ResolvedRow {
  id: string;
  kind: "decision" | "task";
  project: string;
  text: string;
}

type Draft = {
  id: string | null; // null = creating
  group: "you" | "team";
  project: string;
  owner: string;
  action: string;
  due: string;
};

const SOON = /^(today|wed|asap|before jul 16)$/i;

function SourceChips({ sources }: { sources: BriefSourceLink[] }) {
  return (
    <div className="mb2-project__sources">
      {sources.map((source) => (
        <a
          key={source.href + source.label}
          className="mb2-chip"
          href={source.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="g" aria-hidden>
            {source.kind === "meeting" ? "◫" : "✉"}
          </span>{" "}
          {source.label}
        </a>
      ))}
    </div>
  );
}

export function MorningBriefV2Client({ tasks: realTasks = [] }: { tasks?: BriefTask[] }) {
  const content = BRIEF_CONTENT;
  // Prefer the real deep-read tasks; fall back to the static snapshot only when
  // the DB returned nothing (e.g. unreachable at build time).
  const seedTasks = realTasks.length > 0 ? realTasks : content.tasks;

  const [doneDecisions, setDoneDecisions] = React.useState<Set<string>>(new Set());
  const [tasks, setTasks] = React.useState<EditableTask[]>(
    seedTasks.map((task) => ({ ...task, done: false })),
  );
  const [resolvedLog, setResolvedLog] = React.useState<ResolvedRow[]>([]);
  const [movingOpen, setMovingOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [toast, setToast] = React.useState<{ msg: string; undo?: () => void } | null>(null);

  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const idSeq = React.useRef(0);

  const flash = React.useCallback((msg: string, undo?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 5000 : 2600);
  }, []);

  React.useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  // ── decisions ───────────────────────────────────────────────────────────────
  const toggleDecision = (id: string, project: string, text: string) => {
    setDoneDecisions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setResolvedLog((log) => log.filter((row) => row.id !== id));
      } else {
        next.add(id);
        setResolvedLog((log) => [{ id, kind: "decision", project, text }, ...log]);
        flash("Marked resolved — moved to today's log");
      }
      return next;
    });
  };

  // ── tasks ─────────────────────────────────────────────────────────────────
  const resolveTask = (task: EditableTask) => {
    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, done: true } : item)));
    setResolvedLog((log) => [
      { id: task.id, kind: "task", project: task.project, text: task.action },
      ...log,
    ]);
    flash("Resolved — moved to today's log");
  };

  const reopenTask = (id: string) => {
    setTasks((prev) => prev.map((item) => (item.id === id ? { ...item, done: false } : item)));
    setResolvedLog((log) => log.filter((row) => row.id !== id));
  };

  const restoreResolved = (row: ResolvedRow) => {
    setResolvedLog((log) => log.filter((entry) => entry.id !== row.id));
    if (row.kind === "decision") {
      setDoneDecisions((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    } else {
      reopenTask(row.id);
    }
  };

  const deleteTask = (task: EditableTask) => {
    setTasks((prev) => prev.filter((item) => item.id !== task.id));
    const index = tasks.findIndex((item) => item.id === task.id);
    flash("Task deleted", () => {
      setTasks((prev) => {
        const next = [...prev];
        next.splice(Math.max(0, index), 0, task);
        return next;
      });
      setToast(null);
    });
  };

  const openCreate = (group: "you" | "team") =>
    setDraft({ id: null, group, project: "", owner: "", action: "", due: "" });

  const openEdit = (task: EditableTask) =>
    setDraft({
      id: task.id,
      group: task.group,
      project: task.project,
      owner: task.owner ?? "",
      action: task.action,
      due: task.due ?? "",
    });

  const saveDraft = () => {
    if (!draft) return;
    const action = draft.action.trim();
    if (!action) {
      flash("Add a task description first");
      return;
    }
    const owner = draft.owner.trim() || null;
    const due = draft.due.trim() || null;
    const project = draft.project.trim() || "General";
    if (draft.id) {
      setTasks((prev) =>
        prev.map((item) =>
          item.id === draft.id ? { ...item, project, owner, action, due } : item,
        ),
      );
      flash("Task updated");
    } else {
      idSeq.current += 1;
      const newTask: EditableTask = {
        id: `new-${idSeq.current}`,
        group: draft.group,
        project,
        owner,
        action,
        due,
        done: false,
      };
      setTasks((prev) => [...prev, newTask]);
      flash("Task added");
    }
    setDraft(null);
  };

  const yourTasks = tasks.filter((task) => task.group === "you");
  const teamTasks = tasks.filter((task) => task.group === "team");
  const openCount = tasks.filter((task) => !task.done).length;

  const renderTaskRow = (task: EditableTask) => (
    <div className={`mb2-task ${task.group === "team" ? "team" : ""} ${task.done ? "done" : ""}`} key={task.id}>
      <MBButton
        className="mb2-task__check"
        aria-label={task.done ? "Reopen task" : "Mark task resolved"}
        onClick={() => (task.done ? reopenTask(task.id) : resolveTask(task))}
      >
        ✓
      </MBButton>
      <span className="mb2-task__proj">{task.project}</span>
      {task.group === "team" ? (
        <span className="mb2-task__owner">{task.owner ?? "Unassigned"}</span>
      ) : null}
      <span className="mb2-task__action">{task.action}</span>
      {task.group === "team" ? (
        <span className={`mb2-task__due ${task.due && SOON.test(task.due) ? "soon" : ""}`}>
          {task.due ?? ""}
        </span>
      ) : null}
      <span className="mb2-task__actions">
        <MBButton className="mb2-iconbtn" aria-label="Edit task" title="Edit" onClick={() => openEdit(task)}>
          ✎
        </MBButton>
        <MBButton className="mb2-iconbtn" aria-label="Delete task" title="Delete" onClick={() => deleteTask(task)}>
          ×
        </MBButton>
      </span>
    </div>
  );

  return (
    <div className="mb2">
      <div className="mb2-wrap">
        <header className="mb2-masthead">
          <div className="mb2-eyebrow">Alleato Group · The Morning Brief</div>
          <div className="mb2-title" role="heading" aria-level={1}>
            {content.weekday}, {content.dateLabel}
          </div>
          <div className="mb2-coverage">
            {content.coverage.map((item) => (
              <span key={item.label}>
                <b>{item.n}</b> {item.label}
              </span>
            ))}
          </div>
        </header>

        {/* YOUR CALLS TODAY */}
        <div className="mb2-seclabel">Your calls today</div>
        <ol className="mb2-calls">
          {content.decisions.map((decision) => {
            const done = doneDecisions.has(decision.id);
            const plain = decision.text.map((segment) => segment.t).join("");
            return (
              <li className={`mb2-call ${done ? "done" : ""}`} key={decision.id}>
                <MBButton
                  className="mb2-call__spacer"
                  aria-label={done ? "Reopen decision" : "Mark decision resolved"}
                  onClick={() => toggleDecision(decision.id, decision.project, plain)}
                  style={{ position: "absolute", left: 0, top: 6, width: 28, height: 28 }}
                />
                <div className="mb2-call__body">
                  <span className="mb2-call__proj">{decision.project}</span> —{" "}
                  {decision.text.map((segment, index) =>
                    segment.b ? <b key={index}>{segment.t}</b> : <span key={index}>{segment.t}</span>,
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* PROJECTS */}
        <div className="mb2-seclabel">Projects that need attention</div>
        {content.attentionProjects.map((project) => (
          <section className="mb2-project" key={project.id}>
            <div className="mb2-project__head">
              <span className="mb2-project__name" role="heading" aria-level={2}>
                {project.name}
              </span>
              <span className={`mb2-flag ${project.flag}`}>{project.flagLabel}</span>
            </div>
            <SourceChips sources={project.sources} />
            <ul className="mb2-pts">
              {project.points.map((point, index) => (
                <li className={`mb2-pt ${point.call ? "call" : ""}`} key={index}>
                  {point.call ? (
                    <>
                      <b>Your call:</b> {point.t.replace(/^Your call:\s*/, "")}
                    </>
                  ) : (
                    point.t
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* ALSO MOVING */}
        <div className="mb2-moving">
          <MBButton className="mb2-moving__toggle" onClick={() => setMovingOpen((open) => !open)}>
            <span role="heading" aria-level={2}>
              Also moving — nothing needed from you
            </span>{" "}
            <span className="mb2-moving__tw">{content.moving.length} on track</span>
            <span aria-hidden>{movingOpen ? "▾" : "▸"}</span>
          </MBButton>
          {movingOpen
            ? content.moving.map((item) => (
                <div className="mb2-mv" key={item.id}>
                  <b>{item.name}</b>
                  {item.resolved ? <span className="mb2-mv__resolved">Resolved</span> : null}
                  <span className="mb2-mv__txt">{item.text}</span>
                  <a className="mb2-chip" href={item.source.href} target="_blank" rel="noopener noreferrer">
                    <span className="g" aria-hidden>
                      ✉
                    </span>{" "}
                    {item.source.label}
                  </a>
                </div>
              ))
            : null}
        </div>

        {/* LOOSE ENDS */}
        <div className="mb2-seclabel">Loose ends — yours to chase</div>
        <ul className="mb2-loose">
          {content.looseEnds.map((item) => {
            const dashIndex = item.text.indexOf(" — ");
            const lead = dashIndex > -1 ? item.text.slice(0, dashIndex) : "";
            const rest = dashIndex > -1 ? item.text.slice(dashIndex) : item.text;
            return (
              <li key={item.id}>
                <span className="mb2-loose__txt">
                  {lead ? <b>{lead}</b> : null}
                  {rest}
                </span>
                <a className="mb2-chip" href={item.source.href} target="_blank" rel="noopener noreferrer">
                  <span className="g" aria-hidden>
                    ✉
                  </span>{" "}
                  {item.source.label}
                </a>
              </li>
            );
          })}
        </ul>

        {/* ACTION ITEMS */}
        <div className="mb2-seclabel">Action items</div>
        <div className="mb2-tasks-head">
          <p className="mb2-tasks-intro">
            Deduplicated · one owner each · check off, edit, or add below.
          </p>
          <span className="mb2-tasks-intro">{openCount} open</span>
        </div>

        <div className="mb2-taskgroup-h" role="heading" aria-level={2}>
          Your tasks — Brandon <span className="n">{yourTasks.filter((t) => !t.done).length}</span>
        </div>
        <div className="mb2-tasklist">{yourTasks.map(renderTaskRow)}</div>
        <div className="mb2-addrow">
          <MBButton className="mb2-addbtn" onClick={() => openCreate("you")}>
            <span aria-hidden>+</span> Add task
          </MBButton>
        </div>

        <div className="mb2-taskgroup-h" role="heading" aria-level={2}>
          Team tasks <span className="n">{teamTasks.filter((t) => !t.done).length}</span>
        </div>
        <div className="mb2-tasklist">{teamTasks.map(renderTaskRow)}</div>
        <div className="mb2-addrow">
          <MBButton className="mb2-addbtn" onClick={() => openCreate("team")}>
            <span aria-hidden>+</span> Add task
          </MBButton>
        </div>

        {/* RESOLVED */}
        <div className="mb2-resolved">
          <div className="mb2-seclabel" style={{ border: "none", padding: 0, margin: 0 }}>
            Resolved today · {resolvedLog.length}
          </div>
          {resolvedLog.length === 0 ? (
            <div className="mb2-empty">Nothing resolved yet today.</div>
          ) : (
            resolvedLog.map((row) => (
              <div className="mb2-resolved__row" key={`${row.kind}-${row.id}`}>
                <span className="mb2-resolved__check" aria-hidden>
                  ✓
                </span>
                <span className="mb2-resolved__txt">
                  <span className="mb2-resolved__proj">{row.project}</span>
                  <span>{row.text}</span>
                </span>
                <MBButton className="mb2-restore" onClick={() => restoreResolved(row)}>
                  Restore
                </MBButton>
              </div>
            ))
          )}
        </div>

        <div className="mb2-colophon">
          July 9, 2026 · 4 meetings, ~180 emails across 16 projects · sources link to the meeting page
          or project inbox in-app. Preview surface — task changes aren&apos;t saved yet.
        </div>
      </div>

      {/* EDIT / ADD SHEET */}
      {draft ? (
        <div className="mb2-overlay" onClick={() => setDraft(null)}>
          <div className="mb2-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="mb2-sheet__title" role="heading" aria-level={2}>
              {draft.id ? "Edit task" : "Add task"}
            </div>
            <div className="mb2-field">
              <label htmlFor="mb2-action">Task</label>
              <Textarea
                id="mb2-action"
                value={draft.action}
                onChange={(event) => setDraft({ ...draft, action: event.target.value })}
              />
            </div>
            <div className="mb2-field">
              <label htmlFor="mb2-project">Project</label>
              <Input
                id="mb2-project"
                value={draft.project}
                onChange={(event) => setDraft({ ...draft, project: event.target.value })}
              />
            </div>
            {draft.group === "team" ? (
              <div className="mb2-field">
                <label htmlFor="mb2-owner">Owner</label>
                <Input
                  id="mb2-owner"
                  value={draft.owner}
                  onChange={(event) => setDraft({ ...draft, owner: event.target.value })}
                />
              </div>
            ) : null}
            {draft.group === "team" ? (
              <div className="mb2-field">
                <label htmlFor="mb2-due">Due</label>
                <Input
                  id="mb2-due"
                  placeholder="e.g. Today, Jul 24, ASAP"
                  value={draft.due}
                  onChange={(event) => setDraft({ ...draft, due: event.target.value })}
                />
              </div>
            ) : null}
            <div className="mb2-sheet__foot">
              {draft.id ? (
                <MBButton
                  className="mb2-btn danger"
                  onClick={() => {
                    const target = tasks.find((item) => item.id === draft.id);
                    if (target) deleteTask(target);
                    setDraft(null);
                  }}
                >
                  Delete
                </MBButton>
              ) : null}
              <MBButton className="mb2-btn ghost" onClick={() => setDraft(null)}>
                Cancel
              </MBButton>
              <MBButton className="mb2-btn primary" onClick={saveDraft}>
                {draft.id ? "Save" : "Add task"}
              </MBButton>
            </div>
          </div>
        </div>
      ) : null}

      {/* TOAST */}
      {toast ? (
        <div className="mb2-toast">
          <span>{toast.msg}</span>
          {toast.undo ? (
            <MBButton className="mb2-toast__undo" onClick={toast.undo}>
              Undo
            </MBButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
