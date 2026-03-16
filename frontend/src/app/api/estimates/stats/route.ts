/**
 * Estimate type stats for the company-level hub page
 * GET /api/estimates/stats
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EstimateService } from "@/lib/services/estimate-service";

export async function GET() {
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

    const service = new EstimateService(supabase);
    const stats = await service.getTypeStats();

    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch estimate stats" },
      { status: 500 }
    );
  }
}
