import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createContractSchema } from "./validation";
import { ZodError } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[id]/contracts
 * Returns all prime contracts for a specific project with calculated financial data
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/contracts#GET",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const projectIdNum = parseInt(projectId, 10);

    // Optional filters
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build contract query with optional filters
    let contractQuery = supabase
      .from("prime_contracts")
      .select(
        `
        *,
        vendor:companies!prime_contracts_contractor_id_fkey(id, name),
        client:companies!prime_contracts_client_company_id_fkey(id, name),
        contract_company:companies!prime_contracts_contract_company_id_fkey(id, name)
      `,
      )
      .eq("project_id", projectIdNum)
      .order("created_at", { ascending: false });

    if (status) {
      const CONTRACT_STATUSES = [
        "draft",
        "out_for_bid",
        "out_for_signature",
        "approved",
        "complete",
        "terminated",
      ] as const;
      type ContractStatus = (typeof CONTRACT_STATUSES)[number];
      if (!(CONTRACT_STATUSES as readonly string[]).includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid status "${status}". Expected one of: ${CONTRACT_STATUSES.join(", ")}.`,
          },
          { status: 400 },
        );
      }
      contractQuery = contractQuery.eq("status", status as ContractStatus);
    }

    if (search) {
      // Use OR with ilike — GIN trigram indexes (idx_prime_contracts_contract_number_trgm
      // and idx_prime_contracts_title_trgm) make %term% patterns index-scannable.
      contractQuery = contractQuery.or(
        `contract_number.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }

    // Fetch contracts and financial summaries in parallel.
    // prime_contract_financial_summary handles all aggregation in Postgres,
    // eliminating 3 extra round-trips and JS aggregation over all rows.
    const [contractsResult, financialResult] = await Promise.all([
      contractQuery,
      supabase
        .from("prime_contract_financial_summary")
        .select("contract_id, approved_change_orders, pending_change_orders, draft_change_orders, revised_contract_amount, invoiced_amount, payments_received, remaining_balance, percent_paid")
        .eq("project_id", projectIdNum),
    ]);

    if (contractsResult.error) {
      return apiErrorResponse(contractsResult.error);
    }

    // Build a lookup map for O(1) merge
    const financialByContractId = new Map(
      (financialResult.data ?? []).map((f) => [f.contract_id, f]),
    );

    const enrichedContracts = (contractsResult.data ?? []).map((contract) => {
      const fin = financialByContractId.get(contract.id);
      const originalValue = contract.original_contract_value ?? 0;
      // Use contract_company as fallback when client_id is not set
      const clientData = (contract as Record<string, unknown>).client
        ?? (contract as Record<string, unknown>).contract_company
        ?? null;
      return {
        ...contract,
        client: clientData,
        approved_change_orders: fin?.approved_change_orders ?? 0,
        pending_change_orders: fin?.pending_change_orders ?? 0,
        draft_change_orders: fin?.draft_change_orders ?? 0,
        revised_contract_value: fin?.revised_contract_amount ?? originalValue,
        invoiced_amount: fin?.invoiced_amount ?? 0,
        payments_received: fin?.payments_received ?? 0,
        remaining_balance: fin?.remaining_balance ?? originalValue,
        percent_paid: fin?.percent_paid ?? 0,
      };
    });

    return NextResponse.json(enrichedContracts);
    },
);

/**
 * POST /api/projects/[id]/contracts
 * Creates a new prime contract for a specific project
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/contracts#POST",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const guard = await requirePermission(projectIdNum, "contracts", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validatedData = createContractSchema.parse({
      ...body,
      project_id: parseInt(projectId, 10),
    });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/contracts#POST", message: "Authentication required." });
    }

    // Check for unique contract_number within project
    const { data: existingContract } = await supabase
      .from("prime_contracts")
      .select("id")
      .eq("project_id", parseInt(projectId, 10))
      .eq("contract_number", validatedData.contract_number)
      .maybeSingle();

    if (existingContract) {
      return NextResponse.json(
        { error: "Contract number already exists for this project" },
        { status: 400 },
      );
    }

    // Create the contract
    const { data, error } = await supabase
      .from("prime_contracts")
      .insert({
        ...validatedData,
        created_by: user.id,
      })
      .select(
        `
        *,
        vendor:companies!prime_contracts_vendor_id_fkey(id, name)
      `,
      )
      .single();

    if (error) {
      console.error("[POST /contracts] DB insert error:", error);
      return NextResponse.json(
        {
          error: "Failed to create contract",
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
    },
);
