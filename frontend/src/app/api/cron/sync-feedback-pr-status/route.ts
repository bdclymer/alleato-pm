/**
 * POST /api/cron/sync-feedback-pr-status
 *
 * Polls GitHub for pull requests linked to open feedback-inbox items (via
 * their `github_issue_number`) and keeps status in sync without needing a
 * live GitHub webhook:
 *   - A linked PR is open           → status = 'pr_created'
 *   - A linked PR is merged         → status = 'resolved'
 *
 * Secured via CRON_SECRET env var (set in Vercel).
 * Vercel cron schedule: every 15 minutes.
 */

import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { logEvent } from "@/lib/guardrails/observability";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import { findLinkedPullRequests } from "@/lib/admin-feedback/github";

export const maxDuration = 60;

const TERMINAL_STATUSES = ["resolved", "closed", "archived"];

export const POST = withApiGuardrails(
  "/api/cron/sync-feedback-pr-status#POST",
  async ({ request, requestId }) => {
    const cronSecret = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "/api/cron/sync-feedback-pr-status#POST",
        message: "Unauthorized cron invocation.",
        status: 401,
        severity: "medium",
      });
    }

    const supabase = createServiceClient();
    const { data: items, error } = await supabase
      .from("admin_feedback_items")
      .select("id, status, github_issue_number, metadata")
      .not("github_issue_number", "is", null)
      .not("status", "in", `(${TERMINAL_STATUSES.join(",")})`);

    if (error) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "/api/cron/sync-feedback-pr-status#POST",
        message: "Failed to load feedback items for PR status sync.",
        details: { reason: error.message },
        cause: error,
      });
    }

    let checked = 0;
    let prCreated = 0;
    let resolved = 0;
    let failed = 0;

    for (const item of items ?? []) {
      if (!item.github_issue_number) continue;
      checked++;

      try {
        const linkedPulls = await findLinkedPullRequests(item.github_issue_number);
        if (!linkedPulls || linkedPulls.length === 0) continue;

        const mergedPull = linkedPulls.find((pr) => pr.merged);
        const openPull = linkedPulls.find((pr) => pr.state === "open");
        const targetPull = mergedPull ?? openPull;
        if (!targetPull) continue;

        const nextStatus = mergedPull ? "resolved" : "pr_created";
        if (item.status === nextStatus) continue;

        const existingMetadata =
          item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
            ? (item.metadata as Record<string, unknown>)
            : {};

        const { error: updateError } = await supabase
          .from("admin_feedback_items")
          .update({
            status: nextStatus,
            metadata: {
              ...existingMetadata,
              linkedPrNumber: targetPull.number,
              linkedPrUrl: targetPull.url,
            },
          })
          .eq("id", item.id);

        if (updateError) {
          failed++;
          logger.error({
            msg: "[cron/sync-feedback-pr-status] status update failed",
            data: { id: item.id, error: updateError.message },
          });
          continue;
        }

        if (nextStatus === "resolved") resolved++;
        else prCreated++;
      } catch (err) {
        failed++;
        logger.error({
          msg: "[cron/sync-feedback-pr-status] PR lookup failed",
          data: { id: item.id, error: err instanceof Error ? err.message : String(err) },
        });
      }
    }

    logEvent({
      event: "background_job_completed",
      requestId,
      where: "/api/cron/sync-feedback-pr-status#POST",
      details: { checked, prCreated, resolved, failed },
    });

    return NextResponse.json({ success: true, checked, prCreated, resolved, failed });
  },
);
