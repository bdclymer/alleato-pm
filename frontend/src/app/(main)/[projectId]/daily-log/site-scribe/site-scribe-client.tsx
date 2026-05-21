"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  CirclePause,
  Loader2,
  Mic,
  MicOff,
  RefreshCcw,
  Send,
  Square,
  Volume2,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { InfoAlert } from "@/components/ds/InfoAlert";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  SITE_SCRIBE_NOTE_TAGS,
  type SiteScribeManpowerRow,
  type SiteScribeNote,
  type SiteScribePhoto,
  type SiteScribeStructuredLog,
  type SiteScribeSubmitPayload,
  type SiteScribeTranscriptSegment,
} from "@/lib/site-scribe/types";

type SessionState = "idle" | "listening" | "thinking" | "speaking" | "paused" | "review";

interface SiteScribeClientProps {
  projectId: number;
}

interface RealtimeSecretResponse {
  value?: string;
  client_secret?: { value?: string };
  model?: string;
}

interface RealtimeEvent {
  type?: string;
  transcript?: string;
  text?: string;
  delta?: string;
  item_id?: string;
  response?: {
    output?: Array<{
      content?: Array<{ transcript?: string; text?: string }>;
    }>;
  };
  call_id?: string;
  name?: string;
  arguments?: string;
}

const nowIsoDate = () => new Date().toISOString().split("T")[0];

function newId() {
  return crypto.randomUUID();
}

