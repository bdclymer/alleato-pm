import { createHash } from "crypto";
import {
  graphDownload,
  graphDownloadText,
  graphGet,
  graphGetAllPages,
} from "./graph";
import { parseVtt, cuesToTranscript } from "./vtt";
import { extractMeetingInsights } from "./ai";
import { supabaseService } from "./supabase";
import type { ResolvedMeetingMeta } from "./types";

const RECORDING_BUCKET = "recordings";

interface TranscriptEntry {
  id: string;
  meetingId: string;
  meetingOrganizer?: { user?: { id?: string } };
  transcriptContentUrl?: string;
  createdDateTime?: string;
}
interface RecordingEntry {
  id: string;
  meetingId: string;
  meetingOrganizer?: { user?: { id?: string } };
  recordingContentUrl?: string;
  createdDateTime?: string;
}

export function meetingDocKey(graphMeetingId: string): string {
  return "teamsmtg_" + createHash("sha256").update(graphMeetingId).digest("hex").slice(0, 16);
}

const organizerCache = new Map<string, { displayName: string | null; mail: string | null }>();

async function resolveOrganizer(orgId?: string) {
  if (!orgId) return { displayName: null, mail: null };
  if (organizerCache.has(orgId)) return organizerCache.get(orgId)!;
  let info = { displayName: null as string | null, mail: null as string | null };
  try {
    const u = await graphGet<{ displayName?: string; mail?: string; userPrincipalName?: string }>(
      `/users/${orgId}?$select=displayName,mail,userPrincipalName`,
    );
    info = { displayName: u.displayName ?? null, mail: u.mail ?? u.userPrincipalName ?? null };
  } catch {
    /* best-effort */
  }
  organizerCache.set(orgId, info);
  return info;
}

async function resolveMeetingMeta(orgId: string | undefined, meetingId: string): Promise<ResolvedMeetingMeta> {
  const organizer = await resolveOrganizer(orgId);
  const meta: ResolvedMeetingMeta = {
    title: null,
    attendees: [],
    start: null,
    end: null,
    organizerEmail: organizer.mail,
    resolved: false,
  };
  if (orgId) {
    try {
      const m = await graphGet<{
        subject?: string;
        startDateTime?: string;
        endDateTime?: string;
        participants?: {
          organizer?: { upn?: string; identity?: { user?: { displayName?: string } } };
          attendees?: Array<{ upn?: string; identity?: { user?: { displayName?: string } } }>;
        };
      }>(`/users/${orgId}/onlineMeetings/${meetingId}`);
      meta.title = m.subject ?? null;
      meta.start = m.startDateTime ?? null;
      meta.end = m.endDateTime ?? null;
      const names: string[] = [];
      const all = [m.participants?.organizer, ...(m.participants?.attendees ?? [])];
      for (const p of all) {
        const name = p?.identity?.user?.displayName ?? p?.upn;
        if (name && !names.includes(name)) names.push(name);
      }
      meta.attendees = names;
      meta.resolved = true;
    } catch {
      /* fall through to synthetic */
    }
  }
  if (meta.attendees.length === 0 && organizer.displayName) meta.attendees = [organizer.displayName];
  return meta;
}

function durationMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms > 0 ? Math.max(1, Math.round(ms / 60000)) : null;
}

async function getWatermark(source: string): Promise<string | null> {
  const sb = supabaseService();
  const { data } = await sb.from("sync_state").select("watermark").eq("source", source).maybeSingle();
  return data?.watermark ?? null;
}

async function saveWatermark(source: string, watermark: string, status: string, error?: string) {
  const sb = supabaseService();
  await sb.from("sync_state").upsert({
    source,
    watermark,
    last_run_at: new Date().toISOString(),
    last_status: status,
    last_error: error ?? null,
  });
}

export interface SyncResult {
  transcripts_ingested: number;
  recordings_attached: number;
  errors: string[];
}

export async function syncMeetings(): Promise<SyncResult> {
  const result: SyncResult = { transcripts_ingested: 0, recordings_attached: 0, errors: [] };

  // ── Transcripts ──
  const tWatermark = await getWatermark("transcripts");
  let newTWatermark = tWatermark ?? "";
  const transcripts = await graphGetAllPages<TranscriptEntry>(
    "/communications/onlineMeetings/getAllTranscripts",
  );
  for (const entry of transcripts) {
    const created = entry.createdDateTime ?? "";
    if (tWatermark && created && created <= tWatermark) continue;
    try {
      if (await processTranscript(entry)) result.transcripts_ingested++;
    } catch (e) {
      result.errors.push(`transcript ${entry.meetingId}: ${(e as Error).message}`);
    }
    if (created > newTWatermark) newTWatermark = created;
  }
  await saveWatermark("transcripts", newTWatermark, result.errors.length ? "warning" : "success",
    result.errors[0]);

  // ── Recordings ──
  const rWatermark = await getWatermark("recordings");
  let newRWatermark = rWatermark ?? "";
  const recordings = await graphGetAllPages<RecordingEntry>(
    "/communications/onlineMeetings/getAllRecordings",
  );
  for (const entry of recordings) {
    const created = entry.createdDateTime ?? "";
    if (rWatermark && created && created <= rWatermark) continue;
    try {
      if (await processRecording(entry)) result.recordings_attached++;
    } catch (e) {
      result.errors.push(`recording ${entry.meetingId}: ${(e as Error).message}`);
    }
    if (created > newRWatermark) newRWatermark = created;
  }
  await saveWatermark("recordings", newRWatermark, "success");

  return result;
}

