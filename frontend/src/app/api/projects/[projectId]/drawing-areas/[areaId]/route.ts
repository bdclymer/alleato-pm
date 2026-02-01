import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { drawingAreaSchema } from "@/types/drawings.types";

interface RouteContext {
  params: Promise<{ projectId: string; areaId: string }>;
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

    const { areaId } = await context.params;
    
    const { data, error } = await supabase
      .from('drawing_areas')
      .select('*')
      .eq('id', areaId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Area not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Drawing area GET error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { areaId } = await context.params;
    const body = await request.json();

    // Validate request body (partial update allowed)
    const partialSchema = drawingAreaSchema.partial();
    const validationResult = partialSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (validationResult.data.name !== undefined) {
      updateData.name = validationResult.data.name;
    }
    if (validationResult.data.description !== undefined) {
      updateData.description = validationResult.data.description || null;
    }
    if (validationResult.data.parentAreaId !== undefined) {
      updateData.parent_area_id = validationResult.data.parentAreaId || null;
    }
    if (validationResult.data.sortOrder !== undefined) {
      updateData.sort_order = validationResult.data.sortOrder;
    }

    const { data, error } = await supabase
      .from('drawing_areas')
      .update(updateData)
      .eq('id', areaId)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Area not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Drawing area PUT error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { areaId } = await context.params;

    // Check if area has children or drawings
    const [childrenResult, drawingsResult] = await Promise.all([
      supabase.from('drawing_areas').select('id').eq('parent_area_id', areaId).limit(1),
      supabase.from('drawings').select('id').eq('area_id', areaId).limit(1)
    ]);

    if (childrenResult.error || drawingsResult.error) {
      return NextResponse.json(
        { error: "Failed to check area dependencies" },
        { status: 500 }
      );
    }

    if (childrenResult.data && childrenResult.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete area that contains sub-areas" },
        { status: 409 }
      );
    }

    if (drawingsResult.data && drawingsResult.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete area that contains drawings" },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('drawing_areas')
      .delete()
      .eq('id', areaId);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Area not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Drawing area DELETE error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
