import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";

// Screenshots are sent as base64 data URLs which can be several MB.
// App Router route handlers use the native Request API with no built-in
// size limit. On Vercel, the payload limit is 4.5MB for serverless functions.
import {
  ADMIN_FEEDBACK_BUCKET,
  ADMIN_FEEDBACK_REQUEST_TYPES,
  ADMIN_FEEDBACK_SEVERITIES,
} from "@/lib/admin-feedback/constants";
import { createGitHubIssue } from "@/lib/admin-feedback/github";
import { notifyTeamsWebhook } from "@/lib/admin-feedback/teams-webhook";
import { buildAdminFeedbackTitle } from "@/lib/admin-feedback/title";
import { matchFeedbackToTool, getToolById } from "@/lib/admin-feedback/tool-matcher";
import { resolveToolContext, contextToAgentPayload } from "@/lib/admin-feedback/context-resolver";
import { ingestAdminFeedbackLearning } from "@/lib/ai/services/agent-learning-service";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";
import { logger } from "@/lib/logger";

const feedbackPayloadSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  comment: z.string().trim().min(1).max(5000),
  pageUrl: z.string().url(),
  pagePath: z.string().trim().min(1).max(500),
  pageTitle: z.string().trim().max(300).nullable().optional(),
  requestType: z.enum(ADMIN_FEEDBACK_REQUEST_TYPES),
  severity: z.enum(ADMIN_FEEDBACK_SEVERITIES),
  projectId: z.number().int().positive().nullable().optional(),
  target: z.object({
    id: z.string().trim().max(200).nullable().optional(),
    selector: z.string().trim().min(1).max(2000),
    text: z.string().trim().max(1000).nullable().optional(),
    tagName: z.string().trim().max(50).nullable().optional(),
    domPath: z.string().trim().max(2000).nullable().optional(),
    rect: z
      .object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      })
      .nullable()
      .optional(),
  }),
  screenshotDataUrl: z.string().trim().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type FeedbackInsert =
  Database["public"]["Tables"]["admin_feedback_items"]["Insert"];
type JsonValue = Database["public"]["Tables"]["admin_feedback_items"]["Row"]["metadata"];
type ApiErrorPayload = {
  error: string;
  code?: string;
  hint?: string;
  details?: string;
};

function toErrorDetails(value: unknown) {
  if (typeof value === "object" && value !== null) {
    const maybeMessage = "message" in value ? value.message : undefined;
    const maybeCode = "code" in value ? value.code : undefined;
    const maybeDetails = "details" in value ? value.details : undefined;

    return {
      message:
        typeof maybeMessage === "string"
          ? maybeMessage
          : "Unexpected Supabase error",
      code: typeof maybeCode === "string" ? maybeCode : undefined,
      details: typeof maybeDetails === "string" ? maybeDetails : undefined,
    };
  }

  if (value instanceof Error) {
    return { message: value.message };
  }

  return { message: "Unexpected error" };
}

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
      Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]),
    );
  }

  return String(value);
}

function jsonError(status: number, payload: ApiErrorPayload): NextResponse<ApiErrorPayload> {
  return NextResponse.json(payload, { status });
}

