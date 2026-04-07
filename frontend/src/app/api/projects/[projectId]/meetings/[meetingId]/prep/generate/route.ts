import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { generateText, stepCountIs } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";
import { createProjectTools } from "@/lib/ai/tools/project-tools";
import {
  buildMeetingPrepSystemPrompt,
  buildMeetingPrepUserMessage,
} from "@/lib/ai/prompts/meeting-prep";
import { apiErrorResponse } from "@/lib/api-error";

const MODEL_ID = "anthropic/claude-sonnet-4.5";

type RouteParams = { params: Promise<{ projectId: string; meetingId: string }> };

// POST: Generate meeting prep using AI
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { projectId, meetingId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const numericProjectId = parseInt(projectId, 10);
    if (isNaN(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // 1. Fetch the meeting we're prepping for
    const { data: meeting, error: meetingError } = await serviceClient
      .from("document_metadata")
      .select("*")
      .eq("id", meetingId)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json(
        { error: "Meeting not found" },
        { status: 404 }
      );
    }

    // 2. Fetch the last completed meeting for this project
    const { data: lastMeeting } = await serviceClient
      .from("document_metadata")
      .select("*")
      .eq("project_id", numericProjectId)
      .eq("type", "meeting")
      .eq("status", "complete")
      .neq("id", meetingId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Fetch digest for last meeting (if exists)
    let lastDigest = null;
    if (lastMeeting) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: digest } = await (serviceClient as any)
        .from("meeting_digests")
        .select("*")
        .eq("metadata_id", lastMeeting.id)
        .maybeSingle() as { data: { digest_text?: string; action_items_summary?: unknown[]; decisions_summary?: unknown[] } | null; error: unknown };
      lastDigest = digest;
    }

    // 4. Build context and generate
    const startTime = Date.now();

    const systemPrompt = buildMeetingPrepSystemPrompt();
    const userMessage = buildMeetingPrepUserMessage({
      meetingTitle: meeting.title || "Untitled Meeting",
      meetingDate: meeting.date,
      meetingType: meeting.category,
      participants: meeting.participants,
      projectId: numericProjectId,
      projectName: meeting.project,
      lastMeetingTitle: lastMeeting?.title,
      lastMeetingDate: lastMeeting?.date,
      lastMeetingDigest: lastDigest?.digest_text,
      lastMeetingActionItems: lastDigest?.action_items_summary as unknown[] | undefined,
      lastMeetingDecisions: lastDigest?.decisions_summary as unknown[] | undefined,
    });

    const tools = createProjectTools(user.id);

    const result = await generateText({
      model: getLanguageModel(MODEL_ID),
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      tools,
      stopWhen: stepCountIs(7),
    });

    const generationTimeMs = Date.now() - startTime;
    const content = result.text;

    if (!content) {
      return NextResponse.json(
        { error: "AI generated empty content" },
        { status: 500 }
      );
    }

    // 5. Upsert into meeting_preps
    const { data: existing } = await serviceClient
      .from("meeting_preps")
      .select("id, version")
      .eq("meeting_id", meetingId)
      .maybeSingle();

    let data;
    let error;

    if (existing) {
      const result = await serviceClient
        .from("meeting_preps")
        .update({
          content,
          generated_by: "ai",
          model_used: MODEL_ID,
          generation_time_ms: generationTimeMs,
          version: existing.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("meeting_id", meetingId)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await serviceClient
        .from("meeting_preps")
        .insert({
          meeting_id: meetingId,
          project_id: numericProjectId,
          content,
          generated_by: "ai",
          model_used: MODEL_ID,
          generation_time_ms: generationTimeMs,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("Meeting prep generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate meeting prep" },
      { status: 500 }
    );
  }
}
