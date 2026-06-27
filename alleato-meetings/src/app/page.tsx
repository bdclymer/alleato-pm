import { supabaseService } from "@/lib/supabase";
import { MeetingsBrowser, type MeetingCard } from "@/components/meetings-browser";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("meetings")
    .select(
      "id, title, started_at, duration_minutes, participants, summary, recording_storage_path, action_items(count)",
    )
    .order("started_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <Shell>
        <div className="surface p-6 text-sm text-bad">Could not load meetings: {error.message}</div>
      </Shell>
    );
  }

  const meetings: MeetingCard[] = (data ?? []).map((m) => ({
    id: m.id as string,
    title: (m.title as string) ?? "Untitled meeting",
    started_at: (m.started_at as string) ?? null,
    duration_minutes: (m.duration_minutes as number) ?? null,
    participants: (m.participants as string[]) ?? [],
    summary: (m.summary as string) ?? null,
    has_recording: Boolean(m.recording_storage_path),
    action_count:
      Array.isArray(m.action_items) && m.action_items[0]
        ? Number((m.action_items[0] as { count: number }).count) || 0
        : 0,
  }));

  return (
    <Shell>
      <MeetingsBrowser meetings={meetings} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold">Dashboard</p>
        <h1 className="mt-1 font-display text-3xl font-500 tracking-tight">Meetings</h1>
        <p className="mt-1 text-sm text-muted">
          Every Teams meeting, transcribed and distilled — summary, action items, decisions.
        </p>
      </header>
      {children}
    </div>
  );
}
