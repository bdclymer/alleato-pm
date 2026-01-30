import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export interface VerticalMarkupItem {
  id: number;
  projectId: string;
  markup_type: string;
  percentage: number;
  compound: boolean;
  calculation_order: number;
  project_id: number;
  created_at?: string;
  updated_at?: string;
}

// GET /api/projects/[id]/vertical-markup - Fetch vertical markup settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("vertical_markup")
      .select("*")
      .eq("project_id", projectIdNum)
      .order("calculation_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch vertical markup settings" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      markups: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/projects/[id]/vertical-markup - Create a new vertical markup
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { markup_type, percentage, compound = false } = body;

    if (!markup_type || percentage === undefined) {
      return NextResponse.json(
        { error: "markup_type and percentage are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the next calculation order
    const { data: existingMarkups } = await supabase
      .from("vertical_markup")
      .select("calculation_order")
      .eq("project_id", projectIdNum)
      .order("calculation_order", { ascending: false })
      .limit(1);

    const nextOrder =
      existingMarkups && existingMarkups.length > 0
        ? existingMarkups[0].calculation_order + 1
        : 1;

    const { data, error } = await supabase
      .from("vertical_markup")
      .insert({
        project_id: projectIdNum,
        markup_type,
        percentage,
        compound,
        calculation_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create vertical markup" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/projects/[id]/vertical-markup - Update vertical markup (bulk update for reordering)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { markups } = body;

    if (!markups || !Array.isArray(markups)) {
      return NextResponse.json(
        { error: "markups array is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update each markup in order
    const updates = markups.map((markup: VerticalMarkupItem, index: number) =>
      supabase
        .from("vertical_markup")
        .update({
          markup_type: markup.markup_type,
          percentage: markup.percentage,
          compound: markup.compound,
          calculation_order: index + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", markup.id)
        .eq("project_id", projectIdNum),
    );

    await Promise.all(updates);

    // Fetch updated markups
    const { data, error } = await supabase
      .from("vertical_markup")
      .select("*")
      .eq("project_id", projectIdNum)
      .order("calculation_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to update vertical markups" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      markups: data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/projects/[id]/vertical-markup - Delete a vertical markup
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const markupId = searchParams.get("markupId");

    if (!markupId) {
      return NextResponse.json(
        { error: "markupId is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("vertical_markup")
      .delete()
      .eq("id", markupId)
      .eq("project_id", projectIdNum);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete vertical markup" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Vertical markup deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
