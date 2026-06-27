import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Company } from "@/app/api/types";
import { z } from "zod";
import { GuardrailError } from "@/lib/guardrails/errors";
import {
  parseJsonBody,
  validateResponseContract,
  withApiGuardrails,
} from "@/lib/guardrails/api";

const CreateCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  website: z.string().optional(),
  license_number: z.string().optional(),
  notes: z.string().optional(),
});

const CompanyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().nullable().optional(),
  license_number: z.string().nullable().optional(),
});

export const GET = withApiGuardrails("/api/companies#GET", async ({ request }) => {
  const supabase = await createClient();
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/companies#GET",
      message: "Unauthorized companies request.",
      status: 401,
      severity: "medium",
    });
  }
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type");
  const search = searchParams.get("search");

  let query = supabase.from("companies").select("*").order("name", { ascending: true });

  if (type) {
    // Allow filtering by multiple types using comma separation
    const types = type.split(",");
    query = query.in("type", types);
  }

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/companies#GET",
      message: "Failed to fetch companies.",
      details: { reason: error.message },
      cause: error,
    });
  }

  const rows = data ?? [];
  const companies: Company[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: (r.type as Company["type"]) ?? "vendor",
    contact_email: r.contact_email ?? undefined,
    contact_phone: r.contact_phone ?? undefined,
    address: r.address ?? undefined,
    tax_id: r.tax_id ?? undefined,
    license_number: r.license_number ?? undefined,
  }));
  validateResponseContract(
    z.array(CompanyResponseSchema),
    companies,
    "/api/companies#GET",
  );
  return NextResponse.json(companies);
});

export const POST = withApiGuardrails("/api/companies#POST", async ({ request }) => {
  const supabase = await createClient();
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/companies#POST",
      message: "Unauthorized company creation request.",
      status: 401,
      severity: "medium",
    });
  }
  const body = await parseJsonBody(
    request,
    CreateCompanySchema,
    "/api/companies#POST",
  );

  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: body.name,
      address: body.address,
      city: body.city,
      state: body.state,
      website: body.website,
      license_number: body.license_number,
      notes: body.notes,
    })
    .select()
    .single();

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/companies#POST",
      message: "Failed to create company.",
      details: { reason: error.message },
      cause: error,
    });
  }

  return NextResponse.json(data, { status: 201 });
});