async function ensureFeedbackBucket() {
  const serviceSupabase = createServiceClient();
  const { data: bucket, error: getBucketError } =
    await serviceSupabase.storage.getBucket(ADMIN_FEEDBACK_BUCKET);

  if (getBucketError) {
    const details = toErrorDetails(getBucketError);
    const message = details.message.toLowerCase();
    const isNotFound =
      message.includes("not found") || message.includes("does not exist");

    if (!isNotFound) {
      return {
        ok: false as const,
        response: jsonError(500, {
          error: "Unable to verify feedback screenshot bucket",
          code: details.code,
          hint: "Check Supabase Storage permissions for the service role.",
          details: details.message,
        }),
      };
    }

    const { error: createBucketError } =
      await serviceSupabase.storage.createBucket(ADMIN_FEEDBACK_BUCKET, {
        public: true,
      });

    if (createBucketError) {
      const createDetails = toErrorDetails(createBucketError);
      return {
        ok: false as const,
        response: jsonError(500, {
          error: "Unable to create feedback screenshot bucket",
          code: createDetails.code,
          hint: `Create a public Storage bucket named '${ADMIN_FEEDBACK_BUCKET}'.`,
          details: createDetails.message,
        }),
      };
    }

    return { ok: true as const };
  }

  if (!bucket.public) {
    const { error: updateBucketError } =
      await serviceSupabase.storage.updateBucket(ADMIN_FEEDBACK_BUCKET, {
        public: true,
      });

    if (updateBucketError) {
      const updateDetails = toErrorDetails(updateBucketError);
      return {
        ok: false as const,
        response: jsonError(500, {
          error: "Unable to configure feedback screenshot bucket visibility",
          code: updateDetails.code,
          hint: "Make sure the feedback screenshot bucket is public.",
          details: updateDetails.message,
        }),
      };
    }
  }

  return { ok: true as const };
}

function decodeScreenshot(dataUrl: string) {
  const matches = dataUrl.match(/^data:(image\/(?:png|jpeg|webp|gif|heic|heif|avif));base64,(.+)$/);
  if (!matches) {
    throw new Error("Screenshot must be a PNG, JPEG, WEBP, GIF, or AVIF data URL");
  }

  return {
    mimeType: matches[1],
    buffer: Buffer.from(matches[2], "base64"),
  };
}

