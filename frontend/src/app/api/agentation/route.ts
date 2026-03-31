import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

/**
 * Agentation webhook receiver + bidirectional status sync.
 *
 * POST — Receives annotation events from the Agentation toolbar.
 *        Each annotation becomes an initiative card on the Command Center board.
 *
 * PATCH — Syncs MCP status changes back to admin_feedback_items.
 *         Called by the agentation-watch skill when resolving/dismissing annotations.
 *
 * Uses service role client since webhooks arrive without user auth session.
 */

// ---------------------------------------------------------------------------
// POST — Create initiative cards from annotations
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Support both single annotations and batches
  const annotations = Array.isArray(body) ? body : body.annotations ?? [body];

  if (annotations.length === 0) {
    return NextResponse.json({ error: "No annotations provided" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const cards = annotations.map(
    (ann: {
      id?: string;
      comment?: string;
      intent?: string;
      severity?: string;
      element?: string;
      elementPath?: string;
      reactComponents?: string;
      sessionId?: string;
    }) => {
      // Map Agentation severity → priority
      const priorityMap: Record<string, string> = {
        blocking: "urgent",
        important: "high",
        suggestion: "medium",
      };

      // Map intent to labels
      const labelMap: Record<string, string> = {
        fix: "Bug Fix",
        change: "Enhancement",
        question: "Question",
        approve: "Approved",
      };

      const priority = priorityMap[ann.severity || ""] || "medium";
      const label = labelMap[ann.intent || ""] || "Feedback";

      // Build description with context
      const descParts = [ann.comment || "No description"];
      if (ann.element) descParts.push(`**Element:** \`${ann.element}\``);
      if (ann.reactComponents) descParts.push(`**Component:** \`${ann.reactComponents}\``);
      if (ann.elementPath) descParts.push(`**Selector:** \`${ann.elementPath}\``);

      return {
        title: ann.comment?.slice(0, 100) || "Agentation annotation",
        description: descParts.join("\n\n"),
        status: "idea" as const,
        priority,
        labels: [label, "Agentation"],
        sort_order: 0,
        source: "agentation" as const,
        external_id: ann.id || null,
      };
    },
  );

  const { data, error } = await supabase
    .from("initiative_cards")
    .insert(cards)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { created: data?.length ?? 0, cards: data },
    { status: 201 },
  );
}

// ---------------------------------------------------------------------------
// PATCH — Bidirectional status sync (MCP resolve/dismiss → admin_feedback_items)
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const {
    agentationId,
    status,
    summary,
  }: {
    agentationId?: string;
    status?: "resolved" | "dismissed" | "in_progress";
    summary?: string;
  } = body;

  if (!agentationId) {
    return NextResponse.json(
      { error: "agentationId is required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Map MCP status → admin feedback status
  const statusMap: Record<string, string> = {
    resolved: "resolved",
    dismissed: "closed",
    in_progress: "in_progress",
  };

  const feedbackStatus = status ? statusMap[status] || "in_progress" : "in_progress";

  // Find the feedback item by agentationId stored in metadata
  const { data: items, error: findError } = await supabase
    .from("admin_feedback_items")
    .select("id, status")
    .contains("metadata", { agentationId })
    .limit(1);

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    // No matching feedback item — that's fine, not all annotations go through
    // the admin feedback pipeline (non-admin users, for example)
    return NextResponse.json({ matched: false, message: "No matching feedback item found" });
  }

  const feedbackItem = items[0];

  // Update the feedback item status
  const { error: updateError } = await supabase
    .from("admin_feedback_items")
    .update({
      status: feedbackStatus,
      ...(summary ? { metadata: { agentationId, resolution_summary: summary } } : {}),
    })
    .eq("id", feedbackItem.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Also update the initiative card if one exists
  const cardStatusMap: Record<string, string> = {
    resolved: "done",
    dismissed: "archived",
    in_progress: "in_progress",
  };

  await supabase
    .from("initiative_cards")
    .update({ status: cardStatusMap[status || ""] || "in_progress" })
    .eq("external_id", agentationId);

  return NextResponse.json({
    matched: true,
    feedbackItemId: feedbackItem.id,
    newStatus: feedbackStatus,
  });
}
