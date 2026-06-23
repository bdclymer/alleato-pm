import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ companyId: string }>;
}

/**
 * GET /api/directory/companies/[companyId]
 * Get a single company by ID
 */
export const GET = withApiGuardrails(
  "directory/companies/[companyId]#GET",
  async ({ request, params }) => {
  
    const { companyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "directory/companies/[companyId]#GET", message: "Authentication required." });
    }

    // Get company
    const { data: company, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        );
      }
      return apiErrorResponse(error);
    }

    return NextResponse.json(company);
    },
);

/**
 * PATCH /api/directory/companies/[companyId]
 * Update a company
 */
export const PATCH = withApiGuardrails(
  "directory/companies/[companyId]#PATCH",
  async ({ request, params }) => {
  
    const { companyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "directory/companies/[companyId]#PATCH", message: "Authentication required." });
    }

    // Parse request body
    const body = await request.json();

    if (body.primary_contact_id !== undefined && body.primary_contact_id !== null) {
      const { data: contact, error: contactError } = await supabase
        .from("people")
        .select("id")
        .eq("id", body.primary_contact_id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (contactError) {
        return apiErrorResponse(contactError);
      }

      if (!contact) {
        return NextResponse.json(
          { error: "Primary contact must be associated with this company" },
          { status: 400 },
        );
      }
    }

    // Update company
    const { data: company, error } = await supabase
      .from("companies")
      .update({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.state !== undefined && { state: body.state }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.license_number !== undefined && { license_number: body.license_number }),
        ...(body.company_type !== undefined && { type: body.company_type }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.business_phone !== undefined && { contact_phone: body.business_phone }),
        ...(body.contact_phone !== undefined && { contact_phone: body.contact_phone }),
        ...(body.email_address !== undefined && { contact_email: body.email_address }),
        ...(body.contact_email !== undefined && { contact_email: body.contact_email }),
        ...(body.erp_vendor_id !== undefined && { acumatica_vendor_id: body.erp_vendor_id }),
        ...(body.acumatica_vendor_id !== undefined && { acumatica_vendor_id: body.acumatica_vendor_id }),
        ...(body.primary_contact_id !== undefined && { primary_contact_id: body.primary_contact_id }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        );
      }
      // Check for duplicate name
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A company with this name already exists" },
          { status: 409 }
        );
      }
      return apiErrorResponse(error);
    }

    return NextResponse.json(company);
    },
);

/**
 * DELETE /api/directory/companies/[companyId]
 * Delete a company
 */
export const DELETE = withApiGuardrails(
  "directory/companies/[companyId]#DELETE",
  async ({ request, params }) => {
  
    const { companyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "directory/companies/[companyId]#DELETE", message: "Authentication required." });
    }

    // Check if company is used in any projects
    const { data: projectCompanies, error: checkError } = await supabase
      .from("project_companies")
      .select("id")
      .eq("company_id", companyId)
      .limit(1);

    if (checkError) {
      return NextResponse.json(
        { error: "Failed to check company usage", details: checkError.message },
        { status: 500 }
      );
    }

    if (projectCompanies && projectCompanies.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete company",
          message: "This company is currently assigned to one or more projects. Please remove it from all projects before deleting."
        },
        { status: 409 }
      );
    }

    // Delete company
    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", companyId);

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        );
      }
      return apiErrorResponse(error);
    }

    return NextResponse.json(
      { message: "Company deleted successfully" },
      { status: 200 }
    );
    },
);
