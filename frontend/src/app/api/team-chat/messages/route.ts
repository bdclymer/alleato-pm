import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

export const GET = withApiGuardrails(
  "team-chat/messages#GET",
  async ({ request }) => {
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
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
  },
);

export const POST = withApiGuardrails(
  "team-chat/messages#POST",
  async ({ request }) => {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "team-chat/messages#POST",
        message: "Authentication required.",
      });
    }

    const body = await request.json();
    const { channelId, content } = body as {
      channelId: string;
      content: string;
    };

    if (!channelId || !content?.trim()) {
      return NextResponse.json(
        { error: "channelId and content are required" },
        { status: 400 },
      );
    }

    const normalizedContent = content.trim();
    if (normalizedContent.length > 4000) {
      return NextResponse.json(
        { error: "Messages must be 4000 characters or fewer." },
        { status: 400 },
      );
    }

    const [{ data: profile, error: profileError }, { count: channelMessageCount, error: channelError }] =
      await Promise.all([
        supabase
          .from("user_profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("team_chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("channel_id", channelId),
      ]);

    if (profileError) {
      return apiErrorResponse(profileError);
    }

    if (channelError) {
      return apiErrorResponse(channelError);
    }

    if (channelId !== "general" && (channelMessageCount ?? 0) === 0) {
      return NextResponse.json({ error: "Channel not found." }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("team_chat_messages")
      .insert({
        channel_id: channelId,
        user_id: user.id,
        user_name: profile?.full_name ?? profile?.email ?? user.email ?? "User",
        content: normalizedContent,
      })
      .select("id, channel_id, user_name, content, created_at")
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data, { status: 201 });
  },
);
