import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";
import { getErrorDetail } from "@/lib/format-error";
import { appToast as toast } from "@/lib/toast/app-toast";
import {
  ARCHIVED_STATUSES,
  DEFERRED_STATUSES,
  IN_PROGRESS_STATUSES,
  RESOLVED_STATUSES,
} from "./constants";
import type {
  AgentTarget,
  DispatchHistoryEntry,
  DisplayStatus,
  FeedbackItem,
  UserProfile,
} from "./types";

export function notifyFeedbackInboxFailure({
  operation,
  title,
  fallback,
  error,
  metadata,
}: {
  operation: string;
  title: string;
  fallback: string;
  error: unknown;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}) {
  const description = getErrorDetail(error);
  reportNonCriticalFailure({
    area: "feedback-inbox",
    operation,
    error,
    userVisibleFallback: fallback,
    metadata,
  });
  toast.error(title, { description });
}

export function toolLabelFromPath(pagePath: string): string | null {
  const parts = pagePath.split("/").filter(Boolean);
  const projectsIdx = parts.indexOf("projects");
  if (projectsIdx >= 0 && parts.length > projectsIdx + 2) {
    const toolSlug = parts[projectsIdx + 2];
    if (!/^\d+$/.test(toolSlug)) {
      return toolSlug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }
  const nonNumeric = parts.filter((p) => !/^\d+$/.test(p));
  if (nonNumeric.length > 0) {
    const last = nonNumeric[nonNumeric.length - 1];
    return last
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return null;
}

export function relativeTime(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function toDisplayStatus(status: string): DisplayStatus {
  if (ARCHIVED_STATUSES.has(status)) return "archived";
  if (RESOLVED_STATUSES.has(status)) return "resolved";
  if (DEFERRED_STATUSES.has(status)) return "deferred";
  if (IN_PROGRESS_STATUSES.has(status)) return "in_progress";
  return "open";
}

export function getInitials(profile: UserProfile): string {
  if (profile.full_name) {
    return profile.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return profile.email[0].toUpperCase();
}

export function displayName(profile: UserProfile): string {
  return profile.full_name || profile.email.split("@")[0];
}

export function submitterLabel(item: FeedbackItem): string {
  return item.submitter ? displayName(item.submitter) : item.created_by;
}

export function getMetadata(item: FeedbackItem) {
  if (item.metadata && typeof item.metadata === "object") {
    return item.metadata;
  }
  return {};
}

export function getAssignedAgent(item: FeedbackItem): AgentTarget | null {
  const value = getMetadata(item).assignedAgent;
  if (value === "codex" || value === "claude_code") return value;
  return null;
}

export function getDispatchStatus(item: FeedbackItem) {
  const value = getMetadata(item).dispatchStatus;
  return typeof value === "string" ? value : null;
}

export function getDispatchTrigger(item: FeedbackItem) {
  const value = getMetadata(item).dispatchTrigger;
  if (value === "github") return "GitHub";
  if (value === "metadata_queue") return "Queue";
  return null;
}

export function getDispatchHistory(item: FeedbackItem): DispatchHistoryEntry[] {
  const value = getMetadata(item).dispatchHistory;
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => typeof entry === "object" && entry !== null)
    .map((entry) => {
      const record = entry as Record<string, unknown>;
      return {
        target: (record.target === "claude_code" ? "claude_code" : "codex") as AgentTarget,
        at: typeof record.at === "string" ? record.at : "",
        by: typeof record.by === "string" ? record.by : "",
        status: typeof record.status === "string" ? record.status : "",
        annotationId: typeof record.annotationId === "string" ? record.annotationId : null,
        trigger: (record.trigger === "github" ? "github" : "metadata_queue") as
          | "github"
          | "metadata_queue",
        githubIssueUrl:
          typeof record.githubIssueUrl === "string" ? record.githubIssueUrl : null,
      } satisfies DispatchHistoryEntry;
    })
    .filter((entry) => entry.at.length > 0);
}

export function agentLabel(target: AgentTarget) {
  return target === "codex" ? "Codex" : "Claude Code";
}

export function extractMentionIds(text: string, users: UserProfile[]): string[] {
  const ids: string[] = [];
  for (const user of users) {
    const name = displayName(user).toLowerCase();
    const pattern = new RegExp(`@${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(text)) {
      ids.push(user.id);
    }
  }
  return ids;
}
