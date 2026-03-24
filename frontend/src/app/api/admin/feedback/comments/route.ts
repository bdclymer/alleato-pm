import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function jsonError(status: number, payload: { error: string; details?: string }) {
  return NextResponse.json(payload, { status });
}

async function requireAdminUser() {
  const requestUser = await getApiRouteUser();
  if (!requestUser) return null;

  const supabase = createServiceClient();
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("id, is_admin")
    .eq("id", requestUser.id)
    .maybeSingle();

  if (error || !profile?.is_admin) return null;
  return requestUser;
}

// ---------------------------------------------------------------------------
// GET — List comments for a feedback item
// ---------------------------------------------------------------------------

const listSchema = z.object({
  feedbackItemId: z.string().uuid(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAdminUser();
    if (!user) return jsonError(403, { error: "Admin access required" });

    const url = new URL(request.url);
    const parsed = listSchema.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("admin_feedback_comments")
      .select("id, feedback_item_id, author_id, body, mentions, created_at, updated_at")
      .eq("feedback_item_id", parsed.data.feedbackItemId)
      .order("created_at", { ascending: true });

    if (error) {
      return jsonError(500, { error: "Failed to fetch comments", details: error.message });
    }

    // Fetch author profiles for all unique author IDs
    const authorIds = [...new Set((data ?? []).map((c) => c.author_id))];
    let authors: Record<string, { id: string; email: string; full_name: string | null }> = {};

    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, email, full_name")
        .in("id", authorIds);

      if (profiles) {
        authors = Object.fromEntries(profiles.map((p) => [p.id, p]));
      }
    }

    const comments = (data ?? []).map((c) => ({
      ...c,
      author: authors[c.author_id] ?? { id: c.author_id, email: "unknown", full_name: null },
    }));

    return NextResponse.json({ comments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonError(500, { error: "Failed to fetch comments", details: message });
  }
}

// ---------------------------------------------------------------------------
// POST — Add a comment to a feedback item
// ---------------------------------------------------------------------------

const postSchema = z.object({
  feedbackItemId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
  mentions: z.array(z.string().uuid()).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireAdminUser();
    if (!user) return jsonError(403, { error: "Admin access required" });

    const raw = await request.json();
    const parsed = postSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { feedbackItemId, body, mentions = [] } = parsed.data;
    const supabase = createServiceClient();

    // Verify the feedback item exists
    const { data: item, error: itemError } = await supabase
      .from("admin_feedback_items")
      .select("id")
      .eq("id", feedbackItemId)
      .maybeSingle();

    if (itemError || !item) {
      return jsonError(404, { error: "Feedback item not found" });
    }

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from("admin_feedback_comments")
      .insert({
        feedback_item_id: feedbackItemId,
        author_id: user.id,
        body,
        mentions,
      })
      .select("id, feedback_item_id, author_id, body, mentions, created_at, updated_at")
      .single();

    if (insertError) {
      return jsonError(500, { error: "Failed to add comment", details: insertError.message });
    }

    // Fetch author profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, email, full_name")
      .eq("id", user.id)
      .maybeSingle();

    // Send notifications to mentioned users via Liveblocks-style in-app
    // (For now, we store mentions in the DB — notification delivery can be added later)

    return NextResponse.json({
      comment: {
        ...comment,
        author: profile ?? { id: user.id, email: "unknown", full_name: null },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonError(500, { error: "Failed to add comment", details: message });
  }
}
