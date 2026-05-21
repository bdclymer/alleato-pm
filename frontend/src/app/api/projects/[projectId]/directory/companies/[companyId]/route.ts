import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { CompanyService } from "@/services/companyService";
import { PermissionService } from "@/services/permissionService";

interface RouteParams {
  params: Promise<{ projectId: string; companyId: string }>;
}

/**
 * Get detailed information for a specific company.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/directory/companies/[companyId]#GET",
  async ({ request, params }) => {
  
    const { projectId, companyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/directory/companies/[companyId]#GET", message: "Authentication required." });
    }

    // Check permissions
    const permissionService = new PermissionService(supabase);
    const hasPermission = await permissionService.hasPermission(
      user.id,
      projectId,
      "directory",
      "read",
    );

    if (!hasPermission) {
      return NextResponse.json(
        {
          error: "insufficient_permissions",
          message: "You do not have permission to view companies.",
          code: "PERMISSION_DENIED",
        },
        { status: 403 },
      );
    }

    // Get company
    const companyService = new CompanyService(supabase);

    try {
      const company = await companyService.getCompany(projectId, companyId);
      return NextResponse.json(company);
    } catch (getError) {
      if (
        getError instanceof Error &&
        (getError as NodeJS.ErrnoException).code === "RESOURCE_NOT_FOUND"
      ) {
        return NextResponse.json(
          {
            error: "not_found",
            message: `Company with ID ${companyId} not found.`,
            code: "RESOURCE_NOT_FOUND",
          },
          { status: 404 },
        );
      }
      throw getError;
    }
    },
);

/**
 * Update company information.
 *
 * Supports partial updates - only include fields you want to change.
 *
 * Updatable fields:
 * - name, address, city, state, zip: Company information
 * - business_phone, email_address: Contact information
 * - primary_contact_id: Primary contact person
 * - erp_vendor_id: ERP system identifier
 * - company_type: YOUR_COMPANY, VENDOR, SUBCONTRACTOR, SUPPLIER
 * - status: ACTIVE or INACTIVE
 * - logo_url: Company logo URL
 */
export const PATCH = withApiGuardrails(
  "projects/[projectId]/directory/companies/[companyId]#PATCH",
  async ({ request, params }) => {
  
    const { projectId, companyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/directory/companies/[companyId]#PATCH", message: "Authentication required." });
    }

    // Check permissions
    const permissionService = new PermissionService(supabase);
    const hasPermission = await permissionService.hasPermission(
      user.id,
      projectId,
      "directory",
      "write",
    );

    if (!hasPermission) {
      return NextResponse.json(
        {
          error: "insufficient_permissions",
          message: "You do not have permission to update companies.",
          code: "PERMISSION_DENIED",
        },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate company exists
    const companyService = new CompanyService(supabase);

    try {
      await companyService.getCompany(projectId, companyId);
    } catch (getError) {
      if (
        getError instanceof Error &&
        (getError as NodeJS.ErrnoException).code === "RESOURCE_NOT_FOUND"
      ) {
        return NextResponse.json(
          {
            error: "not_found",
            message: `Company with ID ${companyId} not found.`,
            code: "RESOURCE_NOT_FOUND",
          },
          { status: 404 },
        );
      }
      throw getError;
    }

    // Update company
    try {
      const company = await companyService.updateCompany(
        projectId,
        companyId,
        body,
      );
      return NextResponse.json(company);
    } catch (updateError) {
      // Check for duplicate ERP vendor ID
      if (
        updateError instanceof Error &&
        updateError.message.includes("duplicate")
      ) {
        return NextResponse.json(
          {
            error: "validation_error",
            message: "Validation failed",
            errors: {
              erp_vendor_id: ["ERP Vendor ID must be unique"],
            },
            code: "VALIDATION_FAILED",
          },
          { status: 422 },
        );
      }
      throw updateError;
    }
    },
);

/**
 * Delete a company from the project.
 *
 * Note: Companies with assigned users cannot be deleted.
 */
export const DELETE = withApiGuardrails(
  "projects/[projectId]/directory/companies/[companyId]#DELETE",
  async ({ request, params }) => {
  
    const { projectId, companyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/directory/companies/[companyId]#DELETE", message: "Authentication required." });
    }

    // Check permissions
    const permissionService = new PermissionService(supabase);
    const hasPermission = await permissionService.hasPermission(
      user.id,
      projectId,
      "directory",
      "write",
    );

    if (!hasPermission) {
      return NextResponse.json(
        {
          error: "insufficient_permissions",
          message: "You do not have permission to delete companies.",
          code: "PERMISSION_DENIED",
        },
        { status: 403 },
      );
    }

    const serviceSupabase = createServiceClient();
    const companyService = new CompanyService(serviceSupabase);

    // Check if company exists
    let company;
    try {
      company = await companyService.getCompany(projectId, companyId);
    } catch (getError) {
      if (
        getError instanceof Error &&
        (getError as NodeJS.ErrnoException).code === "RESOURCE_NOT_FOUND"
      ) {
        return NextResponse.json(
          {
            error: "not_found",
            message: `Company with ID ${companyId} not found.`,
            code: "RESOURCE_NOT_FOUND",
          },
          { status: 404 },
        );
      }
      throw getError;
    }

    // Check if company can be deleted
    const canDelete = await companyService.canDeleteCompany(
      projectId,
      company.company_id,
    );
    if (!canDelete.canDelete) {
      return NextResponse.json(
        {
          error: "business_rule_violation",
          message: canDelete.reason,
          code: "BUSINESS_RULE_VIOLATION",
        },
        { status: 403 },
      );
    }

    // Delete the project company association
    // Note: We don't delete the global company record, just the project association
    const projectIdNum = Number.parseInt(projectId, 10);
    const { error: deleteError } = await serviceSupabase
      .from("project_companies")
      .delete()
      .eq("project_id", projectIdNum)
      .eq("id", companyId);

    if (deleteError) throw deleteError;

    return new NextResponse(null, { status: 204 });
    },
);
