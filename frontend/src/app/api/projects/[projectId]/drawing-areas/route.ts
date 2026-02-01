import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { drawingAreaSchema } from "@/types/drawings.types";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await context.params;
    
    // Fetch hierarchical drawing areas with counts
    const { data, error } = await supabase
      .from('drawing_areas_with_counts')
      .select('*')
      .eq('project_id', parseInt(projectId))
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Drawing areas GET error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await context.params;
    const body = await request.json();

    // Validate request body
    const validationResult = drawingAreaSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { name, description, parentAreaId, sortOrder } = validationResult.data;

    // Calculate next sort order if not provided
    let nextSortOrder = sortOrder;
    if (nextSortOrder === undefined) {
      const { data: existingAreas } = await supabase
        .from('drawing_areas')
        .select('sort_order')
        .eq('project_id', parseInt(projectId))
        .eq('parent_area_id', parentAreaId || null)
        .order('sort_order', { ascending: false })
        .limit(1);

      nextSortOrder = existingAreas && existingAreas.length > 0 
        ? existingAreas[0].sort_order + 1 
        : 0;
    }

    const { data, error } = await supabase
      .from('drawing_areas')
      .insert({
        project_id: parseInt(projectId),
        name,
        description: description || null,
        parent_area_id: parentAreaId || null,
        sort_order: nextSortOrder,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Drawing areas POST error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
