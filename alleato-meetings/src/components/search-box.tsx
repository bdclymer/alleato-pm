"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  return (
    <form onSubmit={submit} className="relative">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search across all meetings & transcripts…"
        className="w-full rounded-xl border border-line bg-ink-850 py-3 pl-10 pr-4 text-sm text-text placeholder:text-faint outline-none transition-colors focus:border-gold/60 focus:bg-ink-800"
      />
    </form>
  );
}
