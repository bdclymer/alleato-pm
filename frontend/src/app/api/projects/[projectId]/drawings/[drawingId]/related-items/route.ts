import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_RELATED_TYPES = ["rfi", "submittal", "change_order", "observation", "punch_item", "task"] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; drawingId: string }> }
) {
  const { projectId, drawingId } = await params;
  const projectIdNum = Number(projectId);
  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("drawing_related_items")
    .select("*")
    .eq("drawing_id", drawingId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; drawingId: string }> }
) {
  const { projectId, drawingId } = await params;
  const projectIdNum = Number(projectId);
  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { related_id: string; related_type: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { related_id, related_type } = body;
  if (!related_id || !related_type) {
    return NextResponse.json({ error: "related_id and related_type are required" }, { status: 400 });
  }
  if (!VALID_RELATED_TYPES.includes(related_type as typeof VALID_RELATED_TYPES[number])) {
    return NextResponse.json(
      { error: `related_type must be one of: ${VALID_RELATED_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Verify drawing belongs to project
  const { data: drawing, error: drawingError } = await supabase
    .from("drawings")
    .select("id")
    .eq("id", drawingId)
    .eq("project_id", projectIdNum)
    .single();

  if (drawingError || !drawing) {
    return NextResponse.json({ error: "Drawing not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("drawing_related_items")
    .insert({
      drawing_id: drawingId,
      related_id,
      related_type,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "This item is already linked to this drawing" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data }, { status: 201 });
}
