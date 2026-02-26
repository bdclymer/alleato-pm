import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { updateContractSchema } from "../validation";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string }>;
}

/**
 * GET /api/projects/[id]/contracts/[contractId]
 * Returns a single prime contract by ID with calculated financial data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId } = await params;
    const supabase = await createClient();

    // Fetch contract with vendor and client relations
    const { data: contract, error } = await supabase
      .from("prime_contracts")
      .select(
        `
        *,
        vendor:vendors(id, name, contact_name, contact_email, contact_phone),
        client:clients(id, name)
      `,
      )
      .eq("id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Contract not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch contract", details: error.message },
        { status: 400 },
      );
    }

    // Aggregate financial data from contract_change_orders (UUID contract_id matches prime_contracts.id)
    // NOTE: contract_financial_summary_mv uses the integer-PK contracts table — not prime_contracts (UUID)
    const [coResult, invoiceResult, paymentResult] = await Promise.all([
      supabase
        .from("contract_change_orders")
        .select("amount, status")
        .eq("contract_id", contractId),
      supabase
        .from("prime_contract_payment_applications")
        .select("amount, status")
        .eq("contract_id", contractId),
      supabase
        .from("prime_contract_payments")
        .select("amount")
        .eq("contract_id", contractId),
    ]);

    let approvedCOs = 0;
    let pendingCOs = 0;
    let draftCOs = 0;

    if (coResult.data) {
      for (const co of coResult.data) {
        const amount = co.amount ?? 0;
        if (co.status === "approved") approvedCOs += amount;
        else if (co.status === "pending") pendingCOs += amount;
        else if (co.status === "draft") draftCOs += amount;
      }
    }

    const invoicedAmount = (invoiceResult.data ?? [])
      .filter((a) => a.status === "approved")
      .reduce((sum, a) => sum + (a.amount ?? 0), 0);

    const paymentsReceived = (paymentResult.data ?? []).reduce(
      (sum, p) => sum + (p.amount ?? 0),
      0,
    );

    const originalAmount = contract.original_contract_value ?? 0;
    const revisedAmount = originalAmount + approvedCOs;
    const remainingBalance = revisedAmount - paymentsReceived;
    const percentPaid = revisedAmount > 0
      ? Math.round((paymentsReceived / revisedAmount) * 10000) / 100
      : 0;

    // Merge contract with calculated financial data
    const enrichedContract = {
      ...contract,
      approved_change_orders: approvedCOs,
      pending_change_orders: pendingCOs,
      draft_change_orders: draftCOs,
      pending_revised_contract_amount: revisedAmount + pendingCOs,
      revised_contract_value: revisedAmount,
      invoiced_amount: invoicedAmount,
      payments_received: paymentsReceived,
      remaining_balance: remainingBalance,
      percent_paid: percentPaid,
    };

    return NextResponse.json(enrichedContract);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/projects/[id]/contracts/[contractId]
 * Updates a prime contract
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validatedData = updateContractSchema.parse(body);

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if contract exists and belongs to this project
    const { data: existingContract } = await supabase
      .from("prime_contracts")
      .select("id, contract_number")
      .eq("id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (!existingContract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    // If updating contract_number, check for uniqueness
    if (
      validatedData.contract_number &&
      validatedData.contract_number !== existingContract.contract_number
    ) {
      const { data: duplicateContract } = await supabase
        .from("prime_contracts")
        .select("id")
        .eq("project_id", parseInt(projectId, 10))
        .eq("contract_number", validatedData.contract_number)
        .neq("id", contractId)
        .single();

      if (duplicateContract) {
        return NextResponse.json(
          { error: "Contract number already exists for this project" },
          { status: 400 },
        );
      }
    }

    // Update the contract
    const { data, error } = await supabase
      .from("prime_contracts")
      .update(validatedData)
      .eq("id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .select(
        `
        *,
        vendor:vendors(id, name, contact_name, contact_email, contact_phone)
      `,
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update contract", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/projects/[id]/contracts/[contractId]
 * Deletes a prime contract
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for related records before deletion
    const { data: relatedLineItems } = await supabase
      .from("contract_line_items")
      .select("id")
      .eq("contract_id", contractId)
      .limit(1);

    if (relatedLineItems && relatedLineItems.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete contract with existing line items. Please delete related line items first.",
        },
        { status: 400 },
      );
    }

    const { data: relatedChangeOrders } = await supabase
      .from("contract_change_orders")
      .select("id")
      .eq("contract_id", contractId)
      .limit(1);

    if (relatedChangeOrders && relatedChangeOrders.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete contract with existing change orders. Please delete related change orders first.",
        },
        { status: 400 },
      );
    }

    const { data: relatedBillingPeriods } = await supabase
      .from("contract_billing_periods")
      .select("id")
      .eq("contract_id", contractId)
      .limit(1);

    if (relatedBillingPeriods && relatedBillingPeriods.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete contract with existing billing periods. Please delete related billing periods first.",
        },
        { status: 400 },
      );
    }

    // Check if contract exists before deleting
    const { data: existingContract } = await supabase
      .from("prime_contracts")
      .select("id")
      .eq("id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (!existingContract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    // Delete the contract
    const { error } = await supabase
      .from("prime_contracts")
      .delete()
      .eq("id", contractId)
      .eq("project_id", parseInt(projectId, 10));

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete contract", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Contract deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
