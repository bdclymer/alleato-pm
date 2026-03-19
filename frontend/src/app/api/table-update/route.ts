import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { table, id, data } = body;

    if (!table || !id || !data) {
      return NextResponse.json(
        { error: "Missing required fields: table, id, or data" },
        { status: 400 },
      );
    }

    // Remove fields that shouldn't be updated
    const { id: _, created_at, updated_at, ...updateData } = data;

    if ((table === "prime_contract_change_orders" || table === "contract_change_orders") && updateData.status) {
      const { data: existing, error: fetchError } = await supabase
        .from(table)
        .select("status, submitted_at, approved_at")
        .eq("id", id)
        .single();

      if (fetchError) {
        return NextResponse.json(
          {
            error: "Failed to fetch record for update",
            details: fetchError.message,
          },
          { status: 500 },
        );
      }

      const now = new Date().toISOString();
      const nextStatus = updateData.status as string;

      if (nextStatus === "pending" && !existing?.submitted_at) {
        updateData.submitted_at = now;
      }

      if (nextStatus === "approved" && !existing?.approved_at) {
        updateData.approved_at = now;
      }

      if (nextStatus === "approved" && !existing?.submitted_at) {
        updateData.submitted_at = now;
      }
    }

    // Update the record
    const { data: updatedRecord, error } = await supabase
      .from(table)
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update record", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
