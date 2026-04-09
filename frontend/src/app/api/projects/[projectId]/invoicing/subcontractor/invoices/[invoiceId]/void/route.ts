import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// POST /api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/void
// Void a subcontractor invoice. Pre-condition: must not already be paid or void.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; invoiceId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId, invoiceId } = await context.params;

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

    let reason: string | null = null;
    try {
      const body = await request.json();
      if (body && typeof body.reason === "string") {
        reason = body.reason.trim() || null;
      }
    } catch {
      // No body is fine
    }

    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);

    const { data: invoice, error: fetchError } = await supabase
      .from("subcontractor_invoices")
      .select("id, status, notes")
      .eq("id", invoiceIdNum)
      .eq("project_id", projectIdNum)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to verify invoice", details: fetchError.message },
        { status: 500 },
      );
    }

    if (invoice.status === "paid" || invoice.status === "void") {
      return NextResponse.json(
        { error: `Invoice cannot be voided from status "${invoice.status}"` },
        { status: 400 },
      );
    }

    const existingNotes: string | null = invoice.notes ?? null;
    const voidNote = reason
      ? `[Voided ${new Date().toISOString()}] ${reason}`
      : `[Voided ${new Date().toISOString()}]`;
    const mergedNotes = existingNotes ? `${existingNotes}\n${voidNote}` : voidNote;

    const { data: updated, error: updateError } = await supabase
      .from("subcontractor_invoices")
      .update({
        status: "void",
        notes: mergedNotes,
      })
      .eq("id", invoiceIdNum)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "42501") {
        return NextResponse.json(
          { error: "Permission denied" },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: "Failed to void invoice", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: updated,
      message: "Invoice voided successfully",
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