async function uploadScreenshot(userId: string, screenshotDataUrl: string) {
  const bucketReady = await ensureFeedbackBucket();
  if (!bucketReady.ok) {
    throw new Error("Feedback screenshot bucket is not available");
  }

  const serviceSupabase = createServiceClient();
  const screenshot = decodeScreenshot(screenshotDataUrl);
  const extension = screenshot.mimeType.split("/")[1] ?? "png";
  const filePath = `feedback/${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;

  const { error: uploadError } = await serviceSupabase.storage
    .from(ADMIN_FEEDBACK_BUCKET)
    .upload(filePath, screenshot.buffer, {
      contentType: screenshot.mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    const details = toErrorDetails(uploadError);
    throw jsonError(500, {
      error: "Failed to upload feedback screenshot",
      code: details.code,
      hint: "Check Supabase Storage configuration for the admin feedback bucket.",
      details: details.message,
    });
  }

  const {
    data: { publicUrl },
  } = serviceSupabase.storage.from(ADMIN_FEEDBACK_BUCKET).getPublicUrl(filePath);

  return {
    screenshotPath: filePath,
    screenshotUrl: publicUrl,
  };
}

// Throws UNAUTHORIZED (401) when there is no session and AUTH_FORBIDDEN (403)
// when the session exists but the user is not an admin. Distinguishing these
// matters: clients use 401 to redirect to login and 403 to show "no permission"
// UX. Returning a single sentinel for both lost that distinction and caused the
// PR-gate smoke test to flag every unauthenticated request as a 403.
async function requireAdminUser(where: string) {
  const requestUser = await getApiRouteUser();
  if (!requestUser) {
    throw new GuardrailError({
      code: "UNAUTHORIZED",
      where,
      message: "Authentication required.",
      status: 401,
    });
  }

  const serviceSupabase = createServiceClient();
  const { data: profile, error } = await serviceSupabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", requestUser.id)
    .maybeSingle();

  if (error || profile?.is_admin !== true) {
    throw new GuardrailError({
      code: "AUTH_FORBIDDEN",
      where,
      message: "Admin access required.",
      status: 403,
    });
  }

  return requestUser;
}

export const POST = withApiGuardrails("/api/admin/feedback#POST", async ({ request, requestId }) => {
  const requestUser = await getApiRouteUser();
  if (!requestUser) {
    throw new GuardrailError({ code: "UNAUTHORIZED", where: "/api/admin/feedback#POST", message: "Authentication required.", status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    throw new GuardrailError({ code: "INVALID_PAYLOAD", where: "/api/admin/feedback#POST", message: "Request body is not valid JSON." });
  }
  const parsed = feedbackPayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid feedback payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const metadata = toJsonValue(payload.metadata ?? {});
  let screenshotPath: string | null = null;
  let screenshotUrl: string | null = null;

  if (payload.screenshotDataUrl) {
    const uploaded = await uploadScreenshot(requestUser.id, payload.screenshotDataUrl);
    screenshotPath = uploaded.screenshotPath;
    screenshotUrl = uploaded.screenshotUrl;
  }

  const title = buildAdminFeedbackTitle({
    providedTitle: payload.title,
    requestType: payload.requestType,
    comment: payload.comment,
    targetText: payload.target.text,
    pageTitle: payload.pageTitle,
  });

  const matchedTool = await matchFeedbackToTool(
    title,
    payload.comment,
    payload.pagePath,
    payload.pageUrl,
  );
  const toolContext = matchedTool ? resolveToolContext(matchedTool) : null;
  const agentContext = toolContext ? toJsonValue(contextToAgentPayload(toolContext)) : null;

  const insertPayload: FeedbackInsert = {
    created_by: requestUser.id,
    project_id: payload.projectId ?? null,
    page_url: payload.pageUrl,
    page_path: payload.pagePath,
    page_title: payload.pageTitle ?? null,
    target_id: payload.target.id ?? null,
    target_selector: payload.target.selector,
    target_text: payload.target.text ?? null,
    target_tag: payload.target.tagName ?? null,
    dom_path: payload.target.domPath ?? null,
    target_rect: payload.target.rect ?? null,
    title,
    comment: payload.comment,
    request_type: payload.requestType,
    severity: payload.severity,
    status: "open",
    screenshot_path: screenshotPath,
    screenshot_url: screenshotUrl,
    metadata,
    ...(matchedTool ? { tool_id: matchedTool.id } : {}),
    ...(agentContext ? { agent_context: agentContext } : {}),
  };

  const serviceSupabase = createServiceClient();
  const { data: inserted, error: insertError } = await serviceSupabase
    .from("admin_feedback_items")
    .insert(insertPayload)
    .select("id, title, status, github_issue_number, github_issue_url, github_issue_state")
    .single();

  if (insertError) {
    const details = toErrorDetails(insertError);
    throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/feedback#POST", message: details.message });
  }

  try {
    await ingestAdminFeedbackLearning({
      feedbackItemId: inserted.id,
      title,
      comment: payload.comment,
      pagePath: payload.pagePath,
      toolId: matchedTool?.id ?? null,
      projectId: payload.projectId ?? null,
      status: "candidate",
    });
  } catch (learningError) {
    logger.error({ msg: "[AdminFeedback] Candidate learning ingestion failed", data: learningError });
  }

  let githubIssue: { number: number; url: string; state: string } | null = null;
  let githubWarning: string | null = null;

  try {
    githubIssue = await createGitHubIssue({
      title,
      comment: payload.comment,
      pageUrl: payload.pageUrl,
      pagePath: payload.pagePath,
      pageTitle: payload.pageTitle ?? null,
      requestType: payload.requestType,
      severity: payload.severity,
      targetId: payload.target.id ?? null,
      targetSelector: payload.target.selector,
      targetTag: payload.target.tagName ?? null,
      targetText: payload.target.text ?? null,
      domPath: payload.target.domPath ?? null,
      screenshotUrl,
      projectId: payload.projectId ?? null,
      metadata: payload.metadata ?? {},
      toolContext,
    });
  } catch (error) {
    githubWarning = error instanceof Error ? error.message : "GitHub issue creation failed";
  }

  if (githubIssue) {
    await serviceSupabase
      .from("admin_feedback_items")
      .update({
        github_issue_number: githubIssue.number,
        github_issue_url: githubIssue.url,
        github_issue_state: githubIssue.state,
        status: "submitted",
      })
      .eq("id", inserted.id);
  } else if (githubWarning) {
    await serviceSupabase
      .from("admin_feedback_items")
      .update({ status: "github_failed" })
      .eq("id", inserted.id);
  }

  const metadataRecord =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  const submitterEmail =
    typeof metadataRecord.submitterEmail === "string"
      ? metadataRecord.submitterEmail
      : null;
  const submitterName =
    typeof metadataRecord.submitterName === "string"
      ? metadataRecord.submitterName
      : null;
  const videoRecordingUrl =
    typeof metadataRecord.videoRecordingUrl === "string"
      ? metadataRecord.videoRecordingUrl
      : null;
  const requestOrigin = new URL(request.url).origin;
  const inboxBase =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || requestOrigin;

  const teamsResult = await notifyTeamsWebhook({
    requestId,
    feedbackId: inserted.id,
    title,
    comment: payload.comment,
    requestType: payload.requestType,
    severity: payload.severity,
    pageUrl: payload.pageUrl,
    pagePath: payload.pagePath,
    pageTitle: payload.pageTitle ?? null,
    screenshotUrl,
    videoRecordingUrl,
    submitterEmail,
    submitterName,
    githubIssueUrl: githubIssue?.url ?? null,
    inboxUrl: `${inboxBase}/feedback-inbox#item-${inserted.id}`,
  });

  return NextResponse.json({
    feedbackId: inserted.id,
    title,
    screenshotUrl,
    githubIssue,
    githubWarning:
      githubWarning ??
      (githubIssue ? null : "GitHub feedback integration is not configured in this environment."),
    teamsWarning:
      teamsResult.ok || teamsResult.reason === "not_configured"
        ? null
        : (teamsResult.details ?? "Teams webhook delivery failed."),
  });
});

