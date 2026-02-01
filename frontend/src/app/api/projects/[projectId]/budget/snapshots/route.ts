import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Fetch snapshots
    const { data: snapshots, error: snapshotsError } = await supabase
      .from("budget_snapshots")
      .select(
        `
        id,
        name,
        description,
        snapshot_date,
        total_budget,
        total_costs,
        variance,
        created_by,
        created_at
      `,
      )
      .eq("project_id", parseInt(projectId, 10))
      .order("snapshot_date", { ascending: false });

    if (snapshotsError) {
      return NextResponse.json(
        { error: "Failed to fetch snapshots" },
        { status: 500 },
      );
    }

    // Get current budget state for comparison
    const { data: budgetLines, error: budgetError } = await supabase
      .from("budget_lines")
      .select("original_amount, revised_budget, direct_costs, committed_costs")
      .eq("project_id", parseInt(projectId, 10));

    let currentTotalBudget = 0;
    let currentTotalCosts = 0;

    if (!budgetError && budgetLines) {
      budgetLines.forEach((line) => {
        const revised =
          Number(line.revised_budget) || Number(line.original_amount) || 0;
        const costs =
          (Number(line.direct_costs) || 0) +
          (Number(line.committed_costs) || 0);

        currentTotalBudget += revised;
        currentTotalCosts += costs;
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
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

    // Calculate current budget totals
    const { data: budgetLines, error: budgetError } = await supabase
      .from("budget_lines")
      .select("original_amount, revised_budget, direct_costs, committed_costs")
      .eq("project_id", parseInt(projectId, 10));

    if (budgetError) {
      return NextResponse.json(
        { error: "Failed to fetch budget data" },
        { status: 500 },
      );
    }

    let totalBudget = 0;
    let totalCosts = 0;

    budgetLines?.forEach((line) => {
      const revised =
        Number(line.revised_budget) || Number(line.original_amount) || 0;
      const costs =
        (Number(line.direct_costs) || 0) + (Number(line.committed_costs) || 0);

      totalBudget += revised;
      totalCosts += costs;
    });

    const variance = totalBudget - totalCosts;

    // Create snapshot
    const { data: snapshot, error: insertError } = await supabase
      .from("budget_snapshots")
      .insert({
        project_id: projectId,
        name: name || `Snapshot ${new Date().toLocaleDateString()}`,
        description,
        snapshot_date: new Date().toISOString(),
        total_budget: totalBudget,
        total_costs: totalCosts,
        variance,
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
