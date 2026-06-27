import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface Meeting {
  id: string;
  title: string;
  started_at: string | null;
  duration_minutes: number | null;
  organizer_email: string | null;
  participants: string[] | null;
  summary: string | null;
  notes: string | null;
  keywords: string[] | null;
  recording_storage_path: string | null;
  metadata_resolved: boolean;
}
interface Segment { timestamp_label: string | null; speaker: string | null; text: string }
interface ActionItem { id: string; title: string; owner: string | null; due_date: string | null; status: string }
interface Insight { kind: string; text: string }

export default async function MeetingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = supabaseService();

  const { data: meeting } = await sb.from("meetings").select("*").eq("id", id).maybeSingle();
  if (!meeting) notFound();
  const m = meeting as Meeting;

  const [{ data: segs }, { data: actions }, { data: insights }] = await Promise.all([
    sb.from("meeting_segments").select("timestamp_label, speaker, text").eq("meeting_id", id).order("idx"),
    sb.from("action_items").select("id, title, owner, due_date, status").eq("meeting_id", id),
    sb.from("meeting_insights").select("kind, text").eq("meeting_id", id),
  ]);
  const segments = (segs ?? []) as Segment[];
  const actionItems = (actions ?? []) as ActionItem[];
  const decisions = (insights ?? []).filter((i: Insight) => i.kind === "decision");
  const risks = (insights ?? []).filter((i: Insight) => i.kind === "risk");

  // Sign a short-lived URL for the private recording.
  let recordingUrl: string | null = null;
  if (m.recording_storage_path) {
    const [bucket, ...rest] = m.recording_storage_path.split("/");
    const { data } = await sb.storage.from(bucket).createSignedUrl(rest.join("/"), 3600);
    recordingUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-xs text-muted hover:text-fg">← All meetings</Link>
        <h1 className="mt-2 text-lg font-semibold">{m.title}</h1>
        <p className="mt-1 text-xs text-muted">
          {m.started_at ? new Date(m.started_at).toLocaleString() : "Date unknown"}
          {m.duration_minutes ? ` · ${m.duration_minutes} min` : ""}
          {m.organizer_email ? ` · ${m.organizer_email}` : ""}
          {!m.metadata_resolved ? " · ⚠ metadata unresolved" : ""}
        </p>
      </div>

      {recordingUrl ? (
        <video src={recordingUrl} controls preload="metadata" className="w-full rounded-lg border border-border" />
      ) : null}

      {m.summary ? (
        <Section title="Summary">
          <p className="text-sm leading-relaxed text-fg/90">{m.summary}</p>
        </Section>
      ) : null}

      <Section title={`Action items (${actionItems.length})`}>
        {actionItems.length === 0 ? (
          <p className="text-sm text-muted">No action items detected.</p>
        ) : (
          <ul className="space-y-2">
            {actionItems.map((a) => (
              <li key={a.id} className="rounded-md border border-border bg-panel px-3 py-2 text-sm">
                <span className="font-medium">{a.title}</span>
                <span className="ml-2 text-xs text-muted">
                  {a.owner ? `· ${a.owner}` : "· unassigned"}
                  {a.due_date ? ` · due ${a.due_date}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {decisions.length > 0 ? (
        <Section title={`Decisions (${decisions.length})`}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-fg/90">
            {decisions.map((d, i) => <li key={i}>{d.text}</li>)}
          </ul>
        </Section>
      ) : null}

      {risks.length > 0 ? (
        <Section title={`Risks (${risks.length})`}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-fg/90">
            {risks.map((r, i) => <li key={i}>{r.text}</li>)}
          </ul>
        </Section>
      ) : null}

      {m.notes ? (
        <Section title="Notes">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg/90">{m.notes}</pre>
        </Section>
      ) : null}

      {segments.length > 0 ? (
        <Section title="Transcript">
          <div className="space-y-2">
            {segments.map((s, i) => (
              <p key={i} className="text-sm leading-relaxed">
                <span className="mr-2 text-xs text-muted">{s.timestamp_label}</span>
                <span className="font-medium text-accent">{s.speaker ?? "Unknown"}:</span>{" "}
                <span className="text-fg/90">{s.text}</span>
              </p>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">{title}</h2>
      {children}
    </section>
  );
}
