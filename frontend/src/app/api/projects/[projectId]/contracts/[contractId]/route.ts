import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse, classifyError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { updateContractSchema } from "../validation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions-guard";

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
    // Note: look up by UUID only (no project_id filter) so direct navigation
    // from bookmarks or cross-project links still resolves the contract.
    const { data: contract, error } = await supabase
      .from("prime_contracts")
      .select(
        `
        *,
        vendor:companies(id, name, contact_name, contact_email, contact_phone),
        client:companies!prime_contracts_client_company_id_fkey(id, name),
        contractor:companies!prime_contracts_contractor_id_fkey(id, name),
        architect_engineer:companies!prime_contracts_architect_engineer_id_fkey(id, name)
      `,
      )
      .eq("id", contractId)
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

    let contractCompany: { id: string; name: string } | null = null;
    if (contract.contract_company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", contract.contract_company_id)
        .single();
      contractCompany = company ?? null;
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
      contract_company: contractCompany,
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
    console.error("[GET /contracts/:id]", error);
    return apiErrorResponse(error);
  }
}

/**
 * PUT /api/projects/[id]/contracts/[contractId]
 * Updates a prime contract
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const guard = await requirePermission(projectIdNum, "contracts", "write");
    if (guard.denied) return guard.response;

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
        vendor:companies(id, name, contact_name, contact_email, contact_phone)
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

    console.error("[PUT /contracts/:id]", error);
    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/projects/[id]/contracts/[contractId]
 * Deletes a prime contract
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const guard = await requirePermission(projectIdNum, "contracts", "admin");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if contract exists before deleting
    // Note: contract_line_items, contract_change_orders, and contract_billing_periods
    // all have ON DELETE CASCADE FKs to prime_contracts, so the DB handles cleanup automatically.
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
      console.error("[DELETE /contracts/:id] Supabase error:", error);
      const classified = classifyError(error);
      return NextResponse.json(
        { error: classified.message },
        { status: classified.status },
      );
    }

    // Keep uploaded files, but detach legacy polymorphic links from deleted contract
    // to avoid stale references in the attachments table.
    // NOTE: prime_contract_attachments now provides FK-enforced links and will cascade.
    await serviceClient
      .from("attachments")
      .update({
        attached_to_id: null,
        attached_to_table: null,
      })
      .eq("project_id", parseInt(projectId, 10))
      .eq("attached_to_table", "prime_contracts")
      .eq("attached_to_id", contractId);

    return NextResponse.json(
      { message: "Contract deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[DELETE /contracts/:id]", error);
    return apiErrorResponse(error);
  }
}
