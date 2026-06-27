"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncNowButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function run() {
    setState("running");
    setMsg("");
    try {
      const res = await fetch("/api/sync/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setState("error");
        setMsg(data.error === "meeting_access_denied" ? "Access not granted yet" : data.error || "Sync failed");
        return;
      }
      setState("idle");
      router.refresh();
    } catch {
      setState("error");
      setMsg("Sync failed");
    }
  }

  return (
    <div className="flex items-center gap-2">
      {state === "error" && <span className="text-xs text-bad">{msg}</span>}
      <button
        type="button"
        onClick={run}
        disabled={state === "running"}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-ink-850 px-3 py-1.5 text-xs font-500 text-muted transition-colors hover:border-gold/40 hover:text-text disabled:opacity-60"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          className={state === "running" ? "animate-spin" : ""}
        >
          <path d="M20 11A8 8 0 1 0 12 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {state === "running" ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}
