import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Returns vendor companies for this project (used by form dropdowns).
// If the project has no vendors in project_vendors, returns all vendor companies globally.
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/vendors#GET",
  async ({ request, params }) => {
  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr, 10);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_vendors")
    .select("vendor_id, companies(id, name, legal_name)")
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If no project-specific vendors, return all vendor companies for the dropdown
  if (!data || data.length === 0) {
    const { data: allVendors, error: allError } = await supabase
      .from("companies")
      .select("id, name, legal_name")
      .eq("is_vendor", true)
      .order("name");

    if (allError) {
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }

    return NextResponse.json(
      (allVendors ?? []).map((c) => ({
        id: c.id,
        vendor_name: c.name,
        company_id: c.id,
        company: c.name,
      }))
    );
  }

  return NextResponse.json(
    data.map((row) => {
      const company = row.companies as { id: string; name: string; legal_name: string | null } | null;
      return {
        id: row.vendor_id,
        vendor_name: company?.name ?? "",
        company_id: row.vendor_id,
        company: company?.name ?? "",
      };
    })
  );
  },
);
