"use client";

import { useQuery } from "@tanstack/react-query";

// =============================================================================
// Types
// =============================================================================

export interface DigestDecision {
  decision: string;
  owner: string;
  impact: string;
}

export interface DigestActionItem {
  action: string;
  assignee: string;
  due: string;
}

export interface DigestRisk {
  risk: string;
  severity: string;
  mitigation: string;
}

export interface DigestOpportunity {
  opportunity: string;
  type: string;
}

export interface DigestFollowUp {
  item: string;
  owner: string;
}

export interface MeetingDigest {
  id: string;
  metadata_id: string;
  project_id: number | null;
  digest_text: string;
  digest_html: string | null;
  decisions_summary: DigestDecision[];
  action_items_summary: DigestActionItem[];
  risks_summary: DigestRisk[];
  opportunities_summary: DigestOpportunity[];
  follow_ups: DigestFollowUp[];
  key_takeaways: string[];
  model_used: string;
  generation_time_seconds: number | null;
  created_at: string;
}

// =============================================================================
// Query Keys
// =============================================================================

export const digestKeys = {
  all: ["meeting-digests"] as const,
  detail: (meetingId: string) => [...digestKeys.all, meetingId] as const,
};

// =============================================================================
// Hook
// =============================================================================

export function useMeetingDigest(projectId: string, meetingId: string) {
  return useQuery<MeetingDigest | null>({
    queryKey: digestKeys.detail(meetingId),
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/meetings/${meetingId}/digest`
      );
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch meeting digest");
      }
      const json = await response.json();
      return json.data ?? null;
    },
    enabled: !!projectId && !!meetingId,
    staleTime: 60 * 1000,
  });
}
