/**
 * Unified webhook route for all Chat SDK platforms.
 *
 * POST /api/bot/slack    → Slack events & interactions
 * POST /api/bot/teams    → Microsoft Teams activity
 * POST /api/bot/telegram → Telegram webhook updates
 *
 * The [platform] segment maps directly to the adapter name registered
 * in the Chat SDK bot instance.
 */

import { after } from "next/server";
import { bot } from "@/lib/bot";

export const maxDuration = 120;

type Platform = keyof typeof bot.webhooks;

export async function POST(
  request: Request,
  context: { params: Promise<{ platform: string }> },
) {
  try {
    const { platform } = await context.params;

    const handler = bot.webhooks[platform as Platform];
    if (!handler) {
      return new Response(`Unknown platform: ${platform}`, { status: 404 });
    }

    return await handler(request, {
      waitUntil: (task: Promise<unknown>) => after(() => task),
    });
  } catch (error) {
    console.error("[bot-webhook] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