// ---------------------------------------------------------------------------
// GET — List feedback items with optional filters
// ---------------------------------------------------------------------------

const listQuerySchema = z.object({
  status: z.string().optional(),
  requestType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiGuardrails("/api/admin/feedback#GET", async ({ request }) => {
  await requireAdminUser("/api/admin/feedback#GET");

  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { status, requestType, limit = 100, offset = 0 } = parsed.data;
  const serviceSupabase = createServiceClient();

  let query = serviceSupabase
    .from("admin_feedback_items")
    .select(
      "id, created_at, updated_at, created_by, project_id, page_url, page_path, page_title, target_id, target_selector, target_text, target_tag, dom_path, target_rect, title, comment, request_type, severity, status, screenshot_url, screenshot_path, github_issue_number, github_issue_url, github_issue_state, metadata, tool_id, agent_context",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      query = query.eq("status", statuses[0]);
    } else if (statuses.length > 1) {
      query = query.in("status", statuses);
    }
  } else {
    // Always exclude archived items unless explicitly requested
    query = query.neq("status", "archived");
  }

  if (requestType) {
    query = query.eq("request_type", requestType);
  }

  const { data, error, count } = await query;

  if (error) {
    const details = toErrorDetails(error);
    throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/feedback#GET", message: details.message });
  }

  return NextResponse.json({ items: data ?? [], total: count ?? 0 });
});

// ---------------------------------------------------------------------------
// PATCH — Update feedback item status
// ---------------------------------------------------------------------------

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "submitted", "github_failed", "in_progress", "triaged", "diagnosing", "fixing", "verifying", "in_review", "resolved", "closed", "archived"]).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const LEGACY_STATUS_FALLBACKS: Record<string, string> = {
  in_progress: "submitted",
  resolved: "closed",
};

