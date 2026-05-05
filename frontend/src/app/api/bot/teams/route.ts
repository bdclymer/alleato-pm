export const dynamic = "force-dynamic";

import { after } from "next/server";
import { getTeamsChat, resetTeamsChat } from "@/lib/bot/teams-chat";

export async function POST(request: Request): Promise<Response> {
  try {
    const chat = getTeamsChat();
    return await chat.webhooks.teams(request, {
      waitUntil: (task) => after(() => task),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[teams-bot] webhook error", { error: msg });
    // Reset singleton so Teams' automatic retry gets a fresh initialization
    // attempt. Without this, a failed pg pool connect caches a rejected
    // initPromise and every subsequent request fails until cold restart.
    resetTeamsChat();
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
