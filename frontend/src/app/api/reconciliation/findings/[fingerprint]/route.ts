/**
 * PATCH /api/reconciliation/findings/[fingerprint]
 * Update a finding's triage state. Body: { reviewStatus: "open"|"reviewed"|"resolved" }.
 */

import { NextResponse } from "next/server";

import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["open", "reviewed", "resolved"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ fingerprint: string }> },
) {
  try {
    const { fingerprint } = await params;
    const body = (await request.json()) as { reviewStatus?: string };
    const reviewStatus = body.reviewStatus;
    if (!reviewStatus || !ALLOWED.has(reviewStatus)) {
      return NextResponse.json({ error: "Invalid reviewStatus" }, { status: 400 });
    }

    const user = await getApiRouteUser();
    const reviewer = user?.email ?? user?.id ?? null;

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("reconciliation_findings")
      .update({
        review_status: reviewStatus,
        reviewed_by: reviewStatus === "open" ? null : reviewer,
        reviewed_at: reviewStatus === "open" ? null : new Date().toISOString(),
      })
      .eq("fingerprint", decodeURIComponent(fingerprint));
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    logger.error({ msg: "reconciliation finding patch failed", error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
