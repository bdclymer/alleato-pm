import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json(
        { success: false, error_code: "AUTH_EXPIRED", error_message: "Unauthorized" },
        { status: 401 },
      );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimate_gc_templates")
    .select("template_id, name, items, created_at")
    .order("created_at", { ascending: false });

  if (error) return apiErrorResponse(error);
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getApiRouteUser();

  const body = (await request.json()) as { name: string; items: unknown[] };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("estimate_gc_templates")
    .insert({ name: body.name.trim(), items: body.items as Json, created_by: user?.id ?? null })
    .select()
    .single();

  if (error) return apiErrorResponse(error);
  return NextResponse.json(data, { status: 201 });
}
