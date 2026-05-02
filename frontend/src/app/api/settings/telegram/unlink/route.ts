export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";

// DELETE — remove the current user's Telegram account link
export const DELETE = withApiGuardrails(
  "/api/settings/telegram/unlink#DELETE",
  async ({ request }) => {
    const { user, supabase } = await getApiRouteUser(request);
    if (!user) {
      throw new GuardrailError({
        code: "UNAUTHORIZED",
        where: "/api/settings/telegram/unlink#DELETE",
        message: "Not authenticated.",
        status: 401,
        severity: "low",
      });
    }

    const { error } = await supabase
      .from("bot_user_mappings")
      .delete()
      .eq("supabase_user_id", user.id)
      .eq("platform", "telegram");

    if (error) {
      throw new GuardrailError({
        code: "DB_DELETE_FAILED",
        where: "/api/settings/telegram/unlink#DELETE",
        message: "Failed to unlink Telegram account.",
        details: { reason: error.message },
        severity: "medium",
      });
    }

    return NextResponse.json({ unlinked: true });
  },
);
