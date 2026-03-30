import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncDirectCosts } from "@/lib/acumatica/sync";

/**
 * POST /api/sync/acumatica/direct-costs
 *
 * Pulls Project Transactions (PM3040PL) from Acumatica and upserts them
 * into the direct_costs table for a given project.
 *
 * Body: { projectId: number }
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { projectId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const projectId = body.projectId;
  if (!projectId || typeof projectId !== "number") {
    return NextResponse.json({ error: "projectId (number) is required" }, { status: 400 });
  }

  try {
    const result = await syncDirectCosts(projectId, user.id);

    return NextResponse.json({
      success: true,
      projectId,
      result,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
