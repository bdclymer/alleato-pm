/**
 * Shared Types for Fireflies Pipeline Workers
 */

// -----------------------------------------------------------------------------
// Environment
// -----------------------------------------------------------------------------

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  OPENAI_API_KEY: string;
  FIREFLIES_API_KEY: string;
  LEGACY_FIREFLIES_SYNC_ENABLED?: string;
  // Worker URLs for pipeline chaining (optional — crons act as fallback if unset)
  EMBEDDER_WORKER_URL?: string;
  EXTRACTOR_WORKER_URL?: string;
}

// -----------------------------------------------------------------------------
// Fireflies API Types
// -----------------------------------------------------------------------------

export interface FirefliesTranscript {
  id: string;
  title: string;
  date?: string | number;
  dateString?: string;
  duration?: number;
  host_email?: string;
  organizer_email?: string;
  user?: {
    user_id?: string;
    email?: string;
    name?: string;
  };
  fireflies_users?: string[];
  workspace_users?: string[];
  calendar_id?: string;
  cal_id?: string;
  calendar_type?: string;
  meeting_link?: string;
  is_live?: boolean;
  participants?: string[];
  speakers?: Array<{
    id?: string;
    name?: string;
  }>;
  meeting_attendees?: unknown[];
  meeting_attendance?: unknown[];
  transcript_url?: string;
  audio_url?: string;
  video_url?: string;
  meeting_info?: Record<string, unknown>;
  analytics?: Record<string, unknown>;
  channels?: unknown[];
  shared_with?: unknown[];
  apps?: {
    title?: string;
    outputs?: unknown[];
    apps_preview?: unknown[];
  };
  summary?: {
    overview?: string;
    action_items?: string[];
    keywords?: string[];
    outline?: string;
    shorthand_bullet?: string;
    notes?: string;
    gist?: string;
    bullet_gist?: string;
    short_summary?: string;
    short_overview?: string;
    meeting_type?: string;
    topics_discussed?: string[];
    transcript_chapters?: string[];
    extended_sections?: unknown[];
  };
  sentences?: Array<{
    speaker_name: string;
    text: string;
    start_time: number;
    end_time: number;
  }>;
}

// -----------------------------------------------------------------------------
// Parsed Meeting Types
// -----------------------------------------------------------------------------

export interface TranscriptLine {
  timestamp: string;
  speaker: string;
  text: string;
  index: number;
}

export interface ParsedMeeting {
  firefliesId: string;
  title: string;
  startedAt: string | null;
  endedAt: string | null;
  participants: string[];
  transcriptLines: TranscriptLine[];
  rawContent: string;
  firefliesSummary: string;
  firefliesActions: { text: string }[];
  firefliesLink?: string;
  durationMinutes?: number;
  audioUrl?: string;
  videoUrl?: string;
  storageUrl?: string;
  keywords?: string[];
  bulletPoints?: string[];
}

// -----------------------------------------------------------------------------
// Segment Types
// -----------------------------------------------------------------------------

export interface MeetingSegment {
  segmentIndex: number;
  title: string;
  startIndex: number;
  endIndex: number;
  summary: string;
  decisions: string[];
  risks: string[];
  tasks: string[];
  summaryEmbedding?: number[];
}

// -----------------------------------------------------------------------------
// Chunk Types
// -----------------------------------------------------------------------------

export interface DocumentChunk {
  content: string;
  chunkIndex: number;
  segmentIndex: number;
  docType: "chunk" | "segment_summary" | "meeting_summary";
  contentHash: string;
  embedding?: number[];
}

// -----------------------------------------------------------------------------
// Structured Extraction Types
// -----------------------------------------------------------------------------

export interface StructuredData {
  decisions: Array<{
    description: string;
    rationale?: string;
    owner?: string;
    embedding?: number[];
  }>;
  risks: Array<{
    description: string;
    category?: string;
    likelihood?: string;
    impact?: string;
    owner?: string;
    embedding?: number[];
  }>;
  tasks: Array<{
    description: string;
    assignee?: string;
    assigneeEmail?: string;
    dueDate?: string;
    priority?: string;
    embedding?: number[];
  }>;
  opportunities: Array<{
    description: string;
    type?: string;
    owner?: string;
    embedding?: number[];
  }>;
}

// -----------------------------------------------------------------------------
// Pipeline Job Types
// -----------------------------------------------------------------------------

export type PipelineStage =
  | "pending"
  | "raw_ingested"
  | "segmented"
  | "chunked"
  | "embedded"
  | "structured_extracted"
  | "done"
  | "error";

export interface IngestionJob {
  id: string;
  fireflies_id: string;
  metadata_id: string | null;
  stage: PipelineStage;
  attempt_count: number;
  last_attempt_at: string | null;
  error_message: string | null;
}

// -----------------------------------------------------------------------------
// Worker Request/Response Types
// -----------------------------------------------------------------------------

export interface IngestRequest {
  markdown: string;
  filename?: string;
  projectId?: number;
  clientId?: number;
  storageUrl?: string;
}

export interface ParserRequest {
  metadataId: string;
  firefliesId: string;
}

export interface EmbedderRequest {
  metadataId: string;
  firefliesId: string;
}

export interface ExtractorRequest {
  metadataId: string;
  firefliesId: string;
}

export interface WorkerResponse {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}
