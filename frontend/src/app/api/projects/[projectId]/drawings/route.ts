import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { drawingFilterSchema } from "@/types/drawings.types";

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
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const filters = {
      search: searchParams.get('search'),
      discipline: searchParams.get('discipline'),
      drawingType: searchParams.get('drawingType'),
      status: searchParams.get('status'),
      areaId: searchParams.get('areaId'),
      drawingSetId: searchParams.get('drawingSetId'),
      uploadedBy: searchParams.get('uploadedBy'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
    };

    // Validate filters
    const validationResult = drawingFilterSchema.safeParse(filters);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid filters", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query using the drawing_log view
    let query = supabase
      .from('drawing_log')
      .select('*', { count: 'exact' })
      .eq('project_id', parseInt(projectId))
      .order('drawing_updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    const validFilters = validationResult.data;
    
    if (validFilters.search) {
      query = query.or(`drawing_number.ilike.%${validFilters.search}%,title.ilike.%${validFilters.search}%`);
    }

    if (validFilters.discipline) {
      query = query.eq('discipline', validFilters.discipline);
    }

    if (validFilters.drawingType) {
      query = query.eq('drawing_type', validFilters.drawingType);
    }

    if (validFilters.status) {
      query = query.eq('status', validFilters.status);
    }

    if (validFilters.areaId) {
      query = query.eq('area_id', validFilters.areaId);
    }

    if (validFilters.drawingSetId) {
      query = query.eq('drawing_set_id', validFilters.drawingSetId);
    }

    if (validFilters.uploadedBy) {
      query = query.eq('uploaded_by', validFilters.uploadedBy);
    }

    if (validFilters.dateFrom) {
      query = query.gte('received_date', validFilters.dateFrom);
    }

    if (validFilters.dateTo) {
      query = query.lte('received_date', validFilters.dateTo);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Drawings GET error:', error);
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

    // Basic validation - detailed validation happens in the upload hook
    if (!body.drawingNumber || !body.title) {
      return NextResponse.json(
        { error: "Drawing number and title are required" },
        { status: 400 }
      );
    }

    // Check for duplicate drawing number in project
    const { data: existing } = await supabase
      .from('drawings')
      .select('id')
      .eq('project_id', parseInt(projectId))
      .eq('drawing_number', body.drawingNumber)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "Drawing number already exists in this project" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('drawings')
      .insert({
        project_id: parseInt(projectId),
        area_id: body.areaId || null,
        drawing_number: body.drawingNumber,
        title: body.title,
        discipline: body.discipline || null,
        drawing_type: body.drawingType || null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('Drawings POST error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
