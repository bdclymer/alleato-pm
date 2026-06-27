"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AvatarStack } from "@/components/avatars";
import { formatTime, monthDay } from "@/lib/format";

export interface MeetingCard {
  id: string;
  title: string;
  started_at: string | null;
  duration_minutes: number | null;
  participants: string[];
  summary: string | null;
  has_recording: boolean;
  action_count: number;
}

export function MeetingsBrowser({ meetings }: { meetings: MeetingCard[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return meetings;
    return meetings.filter((m) => {
      const hay = [m.title, m.summary ?? "", m.participants.join(" ")].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [q, meetings]);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search meetings, people, topics…"
            className="w-full rounded-xl border border-line bg-ink-850 py-3 pl-10 pr-4 text-sm text-text placeholder:text-faint outline-none transition-colors focus:border-gold/60 focus:bg-ink-800"
          />
        </div>
        <span className="hidden shrink-0 font-mono text-xs text-faint sm:block">
          {filtered.length} / {meetings.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasMeetings={meetings.length > 0} />
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((m, i) => (
            <li key={m.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
              <MeetingRow m={m} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MeetingRow({ m }: { m: MeetingCard }) {
  const { month, day } = monthDay(m.started_at);
  return (
    <Link
      href={`/meetings/${m.id}`}
      className="group flex items-stretch gap-4 rounded-xl border border-line bg-ink-850 p-4 transition-all hover:-translate-y-px hover:border-gold/40 hover:bg-ink-800"
    >
      {/* Date block */}
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-ink-900 py-2">
        <span className="font-mono text-[10px] tracking-widest text-gold">{month}</span>
        <span className="font-display text-2xl leading-none text-text">{day}</span>
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-500 text-text transition-colors group-hover:text-gold">{m.title}</h3>
          {m.has_recording && (
            <span className="chip shrink-0 border-gold/30 text-gold">
              <PlayIcon /> video
            </span>
          )}
        </div>
        {m.summary && (
          <p className="mt-1 line-clamp-1 text-sm text-muted">{m.summary}</p>
        )}
        <div className="mt-2.5 flex items-center gap-4">
          {m.participants.length > 0 && <AvatarStack names={m.participants} />}
          <span className="font-mono text-[11px] text-faint">
            {formatTime(m.started_at)}
            {m.duration_minutes ? ` · ${m.duration_minutes}m` : ""}
          </span>
          {m.action_count > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {m.action_count} action{m.action_count === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ hasMeetings }: { hasMeetings: boolean }) {
  return (
    <div className="surface flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-soft text-gold">
        <SearchIcon />
      </div>
      <h2 className="font-display text-lg text-text">{hasMeetings ? "No matches" : "No meetings yet"}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">
        {hasMeetings
          ? "Try a different search term."
          : "Once Teams transcription is enabled and a sync runs, your meetings appear here with AI summaries and action items."}
      </p>
    </div>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
