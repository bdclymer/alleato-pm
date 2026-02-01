import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { drawingRevisionSchema } from "@/types/drawings.types";

interface RouteContext {
  params: Promise<{ projectId: string; drawingId: string }>;
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

    const { drawingId } = await context.params;
    
    const { data, error } = await supabase
      .from('drawing_revisions')
      .select(`
        *,
        drawing_set:drawing_sets(id, name),
        uploader:auth.users(id, email)
      `)
      .eq('drawing_id', drawingId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('Drawing revisions GET error:', error);
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

    const { drawingId } = await context.params;
    const body = await request.json();

    // Validate request body
    const validationResult = drawingRevisionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { revisionNumber, drawingDate, receivedDate, status, description, drawingSetId } = validationResult.data;

    // Check if revision number already exists for this drawing
    const { data: existing } = await supabase
      .from('drawing_revisions')
      .select('id')
      .eq('drawing_id', drawingId)
      .eq('revision_number', revisionNumber)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "Revision number already exists for this drawing" },
        { status: 409 }
      );
    }

    // Note: This endpoint is for creating revision records only
    // File uploads are handled by the upload hook and separate endpoints
    const { data, error } = await supabase
      .from('drawing_revisions')
      .insert({
        drawing_id: drawingId,
        revision_number: revisionNumber,
        drawing_date: drawingDate || null,
        received_date: receivedDate,
        status: status,
        drawing_set_id: drawingSetId || null,
        description: description || null,
        uploaded_by: user.id,
        // File fields would be set during actual upload
        file_url: '',
        file_name: '',
        file_size: 0,
        file_type: '',
        is_current_revision: false,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('Drawing revisions POST error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
