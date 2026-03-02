import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/directory/companies
 * List all companies in the system (not project-specific)
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - per_page: Items per page (default: 25, max: 150)
 * - sort: Sort field and direction (e.g., "name" or "name:desc")
 * - status: Filter by status (ACTIVE, INACTIVE, or all)
 * - company_type: Filter by company type
 * - search: Search by company name, email, or phone
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const per_page = Math.min(
      parseInt(searchParams.get("per_page") || "25", 10),
      150,
    );
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const company_type = searchParams.get("company_type") || null;
    const sort = searchParams.get("sort") || "name";

    // Start building query
    let query = supabase
      .from("companies")
      .select("*", { count: "exact" });

    // Apply search filter
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,title.ilike.%${search}%,website.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%,notes.ilike.%${search}%`
      );
    }

    // Apply status filter
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Apply company type filter
    if (company_type) {
      query = query.eq("type", company_type);
    }

    // Apply sorting
    const [sortField, sortDirection] = sort.split(":");
    query = query.order(sortField, { ascending: sortDirection !== "desc" });

    // Apply pagination
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;
    query = query.range(from, to);

    // Execute query
    const { data: companies, error, count } = await query;

    if (error) {
      console.error("Error fetching companies:", error);
      return NextResponse.json(
        { error: "Failed to fetch companies", details: error.message },
        { status: 500 }
      );
    }

    // Calculate pagination metadata
    const total = count || 0;
    const total_pages = Math.ceil(total / per_page);

    const normalizedCompanies = (companies || []).map((company) => ({
      ...company,
      company_type: company.type ?? null,
    }));

    return NextResponse.json({
      data: normalizedCompanies,
      pagination: {
        page,
        per_page,
        total,
        total_pages,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: "server_error",
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/directory/companies
 * Create a new company in the global directory
 *
 * Required fields:
 * - name: Company name
 *
 * Optional fields:
 * - address, city, state, zip: Address information
 * - business_phone, email_address: Contact information
 * - company_type: YOUR_COMPANY, VENDOR, SUBCONTRACTOR, SUPPLIER
 * - website: Company website
 */
export async function POST(request: NextRequest) {
  try {
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

    // Validate required fields
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Company name is required",
        },
        { status: 422 }
      );
    }

    // Insert company
    const { data: company, error } = await supabase
      .from("companies")
      .insert({
        name: body.name.trim(),
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zip: body.zip || null,
        website: body.website || null,
        type: body.company_type || body.type || "VENDOR",
        status: body.status || "ACTIVE",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating company:", error);
      // Check for duplicate company
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error: "duplicate_company",
            message: "A company with this name already exists",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error: "Failed to create company",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: "server_error",
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
