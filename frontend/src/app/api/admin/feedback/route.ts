import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_FEEDBACK_BUCKET,
  ADMIN_FEEDBACK_REQUEST_TYPES,
  ADMIN_FEEDBACK_SEVERITIES,
} from "@/lib/admin-feedback/constants";
import { createGitHubIssue } from "@/lib/admin-feedback/github";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

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

function jsonError(status: number, payload: ApiErrorPayload) {
  return NextResponse.json(payload, { status });
}

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

function buildTitle(
  providedTitle: string | undefined,
  requestType: (typeof ADMIN_FEEDBACK_REQUEST_TYPES)[number],
  targetText: string | null | undefined,
  pageTitle: string | null | undefined,
) {
  if (providedTitle?.trim()) {
    return providedTitle.trim();
  }

  const typeLabel =
    requestType === "change_request"
      ? "Change request"
      : requestType.charAt(0).toUpperCase() + requestType.slice(1);
  const targetLabel = targetText?.trim() || pageTitle?.trim() || "page element";

  return `${typeLabel}: ${targetLabel.slice(0, 120)}`;
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
  const matches = dataUrl.match(/^data:(image\/png|image\/jpeg|image\/webp);base64,(.+)$/);
  if (!matches) {
    throw new Error("Screenshot must be a PNG, JPEG, or WEBP data URL");
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

async function requireAdminUser() {
  const requestUser = await getApiRouteUser();
  if (!requestUser) {
    return null;
  }

  const serviceSupabase = createServiceClient();
  const { data: profile, error } = await serviceSupabase
    .from("user_profiles")
    .select("id, is_admin")
    .eq("id", requestUser.id)
    .maybeSingle();

  if (error || !profile?.is_admin) {
    return null;
  }

  return requestUser;
}

export async function POST(request: Request) {
  try {
    const requestUser = await requireAdminUser();
    if (!requestUser) {
      return jsonError(403, {
        error: "Admin access required",
        hint: "Only admin users can submit production feedback.",
      });
    }

    const rawBody = await request.json();
    const parsed = feedbackPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid feedback payload",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const metadata = toJsonValue(payload.metadata ?? {});
    let screenshotPath: string | null = null;
    let screenshotUrl: string | null = null;

    if (payload.screenshotDataUrl) {
      try {
        const uploaded = await uploadScreenshot(
          requestUser.id,
          payload.screenshotDataUrl,
        );
        screenshotPath = uploaded.screenshotPath;
        screenshotUrl = uploaded.screenshotUrl;
      } catch (error) {
        const details = toErrorDetails(error);
        return jsonError(500, {
          error: "Failed to store feedback screenshot",
          details: details.message,
        });
      }
    }

    const title = buildTitle(
      payload.title,
      payload.requestType,
      payload.target.text,
      payload.pageTitle,
    );

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
    };

    const serviceSupabase = createServiceClient();
    const { data: inserted, error: insertError } = await serviceSupabase
      .from("admin_feedback_items")
      .insert(insertPayload)
      .select(
        "id, title, status, github_issue_number, github_issue_url, github_issue_state",
      )
      .single();

    if (insertError) {
      const details = toErrorDetails(insertError);
      return jsonError(500, {
        error: "Failed to save feedback",
        code: details.code,
        hint: "Apply the admin feedback migration before using this endpoint.",
        details: details.message,
      });
    }

    let githubIssue:
      | {
          number: number;
          url: string;
          state: string;
        }
      | null = null;
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
      });
    } catch (error) {
      githubWarning =
        error instanceof Error
          ? error.message
          : "GitHub issue creation failed";
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
        .update({
          status: "github_failed",
        })
        .eq("id", inserted.id);
    }

    return NextResponse.json({
      feedbackId: inserted.id,
      title,
      screenshotUrl,
      githubIssue,
      githubWarning:
        githubWarning ??
        (githubIssue
          ? null
          : "GitHub feedback integration is not configured in this environment."),
    });
  } catch (error) {
    console.error("[AdminFeedback] Submission failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to submit feedback";

    return jsonError(500, {
      error: "Feedback submission failed",
      details: message,
    });
  }
}

// ---------------------------------------------------------------------------
// GET — List feedback items with optional filters
// ---------------------------------------------------------------------------

