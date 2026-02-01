import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import type { PaginatedResponse, Commitment } from "@/app/api/types";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
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
    const type = searchParams.get("type"); // 'subcontract' or 'purchase_order'

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
          // Get the subcontractor's company_id from their person record
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

    // Query from commitments_unified view which combines subcontracts and purchase_orders
    let query = supabase
      .from("commitments_unified")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter by project if projectId is provided
    if (projectId) {
      query = query.eq("project_id", parseInt(projectId, 10));
    }

    // Filter by type (subcontract or purchase_order)
    if (type) {
      query = query.eq("type", type);
    }

    if (status) {
      query = query.ilike("status", status);
    }

    if (companyId) {
      query = query.eq("contract_company_id", companyId);
    }

    if (search) {
      query = query.or(`number.ilike.%${search}%,title.ilike.%${search}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return apiErrorResponse(error);
    }

    // The unified view already has the correct column names
    const mappedData: Commitment[] = (data || []).map((row) => ({
      id: row.id,
      project_id: row.project_id,
      number: row.number,
      title: row.title,
      status: row.status?.toLowerCase() || "draft",
      type: row.type as "subcontract" | "purchase_order",
      executed: row.executed,
      contract_company_id: row.contract_company_id,
      contract_company: null, // TODO: join company data if needed
      description: row.description,
      original_amount: Number(row.original_amount) || 0,
      approved_change_orders: Number(row.approved_change_orders) || 0,
      revised_contract_amount: Number(row.revised_contract_amount) || 0,
      billed_to_date: Number(row.billed_to_date) || 0,
      balance_to_finish: Number(row.balance_to_finish) || 0,
      start_date: row.start_date,
      executed_date: row.executed_date,
      retention_percentage: row.retention_percentage,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    const response: PaginatedResponse<Commitment> = {
      data: mappedData,
      meta: {
        page,
        limit,
        total: count || mappedData.length,
        totalPages: count ? Math.ceil(count / limit) : 1,
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
