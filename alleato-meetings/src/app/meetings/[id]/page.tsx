import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseService } from "@/lib/supabase";
import { Avatar, AvatarStack } from "@/components/avatars";
import { avatarColor, dueState, formatDate, formatTime } from "@/lib/format";

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
interface ActionItem { id: string; title: string; owner: string | null; due_date: string | null }
interface Insight { kind: string; text: string }

export default async function MeetingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = supabaseService();

  const { data: meeting } = await sb.from("meetings").select("*").eq("id", id).maybeSingle();
  if (!meeting) notFound();
  const m = meeting as Meeting;

  const [{ data: segs }, { data: actions }, { data: insights }] = await Promise.all([
    sb.from("meeting_segments").select("timestamp_label, speaker, text").eq("meeting_id", id).order("idx"),
    sb.from("action_items").select("id, title, owner, due_date").eq("meeting_id", id),
    sb.from("meeting_insights").select("kind, text").eq("meeting_id", id),
  ]);
  const segments = (segs ?? []) as Segment[];
  const actionItems = (actions ?? []) as ActionItem[];
  const decisions = ((insights ?? []) as Insight[]).filter((i) => i.kind === "decision");
  const risks = ((insights ?? []) as Insight[]).filter((i) => i.kind === "risk");
  const participants = m.participants ?? [];

  let recordingUrl: string | null = null;
  if (m.recording_storage_path) {
    const [bucket, ...rest] = m.recording_storage_path.split("/");
    const { data } = await sb.storage.from(bucket).createSignedUrl(rest.join("/"), 3600);
    recordingUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="animate-fade">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-faint transition-colors hover:text-gold">
        <span aria-hidden>←</span> All meetings
      </Link>

      {/* Hero */}
      <header className="mt-4 border-b border-line pb-7">
        <h1 className="font-display text-3xl font-500 leading-tight tracking-tight">{m.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-faint">
          <span>{formatDate(m.started_at)}</span>
          {m.started_at && <span>{formatTime(m.started_at)}</span>}
          {m.duration_minutes ? <span>{m.duration_minutes} min</span> : null}
          {m.organizer_email && <span className="text-muted">{m.organizer_email}</span>}
          {!m.metadata_resolved && <span className="text-warn">⚠ metadata unresolved</span>}
        </div>
        {participants.length > 0 && (
          <div className="mt-4">
            <AvatarStack names={participants} max={8} />
          </div>
        )}
      </header>

      {recordingUrl && (
        <div className="mt-7 overflow-hidden rounded-xl border border-line bg-black shadow-2xl shadow-black/40">
          <video src={recordingUrl} controls preload="metadata" className="w-full" />
        </div>
      )}

      <div className="mt-8 space-y-10">
        {m.summary && (
          <Section eyebrow="Summary">
            <p className="text-[15px] leading-relaxed text-text/90">{m.summary}</p>
            {m.keywords && m.keywords.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {m.keywords.map((k) => (
                  <span key={k} className="chip">{k}</span>
                ))}
              </div>
            )}
          </Section>
        )}

        <Section eyebrow="Action Items" count={actionItems.length}>
          {actionItems.length === 0 ? (
            <p className="text-sm text-muted">No action items detected.</p>
          ) : (
            <ul className="space-y-2">
              {actionItems.map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-lg border border-line bg-ink-850 p-3.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text">{a.title}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      {a.owner ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                          <Avatar name={a.owner} size={18} /> {a.owner}
                        </span>
                      ) : (
                        <span className="text-xs text-faint">unassigned</span>
                      )}
                      {a.due_date && <DueChip due={a.due_date} />}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {(decisions.length > 0 || risks.length > 0) && (
          <div className="grid gap-8 sm:grid-cols-2">
            {decisions.length > 0 && (
              <Section eyebrow="Decisions" count={decisions.length}>
                <ul className="space-y-2">
                  {decisions.map((d, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-text/90">
                      <span className="mt-1 text-good">✓</span>
                      <span>{d.text}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {risks.length > 0 && (
              <Section eyebrow="Risks" count={risks.length}>
                <ul className="space-y-2">
                  {risks.map((r, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-text/90">
                      <span className="mt-1 text-bad">!</span>
                      <span>{r.text}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}

        {m.notes && (
          <Section eyebrow="Notes">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text/90">{m.notes}</pre>
          </Section>
        )}

        {segments.length > 0 && (
          <Section eyebrow="Transcript" count={segments.length}>
            <div className="space-y-3">
              {segments.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-12 shrink-0 pt-0.5 text-right font-mono text-[11px] text-faint">
                    {s.timestamp_label}
                  </span>
                  <p className="text-sm leading-relaxed">
                    <span
                      className="font-600"
                      style={{ color: avatarColor(s.speaker ?? "Unknown") }}
                    >
                      {s.speaker ?? "Unknown"}
                    </span>
                    <span className="text-text/85"> {s.text}</span>
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  count,
  children,
}: {
  eyebrow: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3.5 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-gold">
        {eyebrow}
        {typeof count === "number" && <span className="text-faint">({count})</span>}
      </h2>
      {children}
    </section>
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
