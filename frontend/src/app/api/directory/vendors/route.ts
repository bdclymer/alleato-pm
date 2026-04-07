import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import type { Database } from "@/types/database.types";

type VendorRow = Database["public"]["Tables"]["vendors"]["Row"];

const SORTABLE_FIELDS = new Set<keyof VendorRow>([
  "name",
  "legal_name",
  "contact_name",
  "contact_email",
  "contact_phone",
  "city",
  "state",
  "vendor_class",
  "payment_method",
  "acumatica_vendor_id",
  "created_at",
  "updated_at",
  "is_active",
]);

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
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(
      Math.max(1, Number.parseInt(searchParams.get("per_page") || "50", 10)),
      150,
    );
    const search = (searchParams.get("search") || "").trim();
    const active = searchParams.get("is_active");
    const vendorClass = (searchParams.get("vendor_class") || "").trim();
    const paymentMethod = (searchParams.get("payment_method") || "").trim();
    const sortFieldParam = (searchParams.get("sort") || "name") as keyof VendorRow;
    const sortDir = searchParams.get("sort_dir") === "desc" ? "desc" : "asc";
    const sortField = SORTABLE_FIELDS.has(sortFieldParam) ? sortFieldParam : "name";

    let query = supabase.from("vendors").select("*", { count: "exact" });

    if (active === "true") {
      query = query.eq("is_active", true);
    } else if (active === "false") {
      query = query.eq("is_active", false);
    }

    if (vendorClass) {
      query = query.eq("vendor_class", vendorClass);
    }

    if (paymentMethod) {
      query = query.eq("payment_method", paymentMethod);
    }

    if (search) {
      const escaped = search.replace(/[%_,]/g, "\\$&");
      query = query.or(
        [
          `name.ilike.%${escaped}%`,
          `legal_name.ilike.%${escaped}%`,
          `contact_name.ilike.%${escaped}%`,
          `contact_email.ilike.%${escaped}%`,
          `contact_phone.ilike.%${escaped}%`,
          `city.ilike.%${escaped}%`,
          `state.ilike.%${escaped}%`,
          `address.ilike.%${escaped}%`,
          `zip_code.ilike.%${escaped}%`,
          `vendor_class.ilike.%${escaped}%`,
          `payment_method.ilike.%${escaped}%`,
          `terms.ilike.%${escaped}%`,
          `tax_id.ilike.%${escaped}%`,
          `acumatica_vendor_id.ilike.%${escaped}%`,
        ].join(","),
      );
    }

    query = query.order(sortField, { ascending: sortDir === "asc", nullsFirst: false });

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return apiErrorResponse(error);
    }

    const total = count || 0;

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.max(1, Math.ceil(total / perPage)),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
