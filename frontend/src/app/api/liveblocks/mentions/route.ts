import { NextResponse } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROUTE = "/api/liveblocks/mentions#GET";
const SUGGESTION_LIMIT = 10;

// Backs Liveblocks `resolveMentionSuggestions` — powers the "@" mention menu in
// the comment composer. Returns an array of user ids (Liveblocks user id ===
// Supabase auth user id === `user_profiles.id`, the same id space the auth route
// and /api/liveblocks/users use). An empty `text` returns a default set of
// teammates so the menu isn't blank before the user types.
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
  // Strip characters that either break the PostgREST `.or()` filter grammar
  // (`,` `(` `)`) or are ILIKE wildcards (`%` `_` `\`), then bound the length.
  const text = (searchParams.get("text") ?? "")
    .replace(/[,()%_\\*]/g, " ")
    .trim()
    .slice(0, 100);

  const supabase = await createClient();
  let query = supabase
    .from("user_profiles")
    .select("id, full_name, email")
    .not("full_name", "is", null)
    .order("full_name", { ascending: true })
    .limit(SUGGESTION_LIMIT);

  if (text.length > 0) {
    const pattern = `%${text}%`;
    query = query.or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: ROUTE,
      message: `Failed to search mention suggestions: ${error.message}`,
      status: 500,
    });
  }

  const userIds = (data ?? []).map((row) => row.id);
  return NextResponse.json({ users: userIds });
});
