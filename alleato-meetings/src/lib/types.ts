export interface VttCue {
  timestamp: string; // MM:SS
  speaker: string | null;
  text: string;
}

export interface ExtractedActionItem {
  title: string;
  owner: string | null;
  due_date: string | null; // ISO date (YYYY-MM-DD) or null
}

export interface MeetingInsights {
  summary: string;
  notes: string; // markdown
  keywords: string[];
  action_items: ExtractedActionItem[];
  decisions: string[];
  risks: string[];
}

export interface ResolvedMeetingMeta {
  title: string | null;
  attendees: string[];
  start: string | null;
  end: string | null;
  organizerEmail: string | null;
  resolved: boolean;
}
