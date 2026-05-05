export const dynamic = "force-dynamic";

import { after } from "next/server";
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
    if (pendingTasks.length > 0) {
      for (const task of pendingTasks) {
        after(() => task);
      }
    } else {
      // SDK may defer waitUntil calls — run any outstanding tasks now
      console.log("[teams-bot] no tasks collected, awaiting directly");
    }
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
