import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

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
      .from("meeting_digests")
      .select("*")
      .eq("metadata_id", meetingId)
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

    return NextResponse.json({ data });
    },
);
