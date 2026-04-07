import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ vendorId: string }> },
) {
  try {
    const { vendorId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", vendorId)
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
