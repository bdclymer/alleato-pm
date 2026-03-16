import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type ProjectCompanyRow = Database["public"]["Tables"]["project_companies"]["Row"];
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

type ProjectCompanyListItem = ProjectCompanyRow & {
  company_name: string | null;
  website: string | null;
  contact_count: number;
  project_count: number;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const per_page = Math.min(
      Math.max(1, parseInt(searchParams.get("per_page") || "25", 10)),
      150,
    );
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const company_type = searchParams.get("company_type") || "";
    const sort = searchParams.get("sort") || "updated_at:desc";

    let query = supabase
      .from("project_companies")
      .select("*", { count: "exact" });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (company_type) {
      query = query.eq("company_type", company_type);
    }

    if (search) {
      const { data: matchingCompanies, error: matchingError } = await supabase
        .from("companies")
        .select("id")
        .ilike("name", `%${search}%`);

      if (matchingError) {
        return NextResponse.json(
          { error: "Failed to search companies", details: matchingError.message },
          { status: 500 },
        );
      }

      const matchingIds = (matchingCompanies || [])
        .map((row) => row.id)
        .filter(Boolean);

      const searchFilters = [
        matchingIds.length ? `company_id.in.(${matchingIds.join(",")})` : null,
        `business_phone.ilike.%${search}%`,
        `email_address.ilike.%${search}%`,
        `erp_vendor_id.ilike.%${search}%`,
      ]
        .filter(Boolean)
        .join(",");

      if (searchFilters) {
        query = query.or(searchFilters);
      }
    }

    const [sortField, sortDirection] = sort.split(":");
    const allowedSortFields = new Set([
      "id",
      "project_id",
      "company_id",
      "business_phone",
      "email_address",
      "primary_contact_id",
      "erp_vendor_id",
      "company_type",
      "status",
      "logo_url",
      "created_at",
      "updated_at",
    ]);
    const normalizedSortField = allowedSortFields.has(sortField)
      ? sortField
      : "updated_at";

    query = query.order(normalizedSortField, {
      ascending: sortDirection !== "desc",
      nullsFirst: false,
    });

    const from = (page - 1) * per_page;
    const to = from + per_page - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch project companies", details: error.message },
        { status: 500 },
      );
    }

    const projectCompanies = (data || []) as ProjectCompanyRow[];
    const companyIds = Array.from(
      new Set(projectCompanies.map((row) => row.company_id).filter(Boolean)),
    );

    let companyInfoMap = new Map<string, { name: string | null; website: string | null }>();
    const contactCountMap = new Map<string, number>();
    const projectCountMap = new Map<string, number>();

    if (companyIds.length > 0) {
      const [companiesResult, contactsResult, projectsResult] = await Promise.all([
        supabase
          .from("companies")
          .select("id, name, website")
          .in("id", companyIds)
          .returns<Pick<CompanyRow, "id" | "name" | "website">[]>(),
        supabase
          .from("people")
          .select("company_id")
          .in("company_id", companyIds),
        supabase
          .from("project_companies")
          .select("company_id, project_id")
          .in("company_id", companyIds),
      ]);

      if (companiesResult.error) {
        return NextResponse.json(
          { error: "Failed to fetch company details", details: companiesResult.error.message },
          { status: 500 },
        );
      }

      companyInfoMap = new Map(
        (companiesResult.data || []).map((c) => [c.id, { name: c.name || null, website: c.website || null }]),
      );

      // Count contacts per company
      for (const row of contactsResult.data || []) {
        if (row.company_id) {
          contactCountMap.set(row.company_id, (contactCountMap.get(row.company_id) || 0) + 1);
        }
      }

      // Count unique projects per company
      const projectSets = new Map<string, Set<number>>();
      for (const row of projectsResult.data || []) {
        if (row.company_id) {
          const existing = projectSets.get(row.company_id);
          if (existing) {
            existing.add(row.project_id);
          } else {
            projectSets.set(row.company_id, new Set([row.project_id]));
          }
        }
      }
      for (const [cid, projects] of projectSets) {
        projectCountMap.set(cid, projects.size);
      }
    }

    const rows: ProjectCompanyListItem[] = projectCompanies.map((row) => {
      const info = companyInfoMap.get(row.company_id);
      return {
        ...row,
        company_name: info?.name ?? null,
        website: info?.website ?? null,
        contact_count: contactCountMap.get(row.company_id) ?? 0,
        project_count: projectCountMap.get(row.company_id) ?? 0,
      };
    });

    const total = count || 0;
    const total_pages = Math.ceil(total / per_page);

    return NextResponse.json({
      data: rows,
      pagination: {
        page,
        per_page,
        total,
        total_pages,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "server_error",
        message: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
