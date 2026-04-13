import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { type NextRequest, NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

export const GET = withApiGuardrails(
  "directory/project-companies#GET",
  async ({ request }) => {
  
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    // Query companies directly using the type column
    let query = supabase
      .from("companies")
      .select("id, name, website, type, status, contact_phone, contact_email, acumatica_vendor_id, logo_url, created_at, updated_at", { count: "exact" });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (company_type) {
      query = query.ilike("type", company_type);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,contact_phone.ilike.%${search}%,contact_email.ilike.%${search}%,acumatica_vendor_id.ilike.%${search}%`,
      );
    }

    const [sortField, sortDirection] = sort.split(":");
    const allowedSortFields = new Set([
      "name",
      "type",
      "status",
      "business_phone",
      "email_address",
      "created_at",
      "updated_at",
    ]);
    const normalizedSortField = allowedSortFields.has(sortField) ? sortField : "updated_at";

    query = query.order(normalizedSortField, {
      ascending: sortDirection !== "desc",
      nullsFirst: false,
    });

    const from = (page - 1) * per_page;
    const to = from + per_page - 1;
    query = query.range(from, to);

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

    const rows = (companies || []).map((company) => ({
      id: company.id,
      project_id: 0,
      company_id: company.id,
      business_phone: company.contact_phone ?? null,
      email_address: company.contact_email ?? null,
      primary_contact_id: null,
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
    }));

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
    },
);
