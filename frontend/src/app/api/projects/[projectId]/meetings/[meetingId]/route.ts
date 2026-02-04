import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: Get a single meeting
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; meetingId: string }> }
) {
  try {
    const { projectId, meetingId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("document_metadata")
      .select("*")
      .eq("id", meetingId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update a meeting
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string; meetingId: string }> }
) {
  try {
    const { projectId, meetingId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a meeting
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; meetingId: string }> }
) {
  try {
    const { projectId, meetingId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete associated meeting segments first
    await supabase
      .from("meeting_segments")
      .delete()
      .eq("metadata_id", meetingId);

    // Delete the meeting
    const { error } = await supabase
      .from("document_metadata")
      .delete()
      .eq("id", meetingId)
      .eq("project_id", parseInt(projectId, 10));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