async function processTranscript(entry: TranscriptEntry): Promise<boolean> {
  if (!entry.meetingId || !entry.transcriptContentUrl) return false;
  const sb = supabaseService();
  const docKey = meetingDocKey(entry.meetingId);

  const sep = entry.transcriptContentUrl.includes("?") ? "&" : "?";
  const vtt = await graphDownloadText(`${entry.transcriptContentUrl}${sep}$format=text/vtt`);
  const cues = parseVtt(vtt);
  if (cues.length === 0) return false;

  const meta = await resolveMeetingMeta(entry.meetingOrganizer?.user?.id, entry.meetingId);
  const dateIso = meta.start ?? entry.createdDateTime ?? null;
  const title = meta.title ?? `Teams Meeting ${(dateIso ?? "").slice(0, 10)}`.trim();

  // Store raw VTT for provenance.
  let vttPath: string | null = null;
  try {
    vttPath = `transcripts/${docKey}.vtt`;
    await sb.storage.from(RECORDING_BUCKET).upload(vttPath, new Blob([vtt], { type: "text/vtt" }), {
      upsert: true,
    });
  } catch {
    vttPath = null;
  }

  const insights = await extractMeetingInsights(cuesToTranscript(cues), title, dateIso);

  await sb.from("meetings").upsert({
    id: docKey,
    teams_meeting_id: entry.meetingId,
    title,
    started_at: dateIso,
    duration_minutes: durationMinutes(meta.start, meta.end),
    organizer_email: meta.organizerEmail,
    participants: meta.attendees,
    summary: insights.summary,
    notes: insights.notes,
    keywords: insights.keywords,
    transcript_vtt_path: vttPath,
    metadata_resolved: meta.resolved,
    updated_at: new Date().toISOString(),
  });

  // Replace children so re-syncs are idempotent.
  await sb.from("meeting_segments").delete().eq("meeting_id", docKey);
  if (cues.length) {
    await sb.from("meeting_segments").insert(
      cues.map((c, i) => ({
        meeting_id: docKey,
        idx: i,
        timestamp_label: c.timestamp,
        speaker: c.speaker,
        text: c.text,
      })),
    );
  }
  await sb.from("action_items").delete().eq("meeting_id", docKey);
  if (insights.action_items.length) {
    await sb.from("action_items").insert(
      insights.action_items.map((a) => ({
        meeting_id: docKey,
        title: a.title,
        owner: a.owner,
        due_date: a.due_date,
      })),
    );
  }
  await sb.from("meeting_insights").delete().eq("meeting_id", docKey);
  const insightRows = [
    ...insights.decisions.map((t) => ({ meeting_id: docKey, kind: "decision", text: t })),
    ...insights.risks.map((t) => ({ meeting_id: docKey, kind: "risk", text: t })),
  ];
  if (insightRows.length) await sb.from("meeting_insights").insert(insightRows);

  return true;
}

async function processRecording(entry: RecordingEntry): Promise<boolean> {
  if (!entry.meetingId || !entry.recordingContentUrl) return false;
  const sb = supabaseService();
  const docKey = meetingDocKey(entry.meetingId);

  const sep = entry.recordingContentUrl.includes("?") ? "&" : "?";
  const mp4 = await graphDownload(`${entry.recordingContentUrl}${sep}$format=mp4`);
  const path = `videos/${docKey}.mp4`;
  await sb.storage.from(RECORDING_BUCKET).upload(path, new Uint8Array(mp4), {
    contentType: "video/mp4",
    upsert: true,
  });

  // Ensure a meeting row exists (recording may arrive before the transcript).
  const { data: existing } = await sb.from("meetings").select("id").eq("id", docKey).maybeSingle();
  if (!existing) {
    const meta = await resolveMeetingMeta(entry.meetingOrganizer?.user?.id, entry.meetingId);
    await sb.from("meetings").upsert({
      id: docKey,
      teams_meeting_id: entry.meetingId,
      title: meta.title ?? `Teams Meeting ${(meta.start ?? entry.createdDateTime ?? "").slice(0, 10)}`.trim(),
      started_at: meta.start ?? entry.createdDateTime ?? null,
      organizer_email: meta.organizerEmail,
      participants: meta.attendees,
      metadata_resolved: meta.resolved,
    });
  }
  await sb.from("meetings").update({ recording_storage_path: `${RECORDING_BUCKET}/${path}` }).eq("id", docKey);
  return true;
}
