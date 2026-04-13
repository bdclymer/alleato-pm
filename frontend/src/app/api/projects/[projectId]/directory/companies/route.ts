import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CompanyService } from "@/services/companyService";
import { PermissionService } from "@/services/permissionService";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * List all companies for a project with pagination and filtering.
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - per_page: Items per page (default: 25, max: 150)
 * - sort: Sort field and direction (e.g., "name" or "name:desc")
 * - status: Filter by status (ACTIVE, INACTIVE, or all)
 * - company_type: Filter by company type
 * - search: Search by company name, email, or phone
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/directory/companies#GET",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/directory/companies#GET", message: "Authentication required." });
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const per_page = Math.min(
      parseInt(searchParams.get("per_page") || "25", 10),
      150,
    );

    // Validate per_page
    if (per_page < 1 || per_page > 150) {
      return NextResponse.json(
        {
          error: "invalid_parameter",
          message: "Invalid per_page value. Must be between 1 and 150.",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const filters = {
      search: searchParams.get("search") || undefined,
      status:
        (searchParams.get("status") as "ACTIVE" | "INACTIVE" | "all") ||
        "ACTIVE",
      company_type: searchParams.get("company_type") || undefined,
      sort: searchParams.get("sort") || "name",
      page,
      per_page,
    };

    // Get companies
    const companyService = new CompanyService(supabase);
    const result = await companyService.getCompanies(projectId, filters);

    return NextResponse.json(result);
    },
);

/**
 * Create a new company in the project.
 *
 * Required fields:
 * - name: Company name
 *
 * Optional fields:
 * - address, city, state, zip: Address information
 * - business_phone, email_address: Contact information
 * - erp_vendor_id: Unique ERP system identifier
 * - company_type: YOUR_COMPANY, VENDOR, SUBCONTRACTOR, SUPPLIER
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/directory/companies#POST",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/directory/companies#POST", message: "Authentication required." });
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
          message: "You do not have permission to create companies.",
          code: "PERMISSION_DENIED",
        },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await request.json();
    const projectIdNum = Number.parseInt(projectId, 10);

    // ── Assign existing company by company_id ──────────────────────
    if (body.company_id && typeof body.company_id === "string") {
      const { data: existing } = await supabase
        .from("project_companies")
        .select("id")
        .eq("project_id", projectIdNum)
        .eq("company_id", body.company_id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "already_assigned", message: "Company is already assigned to this project.", code: "CONFLICT" },
          { status: 409 },
        );
      }

      const { data: pc, error: pcError } = await supabase
        .from("project_companies")
        .insert({ project_id: projectIdNum, company_id: body.company_id, status: "ACTIVE", company_type: "VENDOR" })
        .select("*, company:companies(*)")
        .single();

      if (pcError) throw pcError;
      return NextResponse.json(pc, { status: 201 });
    }

    // ── Validate required fields for new company creation ──────────
    const validationErrors: Record<string, string[]> = {};

    if (
      !body.name ||
      typeof body.name !== "string" ||
      body.name.trim().length === 0
    ) {
      validationErrors.name = ["Name is required"];
    }

    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Validation failed",
          errors: validationErrors,
          code: "VALIDATION_FAILED",
        },
        { status: 422 },
      );
    }

    // Create company
    const companyService = new CompanyService(supabase);

    try {
      const company = await companyService.createCompany(projectId, body);
      return NextResponse.json(company, { status: 201 });
    } catch (createError) {
      // Check for duplicate ERP vendor ID
      if (
        createError instanceof Error &&
        createError.message.includes("duplicate")
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
      throw createError;
    }
    },
);
