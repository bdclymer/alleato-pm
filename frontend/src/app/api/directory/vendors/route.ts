import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const GET = withApiGuardrails(
  "directory/vendors#GET",
  async ({ request }) => {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = Math.min(parseInt(searchParams.get("per_page") ?? "50"), 150);
  const search = searchParams.get("search") ?? "";
  const isActive = searchParams.get("is_active");
  const vendorClass = searchParams.get("vendor_class");
  const paymentMethod = searchParams.get("payment_method");
  const sortBy = searchParams.get("sort_by") ?? "name";
  const sortOrder = searchParams.get("sort_order") !== "desc";

  const offset = (page - 1) * perPage;

  const searchableColumns = [
    "name", "legal_name", "contact_name", "contact_email", "contact_phone",
    "city", "state", "address", "zip_code", "vendor_class", "payment_method",
    "terms", "tax_id", "acumatica_vendor_id",
  ];

  let query = supabase
    .from("companies")
    .select("*", { count: "exact" })
    .eq("is_vendor", true);

  if (search) {
    query = query.or(searchableColumns.map((col) => `${col}.ilike.%${search}%`).join(","));
  }

  if (isActive !== null && isActive !== "") {
    query = query.eq("status", isActive === "true" ? "active" : "inactive");
  }
  if (vendorClass) {
    query = query.eq("vendor_class", vendorClass);
  }
  if (paymentMethod) {
    query = query.eq("payment_method", paymentMethod);
  }

  query = query.order(sortBy, { ascending: sortOrder }).range(offset, offset + perPage - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      per_page: perPage,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / perPage),
    },
  });
  },
);
