import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channel");
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 200);

  if (!channelId) {
    return NextResponse.json({ error: "channel is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("team_chat_messages")
    .select("id, channel_id, user_name, content, created_at")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { channelId, content, userName } = body as {
    channelId: string;
    content: string;
    userName: string;
  };

  if (!channelId || !content?.trim() || !userName) {
    return NextResponse.json(
      { error: "channelId, content, and userName are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("team_chat_messages")
    .insert({
      channel_id: channelId,
      user_id: user.id,
      user_name: userName,
      content: content.trim(),
    })
    .select("id, channel_id, user_name, content, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
