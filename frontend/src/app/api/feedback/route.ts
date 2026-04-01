import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_FEEDBACK_BUCKET,
  ADMIN_FEEDBACK_REQUEST_TYPES,
  ADMIN_FEEDBACK_SEVERITIES,
} from "@/lib/admin-feedback/constants";
import { createGitHubIssue } from "@/lib/admin-feedback/github";
import { matchFeedbackToTool } from "@/lib/admin-feedback/tool-matcher";
import { resolveToolContext, contextToAgentPayload } from "@/lib/admin-feedback/context-resolver";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Client Feedback API — accessible to ANY authenticated user (not admin-only)
//
// This powers the production client feedback widget. Items land in the same
// admin_feedback_items table but are tagged with source: "client" in metadata
// so they can be filtered separately from dev annotations.
// ---------------------------------------------------------------------------

const clientFeedbackSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  type: z.enum(ADMIN_FEEDBACK_REQUEST_TYPES),
  severity: z.enum(ADMIN_FEEDBACK_SEVERITIES),
  pageUrl: z.string().url(),
  pagePath: z.string().trim().min(1).max(500),
  pageTitle: z.string().trim().max(300).nullable().optional(),
  projectId: z.number().int().positive().nullable().optional(),
  screenshotDataUrl: z.string().trim().nullable().optional(),
});

type FeedbackInsert =
  Database["public"]["Tables"]["admin_feedback_items"]["Insert"];
type JsonValue = Database["public"]["Tables"]["admin_feedback_items"]["Row"]["metadata"];

function toJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toJsonValue(item)]),
    );
  }
  return String(value);
}

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

async function ensureBucket() {
  const supabase = createServiceClient();
  const { data: bucket, error } = await supabase.storage.getBucket(ADMIN_FEEDBACK_BUCKET);

  if (error) {
    const msg = typeof error === "object" && "message" in error ? (error as { message: string }).message : "";
    const isNotFound = msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("does not exist");
    if (!isNotFound) throw new Error("Unable to verify feedback bucket");

    const { error: createErr } = await supabase.storage.createBucket(ADMIN_FEEDBACK_BUCKET, { public: true });
    if (createErr) throw new Error("Unable to create feedback bucket");
    return;
  }

  if (!bucket.public) {
    await supabase.storage.updateBucket(ADMIN_FEEDBACK_BUCKET, { public: true });
  }
}

async function uploadScreenshot(userId: string, dataUrl: string) {
  await ensureBucket();
  const supabase = createServiceClient();
  const screenshot = decodeScreenshot(dataUrl);
  const ext = screenshot.mimeType.split("/")[1] ?? "png";
  const filePath = `feedback/${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(ADMIN_FEEDBACK_BUCKET)
    .upload(filePath, screenshot.buffer, {
      contentType: screenshot.mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw new Error("Failed to upload screenshot");

  const { data: { publicUrl } } = supabase.storage
    .from(ADMIN_FEEDBACK_BUCKET)
    .getPublicUrl(filePath);

  return { screenshotPath: filePath, screenshotUrl: publicUrl };
}

// ---------------------------------------------------------------------------
// POST — Submit client feedback (any authenticated user)
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    // Any authenticated user — NOT admin-only
    const user = await getApiRouteUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", hint: "You must be signed in to submit feedback." },
        { status: 401 },
      );
    }

    const rawBody = await request.json();
    const parsed = clientFeedbackSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid feedback payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    let screenshotPath: string | null = null;
    let screenshotUrl: string | null = null;

    // Upload screenshot if provided
    if (payload.screenshotDataUrl) {
      try {
        const uploaded = await uploadScreenshot(user.id, payload.screenshotDataUrl);
        screenshotPath = uploaded.screenshotPath;
        screenshotUrl = uploaded.screenshotUrl;
      } catch {
        console.warn("[ClientFeedback] Screenshot upload failed, continuing without");
      }
    }

    // Auto-match to a procore_tools row
    const matchedTool = await matchFeedbackToTool(
      payload.title,
      payload.description,
      payload.pagePath,
      payload.pageUrl,
    );
    const toolContext = matchedTool ? resolveToolContext(matchedTool) : null;
    const agentContext = toolContext
      ? toJsonValue(contextToAgentPayload(toolContext))
      : null;

    const metadata = toJsonValue({
      source: "client",
      userAgent: request.headers.get("user-agent") ?? null,
    });

    const insertPayload: FeedbackInsert = {
      created_by: user.id,
      project_id: payload.projectId ?? null,
      page_url: payload.pageUrl,
      page_path: payload.pagePath,
      page_title: payload.pageTitle ?? null,
      target_id: null,
      target_selector: "body",
      target_text: null,
      target_tag: null,
      dom_path: null,
      target_rect: null,
      title: payload.title,
      comment: payload.description,
      request_type: payload.type,
      severity: payload.severity,
      status: "open",
      screenshot_path: screenshotPath,
      screenshot_url: screenshotUrl,
      metadata,
      ...(matchedTool ? { tool_id: matchedTool.id } : {}),
      ...(agentContext ? { agent_context: agentContext } : {}),
    };

    const supabase = createServiceClient();
    const { data: inserted, error: insertError } = await supabase
      .from("admin_feedback_items")
      .insert(insertPayload)
      .select("id, title, status")
      .single();

    if (insertError) {
      console.error("[ClientFeedback] Insert failed:", insertError);
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 },
      );
    }

    // Create GitHub issue asynchronously — don't block the response
    let githubIssue: { number: number; url: string; state: string } | null = null;
    let githubWarning: string | null = null;

    try {
      githubIssue = await createGitHubIssue({
        title: payload.title,
        comment: payload.description,
        pageUrl: payload.pageUrl,
        pagePath: payload.pagePath,
        pageTitle: payload.pageTitle ?? null,
        requestType: payload.type,
        severity: payload.severity,
        targetId: null,
        targetSelector: "body",
        targetTag: null,
        targetText: null,
        domPath: null,
        screenshotUrl,
        projectId: payload.projectId ?? null,
        metadata: { source: "client" },
        toolContext,
      });
    } catch (err) {
      githubWarning = err instanceof Error ? err.message : "GitHub issue creation failed";
    }

    // Update with GitHub info
    if (githubIssue) {
      await supabase
        .from("admin_feedback_items")
        .update({
          github_issue_number: githubIssue.number,
          github_issue_url: githubIssue.url,
          github_issue_state: githubIssue.state,
          status: "submitted",
        })
        .eq("id", inserted.id);
    } else if (githubWarning) {
      await supabase
        .from("admin_feedback_items")
        .update({ status: "github_failed" })
        .eq("id", inserted.id);
    }

    return NextResponse.json({
      feedbackId: inserted.id,
      title: inserted.title,
      screenshotUrl,
      githubIssue,
      githubWarning: githubWarning ?? (githubIssue ? null : "GitHub not configured."),
    });
  } catch (err) {
    console.error("[ClientFeedback] Submission failed:", err);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 },
    );
  }
}
