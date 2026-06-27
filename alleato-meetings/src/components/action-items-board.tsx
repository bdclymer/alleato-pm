"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatars";
import { dueState } from "@/lib/format";

export interface ActionRow {
  id: string;
  title: string;
  owner: string | null;
  due_date: string | null;
  status: string;
  meeting_id: string;
  meeting_title: string;
}

type Filter = "all" | "overdue" | "unassigned";

export function ActionItemsBoard({ rows }: { rows: ActionRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "overdue" && dueState(r.due_date) !== "overdue") return false;
      if (filter === "unassigned" && r.owner) return false;
      if (needle) {
        const hay = [r.title, r.owner ?? "", r.meeting_title].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, filter]);

  const overdueCount = rows.filter((r) => dueState(r.due_date) === "overdue").length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search action items…"
            className="w-full rounded-xl border border-line bg-ink-850 px-4 py-3 text-sm text-text placeholder:text-faint outline-none transition-colors focus:border-gold/60 focus:bg-ink-800"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-line bg-ink-850 p-1">
          <Tab on={filter === "all"} onClick={() => setFilter("all")}>All</Tab>
          <Tab on={filter === "overdue"} onClick={() => setFilter("overdue")}>
            Overdue{overdueCount > 0 ? ` · ${overdueCount}` : ""}
          </Tab>
          <Tab on={filter === "unassigned"} onClick={() => setFilter("unassigned")}>Unassigned</Tab>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="surface px-6 py-16 text-center text-sm text-muted">
          {rows.length === 0 ? "No action items yet." : "Nothing matches this filter."}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r, i) => (
            <li
              key={r.id}
              className="animate-rise flex items-start gap-3.5 rounded-xl border border-line bg-ink-850 p-4 transition-colors hover:border-gold/30"
              style={{ animationDelay: `${Math.min(i, 14) * 30}ms` }}
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text">{r.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {r.owner ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <Avatar name={r.owner} size={18} /> {r.owner}
                    </span>
                  ) : (
                    <span className="text-xs text-faint">unassigned</span>
                  )}
                  {r.due_date && <DueChip due={r.due_date} />}
                  <Link
                    href={`/meetings/${r.meeting_id}`}
                    className="ml-auto truncate text-xs text-faint transition-colors hover:text-gold"
                  >
                    {r.meeting_title} →
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-500 transition-colors ${
        on ? "bg-gold-soft text-gold" : "text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function DueChip({ due }: { due: string }) {
  const state = dueState(due);
  const cls =
    state === "overdue"
      ? "border-bad/40 text-bad"
      : state === "soon"
        ? "border-warn/40 text-warn"
        : "border-line text-muted";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${cls}`}>
      {state === "overdue" ? "overdue · " : "due "}
      {due}
    </span>
  );
}
