import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // Get the most recent message per channel
  const { data, error } = await supabase
    .from("team_chat_messages")
    .select("channel_id, content, user_name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({});
  }

  // Keep only the latest message per channel
  const byChannel: Record<string, { content: string; user_name: string; created_at: string }> = {};
  for (const row of data ?? []) {
    if (!byChannel[row.channel_id]) {
      byChannel[row.channel_id] = {
        content: row.content,
        user_name: row.user_name,
        created_at: row.created_at,
      };
    }
  }

  return NextResponse.json(byChannel);
}
