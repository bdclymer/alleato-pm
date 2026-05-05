export const dynamic = "force-dynamic";

import { after } from "next/server";
import { getTeamsChat } from "@/lib/bot/teams-chat";

export async function POST(request: Request): Promise<Response> {
  try {
    const chat = getTeamsChat();
    // Pass `after` as `waitUntil` so the message handler survives past the
    // 200 response on Vercel. Without this, Vercel kills the function as soon
    // as the response is sent, before the AI call and reply complete.
    return await chat.webhooks.teams(request, {
      waitUntil: (promise) => after(promise),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[teams-bot] webhook error", { error: msg });
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
