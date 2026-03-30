import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

// Comment screenshots are sent as base64 data URLs which can be several MB
export const maxBodySize = "10mb";
import { ADMIN_FEEDBACK_BUCKET } from "@/lib/admin-feedback/constants";
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
      .select("id, feedback_item_id, author_id, body, mentions, screenshot_url, screenshot_path, created_at, updated_at")
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
  screenshotDataUrl: z.string().trim().nullable().optional(),
});

function decodeScreenshot(dataUrl: string) {
  const matches = dataUrl.match(
    /^data:(image\/(?:png|jpeg|webp|gif|heic|heif|avif));base64,(.+)$/,
  );
  if (!matches) {
    throw new Error("Screenshot must be a PNG, JPEG, WEBP, GIF, or AVIF data URL");
  }
  return {
    mimeType: matches[1],
    buffer: Buffer.from(matches[2], "base64"),
  };
}

async function ensureFeedbackBucket() {
  const svc = createServiceClient();
  const { error: getBucketError } = await svc.storage.getBucket(ADMIN_FEEDBACK_BUCKET);

  if (getBucketError) {
    const msg = (getBucketError as { message?: string }).message?.toLowerCase() ?? "";
    const isNotFound = msg.includes("not found") || msg.includes("does not exist");
    if (!isNotFound) throw new Error("Unable to verify feedback screenshot bucket");

    const { error: createErr } = await svc.storage.createBucket(ADMIN_FEEDBACK_BUCKET, {
      public: true,
    });
    if (createErr) throw new Error("Unable to create feedback screenshot bucket");
  }
}

async function uploadCommentScreenshot(userId: string, screenshotDataUrl: string) {
  await ensureFeedbackBucket();
  const svc = createServiceClient();
  const screenshot = decodeScreenshot(screenshotDataUrl);
  const extension = screenshot.mimeType.split("/")[1] ?? "png";
  const filePath = `comments/${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;

  const { error: uploadError } = await svc.storage
    .from(ADMIN_FEEDBACK_BUCKET)
    .upload(filePath, screenshot.buffer, {
      contentType: screenshot.mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload comment screenshot: ${(uploadError as { message?: string }).message ?? "unknown"}`);
  }

  const {
    data: { publicUrl },
  } = svc.storage.from(ADMIN_FEEDBACK_BUCKET).getPublicUrl(filePath);

  return { screenshotPath: filePath, screenshotUrl: publicUrl };
}

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

    const { feedbackItemId, body, mentions = [], screenshotDataUrl } = parsed.data;
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

    // Upload screenshot if provided
    let screenshotUrl: string | null = null;
    let screenshotPath: string | null = null;

    if (screenshotDataUrl) {
      try {
        const uploaded = await uploadCommentScreenshot(user.id, screenshotDataUrl);
        screenshotUrl = uploaded.screenshotUrl;
        screenshotPath = uploaded.screenshotPath;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Screenshot upload failed";
        return jsonError(500, { error: "Failed to upload comment screenshot", details: msg });
      }
    }

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from("admin_feedback_comments")
      .insert({
        feedback_item_id: feedbackItemId,
        author_id: user.id,
        body,
        mentions,
        screenshot_url: screenshotUrl,
        screenshot_path: screenshotPath,
      })
      .select("id, feedback_item_id, author_id, body, mentions, screenshot_url, screenshot_path, created_at, updated_at")
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
