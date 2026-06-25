import type { AiProfileMemory } from "@/lib/ai/ai-profile-summary";

export type AiProfileContextUser = {
  id?: string | null;
  fullName?: string | null;
  email?: string | null;
  company?: string | null;
  title?: string | null;
  role?: string | null;
  profileCompleteness?: number | null;
  isAdmin?: boolean | null;
  isDeveloper?: boolean | null;
};

export type AiProfileLeadershipContextItem = {
  id: string;
  label: string;
  content: string;
  source: string;
  updatedAt: string;
};

export type AiProfileLeadershipContextPolicy =
  | {
      state: "not_configured";
      reason: string;
    }
  | {
      state: "unauthorized";
      reason: string;
    }
  | {
      state: "available";
      source: string;
      items: AiProfileLeadershipContextItem[];
    };

export type AiProfileContextPacket = {
  status: "ready" | "degraded";
  identity: {
    userId: string | null;
    displayName: string;
    email: string | null;
    company: string | null;
    title: string | null;
    role: string | null;
    profileCompleteness: number | null;
  };
  approvalPolicy: {
    authority: "admin" | "standard" | "unknown";
    defaultWriteMode: "commit_allowed" | "preview_only";
    reason: string;
  };
  memoryContext: {
    included: Pick<
      AiProfileMemory,
      | "id"
      | "type"
      | "content"
      | "confidence"
      | "importance"
      | "project_id"
      | "source"
      | "visibility"
      | "created_at"
    >[];
    omittedCount: number;
    selectionReason: string;
  };
  notificationPreferences: {
    state: "not_configured";
    defaultRouting: "matrix_defaults";
    reason: string;
  };
  leadershipContext: AiProfileLeadershipContextPolicy;
  blockedCapabilities: string[];
  warnings: string[];
};

export type BuildAiProfileContextPacketParams = {
  user: AiProfileContextUser | null;
  memories?: AiProfileMemory[];
  activeProjectId?: number | null;
  maxMemories?: number;
  leadershipContext?: AiProfileLeadershipContextPolicy;
};

const DEFAULT_MAX_MEMORIES = 5;

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function memoryScore(memory: AiProfileMemory, activeProjectId: number | null) {
  const projectBoost =
    activeProjectId !== null && memory.project_id === activeProjectId ? 2 : 0;
  const globalBoost = memory.project_id === null ? 0.5 : 0;
  const importance = Number.isFinite(memory.importance) ? memory.importance : 0;
  const confidence = Number.isFinite(memory.confidence) ? memory.confidence : 0;
  const createdAt = new Date(memory.created_at).getTime() / 10000000000000;

  return projectBoost + globalBoost + importance + confidence + createdAt;
}

function selectRelevantMemories({
  memories,
  activeProjectId,
  maxMemories,
}: {
  memories: AiProfileMemory[];
  activeProjectId: number | null;
  maxMemories: number;
}) {
  return [...memories]
    .filter((memory) => memory.content.trim().length > 0)
    .sort(
      (a, b) =>
        memoryScore(b, activeProjectId) - memoryScore(a, activeProjectId),
    )
    .slice(0, maxMemories)
    .map(
      ({
        id,
        type,
        content,
        confidence,
        importance,
        project_id,
        source,
        visibility,
        created_at,
      }) => ({
        id,
        type,
        content,
        confidence,
        importance,
        project_id,
        source,
        visibility,
        created_at,
      }),
    );
}

export function buildAiProfileContextPacket({
  user,
  memories = [],
  activeProjectId = null,
  maxMemories = DEFAULT_MAX_MEMORIES,
  leadershipContext = {
    state: "not_configured",
    reason:
      "Leadership coaching context has no durable source or visibility policy yet.",
  },
}: BuildAiProfileContextPacketParams): AiProfileContextPacket {
  const warnings: string[] = [];
  const blockedCapabilities: string[] = [];
  const userId = normalizeText(user?.id);
  const displayName = normalizeText(user?.fullName) ?? "Unknown user";
  const email = normalizeText(user?.email);
  const authority =
    user?.isAdmin === true || user?.isDeveloper === true
      ? "admin"
      : userId
        ? "standard"
        : "unknown";

  if (!userId) {
    warnings.push("User identity is unresolved.");
    blockedCapabilities.push("write_actions", "delivery_actions");
  }

  if (authority === "unknown") {
    warnings.push("Approval authority is unknown.");
  }

  if (leadershipContext.state !== "available") {
    warnings.push(leadershipContext.reason);
  }

  const boundedMaxMemories = Math.max(0, Math.min(maxMemories, 8));
  const included = selectRelevantMemories({
    memories,
    activeProjectId,
    maxMemories: boundedMaxMemories,
  });

  return {
    status: warnings.length > 0 ? "degraded" : "ready",
    identity: {
      userId,
      displayName,
      email,
      company: normalizeText(user?.company),
      title: normalizeText(user?.title),
      role: normalizeText(user?.role),
      profileCompleteness:
        typeof user?.profileCompleteness === "number"
          ? user.profileCompleteness
          : null,
    },
    approvalPolicy: {
      authority,
      defaultWriteMode: authority === "admin" ? "commit_allowed" : "preview_only",
      reason:
        authority === "admin"
          ? "Admin or developer profile can proceed to commit after preview and required confirmations."
          : "Non-admin or unresolved authority defaults to preview-only until explicit commit eligibility is checked.",
    },
    memoryContext: {
      included,
      omittedCount: Math.max(0, memories.length - included.length),
      selectionReason:
        activeProjectId === null
          ? "Selected highest-confidence global memories."
          : "Selected project-matching memories first, then high-confidence global memories.",
    },
    notificationPreferences: {
      state: "not_configured",
      defaultRouting: "matrix_defaults",
      reason:
        "Notification preferences are not user-configured yet; route through the shared notification matrix defaults.",
    },
    leadershipContext,
    blockedCapabilities,
    warnings,
  };
}
