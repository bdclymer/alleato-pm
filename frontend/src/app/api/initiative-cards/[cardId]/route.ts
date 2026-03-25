import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("initiative_cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await params;
  const supabase = await createClient();
  const body = await req.json();

  // Only allow updating known fields
  const allowedFields = [
    "title",
    "description",
    "status",
    "priority",
    "labels",
    "sort_order",
    "linked_record_type",
    "linked_record_id",
    "assignee",
    "assignee_id",
    "due_date",
    "github_issue_url",
    "dispatch_status",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  const { data, error } = await supabase
    .from("initiative_cards")
    .update(updates)
    .eq("id", cardId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("initiative_cards")
    .delete()
    .eq("id", cardId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
