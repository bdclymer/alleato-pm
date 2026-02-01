import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createContractSchema } from "./validation";
import { ZodError } from "zod";
import { apiErrorResponse } from "@/lib/api-error";

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
        vendor:vendors(id, name),
        client:clients(id, name)
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

    // Fetch financial summary data for all contracts
    const contractIds = (contracts || []).map((c) => c.id);

    let financialData: Record<string, {
      original_contract_amount: number | null;
      approved_change_orders: number | null;
      pending_change_orders: number | null;
      draft_change_orders: number | null;
      revised_contract_amount: number | null;
      invoiced_amount: number | null;
      payments_received: number | null;
      remaining_balance: number | null;
    }> = {};

    if (contractIds.length > 0) {
      const { data: summaryData } = await supabase
        .from("contract_financial_summary_mv")
        .select(`
          contract_id,
          original_contract_amount,
          approved_change_orders,
          pending_change_orders,
          draft_change_orders,
          revised_contract_amount,
          invoiced_amount,
          payments_received,
          remaining_balance
        `)
        .in("contract_id", contractIds);

      if (summaryData) {
        financialData = summaryData.reduce((acc, row) => {
          if (row.contract_id) {
            acc[row.contract_id] = {
              original_contract_amount: row.original_contract_amount,
              approved_change_orders: row.approved_change_orders,
              pending_change_orders: row.pending_change_orders,
              draft_change_orders: row.draft_change_orders,
              revised_contract_amount: row.revised_contract_amount,
              invoiced_amount: row.invoiced_amount,
              payments_received: row.payments_received,
              remaining_balance: row.remaining_balance,
            };
          }
          return acc;
        }, {} as typeof financialData);
      }
    }

    // Merge contract data with financial summary
    const enrichedContracts = (contracts || []).map((contract) => {
      const financial = financialData[contract.id];
      return {
        ...contract,
        // Use financial summary values, falling back to stored values
        original_contract_value: financial?.original_contract_amount ?? contract.original_contract_value,
        approved_change_orders: financial?.approved_change_orders ?? 0,
        pending_change_orders: financial?.pending_change_orders ?? 0,
        draft_change_orders: financial?.draft_change_orders ?? 0,
        revised_contract_value: financial?.revised_contract_amount ?? contract.revised_contract_value,
        invoiced: financial?.invoiced_amount ?? 0,
        payments_received: financial?.payments_received ?? 0,
        remaining_balance: financial?.remaining_balance ?? contract.revised_contract_value,
      };
    });

    return NextResponse.json(enrichedContracts);
  } catch (error) {
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

    // DEVELOPMENT: Permission check disabled for easier testing
    // TODO: Re-enable this in production
    // const { data: projectMember } = await supabase
    //   .from('project_members')
    //   .select('access')
    //   .eq('project_id', parseInt(projectId, 10))
    //   .eq('user_id', user.id)
    //   .single();

    // if (!projectMember || !['editor', 'admin', 'owner'].includes(projectMember.access)) {
    //   return NextResponse.json(
    //     { error: 'Forbidden: You do not have permission to create contracts for this project' },
    //     { status: 403 }
    //   );
    // }

    // Check for unique contract_number within project
    const { data: existingContract } = await supabase
      .from("prime_contracts")
      .select("id")
      .eq("project_id", parseInt(projectId, 10))
      .eq("contract_number", validatedData.contract_number)
      .single();

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
        vendor:vendors(id, name)
      `,
      )
      .single();

    if (error) {
      return apiErrorResponse(error);
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
