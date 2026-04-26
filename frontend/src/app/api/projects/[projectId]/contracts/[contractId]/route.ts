import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse, classifyError } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { updateContractSchema } from "../validation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions-guard";
import { logger } from "@/lib/logger";
import {
  fetchLivePrimeContractChangeTotals,
  mergePrimeContractFinancials,
} from "@/lib/prime-contracts/live-change-order-totals";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string }>;
}

/**
 * GET /api/projects/[id]/contracts/[contractId]
 * Returns a single prime contract by ID with calculated financial data
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/contracts/[contractId]#GET",
  async ({ request, params }) => {

    const { projectId, contractId } = await params;
    const supabase = await createClient();

    // Fetch contract and financial summary in parallel.
    // contract_company is now included in the initial join (fixes N+1).
    // prime_contract_financial_summary view handles all aggregation in Postgres
    // (eliminates 3 extra round-trips + JS aggregation).
    const [contractResult, financialResult] = await Promise.all([
      supabase
        .from("prime_contracts")
        .select(
          `
          *,
          vendor:companies!prime_contracts_vendor_id_fkey(id, name, contact_name, contact_email, contact_phone),
          client:companies!prime_contracts_client_company_id_fkey(id, name),
          contractor:companies!prime_contracts_contractor_id_fkey(id, name),
          architect_engineer:companies!prime_contracts_architect_engineer_id_fkey(id, name),
          contract_company:companies!prime_contracts_contract_company_id_fkey(id, name)
        `,
        )
        .eq("id", contractId)
        .single(),
      supabase
        .from("prime_contract_financial_summary")
        .select("approved_change_orders, pending_change_orders, draft_change_orders, revised_contract_amount, pending_revised_contract_amount, invoiced_amount, payments_received, remaining_balance, percent_paid")
        .eq("contract_id", contractId)
        .single(),
    ]);

    if (contractResult.error) {
      if (contractResult.error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Contract not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch contract", details: contractResult.error.message },
        { status: 400 },
      );
    }

    const contract = contractResult.data;

    // Privacy gate: if contract is private, only admins and users in allowed_user_ids may view it
    if (contract.is_private) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const allowedIds: string[] = (contract as { allowed_user_ids?: string[] }).allowed_user_ids ?? [];
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      const isAdmin = profile?.is_admin === true;
      const isAllowed = isAdmin || allowedIds.includes(user.id);
      if (!isAllowed) {
        return NextResponse.json({ error: "Contract not found" }, { status: 404 });
      }
    }

    // Financial summary may not exist yet for brand-new contracts with no COs/payments
    const fin = financialResult.data ?? {
      approved_change_orders: 0,
      pending_change_orders: 0,
      draft_change_orders: 0,
      revised_contract_amount: contract.original_contract_value ?? 0,
      pending_revised_contract_amount: contract.original_contract_value ?? 0,
      invoiced_amount: 0,
      payments_received: 0,
      remaining_balance: contract.original_contract_value ?? 0,
      percent_paid: 0,
    };
    let liveTotals;
    try {
      liveTotals = (await fetchLivePrimeContractChangeTotals(
        supabase,
        parseInt(projectId, 10),
        [contractId],
      )).get(contractId);
    } catch (error) {
      return apiErrorResponse(error);
    }
    const financials = mergePrimeContractFinancials(
      contract.original_contract_value ?? 0,
      fin,
      liveTotals,
    );

    return NextResponse.json({
      ...contract,
      approved_change_orders: financials.approved_change_orders,
      pending_change_orders: financials.pending_change_orders,
      draft_change_orders: financials.draft_change_orders,
      pending_revised_contract_amount: financials.pending_revised_contract_value,
      revised_contract_value: financials.revised_contract_value,
      invoiced_amount: fin.invoiced_amount,
      payments_received: fin.payments_received,
      remaining_balance: fin.remaining_balance ?? financials.revised_contract_value,
      percent_paid: fin.percent_paid,
    });
    },
);

/**
 * PUT /api/projects/[id]/contracts/[contractId]
 * Updates a prime contract
 */
export const PUT = withApiGuardrails(
  "projects/[projectId]/contracts/[contractId]#PUT",
  async ({ request, params }) => {
  
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
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/contracts/[contractId]#PUT", message: "Authentication required." });
    }

    // Check if contract exists and belongs to this project
    const { data: existingContract } = await supabase
      .from("prime_contracts")
      .select("id, contract_number")
      .eq("id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .maybeSingle();

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
        .maybeSingle();

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
        vendor:companies!prime_contracts_vendor_id_fkey(id, name, contact_name, contact_email, contact_phone)
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
    },
);

/**
 * DELETE /api/projects/[id]/contracts/[contractId]
 * Deletes a prime contract
 */
export const DELETE = withApiGuardrails(
  "projects/[projectId]/contracts/[contractId]#DELETE",
  async ({ request, params }) => {
  
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
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/contracts/[contractId]#DELETE", message: "Authentication required." });
    }

    // Guard: prevent delete when child records exist (test 3.2)
    // A contract with SOV line items or prime contract change orders must be
    // cleaned up by the user first — silent cascade would destroy financial history.
    const [lineItemsResult, changeOrdersResult] = await Promise.all([
      supabase
        .from("contract_line_items")
        .select("id", { count: "exact", head: true })
        .eq("contract_id", contractId),
      supabase
        .from("prime_contract_change_orders")
        .select("id", { count: "exact", head: true })
        .eq("contract_id", contractId),
    ]);

    const lineItemCount = lineItemsResult.count ?? 0;
    const changeOrderCount = changeOrdersResult.count ?? 0;

    if (lineItemCount > 0 || changeOrderCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete contract with existing line items or change orders. Remove them first.",
        },
        { status: 409 },
      );
    }

    // Delete directly — cascade FKs handle child cleanup automatically.
    // Skipping the pre-check eliminates a race condition and a round-trip;
    // "0 rows affected" is treated the same as a 404 (contract not found).
    const { error, count } = await supabase
      .from("prime_contracts")
      .delete({ count: "exact" })
      .eq("id", contractId)
      .eq("project_id", parseInt(projectId, 10));

    if (!error && count === 0) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    if (error) {
      logger.error({ msg: "[DELETE /contracts/:id] Supabase error:", error: error instanceof Error ? error.message : String(error) });
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
    },
);
