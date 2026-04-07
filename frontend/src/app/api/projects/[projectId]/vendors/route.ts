import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[projectId]/vendors
 * Returns vendors for use in form dropdowns (e.g., Direct Costs).
 * Vendors are company-scoped, so we return all active vendors.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const projectIdNum = Number.parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("vendors")
      .select("id, name, company_id, companies ( name )")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching vendors:", error);
      return apiErrorResponse(error);
    }

    // Map to the shape the DirectCostForm expects:
    // { id: string, vendor_name: string, company?: string }
    const vendors = (data || []).map((row: Record<string, unknown>) => {
      const companies = row.companies as
        | { name: string | null }
        | { name: string | null }[]
        | null;
      const companyName = Array.isArray(companies)
        ? companies[0]?.name
        : companies?.name;

      return {
        id: row.id as string,
        vendor_name: row.name as string,
        company_id: (row.company_id as string | null) ?? null,
        company: companyName || undefined,
      };
    });

    return NextResponse.json(vendors);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
