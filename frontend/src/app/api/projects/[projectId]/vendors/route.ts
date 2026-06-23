import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

type VendorCompany = {
  id: string;
  name: string | null;
  legal_name: string | null;
  license_number: string | null;
};

type ProjectVendorRow = {
  vendor_id: string;
  companies: VendorCompany[] | VendorCompany | null;
};

function normalizeCompany(
  company: ProjectVendorRow["companies"],
): VendorCompany | null {
  if (!company) return null;
  return Array.isArray(company) ? company[0] ?? null : company;
}

// Returns vendor companies for this project (used by form dropdowns).
// If the project has no vendors in project_vendors, returns all vendor companies globally.
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/vendors#GET",
  async ({ request, params }) => {
  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr, 10);
  const supabase = await createClient();

  const [projectVendorsResult, allVendorsResult] = await Promise.all([
    supabase
      .from("project_vendors")
      .select("vendor_id, companies(id, name, legal_name, license_number)")
      .eq("project_id", projectId),
    supabase
      .from("companies")
      .select("id, name, legal_name, license_number")
      .eq("is_vendor", true)
      .order("name"),
  ]);

  if (projectVendorsResult.error) {
    return apiErrorResponse(projectVendorsResult.error);
  }
  if (allVendorsResult.error) {
    return apiErrorResponse(allVendorsResult.error);
  }

  // Build a set of project-linked vendor IDs for dedup
  const projectVendorIds = new Set(
    (projectVendorsResult.data ?? []).map((row) => row.vendor_id),
  );

  // Project-linked vendors first, then all other is_vendor=true companies
  const projectVendorRows = (projectVendorsResult.data as ProjectVendorRow[] ?? []).map(
    (row) => {
      const company = normalizeCompany(row.companies);
      return {
        id: row.vendor_id,
        vendor_name: company?.name ?? "",
        company_id: row.vendor_id,
        company: company?.name ?? "",
        license_number: company?.license_number ?? null,
      };
    },
  );

  const globalVendorRows = (allVendorsResult.data as VendorCompany[] ?? [])
    .filter((c) => !projectVendorIds.has(c.id))
    .map((c) => ({
      id: c.id,
      vendor_name: c.name ?? "",
      company_id: c.id,
      company: c.name ?? "",
      license_number: c.license_number ?? null,
    }));

  return NextResponse.json([...projectVendorRows, ...globalVendorRows]);
  },
);

// ---------------------------------------------------------------------------
// POST — create a company and link it to this project as a vendor.
//
// Used by AddCompanyModal (change-events form). Before this existed the modal
// silently 404'd because only GET was defined.
//
// Behavior:
// 1. Validate body with Zod (name required, max 200 chars).
// 2. If a company with a case-insensitive name match already exists:
//      - Ensure is_vendor = true (flip it if not).
//      - Skip company insert.
//    Otherwise insert a new company with is_vendor = true.
// 3. Upsert the (project_id, vendor_id) row into project_vendors. If the
//    company is already linked, return 200 with the existing link; otherwise
//    return 201 with the new link.
// ---------------------------------------------------------------------------

const CreateVendorSchema = z.object({
  name: z
    .string({ error: "Company name is required" })
    .trim()
    .min(1, "Company name is required")
    .max(200, "Company name is too long (max 200 characters)"),
});

export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/vendors#POST",
  async ({ request, params }) => {
    const { projectId: projectIdStr } = await params;
    const projectId = parseInt(projectIdStr, 10);
    if (Number.isNaN(projectId)) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/vendors#POST",
        message: "Invalid project ID.",
        details: [{ path: "projectId", message: "Project ID must be a number." }],
      });
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/vendors#POST",
        message: "Authentication required.",
      });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch (error) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/vendors#POST",
        message: "Request body must be valid JSON.",
        cause: error,
      });
    }

    const parsed = CreateVendorSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/vendors#POST",
        message: "Invalid request.",
        details: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }

    const name = parsed.data.name;

    // 1. Find existing company by case-insensitive name match.
    const { data: existingCompanies, error: lookupError } = await supabase
      .from("companies")
      .select("id, name, is_vendor")
      .ilike("name", name)
      .limit(1);

    if (lookupError) {
      return apiErrorResponse(lookupError);
    }

    let companyId: string;
    const existing = existingCompanies?.[0];

    if (existing) {
      companyId = existing.id;
      // Ensure it's flagged as a vendor.
      if (!existing.is_vendor) {
        const { error: flagError } = await supabase
          .from("companies")
          .update({ is_vendor: true })
          .eq("id", companyId);
        if (flagError) return apiErrorResponse(flagError);
      }
    } else {
      // 2. Create new company.
      const { data: newCompany, error: insertError } = await supabase
        .from("companies")
        .insert({ name, is_vendor: true })
        .select("id, name")
        .single();

      if (insertError) return apiErrorResponse(insertError);
      if (!newCompany) {
        throw new GuardrailError({
          code: "INTERNAL_ERROR",
          where: "projects/[projectId]/vendors#POST",
          message: "Failed to create company.",
        });
      }
      companyId = newCompany.id;
    }

    // 3. Link to project if not already linked.
    const { data: existingLink, error: linkLookupError } = await supabase
      .from("project_vendors")
      .select("id")
      .eq("project_id", projectId)
      .eq("vendor_id", companyId)
      .maybeSingle();

    if (linkLookupError) return apiErrorResponse(linkLookupError);

    if (existingLink) {
      return NextResponse.json(
        {
          item: {
            id: companyId,
            vendor_name: name,
            company_id: companyId,
            company: name,
          },
          alreadyLinked: true,
        },
        { status: 200 },
      );
    }

    const { error: linkError } = await supabase.from("project_vendors").insert({
      project_id: projectId,
      vendor_id: companyId,
      added_by: user.id,
    });

    if (linkError) return apiErrorResponse(linkError);

    return NextResponse.json(
      {
        item: {
          id: companyId,
          vendor_name: name,
          company_id: companyId,
          company: name,
        },
        alreadyLinked: false,
      },
      { status: 201 },
    );
  },
);
