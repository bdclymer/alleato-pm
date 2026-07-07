import { randomUUID } from "crypto";

import { Liveblocks } from "@liveblocks/node";

import { getCollaborationNotificationHref } from "@/lib/collaboration/notification-links";

// Mirrors an app-domain notification into the Liveblocks inbox so it renders in
// the header bell + /notifications alongside native comment/mention
// notifications. The system of record stays in `collaboration_notifications`
// (Teams fan-out, AI-widget interruption, dedup, learning ledger); Liveblocks is
// purely the render surface. Every mirrored notification uses the flat `$alleato`
// custom kind (see types/liveblocks.d.ts). Fire-and-forget: a Liveblocks failure
// must never block the primary notification write.

type MirrorInput = {
  title: string;
  body?: string | null;
  source?: string | null;
  /** The original collaboration_notifications.kind, e.g. "$deadline" or "rfi_attention". */
  notificationKind: string;
  projectId?: number | null;
  entityType?: string | null;
  entityId?: string | null;
  /** Stable id for dedup; falls back to a random id when absent. */
  subjectId?: string | null;
};

// Mirrors the `$alleato` shape declared in types/liveblocks.d.ts. Declared
// locally because the imported `Liveblocks` node class shadows the global
// `Liveblocks` interface, so it can't be referenced by indexed access here.
type AlleatoActivity = {
  title: string;
  body?: string;
  href?: string;
  notificationKind?: string;
  source?: string;
  entityType?: string;
  entityId?: string;
  projectId?: number;
};

let cachedClient: Liveblocks | null = null;

function getLiveblocks(): Liveblocks | null {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) return null;
  if (!cachedClient) {
    cachedClient = new Liveblocks({ secret });
  }
  return cachedClient;
}

function cleanText(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// Only primitive values are allowed in Liveblocks activityData.
function buildActivityData(input: MirrorInput) {
  const href = getCollaborationNotificationHref({
    projectId: input.projectId ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
  });

  const data: AlleatoActivity = {
    title: input.title,
    notificationKind: input.notificationKind,
  };

  const body = cleanText(input.body);
  if (body) data.body = body;
  if (href) data.href = href;
  const source = cleanText(input.source);
  if (source) data.source = source;
  const entityType = cleanText(input.entityType);
  if (entityType) data.entityType = entityType;
  const entityId = cleanText(input.entityId);
  if (entityId) data.entityId = entityId;
  if (typeof input.projectId === "number") data.projectId = input.projectId;

  return data;
}

async function mirrorOne(
  liveblocks: Liveblocks,
  userId: string,
  input: MirrorInput,
) {
  // No roomId: the app-domain notification kinds don't map cleanly to
  // CommentableEntityType room ids, and the href already handles navigation.
  await liveblocks.triggerInboxNotification({
    userId,
    kind: "$alleato",
    subjectId: cleanText(input.subjectId) ?? randomUUID(),
    activityData: buildActivityData(input),
  });
}

/**
 * Mirror a notification into the Liveblocks inbox for one or more users.
 * Never throws — logs and moves on so the primary DB write path is unaffected.
 */
export async function mirrorToLiveblocksInbox(
  userIds: string | string[],
  input: MirrorInput,
): Promise<void> {
  const liveblocks = getLiveblocks();
  if (!liveblocks) return;

  const users = Array.isArray(userIds) ? userIds : [userIds];
  await Promise.all(
    users.map((userId) =>
      mirrorOne(liveblocks, userId, input).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[liveblocks-inbox] mirror failed", {
          userId,
          kind: input.notificationKind,
          error: message,
        });
      }),
    ),
  );
}
