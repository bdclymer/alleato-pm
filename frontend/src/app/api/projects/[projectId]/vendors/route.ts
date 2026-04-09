import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[projectId]/vendors
 * Returns vendor companies for this project (used by form dropdowns, e.g. Direct Costs).
 * vendors table was dropped; vendor data now lives in companies with is_vendor = true,
 * linked to projects via project_vendors (vendor_id -> companies.id).
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
      .from("project_vendors")
      .select("vendor_id, companies(id, name, legal_name)")
      .eq("project_id", projectIdNum);

    if (error) {
      console.error("Error fetching project vendors:", error);

      // Fallback: return all vendor companies regardless of project
      const { data: allVendors, error: fallbackError } = await supabase
        .from("companies")
        .select("id, name, legal_name")
        .eq("is_vendor", true)
        .order("name");

      if (fallbackError) {
        return apiErrorResponse(fallbackError);
      }

      return NextResponse.json(
        (allVendors ?? []).map((c) => ({
          id: c.id,
          vendor_name: c.name,
          company_id: c.id,
          company: c.name,
        })),
      );
    }

    // Map to the shape the DirectCostForm expects:
    // { id: string, vendor_name: string, company_id: string, company?: string }
    const vendors = (data ?? []).map((row) => {
      const company = row.companies as
        | { id: string | number; name: string | null; legal_name: string | null }
        | { id: string | number; name: string | null; legal_name: string | null }[]
        | null;
      const resolved = Array.isArray(company) ? company[0] : company;

      return {
        id: row.vendor_id,
        vendor_name: resolved?.name ?? "",
        company_id: row.vendor_id,
        company: resolved?.name ?? undefined,
      };
    });

    return NextResponse.json(vendors);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