export const PATCH = withApiGuardrails("/api/admin/feedback#PATCH", async ({ request }) => {
  await requireAdminUser("/api/admin/feedback#PATCH");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new GuardrailError({ code: "INVALID_PAYLOAD", where: "/api/admin/feedback#PATCH", message: "Request body is not valid JSON." });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, metadata, ...updates } = parsed.data;
  if (Object.keys(updates).length === 0 && !metadata) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const serviceSupabase = createServiceClient();
  const mergedUpdates: Record<string, unknown> = { ...updates };

  if (metadata) {
    const { data: existingItem, error: existingError } = await serviceSupabase
      .from("admin_feedback_items")
      .select("metadata")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/feedback#PATCH", message: existingError.message });
    }

    const currentMetadata =
      existingItem?.metadata && typeof existingItem.metadata === "object"
        ? (existingItem.metadata as Record<string, unknown>)
        : {};

    mergedUpdates.metadata = toJsonValue({ ...currentMetadata, ...metadata });
  }

  let { data, error } = await serviceSupabase
    .from("admin_feedback_items")
    .update(mergedUpdates)
    .eq("id", id)
    .select("id, status, title")
    .single();

  if (
    error &&
    updates.status &&
    toErrorDetails(error).code === "23514" &&
    LEGACY_STATUS_FALLBACKS[updates.status]
  ) {
    const fallbackStatus = LEGACY_STATUS_FALLBACKS[updates.status];
    const fallbackUpdates = { ...mergedUpdates, status: fallbackStatus };
    const fallbackResult = await serviceSupabase
      .from("admin_feedback_items")
      .update(fallbackUpdates)
      .eq("id", id)
      .select("id, status, title")
      .single();
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    const details = toErrorDetails(error);
    if (details.code === "23514") {
      return NextResponse.json({ error: "Invalid feedback status", code: details.code, details: details.message }, { status: 400 });
    }
    throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/feedback#PATCH", message: details.message });
  }

  if (data?.status === "resolved") {
    try {
      const { data: fullItem } = await serviceSupabase
        .from("admin_feedback_items")
        .select("id, title, comment, page_path, tool_id, project_id, metadata")
        .eq("id", id)
        .maybeSingle();

      if (fullItem) {
        const itemMeta =
          fullItem.metadata &&
          typeof fullItem.metadata === "object" &&
          !Array.isArray(fullItem.metadata)
            ? (fullItem.metadata as Record<string, unknown>)
            : null;
        const resolutionSummary =
          itemMeta && "resolution_summary" in itemMeta
            ? String(itemMeta.resolution_summary ?? "")
            : null;

        await ingestAdminFeedbackLearning({
          feedbackItemId: fullItem.id,
          title: fullItem.title,
          comment: fullItem.comment,
          pagePath: fullItem.page_path,
          toolId: typeof fullItem.tool_id === "number" ? fullItem.tool_id : null,
          projectId: typeof fullItem.project_id === "number" ? fullItem.project_id : null,
          status: "active",
          resolutionSummary,
        });
      }
    } catch (learningError) {
      logger.error({ msg: "[AdminFeedback] Resolved learning ingestion failed", data: learningError });
    }
  }

  return NextResponse.json({ item: data });
});

// ---------------------------------------------------------------------------
// PUT — Send existing feedback item to GitHub as an issue
// ---------------------------------------------------------------------------

const sendToGitHubSchema = z.object({
  id: z.string().uuid(),
});

