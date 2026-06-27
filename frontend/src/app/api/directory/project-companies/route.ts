import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { type NextRequest, NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";

const SORT_FIELD_MAP: Record<string, string> = {
  company_name: "name",
  company_type: "type",
  status: "status",
  business_phone: "contact_phone",
  website: "website",
  email_address: "contact_email",
  erp_vendor_id: "acumatica_vendor_id",
  created_at: "created_at",
  updated_at: "updated_at",
};

function parseMinimumCount(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function applyTextFilter<T>(
  query: T,
  column: string,
  value: string | null,
): T {
  if (!value?.trim()) return query;
  return (query as { ilike: (column: string, pattern: string) => T }).ilike(
    column,
    `%${value.trim()}%`,
  );
}

export const GET = withApiGuardrails(
  "directory/project-companies#GET",
  async ({ request }) => {
  
    const supabase = await createClient();

    const user = await getApiRouteUser();

    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "directory/project-companies#GET", message: "Authentication required." });
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
    const companyName = searchParams.get("company_name");
    const businessPhone = searchParams.get("business_phone");
    const website = searchParams.get("website");
    const emailAddress = searchParams.get("email_address");
    const erpVendorId = searchParams.get("erp_vendor_id");
    const primaryContactId = searchParams.get("primary_contact_id");
    const logoUrl = searchParams.get("logo_url");
    const createdAtFrom = searchParams.get("created_at_from");
    const createdAtTo = searchParams.get("created_at_to");
    const updatedAtFrom = searchParams.get("updated_at_from");
    const updatedAtTo = searchParams.get("updated_at_to");
    const contactCountMin = parseMinimumCount(
      searchParams.get("contact_count_min"),
    );
    const projectCountMin = parseMinimumCount(
      searchParams.get("project_count_min"),
    );

    // Query companies directly using the type column
    let query = supabase
      .from("companies")
      .select("id, name, website, type, status, contact_phone, contact_email, acumatica_vendor_id, primary_contact_id, logo_url, created_at, updated_at", { count: "exact" });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (company_type) {
      query = query.ilike("type", company_type);
    }

    query = applyTextFilter(query, "name", companyName);
    query = applyTextFilter(query, "contact_phone", businessPhone);
    query = applyTextFilter(query, "website", website);
    query = applyTextFilter(query, "contact_email", emailAddress);
    query = applyTextFilter(query, "acumatica_vendor_id", erpVendorId);
    query = applyTextFilter(query, "primary_contact_id", primaryContactId);
    query = applyTextFilter(query, "logo_url", logoUrl);

    if (createdAtFrom) {
      query = query.gte("created_at", `${createdAtFrom}T00:00:00.000Z`);
    }

    if (createdAtTo) {
      query = query.lte("created_at", `${createdAtTo}T23:59:59.999Z`);
    }

    if (updatedAtFrom) {
      query = query.gte("updated_at", `${updatedAtFrom}T00:00:00.000Z`);
    }

    if (updatedAtTo) {
      query = query.lte("updated_at", `${updatedAtTo}T23:59:59.999Z`);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,contact_phone.ilike.%${search}%,contact_email.ilike.%${search}%,acumatica_vendor_id.ilike.%${search}%`,
      );
    }

    const [sortField, sortDirection] = sort.split(":");
    const normalizedSortField = SORT_FIELD_MAP[sortField] ?? "updated_at";

    query = query.order(normalizedSortField, {
      ascending: sortDirection !== "desc",
      nullsFirst: false,
    });

    const from = (page - 1) * per_page;
    const to = from + per_page - 1;
    const hasDerivedCountFilter =
      contactCountMin !== null || projectCountMin !== null;
    if (!hasDerivedCountFilter) {
      query = query.range(from, to);
    }

    const { data: companies, error, count } = await query;

    if (error) {
      return apiErrorResponse(error);
    }

    const companyIds = (companies || []).map((c) => c.id);

    const contactCountMap = new Map<string, number>();
    const projectCountMap = new Map<string, number>();

    if (companyIds.length > 0) {
      const [contactsResult, projectsResult] = await Promise.all([
        supabase.from("people").select("company_id").in("company_id", companyIds),
        supabase.from("project_companies").select("company_id, project_id").in("company_id", companyIds),
      ]);

      for (const row of contactsResult.data || []) {
        if (row.company_id) {
          contactCountMap.set(row.company_id, (contactCountMap.get(row.company_id) || 0) + 1);
        }
      }

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

    const rows = (companies || [])
      .map((company) => ({
      id: company.id,
      project_id: 0,
      company_id: company.id,
      business_phone: company.contact_phone ?? null,
      email_address: company.contact_email ?? null,
      primary_contact_id: company.primary_contact_id ?? null,
      erp_vendor_id: company.acumatica_vendor_id ?? null,
      company_type: company.type ?? null,
      status: company.status ?? null,
      logo_url: company.logo_url ?? null,
      created_at: company.created_at ?? null,
      updated_at: company.updated_at ?? null,
      company_name: company.name ?? null,
      website: company.website ?? null,
      contact_count: contactCountMap.get(company.id) ?? 0,
      project_count: projectCountMap.get(company.id) ?? 0,
      }))
      .filter((company) => {
        if (
          contactCountMin !== null &&
          company.contact_count < contactCountMin
        ) {
          return false;
        }
        if (
          projectCountMin !== null &&
          company.project_count < projectCountMin
        ) {
          return false;
        }
        return true;
      });

    const pagedRows = hasDerivedCountFilter ? rows.slice(from, to + 1) : rows;
    const total = hasDerivedCountFilter ? rows.length : count || 0;
    const total_pages = Math.ceil(total / per_page);

    return NextResponse.json({
      data: pagedRows,
      pagination: {
        page,
        per_page,
        total,
        total_pages,
      },
    });
    },
);
