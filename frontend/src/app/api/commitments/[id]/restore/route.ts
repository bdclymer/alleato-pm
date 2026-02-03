import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/commitments/[id]/restore
 * Restore a soft-deleted commitment from the recycle bin
 *
 * Restores a commitment that was previously soft-deleted by setting deleted_at = NULL.
 * The commitment will be restored to its previous status.
 *
 * @route POST /api/commitments/[id]/restore
 * @param id - Commitment ID
 * @returns RestoreCommitmentResponse with restored commitment data
 *
 * Error Cases:
 * - 401: Unauthorized (no user session)
 * - 404: Commitment not found
 * - 400: Commitment is not deleted (cannot restore)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First determine the type from the unified view (including deleted records)
    const { data: existing, error: fetchError } = await supabase
      .from("commitments_unified")
      .select("id, type, deleted_at, status")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "COMMITMENT_NOT_FOUND", message: "Commitment does not exist" },
        { status: 404 },
      );
    }

    // Check if the commitment is actually deleted
    if (!existing.deleted_at) {
      return NextResponse.json(
        {
          error: "NOT_DELETED",
          message: "Commitment is not deleted and cannot be restored",
        },
        { status: 400 },
      );
    }

    // Restore the commitment by setting deleted_at to null
    const tableName =
      existing.type === "subcontract" ? "subcontracts" : "purchase_orders";

    const restoredAt = new Date().toISOString();
    const { data, error } = await supabase
      .from(tableName)
      .update({
        deleted_at: null,
        updated_at: restoredAt,
      })
      .eq("id", id)
      .select("status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Return response matching API specification
    return NextResponse.json({
      success: true,
      message: "Commitment restored from recycle bin",
      data: {
        id,
        restoredAt,
        status: data?.status || existing.status || "draft",
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
