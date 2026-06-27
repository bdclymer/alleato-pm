import type { VttCue } from "./types";

const TIME_RE =
  /(\d{2}):(\d{2}):(\d{2})[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}/;
const VOICE_OPEN_RE = /<v\s+([^>]+)>/i;
const TAG_RE = /<\/?[^>]+>/g;

function secondsToStamp(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Parse Microsoft Teams WebVTT into speaker/timestamp/text cues.
 * Handles `<v Speaker Name>text</v>` voice tags, cue identifiers, multi-line
 * cue text, and CRLF. Cues without a voice tag yield speaker = null.
 */
export function parseVtt(vtt: string): VttCue[] {
  const cues: VttCue[] = [];
  if (!vtt) return cues;
  for (const block of vtt.trim().split(/\r?\n\s*\r?\n/)) {
    const lines = block.split(/\r?\n/).filter((l) => l.trim());
    const tsIdx = lines.findIndex((l) => l.includes("-->"));
    if (tsIdx === -1) continue;
    const m = TIME_RE.exec(lines[tsIdx]);
    if (!m) continue;
    const startSeconds =
      parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
    const raw = lines.slice(tsIdx + 1).join(" ").trim();
    if (!raw) continue;
    const voice = VOICE_OPEN_RE.exec(raw);
    const speaker = voice ? voice[1].trim() : null;
    const text = raw.replace(TAG_RE, "").trim();
    if (!text) continue;
    cues.push({ timestamp: secondsToStamp(startSeconds), speaker, text });
  }
  return cues;
}

/** Flatten cues into a readable transcript string for the LLM / display. */
export function cuesToTranscript(cues: VttCue[]): string {
  return cues
    .map((c) => `[${c.timestamp}] ${c.speaker ?? "Unknown"}: ${c.text}`)
    .join("\n");
}
