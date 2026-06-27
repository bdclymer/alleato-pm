"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/auth-browser";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setMessage("");
    try {
      const supabase = createBrowserSupabase();
      const next = new URLSearchParams(window.location.search).get("next") || "/";
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) throw error;
      setState("sent");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Could not send the link.");
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-ink-950 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gold font-display text-xl text-gold-ink">
            A
          </span>
          <h1 className="font-display text-2xl tracking-tight">Alleato Meetings</h1>
          <p className="mt-1 text-sm text-muted">Sign in with a magic link.</p>
        </div>

        {state === "sent" ? (
          <div className="surface p-6 text-center text-sm">
            <p className="text-text">Check your inbox.</p>
            <p className="mt-1 text-muted">We sent a sign-in link to {email}.</p>
          </div>
        ) : (
          <form onSubmit={sendLink} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@alleatogroup.com"
              className="w-full rounded-xl border border-line bg-ink-850 px-4 py-3 text-sm text-text placeholder:text-faint outline-none transition-colors focus:border-gold/60 focus:bg-ink-800"
            />
            <button
              type="submit"
              disabled={state === "sending"}
              className="w-full rounded-xl bg-gold py-3 text-sm font-600 text-gold-ink transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {state === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {state === "error" && <p className="text-xs text-bad">{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
