import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

// GET: Get the post-meeting digest for a specific meeting
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    return apiErrorResponse(error);
  }
}
