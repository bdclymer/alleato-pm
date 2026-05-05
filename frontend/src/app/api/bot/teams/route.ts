export const dynamic = "force-dynamic";

import { getTeamsChat, resetTeamsChat } from "@/lib/bot/teams-chat";

export async function POST(request: Request): Promise<Response> {
  try {
    const chat = getTeamsChat();
    const pendingTasks: Array<Promise<unknown>> = [];
    const response = await chat.webhooks.teams(request, {
      waitUntil: (task) => {
        console.log("[teams-bot] waitUntil called");
        pendingTasks.push(task);
      },
    });
    console.log("[teams-bot] tasks after webhook:", pendingTasks.length);
    // Await tasks directly so they complete within the request lifecycle.
    // Teams bot responses are sent as outbound proactive messages (not as
    // the HTTP reply), so blocking here doesn't delay the 200 ACK to Teams
    // for simple responses. For long AI queries Teams may timeout the webhook
    // but the bot will still send the reply proactively.
    await Promise.allSettled(pendingTasks);
    return response;
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