export const PUT = withApiGuardrails("/api/admin/feedback#PUT", async ({ request }) => {
  await requireAdminUser("/api/admin/feedback#PUT");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new GuardrailError({ code: "INVALID_PAYLOAD", where: "/api/admin/feedback#PUT", message: "Request body is not valid JSON." });
  }
  const parsed = sendToGitHubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = parsed.data;
  const serviceSupabase = createServiceClient();

  const { data: item, error: fetchError } = await serviceSupabase
    .from("admin_feedback_items")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !item) {
    return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
  }

  if (item.github_issue_number) {
    return NextResponse.json({
      error: "Already submitted",
      details: `GitHub issue #${item.github_issue_number} already exists.`,
      github_issue_url: item.github_issue_url,
    }, { status: 400 });
  }

  let sendToolContext = null;
  const itemToolId = (item as Record<string, unknown>).tool_id;
  if (typeof itemToolId === "number") {
    const tool = await getToolById(itemToolId);
    if (tool) sendToolContext = resolveToolContext(tool);
  } else {
    const autoMatch = await matchFeedbackToTool(item.title, item.comment, item.page_path, item.page_url);
    if (autoMatch) sendToolContext = resolveToolContext(autoMatch);
  }

  const githubIssue = await createGitHubIssue({
    title: item.title,
    comment: item.comment,
    pageUrl: item.page_url,
    pagePath: item.page_path,
    pageTitle: item.page_title ?? null,
    requestType: item.request_type as Parameters<typeof createGitHubIssue>[0]["requestType"],
    severity: (item.severity ?? "medium") as Parameters<typeof createGitHubIssue>[0]["severity"],
    targetId: item.target_id ?? null,
    targetSelector: item.target_selector,
    targetTag: item.target_tag ?? null,
    targetText: item.target_text ?? null,
    domPath: item.dom_path ?? null,
    screenshotUrl: item.screenshot_url ?? null,
    projectId: item.project_id ?? null,
    metadata: (item.metadata as Record<string, unknown>) ?? {},
    toolContext: sendToolContext,
  });

  if (!githubIssue) {
    throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/feedback#PUT", message: "GitHub integration not configured. Set GITHUB_FEEDBACK_REPO_OWNER, GITHUB_FEEDBACK_REPO_NAME, and GITHUB_FEEDBACK_TOKEN." });
  }

  const { data: updated, error: updateError } = await serviceSupabase
    .from("admin_feedback_items")
    .update({
      github_issue_number: githubIssue.number,
      github_issue_url: githubIssue.url,
      github_issue_state: githubIssue.state,
      status: "submitted",
    })
    .eq("id", id)
    .select("id, status, github_issue_number, github_issue_url, github_issue_state")
    .single();

  if (updateError) {
    return NextResponse.json({
      item: { id, status: "submitted" },
      githubIssue,
      warning: "GitHub issue created but failed to update local record.",
    });
  }

  return NextResponse.json({ item: updated, githubIssue });
});

// ---------------------------------------------------------------------------
// DELETE — Delete a feedback item and its related data
// ---------------------------------------------------------------------------

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export const DELETE = withApiGuardrails("/api/admin/feedback#DELETE", async ({ request }) => {
  await requireAdminUser("/api/admin/feedback#DELETE");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new GuardrailError({ code: "INVALID_PAYLOAD", where: "/api/admin/feedback#DELETE", message: "Request body is not valid JSON." });
  }
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = parsed.data;
  const serviceSupabase = createServiceClient();

  const { data: item, error: fetchError } = await serviceSupabase
    .from("admin_feedback_items")
    .select("id, screenshot_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !item) {
    return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
  }

  const { error: commentsError } = await serviceSupabase
    .from("admin_feedback_comments")
    .delete()
    .eq("feedback_item_id", id);

  if (commentsError) {
    throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/feedback#DELETE", message: commentsError.message });
  }

  const { error: deleteError } = await serviceSupabase
    .from("admin_feedback_items")
    .delete()
    .eq("id", id);

  if (deleteError) {
    throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/admin/feedback#DELETE", message: deleteError.message });
  }

  if (item.screenshot_path) {
    await serviceSupabase.storage.from(ADMIN_FEEDBACK_BUCKET).remove([item.screenshot_path]);
  }

  return NextResponse.json({ deleted: true });
});
