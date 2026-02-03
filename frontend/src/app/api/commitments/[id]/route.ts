import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { commitmentSchema } from "@/lib/schemas/financial-schemas";
import type { ZodError } from "@/app/api/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Determine type from unified view
    const { data: unifiedData, error: unifiedError } = await supabase
      .from("commitments_unified")
      .select("commitment_type")
      .eq("id", id)
      .single();

    if (unifiedError || !unifiedData) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 },
      );
    }

    const isSubcontract = unifiedData.commitment_type === "subcontract";
    const tableName = isSubcontract ? "subcontracts" : "purchase_orders";
    const sovTableName = isSubcontract
      ? "subcontract_sov_items"
      : "purchase_order_sov_items";
    const sovFkColumn = isSubcontract
      ? "subcontract_id"
      : "purchase_order_id";
    const totalsViewName = isSubcontract
      ? "subcontracts_with_totals"
      : "purchase_orders_with_totals";

    // Fetch base record with company join
    const { data, error } = await supabase
      .from(tableName)
      .select(
        `
        *,
        contract_company:companies!contract_company_id(*)
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Commitment not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Fetch financial totals from _with_totals view
    const { data: totalsData } = await (supabase as any)
      .from(totalsViewName)
      .select(
        "total_sov_amount, total_billed_to_date, total_amount_remaining, sov_line_count",
      )
      .eq("id", id)
      .single();

    // Fetch SOV line items
    const { data: sovItems } = await (supabase as any)
      .from(sovTableName)
      .select("*")
      .eq(sovFkColumn, id)
      .order("line_number", { ascending: true });

    // Fetch change order totals by status
    const { data: changeOrders } = await supabase
      .from("contract_change_orders")
      .select("status, amount")
      .eq("contract_id", id);

    // Calculate change order totals by status
    const changeOrderTotals = {
      approved: 0,
      pending: 0,
      draft: 0,
      executed: 0,
      void: 0,
      total: 0,
    };

    if (changeOrders && changeOrders.length > 0) {
      for (const co of changeOrders) {
        const amount = Number(co.amount) || 0;
        const status = (co.status || "draft").toLowerCase();
        changeOrderTotals.total += amount;

        if (status === "approved" || status === "executed") {
          changeOrderTotals.approved += amount;
        } else if (status === "pending") {
          changeOrderTotals.pending += amount;
        } else if (status === "draft") {
          changeOrderTotals.draft += amount;
        } else if (status === "void") {
          changeOrderTotals.void += amount;
        }
      }
    }

    const originalAmount = Number(totalsData?.total_sov_amount) || 0;
    const billedToDate = Number(totalsData?.total_billed_to_date) || 0;
    // Revised amount = original + approved change orders
    const revisedAmount = originalAmount + changeOrderTotals.approved;
    const balanceToFinish = revisedAmount - billedToDate;

    const responseData = {
      ...data,
      type: unifiedData.commitment_type,
      original_amount: originalAmount,
      approved_change_orders: changeOrderTotals.approved,
      pending_change_orders: changeOrderTotals.pending,
      draft_change_orders: changeOrderTotals.draft,
      revised_contract_amount: revisedAmount,
      billed_to_date: billedToDate,
      balance_to_finish: balanceToFinish,
      sov_line_count: Number(totalsData?.sov_line_count) || 0,
      line_items: sovItems || [],
      change_order_totals: changeOrderTotals,
    };

    return NextResponse.json({ data: responseData });
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validatedData = commitmentSchema.parse(body);

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine the commitment type from the unified view
    const { data: unifiedData, error: unifiedError } = await supabase
      .from("commitments_unified")
      .select("commitment_type")
      .eq("id", id)
      .single();

    if (unifiedError || !unifiedData) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 },
      );
    }

    // Query the appropriate table based on type
    const tableName =
      unifiedData.commitment_type === "subcontract"
        ? "subcontracts"
        : "purchase_orders";

    // Update commitment
    const { data, error } = await supabase
      .from(tableName)
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        contract_company:companies!contract_company_id(*),
        assignee:users!assignee_id(*)
      `,
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as ZodError;
      return NextResponse.json(
        { error: "Validation error", issues: zodError.errors },
        { status: 400 },
      );
    }

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

/**
 * DELETE /api/commitments/[id]
 * Soft delete commitment (move to recycle bin by setting deleted_at timestamp)
 *
 * This performs a soft delete - the commitment is not permanently removed
 * and can be restored using POST /api/commitments/[id]/restore
 *
 * For permanent deletion, use DELETE /api/commitments/[id]/permanent-delete
 */
export async function DELETE(
  _request: Request,
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

    // Determine the commitment type from the unified view
    const { data: unifiedData, error: unifiedError } = await supabase
      .from("commitments_unified")
      .select("commitment_type, deleted_at")
      .eq("id", id)
      .single();

    if (unifiedError || !unifiedData) {
      return NextResponse.json(
        { error: "COMMITMENT_NOT_FOUND", message: "Commitment does not exist" },
        { status: 404 },
      );
    }

    // Check if already soft-deleted
    if (unifiedData.deleted_at) {
      return NextResponse.json(
        {
          error: "ALREADY_DELETED",
          message: "Commitment is already deleted",
        },
        { status: 400 },
      );
    }

    // Query the appropriate table based on type
    const tableName =
      unifiedData.commitment_type === "subcontract"
        ? "subcontracts"
        : "purchase_orders";

    // Soft delete commitment (set deleted_at timestamp)
    const deletedAt = new Date().toISOString();
    const { error } = await supabase
      .from(tableName)
      .update({
        deleted_at: deletedAt,
        updated_at: deletedAt,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Return response matching API specification
    return NextResponse.json({
      success: true,
      message: "Commitment moved to recycle bin",
      data: {
        id,
        deletedAt,
        canRestore: true,
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
