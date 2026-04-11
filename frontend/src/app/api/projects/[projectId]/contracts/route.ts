import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
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
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Build query with optional filters
    let query = supabase
      .from("prime_contracts")
      .select(
        `
        *,
        vendor:companies!prime_contracts_contractor_id_fkey(id, name),
        client:companies!prime_contracts_client_company_id_fkey(id, name),
        contract_company:companies!prime_contracts_contract_company_id_fkey(id, name)
      `,
      )
      .eq("project_id", parseInt(projectId, 10))
      .order("created_at", { ascending: false });

    // Optional filters
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `contract_number.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }

    const { data: contracts, error } = await query;

    if (error) {
      return apiErrorResponse(error);
    }

    // Aggregate financial data from contract_change_orders, payment applications, and payments
    // NOTE: contract_financial_summary_mv uses the integer-PK contracts table — not prime_contracts (UUID)
    const contractIds = (contracts || []).map((c) => c.id);

    const coAggregates: Record<string, { approved: number; pending: number; draft: number }> = {};
    const invoicedAggregates: Record<string, number> = {};
    const paymentsAggregates: Record<string, number> = {};

    if (contractIds.length > 0) {
      const [coResult, invoiceResult, paymentResult] = await Promise.all([
        supabase
          .from("contract_change_orders")
          .select("contract_id, amount, status")
          .in("contract_id", contractIds),
        supabase
          .from("prime_contract_payment_applications")
          .select("contract_id, amount, status")
          .in("contract_id", contractIds),
        supabase
          .from("prime_contract_payments")
          .select("contract_id, amount")
          .in("contract_id", contractIds),
      ]);

      if (coResult.data) {
        for (const co of coResult.data) {
          if (!coAggregates[co.contract_id]) {
            coAggregates[co.contract_id] = { approved: 0, pending: 0, draft: 0 };
          }
          const amount = co.amount ?? 0;
          if (co.status === "approved") coAggregates[co.contract_id].approved += amount;
          else if (co.status === "pending") coAggregates[co.contract_id].pending += amount;
          else if (co.status === "draft") coAggregates[co.contract_id].draft += amount;
        }
      }

      if (invoiceResult.data) {
        for (const inv of invoiceResult.data) {
          if (inv.status === "approved") {
            invoicedAggregates[inv.contract_id] =
              (invoicedAggregates[inv.contract_id] ?? 0) + (inv.amount ?? 0);
          }
        }
      }

      if (paymentResult.data) {
        for (const pmt of paymentResult.data) {
          paymentsAggregates[pmt.contract_id] =
            (paymentsAggregates[pmt.contract_id] ?? 0) + (pmt.amount ?? 0);
        }
      }
    }

    // Merge contract data with calculated financial values
    const enrichedContracts = (contracts || []).map((contract) => {
      const agg = coAggregates[contract.id] ?? { approved: 0, pending: 0, draft: 0 };
      const revisedValue = (contract.original_contract_value ?? 0) + agg.approved;
      const invoicedAmount = invoicedAggregates[contract.id] ?? 0;
      const paymentsReceived = paymentsAggregates[contract.id] ?? 0;
      // Use contract_company as fallback when client_id is not set
      const clientData = (contract as Record<string, unknown>).client ?? (contract as Record<string, unknown>).contract_company ?? null;
      return {
        ...contract,
        client: clientData,
        approved_change_orders: agg.approved,
        pending_change_orders: agg.pending,
        draft_change_orders: agg.draft,
        revised_contract_value: revisedValue,
        invoiced_amount: invoicedAmount,
        payments_received: paymentsReceived,
        remaining_balance: revisedValue - paymentsReceived,
        percent_paid:
          revisedValue > 0
            ? Math.round((paymentsReceived / revisedValue) * 10000) / 100
            : 0,
      };
    });

    return NextResponse.json(enrichedContracts);
  } catch (error) {
    console.error("[contracts GET] Error:", error);
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/projects/[id]/contracts
 * Creates a new prime contract for a specific project
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('Contract validation error:', error.issues);
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

    return apiErrorResponse(error);
  }
}
