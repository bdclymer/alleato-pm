import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

interface SnapshotsParams {
  params: Promise<{
    projectId: string;
  }>;
}

/**
 * GET /api/projects/[id]/budget/snapshots
 *
 * Fetches budget snapshots (point-in-time captures)
 */
export async function GET(request: NextRequest, { params }: SnapshotsParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch snapshots — totals are stored in the grand_totals JSON column
    const { data: rawSnapshots, error: snapshotsError } = await supabase
      .from("budget_snapshots")
      .select("id, name, description, grand_totals, created_by, created_at")
      .eq("project_id", parseInt(projectId, 10))
      .order("created_at", { ascending: false });

    if (snapshotsError) {
      return NextResponse.json(
        { error: "Failed to fetch snapshots" },
        { status: 500 },
      );
    }

    // Flatten grand_totals JSON into the shape the UI expects
    const snapshots = (rawSnapshots || []).map((s) => {
      const totals = (s.grand_totals as Record<string, unknown>) ?? {};
      return {
        id: s.id,
        name: s.name,
        description: s.description,
        snapshot_date: (totals.snapshot_date as string) ?? s.created_at,
        total_budget: Number(totals.total_budget ?? 0),
        total_costs: Number(totals.total_costs ?? 0),
        variance: Number(totals.variance ?? 0),
        created_by: s.created_by,
        created_at: s.created_at,
      };
    });

    // Get current budget state for comparison (only original_amount exists on base table)
    const { data: budgetLines, error: budgetError } = await supabase
      .from("budget_lines")
      .select("original_amount")
      .eq("project_id", parseInt(projectId, 10));

    let currentTotalBudget = 0;
    const currentTotalCosts = 0;

    if (!budgetError && budgetLines) {
      budgetLines.forEach((line) => {
        currentTotalBudget += Number(line.original_amount) || 0;
      });
    }

    const currentVariance = currentTotalBudget - currentTotalCosts;

    return NextResponse.json({
      snapshots: snapshots || [],
      current: {
        totalBudget: currentTotalBudget,
        totalCosts: currentTotalCosts,
        variance: currentVariance,
        snapshotDate: new Date().toISOString(),
      },
      count: snapshots?.length || 0,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/projects/[id]/budget/snapshots
 *
 * Creates a new budget snapshot
 */
export async function POST(request: NextRequest, { params }: SnapshotsParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    // Calculate current budget totals from base table columns only
    const { data: budgetLines, error: budgetError } = await supabase
      .from("budget_lines")
      .select("original_amount")
      .eq("project_id", parseInt(projectId, 10));

    if (budgetError) {
      return NextResponse.json(
        { error: "Failed to fetch budget data" },
        { status: 500 },
      );
    }

    let totalBudget = 0;
    const totalCosts = 0;

    budgetLines?.forEach((line) => {
      totalBudget += Number(line.original_amount) || 0;
    });

    const variance = totalBudget - totalCosts;

    // Create snapshot
    const { data: snapshot, error: insertError } = await supabase
      .from("budget_snapshots")
      .insert({
        project_id: parseInt(projectId, 10),
        name: name || `Snapshot ${new Date().toLocaleDateString()}`,
        description,
        grand_totals: {
          snapshot_date: new Date().toISOString(),
          total_budget: totalBudget,
          total_costs: totalCosts,
          variance,
        },
        line_items: budgetLines ?? [],
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create snapshot" },
        { status: 500 },
      );
    }

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
