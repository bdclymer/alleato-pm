import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

// GET: Get a single meeting
export const GET = withApiGuardrails<{ projectId: string; meetingId: string }>(
  "projects/[projectId]/meetings/[meetingId]#GET",
  async ({ request, params }) => {
  
    const { projectId, meetingId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/meetings/[meetingId]#GET", message: "Authentication required." });
    }

    const { data, error } = await supabase
      .from("document_metadata")
      .select("*")
      .eq("id", meetingId)
      .eq("project_id", parseInt(projectId, 10))
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
      }
      return apiErrorResponse(error);
    }

    return NextResponse.json({ data });
    },
);

// PUT: Update a meeting
export const PUT = withApiGuardrails<{ projectId: string; meetingId: string }>(
  "projects/[projectId]/meetings/[meetingId]#PUT",
  async ({ request, params }) => {
  
    const { projectId, meetingId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/meetings/[meetingId]#PUT", message: "Authentication required." });
    }

    const body = await request.json();
    const { title, date, duration_minutes, participants, category, description, summary, access_level, status } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (date !== undefined) updateData.date = date;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
    if (participants !== undefined) updateData.participants = participants;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (summary !== undefined) updateData.summary = summary;
    if (access_level !== undefined) updateData.access_level = access_level;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from("document_metadata")
      .update(updateData)
      .eq("id", meetingId)
      .eq("project_id", parseInt(projectId, 10))
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
      }
      return apiErrorResponse(error);
    }

    return NextResponse.json({ data });
    },
);

// DELETE: Delete a meeting
export const DELETE = withApiGuardrails<{ projectId: string; meetingId: string }>(
  "projects/[projectId]/meetings/[meetingId]#DELETE",
  async ({ request, params }) => {
  
    const { projectId, meetingId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/meetings/[meetingId]#DELETE", message: "Authentication required." });
    }

    const { data, error } = await supabase
      .from("document_metadata")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", meetingId)
      .eq("project_id", parseInt(projectId, 10))
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
      }
      return apiErrorResponse(error);
    }

    return NextResponse.json({ success: true, data });
    },
);
