"use client";

import Link from "next/link";

import type { RailTask } from "@/lib/daily-briefs/morning-brief-tasks";

import { MBButton } from "./mb-button";

export interface TaskCardProps {
  task: RailTask;
  expanded: boolean;
  menuOpen: boolean;
  onResolve: (id: string) => void;
  onExpand: (id: string) => void;
  onMenu: (id: string) => void;
  onEdit: (id: string) => void;
  onReassign: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({
  task,
  expanded,
  menuOpen,
  onResolve,
  onExpand,
  onMenu,
  onEdit,
  onReassign,
  onDelete,
}: TaskCardProps) {
  return (
    <div className="mb-task" data-row>
      {task.you ? <span className="mb-task__accent" /> : null}

      <MBButton
        className="mb-task__check"
        title="Mark resolved"
        aria-label="Mark resolved"
        onClick={() => onResolve(task.id)}
      >
        ✓
      </MBButton>

      <div className="mb-task__main">
        <div className="mb-task__text">{task.text}</div>
        <div className="mb-task__meta">
          {task.project ? (
            <Link href={task.href} className="mb-task__proj">
              {task.project}
            </Link>
          ) : (
            <span className="mb-task__proj">Unassigned</span>
          )}
          {task.showOwner ? (
            <>
              <span className="mb-task__sep">·</span>
              <span className="mb-task__owner">{task.owner}</span>
            </>
          ) : null}
          {task.dueLabel ? (
            <>
              <span className="mb-task__sep">·</span>
              <span className={`mb-task__due${task.dueNormal ? " normal" : ""}`}>
                {task.dueLabel}
              </span>
            </>
          ) : null}
          {task.carried ? (
            <>
              <span className="mb-task__sep">·</span>
              <span className="mb-task__carried">Carried · {task.since}</span>
            </>
          ) : null}
          {task.reasoning ? (
            <MBButton className="mb-task__why" onClick={() => onExpand(task.id)}>
              {expanded ? "Hide context" : "Why?"}
            </MBButton>
          ) : null}
        </div>

        {expanded && task.reasoning ? (
          <div className="mb-task__detail">{task.reasoning}</div>
        ) : null}
      </div>

      <div className="mb-task__menu-wrap">
        <MBButton
          className="mb-task__menu-btn"
          title="Task options"
          aria-label="Task options"
          onClick={(event) => {
            event.stopPropagation();
            onMenu(task.id);
          }}
        >
          ⋯
        </MBButton>
        {menuOpen ? (
          <div className="mb-menu mb-menu--task">
            <MBButton onClick={() => onEdit(task.id)}>Edit task</MBButton>
            <MBButton onClick={() => onReassign(task.id)}>Reassign</MBButton>
            <div className="mb-menu__divider" />
            <MBButton className="danger" onClick={() => onDelete(task.id)}>
              Delete
            </MBButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
