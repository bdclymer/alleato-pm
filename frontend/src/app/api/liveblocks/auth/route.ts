import { Liveblocks } from "@liveblocks/node";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROUTE = "/api/liveblocks/auth#POST";
const secret = process.env.LIVEBLOCKS_SECRET_KEY;

// Stable accent color per user id so avatars/threads are visually consistent.
const AVATAR_PALETTE = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#059669",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#4f46e5",
];

function colorForUser(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

// Liveblocks access-token auth. All authenticated Alleato users may read/write
// any entity comment room (`alleato:*`) — this mirrors Velt's shared model where
// anyone signed in can comment on any record. Room ids come from
// `getRoomId(entityType, entityId)` in lib/collaboration/rooms.ts.
export const POST = withApiGuardrails(ROUTE, async () => {
  if (!secret) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: ROUTE,
      message: "Liveblocks is not configured (missing LIVEBLOCKS_SECRET_KEY).",
      status: 500,
    });
  }

  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: ROUTE,
      message: "Authentication required.",
      status: 401,
    });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const name = profile?.full_name ?? profile?.email ?? user.email ?? "Teammate";

  const liveblocks = new Liveblocks({ secret });
  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name,
      email: profile?.email ?? user.email ?? undefined,
      color: colorForUser(user.id),
    },
  });

  session.allow("alleato:*", session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return new Response(body, { status });
});
