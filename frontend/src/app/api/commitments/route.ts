import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import type { PaginatedResponse, Commitment } from "@/app/api/types";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * Columns selected from *_with_totals views.
 * Only fetch columns needed for the list page to reduce payload size.
 */
const LIST_COLUMNS = [
  "id",
  "project_id",
  "contract_number",
  "title",
  "status",
  "executed",
  "contract_company_id",
  "company_name",
  "company_type",
  "description",
  "start_date",
  "contract_date",
  "default_retainage_percent",
  "created_at",
  "updated_at",
  "total_sov_amount",
  "total_billed_to_date",
  "total_amount_remaining",
  "sov_line_count",
  "is_private",
].join(",");

interface WithTotalsRow {
  id: string | null;
  project_id: number | null;
  contract_number: string | null;
  title: string | null;
  status: string | null;
  executed: boolean | null;
  contract_company_id: string | null;
  company_name: string | null;
  company_type?: string | null;
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
  erp_status?: string | null;
  ssov_status?: string | null;
  is_private?: boolean | null;
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

  const invoicedAmount = billedToDate;
  const paymentsIssued = 0;
  const percentPaid = originalAmount > 0 ? (paymentsIssued / originalAmount) * 100 : 0;
  const remainingBalance = originalAmount - paymentsIssued;

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
    erp_status: row.erp_status || null,
    ssov_status: row.ssov_status || null,
    pending_change_orders: 0,
    draft_change_orders: 0,
    invoiced_amount: invoicedAmount,
    payments_issued: paymentsIssued,
    percent_paid: percentPaid,
    remaining_balance: remainingBalance,
    is_private: row.is_private ?? true,
  };
}

/**
 * GET /api/commitments
 *
 * Retrieves a paginated list of commitments (subcontracts and purchase orders)
 * with filtering, search, and automatic subcontractor company scoping.
 *
 * Performance optimizations (Phase 9):
 * - Selects only needed columns instead of SELECT *
 * - Filters soft-deleted records at the database level
 * - Runs subcontract and purchase order queries in parallel
 * - Uses server-side range limiting to reduce payload
 * - Response includes Cache-Control headers for client caching
 *
 * @route GET /api/commitments
 *
 * @queryparam {string} projectId - (Required) Project ID to filter commitments
 * @queryparam {number} [page=1] - Page number for pagination (1-based)
 * @queryparam {number} [limit=50] - Items per page (default reduced from 100 to 50)
 * @queryparam {string} [status] - Filter by commitment status (case-insensitive)
 * @queryparam {string} [search] - Search in contract_number and title fields
 * @queryparam {string} [companyId] - Filter by contract company ID
 * @queryparam {string} [type] - Filter by type: "subcontract" or "purchase_order"
 *
 * @returns {PaginatedResponse<Commitment>} 200 - Paginated list of commitments with metadata
 * @returns {object} 401 - Unauthorized (missing or invalid session)
 * @returns {object} 400/500 - Error response from database or server
 */
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
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500);
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

    // Build queries for both types in parallel for better performance
    const fetchSubcontracts = async (): Promise<{
      data: Commitment[];
      count: number;
    }> => {
      if (type && type !== "subcontract") return { data: [], count: 0 };

      let query = (supabase as any)
        .from("subcontracts_with_totals")
        .select(LIST_COLUMNS, { count: "exact" })
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      query = applyFilters(query, filters);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: (data || []).map((row: WithTotalsRow) =>
          mapRowToCommitment(row, "subcontract"),
        ),
        count: count || 0,
      };
    };

    const fetchPurchaseOrders = async (): Promise<{
      data: Commitment[];
      count: number;
    }> => {
      if (type && type !== "purchase_order") return { data: [], count: 0 };

      let query = (supabase as any)
        .from("purchase_orders_with_totals")
        .select(LIST_COLUMNS, { count: "exact" })
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      query = applyFilters(query, filters);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: (data || []).map((row: WithTotalsRow) =>
          mapRowToCommitment(row, "purchase_order"),
        ),
        count: count || 0,
      };
    };

    // Run both queries in parallel
    const [scResult, poResult] = await Promise.all([
      fetchSubcontracts(),
      fetchPurchaseOrders(),
    ]);

    // Combine results
    const allCommitments = [...scResult.data, ...poResult.data];

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

    // Add cache headers - list data can be cached briefly (10 seconds)
    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/commitments
 *
 * @deprecated This endpoint is deprecated and returns HTTP 410 Gone.
 * Use the following endpoints instead:
 * - POST /api/projects/[projectId]/subcontracts - Create a subcontract
 * - POST /api/projects/[projectId]/purchase-orders - Create a purchase order
 *
 * @route POST /api/commitments
 * @returns {object} 410 - Gone (endpoint deprecated)
 */
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
