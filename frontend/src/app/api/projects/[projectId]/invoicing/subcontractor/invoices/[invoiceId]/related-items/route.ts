import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// GET → list related items for this invoice
// POST → link a related item  { related_type, related_id, description? }
// DELETE ?id=123 → unlink
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  try {
    const supabase = await createClient();
    const { invoiceId } = await context.params;
    const invoiceIdNum = parseInt(invoiceId, 10);

    const { data, error } = await supabase
      .from("subcontractor_invoice_related_items")
      .select("*")
      .eq("invoice_id", invoiceIdNum)
      .order("linked_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch related items", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  try {
    const supabase = await createClient();
    const { invoiceId } = await context.params;
    const invoiceIdNum = parseInt(invoiceId, 10);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { related_type, related_id, description } = body ?? {};
    if (!related_type || !related_id) {
      return NextResponse.json(
        { error: "related_type and related_id required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("subcontractor_invoice_related_items")
      .insert({
        invoice_id: invoiceIdNum,
        related_type,
        related_id: String(related_id),
        description: description ?? null,
        linked_by_user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to link item", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  try {
    const supabase = await createClient();
    const { invoiceId } = await context.params;
    const invoiceIdNum = parseInt(invoiceId, 10);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id query param required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("subcontractor_invoice_related_items")
      .delete()
      .eq("id", Number(id))
      .eq("invoice_id", invoiceIdNum);

    if (error) {
      return NextResponse.json(
        { error: "Failed to unlink item", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Unlinked" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
