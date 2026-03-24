import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

/**
 * Agentation webhook receiver.
 * The Agentation toolbar POSTs annotation events here.
 * Each annotation becomes an initiative card on the Command Center board.
 *
 * Uses service role client since webhooks arrive without user auth session.
 */
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