const listQuerySchema = z.object({
  status: z.string().optional(),
  requestType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(request: Request) {
  try {
    const requestUser = await requireAdminUser();
    if (!requestUser) {
      return jsonError(403, {
        error: "Admin access required",
        hint: "Only admin users can view production feedback.",
      });
    }

    const url = new URL(request.url);
    const parsed = listQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );
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
        "id, created_at, updated_at, created_by, project_id, page_url, page_path, page_title, target_id, target_selector, target_text, target_tag, dom_path, target_rect, title, comment, request_type, severity, status, screenshot_url, screenshot_path, github_issue_number, github_issue_url, github_issue_state, metadata",
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
    }

    if (requestType) {
      query = query.eq("request_type", requestType);
    }

    const { data, error, count } = await query;

    if (error) {
      const details = toErrorDetails(error);
      return jsonError(500, {
        error: "Failed to fetch feedback items",
        code: details.code,
        details: details.message,
      });
    }

    return NextResponse.json({ items: data ?? [], total: count ?? 0 });
  } catch (error) {
    console.error("[AdminFeedback] List failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to list feedback";
    return jsonError(500, { error: "Failed to list feedback", details: message });
  }
}

// ---------------------------------------------------------------------------
// PATCH — Update feedback item status
// ---------------------------------------------------------------------------

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "submitted", "github_failed", "closed"]).optional(),
  title: z.string().trim().min(1).max(200).optional(),
});

export async function PATCH(request: Request) {
  try {
    const requestUser = await requireAdminUser();
    if (!requestUser) {
      return jsonError(403, {
        error: "Admin access required",
        hint: "Only admin users can update feedback.",
      });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id, ...updates } = parsed.data;
    if (Object.keys(updates).length === 0) {
      return jsonError(400, { error: "No fields to update" });
    }

    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase
      .from("admin_feedback_items")
      .update(updates)
      .eq("id", id)
      .select("id, status, title")
      .single();

    if (error) {
      const details = toErrorDetails(error);
      return jsonError(500, {
        error: "Failed to update feedback item",
        code: details.code,
        details: details.message,
      });
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error("[AdminFeedback] Patch failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to update feedback";
    return jsonError(500, { error: "Failed to update feedback", details: message });
  }
}

// ---------------------------------------------------------------------------
// PUT — Send existing feedback item to GitHub as an issue
// ---------------------------------------------------------------------------

const sendToGitHubSchema = z.object({
  id: z.string().uuid(),
});

export async function PUT(request: Request) {
  try {
    const requestUser = await requireAdminUser();
    if (!requestUser) {
      return jsonError(403, {
        error: "Admin access required",
        hint: "Only admin users can send feedback to GitHub.",
      });
    }

    const body = await request.json();
    const parsed = sendToGitHubSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id } = parsed.data;
    const serviceSupabase = createServiceClient();

    // Fetch the full feedback item
    const { data: item, error: fetchError } = await serviceSupabase
      .from("admin_feedback_items")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !item) {
      return jsonError(404, { error: "Feedback item not found" });
    }

    if (item.github_issue_number) {
      return jsonError(400, {
        error: "Already submitted",
        details: `GitHub issue #${item.github_issue_number} already exists.`,
        github_issue_url: item.github_issue_url,
      });
    }

    // Create GitHub issue
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
    });

    if (!githubIssue) {
      return jsonError(500, {
        error: "GitHub integration not configured",
        hint: "Set GITHUB_FEEDBACK_REPO_OWNER, GITHUB_FEEDBACK_REPO_NAME, and GITHUB_FEEDBACK_TOKEN environment variables.",
      });
    }

    // Update the feedback item with GitHub issue info
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
      // Issue was created but DB update failed — still return the issue info
      return NextResponse.json({
        item: { id, status: "submitted" },
        githubIssue,
        warning: "GitHub issue created but failed to update local record.",
      });
    }

    return NextResponse.json({ item: updated, githubIssue });
  } catch (error) {
    console.error("[AdminFeedback] Send to GitHub failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to create GitHub issue";
    return jsonError(500, { error: "Failed to send to GitHub", details: message });
  }
}
