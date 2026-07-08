import { NextResponse } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { AGENT_USERS, isAgentUserId } from "@/lib/collaboration/agent-comments";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROUTE = "/api/liveblocks/users#GET";

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
    if (isAgentUserId(id)) return { name: AGENT_USERS[id].name };
    const row = byId.get(id);
    if (!row) return null;
    return { name: row.full_name ?? row.email ?? "Teammate" };
  });

  return NextResponse.json({ users });
});
