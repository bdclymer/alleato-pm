import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

// GET: List meetings for a project
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/meetings#GET",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/meetings#GET", message: "Authentication required." });
    }

    const numericProjectId = parseInt(projectId, 10);
    if (isNaN(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = supabase
      .from("document_metadata")
      .select("*")
      .eq("project_id", numericProjectId)
      .eq("type", "meeting")
      .order("date", { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%,participants.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ data: data || [] });
    },
);

// POST: Create a new meeting
export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/meetings#POST",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/meetings#POST", message: "Authentication required." });
    }

    const numericProjectId = parseInt(projectId, 10);
    if (isNaN(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const body = await request.json();
    const { title, date, duration_minutes, participants, category, description, access_level, status } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Get project name for the `project` column
    const { data: projectData } = await supabase
      .from("projects")
      .select("name")
      .eq("id", numericProjectId)
      .single();

    const newMeeting = {
      id: crypto.randomUUID(),
      title,
      date: date || null,
      duration_minutes: duration_minutes || null,
      participants: participants || null,
      category: category || null,
      description: description || null,
      content: description || null,
      access_level: access_level || "private",
      status: status || "complete",
      type: "meeting",
      project_id: numericProjectId,
      project: projectData?.name || null,
      source: "manual",
    };

    const { data, error } = await supabase
      .from("document_metadata")
      .insert(newMeeting)
      .select()
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ data }, { status: 201 });
    },
);
