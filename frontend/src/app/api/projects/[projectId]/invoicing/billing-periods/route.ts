import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// GET /api/projects/[projectId]/invoicing/billing-periods
// List billing periods for a project, ordered by start_date DESC
// Optional query param: is_closed=true|false
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId } = await context.params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: "Authentication failed", details: authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const projectIdNum = parseInt(projectId, 10);
    const { searchParams } = new URL(request.url);
    const isClosedParam = searchParams.get("is_closed");

    let query = supabase
      .from("billing_periods")
      .select("*")
      .eq("project_id", projectIdNum)
      .order("start_date", { ascending: false });

    if (isClosedParam === "true") {
      query = query.eq("is_closed", true);
    } else if (isClosedParam === "false") {
      query = query.eq("is_closed", false);
    }

    const { data: periods, error: periodsError } = await query;

    if (periodsError) {
      return NextResponse.json(
        { error: "Failed to fetch billing periods", details: periodsError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: periods ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// POST /api/projects/[projectId]/invoicing/billing-periods
// Create a new billing period for a project
// Required: start_date, end_date
// Optional: name, due_date
// Auto-assigns period_number as max(existing) + 1
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId } = await context.params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: "Authentication failed", details: authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const projectIdNum = parseInt(projectId, 10);
    const body = await request.json();
    const { start_date, end_date, name, due_date } = body;

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 },
      );
    }

    // Verify the project exists
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectIdNum)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    // Auto-assign period_number as max existing + 1
    const { data: maxRow } = await supabase
      .from("billing_periods")
      .select("period_number")
      .eq("project_id", projectIdNum)
      .order("period_number", { ascending: false })
      .limit(1)
      .single();

    const nextPeriodNumber = (maxRow?.period_number ?? 0) + 1;

    const { data: period, error: insertError } = await supabase
      .from("billing_periods")
      .insert({
        project_id: projectIdNum,
        start_date,
        end_date,
        name: name ?? null,
        due_date: due_date ?? null,
        period_number: nextPeriodNumber,
        is_closed: false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create billing period", details: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: period }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
