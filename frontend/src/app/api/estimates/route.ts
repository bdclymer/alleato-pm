/**
 * Company-level estimates API — cross-project list
 * GET /api/estimates?type=asrs|design_build|all
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EstimateService } from "@/lib/services/estimate-service";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const estimateType = searchParams.get("type") ?? "all";

    const service = new EstimateService(supabase);
    const data = await service.listAll(estimateType === "all" ? null : estimateType);

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch estimates" },
      { status: 500 }
    );
  }
}
