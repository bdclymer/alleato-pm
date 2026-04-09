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
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * PATCH /api/directory/companies/[companyId]
 * Update a company
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Update company
    const { data: company, error } = await supabase
      .from("companies")
      .update({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.state !== undefined && { state: body.state }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.company_type !== undefined && { type: body.company_type }),
        ...(body.status !== undefined && { status: body.status }),
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
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/directory/companies/[companyId]
 * Delete a company
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    return apiErrorResponse(error);
  }
}