# Site Scribe Realtime Daily Log Capture

Site Scribe is a field-first daily-log capture surface at `/:projectId/daily-log/site-scribe`.

## Architecture

Browser responsibilities:

- Captures microphone audio with `getUserMedia`.
- Opens a WebRTC Realtime session with the ephemeral client secret returned by `/api/site-scribe/realtime-session`.
- Uses realtime transcription for a user-led brain dump, with no assistant-led interview during capture.
- Displays the live user transcript so field crews can correct what was heard before submission.
- Captures progress photos with camera/file input.
- Tags every photo with `capturedAt` and `audioTimestampMs`, then pairs photos to the nearest note by narration timestamp.
- Keeps approved-but-unsynced log payloads in `localStorage` while offline and retries when the browser reconnects.

Server responsibilities:

- `/api/site-scribe/realtime-session` mints short-lived OpenAI Realtime client secrets using `OPENAI_API_KEY`.
- `/api/site-scribe/refine-log` runs the full user transcript through a structured Responses API pass before review.
- `/api/projects/[projectId]/daily-log/site-scribe` persists only user-approved logs.
- Finalized logs write to `daily_logs`, `daily_log_manpower`, `daily_log_notes`, and `daily_log_photos`.
- Raw audio and full transcript are uploaded to Supabase Storage bucket `project-files` under `projects/<projectId>/daily-logs/site-scribe/<sessionId>/`.

## OpenAI Realtime Setup

Required local environment:

```bash
OPENAI_API_KEY=sk-...
OPENAI_REALTIME_MODEL=gpt-realtime-2
OPENAI_REALTIME_TRANSCRIPTION_MODEL=gpt-realtime-whisper
OPENAI_SITE_SCRIBE_REFINE_MODEL=gpt-5.4-mini
```

The model environment variables are optional overrides. Defaults follow the current OpenAI model guidance for realtime voice agents, realtime transcription, and structured text refinement.

Local development:

```bash
cd frontend
npm run dev
```

Then open `http://localhost:3000/<projectId>/daily-log/site-scribe`.

## Session Lifecycle Notes

- Idle: no peer connection or media stream exists.
- Listening: microphone is active and the Realtime session is ready for speech.
- Structuring: the model has received input and is refining it into daily-log fields.
- Processing: a transient realtime processing state; the capture flow remains user-led.
- Paused: UI-level pause state; the crew can resume or end the session.
- Review: capture is stopped, the full transcript refinement pass has completed or failed loudly, and the user must approve before Supabase persistence.

Do not send the long-lived `OPENAI_API_KEY` to the browser. The browser consumes only the ephemeral Realtime client secret.

## Latency Notes

- WebRTC is used for low-latency audio input/output.
- The session uses server-side voice activity detection for realtime transcription.
- The prompt tells the assistant not to interview, coach, interrupt, or ask clarifying questions during capture.
- Missing or ambiguous structured fields are left blank or low-confidence for the review screen instead of being resolved through spoken follow-up.
- When the user ends capture, the browser asks the server to refine the whole transcript into the daily-log schema with Structured Outputs before showing the approval state.

## Permissions And Recovery

- Microphone denial should leave the UI in Idle and show the browser permission error.
- Camera denial affects photo capture only; the voice session can continue.
- If Realtime session minting fails, the error is loud and includes the upstream status in the API response.
- If transcript, audio, or photo upload fails during approval, the submit route returns a specific failure code and does not claim success.
- If final transcript refinement fails, the UI shows a loud toast and keeps the current draft editable instead of blocking review.
- Offline approval stores the full payload locally and increments the pending sync count.

## Offline Queue Behavior

- Site Scribe queues approved payloads in `localStorage` with the prefix `site-scribe-queued-`.
- The UI retries queued payloads on browser `online` events and through the manual `Sync queued logs` action.
- Audio and photos are stored as data URLs in the queued payload. This is practical for short field logs; very long sessions should be split to avoid browser storage limits.

## Validation Checklist

- Audio permission: deny and allow microphone access; confirm the UI returns to Idle on denial and enters Listening on allow.
- Camera permission: capture at least one photo from a mobile browser; confirm timestamp and audio timestamp are shown.
- Connection recovery: start a session, toggle offline, approve the log, return online, and confirm queued sync clears.
- Offline queue: inspect local storage for `site-scribe-queued-*`, then confirm the key is removed after successful sync.
- Realtime transcript: speak over generator noise, hammer drill noise, and wind; confirm user narration remains visible and editable through the structured review.
- Passive capture behavior: say "ABC was here all day" and confirm the assistant does not ask a spoken follow-up. Missing worker count and hours should appear as blank or low-confidence review fields.
- Extraction accuracy: compare manpower, notes, tags, confidence scores, and photo pairings against a ground-truth written daily log.
- End-to-end quality: approve a log and verify rows in `daily_logs`, `daily_log_manpower`, `daily_log_notes`, `daily_log_photos`, and Supabase Storage audit files.
