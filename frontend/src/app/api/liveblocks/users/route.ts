import { NextResponse } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { AGENT_USERS, isAgentUserId } from "@/lib/collaboration/agent-comments";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROUTE = "/api/liveblocks/users#GET";

// Deterministic avatar color per user id — Liveblocks' native Avatar/CommentPin
// render a colored circle with the user's initials when no avatar image exists,
// and we don't store avatar images. Stable hash -> pleasant HSL hue.
function colorForId(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 45%)`;
}

// Backs Liveblocks `resolveUsers` — maps user ids to display info so comment
// threads render names instead of raw ids. Returns records in the SAME ORDER as
// the requested ids (Liveblocks matches by index); unknown ids come back as null.
export const GET = withApiGuardrails(ROUTE, async ({ request }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: ROUTE,
      message: "Authentication required.",
      status: 401,
    });
  }

  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ users: [] });
  }

  // Agent bot users (e.g. "agent:claude-code") aren't in user_profiles — resolve
  // them from the static registry so their comments render with a name.
  const dbIds = ids.filter((id) => !isAgentUserId(id));

  const supabase = await createClient();
  const { data } = dbIds.length
    ? await supabase
        .from("user_profiles")
        .select("id, full_name, email")
        .in("id", dbIds)
    : { data: [] };

  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  const users = ids.map((id) => {
    if (isAgentUserId(id)) {
      return { name: AGENT_USERS[id].name, color: colorForId(id) };
    }
    const row = byId.get(id);
    if (!row) return null;
    return {
      name: row.full_name ?? row.email ?? "Teammate",
      color: colorForId(id),
    };
  });

  return NextResponse.json({ users });
});
