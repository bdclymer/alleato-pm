import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("initiative_cards")
    .select("*")
    .order("status")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();

  const status = body.status || "idea";

  // Get max sort_order for the target status column
  const { data: maxRow } = await supabase
    .from("initiative_cards")
    .select("sort_order")
    .eq("status", status)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("initiative_cards")
    .insert({
      title: body.title,
      description: body.description || null,
      status,
      priority: body.priority || "medium",
      labels: body.labels || [],
      sort_order: nextOrder,
      linked_record_type: body.linked_record_type || null,
      linked_record_id: body.linked_record_id || null,
      source: body.source || "manual",
      external_id: body.external_id || null,
      github_issue_url: body.github_issue_url || null,
      assignee: body.assignee || null,
      assignee_id: body.assignee_id || null,
      due_date: body.due_date || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();

  // Bulk reorder: expects { cards: [{ id, status, sort_order }] }
  if (body.cards && Array.isArray(body.cards)) {
    const updates = body.cards.map(
      (card: { id: string; status: string; sort_order: number }) =>
        supabase
          .from("initiative_cards")
          .update({ status: card.status, sort_order: card.sort_order })
          .eq("id", card.id),
    );

    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      return NextResponse.json({ error: failed.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
