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

    const originalAmount = Number(totalsData?.total_sov_amount) || 0;
    const billedToDate = Number(totalsData?.total_billed_to_date) || 0;
    const balanceToFinish = Number(totalsData?.total_amount_remaining) || 0;

    const responseData = {
      ...data,
      type: unifiedData.commitment_type,
      original_amount: originalAmount,
      approved_change_orders: 0,
      revised_contract_amount: originalAmount,
      billed_to_date: billedToDate,
      balance_to_finish: balanceToFinish,
      sov_line_count: Number(totalsData?.sov_line_count) || 0,
      line_items: sovItems || [],
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

    // Soft delete commitment (set deleted_at)
    const { error } = await supabase
      .from(tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Commitment deleted successfully" });
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
