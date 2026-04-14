import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

/** Adapts the live meeting_preps table into the legacy digest response shape. */
function toDigestResponse(prep: {
  id: string;
  meeting_id: string;
  project_id: number | null;
  content: string;
  model_used: string | null;
  generation_time_ms: number | null;
  created_at: string | null;
}) {
  return {
    id: prep.id,
    metadata_id: prep.meeting_id,
    project_id: prep.project_id,
    digest_text: prep.content,
    digest_html: null,
    decisions_summary: [],
    action_items_summary: [],
    risks_summary: [],
    opportunities_summary: [],
    follow_ups: [],
    key_takeaways: prep.content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3),
    model_used: prep.model_used ?? "unknown",
    generation_time_seconds:
      prep.generation_time_ms != null
        ? Math.round(prep.generation_time_ms / 1000)
        : null,
    created_at: prep.created_at ?? new Date().toISOString(),
  };
}

// GET: Get the post-meeting digest for a specific meeting
export const GET = withApiGuardrails<{ projectId: string; meetingId: string }>(
  "projects/[projectId]/meetings/[meetingId]/digest#GET",
  async ({ request, params }) => {
  
    const { meetingId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/meetings/[meetingId]/digest#GET", message: "Authentication required." });
    }

    const { data, error } = await supabase
      .from("meeting_preps")
      .select("*")
      .eq("meeting_id", meetingId)
      .maybeSingle();

    if (error) {
      return apiErrorResponse(error);
    }

    if (!data) {
      return NextResponse.json(
        { error: "Digest not yet generated" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: toDigestResponse(data) });
    },
);
