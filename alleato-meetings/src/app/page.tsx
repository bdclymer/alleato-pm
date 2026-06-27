import Link from "next/link";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface MeetingRow {
  id: string;
  title: string;
  started_at: string | null;
  duration_minutes: number | null;
  participants: string[] | null;
  recording_storage_path: string | null;
}

export default async function HomePage() {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("meetings")
    .select("id, title, started_at, duration_minutes, participants, recording_storage_path")
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) {
    return <p className="text-sm text-muted">Could not load meetings: {error.message}</p>;
  }
  const meetings = (data ?? []) as MeetingRow[];

  if (meetings.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-panel p-8 text-center">
        <h1 className="text-base font-medium">No meetings yet</h1>
        <p className="mt-2 text-sm text-muted">
          Once Teams transcription is enabled and a sync runs, recorded meetings appear here
          with AI summary, notes, and action items.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-base font-medium">Meetings</h1>
      <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
        {meetings.map((m) => (
          <li key={m.id}>
            <Link href={`/meetings/${m.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-white/5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.title}</p>
                <p className="text-xs text-muted">
                  {m.started_at ? new Date(m.started_at).toLocaleString() : "Date unknown"}
                  {m.duration_minutes ? ` · ${m.duration_minutes} min` : ""}
                  {m.participants?.length ? ` · ${m.participants.length} attendees` : ""}
                </p>
              </div>
              {m.recording_storage_path ? (
                <span className="ml-3 shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
                  video
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
