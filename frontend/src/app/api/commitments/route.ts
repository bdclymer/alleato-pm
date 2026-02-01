import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import type { PaginatedResponse, Commitment } from "@/app/api/types";
import { apiErrorResponse } from "@/lib/api-error";

interface WithTotalsRow {
  id: string | null;
  project_id: number | null;
  contract_number: string | null;
  title: string | null;
  status: string | null;
  executed: boolean | null;
  contract_company_id: string | null;
  company_name: string | null;
  description: string | null;
  start_date?: string | null;
  contract_date: string | null;
  default_retainage_percent: number | null;
  created_at: string | null;
  updated_at: string | null;
  total_sov_amount: number | null;
  total_billed_to_date: number | null;
  total_amount_remaining: number | null;
  sov_line_count: number | null;
  deleted_at?: string | null;
}

function applyFilters(
  query: any,
  filters: {
    projectId?: string | null;
    status?: string | null;
    companyId?: string | null;
    search?: string | null;
  },
) {
  if (filters.projectId) {
    query = query.eq("project_id", parseInt(filters.projectId, 10));
  }
  if (filters.status) {
    query = query.ilike("status", filters.status);
  }
  if (filters.companyId) {
    query = query.eq("contract_company_id", filters.companyId);
  }
  if (filters.search) {
    query = query.or(
      `contract_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%`,
    );
  }
  return query;
}

function mapRowToCommitment(
  row: WithTotalsRow,
  type: "subcontract" | "purchase_order",
): Commitment {
  const originalAmount = Number(row.total_sov_amount) || 0;
  const billedToDate = Number(row.total_billed_to_date) || 0;
  const balanceToFinish = Number(row.total_amount_remaining) || 0;

  return {
    id: row.id || "",
    project_id: row.project_id || 0,
    number: row.contract_number || "",
    title: row.title,
    status: row.status?.toLowerCase() || "draft",
    type,
    executed: row.executed ?? false,
    contract_company_id: row.contract_company_id,
    contract_company: row.company_name
      ? {
          id: row.contract_company_id || "",
          name: row.company_name,
          type: (row.company_type as any) || "vendor",
        }
      : null,
    description: row.description,
    original_amount: originalAmount,
    approved_change_orders: 0,
    revised_contract_amount: originalAmount,
    billed_to_date: billedToDate,
    balance_to_finish: balanceToFinish,
    start_date: row.start_date || null,
    executed_date: row.contract_date,
    retention_percentage: row.default_retainage_percent,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    let companyId = searchParams.get("companyId");
    const projectId = searchParams.get("projectId");
    const type = searchParams.get("type");

    // For subcontractors, auto-filter to only their company's commitments
    if (projectId && !companyId) {
      const serviceClient = createServiceClient();
      const { data: authLink } = await serviceClient
        .from("users_auth")
        .select("person_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (authLink) {
        const projectIdNum = parseInt(projectId, 10);
        const { data: membership } = await serviceClient
          .from("project_directory_memberships")
          .select("user_type")
          .eq("person_id", authLink.person_id)
          .eq("project_id", projectIdNum)
          .eq("status", "active")
          .maybeSingle();

        if (membership?.user_type === "subcontractor") {
          const { data: person } = await serviceClient
            .from("people")
            .select("company_id")
            .eq("id", authLink.person_id)
            .maybeSingle();

          if (person?.company_id) {
            companyId = String(person.company_id);
          }
        }
      }
    }

    const filters = { projectId, status, companyId, search };
    const allCommitments: Commitment[] = [];

    // Fetch from subcontracts_with_totals (includes SOV financial aggregation)
    if (!type || type === "subcontract") {
      let scQuery = (supabase as any)
        .from("subcontracts_with_totals")
        .select("*")
        .order("created_at", { ascending: false });

      scQuery = applyFilters(scQuery, filters);
      const { data: scData, error: scError } = await scQuery;

      if (scError) {
        return apiErrorResponse(scError);
      }

      const scCommitments = (scData || []).map((row: WithTotalsRow) =>
        mapRowToCommitment(row, "subcontract"),
      );
      allCommitments.push(...scCommitments);
    }

    // Fetch from purchase_orders_with_totals (includes SOV financial aggregation)
    if (!type || type === "purchase_order") {
      let poQuery = (supabase as any)
        .from("purchase_orders_with_totals")
        .select("*")
        .order("created_at", { ascending: false });

      poQuery = applyFilters(poQuery, filters);
      const { data: poData, error: poError } = await poQuery;

      if (poError) {
        return apiErrorResponse(poError);
      }

      const poCommitments = (poData || []).map((row: WithTotalsRow) =>
        mapRowToCommitment(row, "purchase_order"),
      );
      allCommitments.push(...poCommitments);
    }

    // Sort combined results by created_at descending
    allCommitments.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Apply pagination
    const total = allCommitments.length;
    const from = (page - 1) * limit;
    const paginatedData = allCommitments.slice(from, from + limit);

    const response: PaginatedResponse<Commitment> = {
      data: paginatedData,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// POST is deprecated - use /api/projects/[id]/subcontracts or /api/projects/[id]/purchase-orders instead
export async function POST() {
  return NextResponse.json(
    {
      error: "Deprecated endpoint",
      message:
        "Use /api/projects/[id]/subcontracts for subcontracts or /api/projects/[id]/purchase-orders for purchase orders",
    },
    { status: 410 },
  );
}