function emptyStructuredLog(): SiteScribeStructuredLog {
  return {
    summary: "",
    manpower: [],
    notes: [],
    photos: [],
    fieldConfidence: {},
  };
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function confidenceTone(value?: number) {
  if ((value ?? 0) >= 0.8) return "text-success";
  if ((value ?? 0) >= 0.6) return "text-warning";
  return "text-destructive";
}

function Confidence({ value }: { value?: number }) {
  const percent = Math.round((value ?? 0) * 100);
  return <span className={cn("text-xs font-semibold", confidenceTone(value))}>{percent}%</span>;
}

function mergeStructuredLog(
  current: SiteScribeStructuredLog,
  patch: Partial<SiteScribeStructuredLog>,
): SiteScribeStructuredLog {
  const bySub = new Map(current.manpower.map((row) => [row.subcontractorName.toLowerCase(), row]));
  patch.manpower?.forEach((row) => {
    const key = row.subcontractorName.toLowerCase();
    bySub.set(key, { ...bySub.get(key), ...row, id: bySub.get(key)?.id ?? row.id ?? newId() });
  });

  const existingNoteText = new Set(current.notes.map((note) => note.text.toLowerCase()));
  const mergedNotes = [
    ...current.notes,
    ...(patch.notes ?? [])
      .filter((note) => !existingNoteText.has(note.text.toLowerCase()))
      .map((note) => ({ ...note, id: note.id ?? newId() })),
  ];

  return {
    summary: patch.summary ?? current.summary,
    manpower: Array.from(bySub.values()),
    notes: mergedNotes,
    photos: patch.photos ?? current.photos,
    fieldConfidence: { ...current.fieldConfidence, ...patch.fieldConfidence },
  };
}

function buildHeuristicPatch(
  text: string,
  startMs: number,
): Partial<SiteScribeStructuredLog> {
  const manpower: SiteScribeManpowerRow[] = [];
  const notes: SiteScribeNote[] = [];
  const lower = text.toLowerCase();
  const manpowerMatch = text.match(
    /([A-Z][A-Za-z0-9&.\-\s]{1,40}?)\s+(?:had|with|brought|was here with|had about)\s+(\d{1,3})\s+(?:workers?|guys?|people|crew)\s+(?:for|at|onsite for|on site for)?\s*(\d{1,2}(?:\.\d+)?)?\s*(?:hours?|hrs?)?/i,
  );

  if (manpowerMatch) {
    manpower.push({
      id: newId(),
      subcontractorName: manpowerMatch[1].trim(),
      workerCount: Number(manpowerMatch[2]),
      hoursWorked: manpowerMatch[3] ? Number(manpowerMatch[3]) : null,
      sourceAudioStartMs: startMs,
      sourceAudioEndMs: startMs + 5000,
      confidence: {
        subcontractorName: 0.7,
        workerCount: 0.75,
        hoursWorked: manpowerMatch[3] ? 0.72 : 0.35,
      },
    });
  }

  const tag =
    lower.includes("delivery") || lower.includes("delivered")
      ? "Delivery"
      : lower.includes("inspection") || lower.includes("inspector")
        ? "Inspection"
        : lower.includes("safety") || lower.includes("incident")
          ? "Safety"
          : lower.includes("visitor") || lower.includes("owner came")
            ? "Visitor"
            : lower.includes("issue") || lower.includes("problem") || lower.includes("delay")
              ? "Issue"
              : lower.includes("equipment") || lower.includes("lift") || lower.includes("excavator")
                ? "Equipment"
                : lower.includes("progress") || lower.includes("installed") || lower.includes("finished")
                  ? "Progress"
                  : null;

  if (tag && text.trim().length > 12) {
    notes.push({
      id: newId(),
      tag,
      text: text.trim(),
      sourceAudioStartMs: startMs,
      sourceAudioEndMs: startMs + 5000,
      confidence: { tag: 0.62, text: 0.68 },
    });
  }

  return {
    summary: text.trim(),
    manpower,
    notes,
  };
}

export function SiteScribeClient({ projectId }: SiteScribeClientProps) {
  const router = useRouter();
  const [sessionState, setSessionState] = React.useState<SessionState>("idle");
  const [logDate, setLogDate] = React.useState(nowIsoDate());
  const [durationMs, setDurationMs] = React.useState(0);
  const [pendingSyncCount, setPendingSyncCount] = React.useState(0);
  const [isOnline, setIsOnline] = React.useState(true);
  const [transcript, setTranscript] = React.useState<SiteScribeTranscriptSegment[]>([]);
  const [structuredLog, setStructuredLog] = React.useState<SiteScribeStructuredLog>(emptyStructuredLog);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const peerRef = React.useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = React.useRef<RTCDataChannel | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const startedAtRef = React.useRef<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    setIsOnline(navigator.onLine);
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  React.useEffect(() => {
    if (!startedAtRef.current || sessionState === "idle" || sessionState === "review") return;
    const timer = window.setInterval(() => {
      setDurationMs(Date.now() - (startedAtRef.current ?? Date.now()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionState]);

  const elapsedAudioMs = React.useCallback(() => {
    return startedAtRef.current ? Date.now() - startedAtRef.current : 0;
  }, []);

  const pairPhotos = React.useCallback((photos: SiteScribePhoto[], notes: SiteScribeNote[]) => {
    return photos.map((photo) => {
      const closest = notes
        .map((note) => ({
          note,
          distance: Math.abs((note.sourceAudioStartMs ?? 0) - photo.audioTimestampMs),
        }))
        .sort((a, b) => a.distance - b.distance)[0];

      if (!closest || closest.distance > 120000) return photo;

      return {
        ...photo,
        pairedNoteId: closest.note.id,
        pairingConfidence: Math.max(0.35, 1 - closest.distance / 120000),
        caption: photo.caption || closest.note.text.slice(0, 120),
      };
    });
  }, []);

  const applyStructuredPatch = React.useCallback(
    (patch: Partial<SiteScribeStructuredLog>) => {
      setStructuredLog((current) => {
        const merged = mergeStructuredLog(current, patch);
        return { ...merged, photos: pairPhotos(merged.photos, merged.notes) };
      });
    },
    [pairPhotos],
  );

  const addTranscript = React.useCallback(
    (speaker: "crew" | "assistant", text: string, final = true) => {
      if (!text.trim()) return;
      const startMs = elapsedAudioMs();
      const segment: SiteScribeTranscriptSegment = {
        id: newId(),
        speaker,
        text: text.trim(),
        startMs,
        endMs: startMs + 1000,
        final,
      };
      setTranscript((current) => [...current, segment]);
      if (speaker === "crew") {
        applyStructuredPatch(buildHeuristicPatch(text, startMs));
      }
    },
    [applyStructuredPatch, elapsedAudioMs],
  );

  const handleRealtimeEvent = React.useCallback(
    (event: RealtimeEvent) => {
      if (event.type?.includes("speech_started")) setSessionState("listening");
      if (event.type?.includes("response.created")) setSessionState("thinking");
      if (event.type?.includes("response.audio.delta")) setSessionState("speaking");
      if (event.type?.includes("response.done")) setSessionState("listening");

      const transcriptText =
        event.transcript ??
        event.text ??
        event.response?.output?.flatMap((output) => output.content ?? [])
          .map((content) => content.transcript ?? content.text ?? "")
          .join(" ");

      if (
        transcriptText &&
        (event.type?.includes("transcription.completed") ||
          event.type?.includes("input_audio_transcription.completed"))
      ) {
        addTranscript("crew", transcriptText);
      }

      if (transcriptText && event.type?.includes("response.audio_transcript.done")) {
        addTranscript("assistant", transcriptText);
      }

      if (event.type?.includes("function_call_arguments.done") && event.name === "capture_daily_log_update") {
        try {
          const parsed = JSON.parse(event.arguments ?? "{}") as Partial<SiteScribeStructuredLog>;
          applyStructuredPatch(parsed);
        } catch {
          toast.error("Site Scribe could not parse one AI extraction update.");
        }
      }
    },
    [addTranscript, applyStructuredPatch],
  );

  const startSession = async () => {
    try {
      setSessionState("thinking");
      const tokenJson = await apiFetch<RealtimeSecretResponse>("/api/site-scribe/realtime-session", {
        method: "POST",
      });
      const clientSecret = tokenJson.value ?? tokenJson.client_secret?.value;
      if (!clientSecret) throw new Error("Realtime session did not return a client secret.");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      recorderRef.current = new MediaRecorder(stream);
      recorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorderRef.current.start(1000);

      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      peer.ontrack = (event) => {
        if (audioRef.current) audioRef.current.srcObject = event.streams[0];
      };

      const dataChannel = peer.createDataChannel("oai-events");
      dataChannelRef.current = dataChannel;
      dataChannel.onmessage = (message) => {
        handleRealtimeEvent(JSON.parse(message.data) as RealtimeEvent);
      };
      dataChannel.onopen = () => {
        setSessionState("listening");
        startedAtRef.current = Date.now();
        dataChannel.send(JSON.stringify({ type: "response.create" }));
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(tokenJson.model ?? "gpt-realtime-2")}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        },
      );

      if (!sdpResponse.ok) throw new Error(await sdpResponse.text());
      await peer.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });
    } catch (error) {
      setSessionState("idle");
      toast.error(error instanceof Error ? error.message : "Site Scribe could not start.");
      streamRef.current?.getTracks().forEach((track) => track.stop());
    }
  };

  const stopSession = async () => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    dataChannelRef.current?.close();
    peerRef.current?.close();
    setSessionState("review");
  };

  const capturePhoto = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const photo: SiteScribePhoto = {
        id: newId(),
        fileName: file.name || `site-photo-${Date.now()}.jpg`,
        contentType: file.type || "image/jpeg",
        dataUrl: String(reader.result),
        capturedAt: new Date().toISOString(),
        audioTimestampMs: elapsedAudioMs(),
      };
      setStructuredLog((current) => {
        const photos = pairPhotos([...current.photos, photo], current.notes);
        return { ...current, photos };
      });
    };
    reader.readAsDataURL(file);
  };

  const updateManpower = (id: string, patch: Partial<SiteScribeManpowerRow>) => {
    setStructuredLog((current) => ({
      ...current,
      manpower: current.manpower.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  };

  const updateNote = (id: string, patch: Partial<SiteScribeNote>) => {
    setStructuredLog((current) => {
      const notes = current.notes.map((note) => (note.id === id ? { ...note, ...patch } : note));
      return { ...current, notes, photos: pairPhotos(current.photos, notes) };
    });
  };

  const submitApprovedLog = async () => {
    setIsSubmitting(true);
    const audioBlob = audioChunksRef.current.length
      ? new Blob(audioChunksRef.current, { type: "audio/webm" })
      : null;

    const rawAudio = audioBlob
      ? await new Promise<SiteScribeSubmitPayload["rawAudio"]>((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              fileName: "site-scribe-session.webm",
              contentType: audioBlob.type,
              dataUrl: String(reader.result),
            });
          reader.readAsDataURL(audioBlob);
        })
      : null;

    const payload: SiteScribeSubmitPayload = {
      projectId,
      logDate,
      sessionId: newId(),
      durationMs,
      transcript,
      structuredLog,
      rawAudio,
    };

    if (!navigator.onLine) {
      localStorage.setItem(`site-scribe-queued-${payload.sessionId}`, JSON.stringify(payload));
      setPendingSyncCount((count) => count + 1);
      setIsSubmitting(false);
      toast.warning("Offline. Site Scribe queued this log for sync when the connection returns.");
      return;
    }

    await apiFetch(`/api/projects/${projectId}/daily-log/site-scribe`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);
    toast.success("Site Scribe daily log submitted.");
    router.push(`/${projectId}/daily-log`);
  };

  const syncQueuedLogs = async () => {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith("site-scribe-queued-"));
    let synced = 0;
    let failed = 0;
    for (const key of keys) {
      const payload = localStorage.getItem(key);
      if (!payload) continue;
      try {
        await apiFetch(`/api/projects/${projectId}/daily-log/site-scribe`, {
        method: "POST",
        body: payload,
        });
        localStorage.removeItem(key);
        synced += 1;
      } catch (error) {
        failed += 1;
        console.warn("Site Scribe queued sync failed; payload retained for retry.", error);
      }
    }
    setPendingSyncCount(Math.max(0, keys.length - synced));
    if (synced > 0) toast.success(`Synced ${synced} queued Site Scribe log${synced === 1 ? "" : "s"}.`);
    if (failed > 0) toast.error(`${failed} queued Site Scribe log${failed === 1 ? "" : "s"} still need sync.`);
  };

  React.useEffect(() => {
    if (isOnline) void syncQueuedLogs();
     
  }, [isOnline]);

  const statusLabel =
    sessionState === "idle"
      ? "Idle"
      : sessionState === "listening"
        ? "Listening"
        : sessionState === "thinking"
          ? "AI thinking"
          : sessionState === "speaking"
            ? "AI speaking"
            : sessionState === "paused"
              ? "Paused"
              : "Review";

  return (
    <>
      <audio ref={audioRef} autoPlay className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void capturePhoto(file);
          event.target.value = "";
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <section className="space-y-6">
          <div className="rounded-lg bg-foreground p-5 text-background shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-background/80">Capture state</div>
                <div className="mt-1 flex items-center gap-3 text-2xl font-semibold">
                  {sessionState === "speaking" ? <Volume2 className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  {statusLabel}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xl font-semibold">{formatDuration(durationMs)}</div>
                  <div className="text-xs text-background/60">Duration</div>
                </div>
                <div>
                  <div className="text-xl font-semibold">{structuredLog.photos.length}</div>
                  <div className="text-xs text-background/60">Photos</div>
                </div>
                <div>
                  <div className="text-xl font-semibold">{pendingSyncCount}</div>
                  <div className="text-xs text-background/60">Pending</div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {sessionState === "idle" ? (
                <Button size="lg" className="h-16 text-base" onClick={startSession}>
                  <Mic />
                  Start talking
                </Button>
              ) : (
                <Button size="lg" className="h-16 text-base" variant="destructive" onClick={stopSession}>
                  <Square />
                  End session
                </Button>
              )}
              <Button
                size="lg"
                variant="secondary"
                className="h-16 text-base"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera />
                Capture photo
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-16 border-background/20 bg-foreground text-base text-background hover:bg-foreground/90"
                onClick={() => setSessionState(sessionState === "paused" ? "listening" : "paused")}
                disabled={sessionState === "idle" || sessionState === "review"}
              >
                {sessionState === "paused" ? <MicOff /> : <CirclePause />}
                {sessionState === "paused" ? "Resume" : "Pause"}
              </Button>
            </div>

            {!isOnline ? (
              <InfoAlert variant="warning" className="mt-4">
                <WifiOff className="h-4 w-4" />
                Offline mode: audio and photos stay local until reconnect.
              </InfoAlert>
            ) : null}
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionRuleHeading label="Live transcript" className="mb-0 pb-0" />
              <Badge variant="outline">{transcript.length} segments</Badge>
            </div>
            <div className="min-h-96 space-y-3 rounded-lg border bg-background p-4">
              {transcript.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Start the session and speak naturally. The transcript appears here so the crew can
                  correct what Site Scribe heard before submission.
                </p>
              ) : (
                transcript.map((segment) => (
                  <div key={segment.id} className="grid gap-1 border-b pb-3 last:border-b-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={segment.speaker === "crew" ? "secondary" : "outline"}>
                        {segment.speaker === "crew" ? "Crew" : "AI"}
                      </Badge>
                      {formatDuration(segment.startMs)}
                    </div>
                    <p className="text-sm leading-6">{segment.text}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SectionRuleHeading label="Structured log" className="mb-0 pb-0" />
              <p className="text-sm text-muted-foreground">Review and edit before approval.</p>
            </div>
            <Input
              type="date"
              value={logDate}
              onChange={(event) => setLogDate(event.target.value)}
              className="w-40"
            />
          </div>

          <div className="space-y-2">
            <Label>Summary</Label>
            <Textarea
              value={structuredLog.summary}
              onChange={(event) =>
                setStructuredLog((current) => ({ ...current, summary: event.target.value }))
              }
              placeholder="AI-generated daily log summary"
              className="min-h-24"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionRuleHeading label="Manpower" className="mb-0 pb-0" />
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setStructuredLog((current) => ({
                    ...current,
                    manpower: [
                      ...current.manpower,
                      {
                        id: newId(),
                        subcontractorName: "",
                        workerCount: null,
                        hoursWorked: null,
                        confidence: { subcontractorName: 0, workerCount: 0, hoursWorked: 0 },
                      },
                    ],
                  }))
                }
              >
                Add row
              </Button>
            </div>
            <div className="space-y-3">
              {structuredLog.manpower.map((row) => (
                <div key={row.id} className="grid gap-3 rounded-md border p-3">
                  <Input
                    value={row.subcontractorName}
                    onChange={(event) => updateManpower(row.id, { subcontractorName: event.target.value })}
                    placeholder="Subcontractor"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      value={row.workerCount ?? ""}
                      onChange={(event) => updateManpower(row.id, { workerCount: Number(event.target.value) })}
                      placeholder="Workers"
                    />
                    <Input
                      type="number"
                      value={row.hoursWorked ?? ""}
                      onChange={(event) => updateManpower(row.id, { hoursWorked: Number(event.target.value) })}
                      placeholder="Hours"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Sub / workers / hours confidence</span>
                    <span className="flex gap-2">
                      <Confidence value={row.confidence.subcontractorName} />
                      <Confidence value={row.confidence.workerCount} />
                      <Confidence value={row.confidence.hoursWorked} />
                    </span>
                  </div>
                </div>
              ))}
              {structuredLog.manpower.length === 0 ? (
                <p className="text-sm text-muted-foreground">No manpower rows captured yet.</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <SectionRuleHeading label="Notes" className="mb-0 pb-0" />
            <div className="space-y-3">
              {structuredLog.notes.map((note) => (
                <div key={note.id} className="grid gap-3 rounded-md border p-3">
                  <Select
                    value={note.tag}
                    onValueChange={(value) => updateNote(note.id, { tag: value as SiteScribeNote["tag"] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Topic tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {SITE_SCRIBE_NOTE_TAGS.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={note.text}
                    onChange={(event) => updateNote(note.id, { text: event.target.value })}
                    className="min-h-20"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tag / text confidence</span>
                    <span className="flex gap-2">
                      <Confidence value={note.confidence.tag} />
                      <Confidence value={note.confidence.text} />
                    </span>
                  </div>
                </div>
              ))}
              {structuredLog.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tagged notes captured yet.</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <SectionRuleHeading label="Photos paired to narration" className="mb-0 pb-0" />
            <div className="grid grid-cols-2 gap-3">
              {structuredLog.photos.map((photo) => (
                <div key={photo.id} className="space-y-2">
                  <Image
                    src={photo.dataUrl}
                    alt={photo.caption ?? "Captured site progress"}
                    width={320}
                    height={320}
                    unoptimized
                    className="aspect-square w-full rounded-md object-cover"
                  />
                  <div className="text-xs text-muted-foreground">
                    {formatDuration(photo.audioTimestampMs)} · pair{" "}
                    <Confidence value={photo.pairingConfidence ?? 0} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {sessionState === "review" ? (
            <Button className="h-14 w-full text-base" onClick={submitApprovedLog} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
              Approve and submit daily log
            </Button>
          ) : (
            <Button variant="outline" className="h-14 w-full text-base" onClick={syncQueuedLogs}>
              <RefreshCcw />
              Sync queued logs
            </Button>
          )}

          {sessionState === "review" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-success" />
              Submission is blocked until the user explicitly approves this review.
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
