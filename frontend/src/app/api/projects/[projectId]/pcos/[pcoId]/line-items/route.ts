/**
 * ============================================================================
 * PCO LINE ITEMS API ROUTE
 * ============================================================================
 *
 * GET    /api/projects/[projectId]/pcos/[pcoId]/line-items - List line items
 * POST   /api/projects/[projectId]/pcos/[pcoId]/line-items - Add line item
 * PATCH  /api/projects/[projectId]/pcos/[pcoId]/line-items - Update line item
 * DELETE /api/projects/[projectId]/pcos/[pcoId]/line-items - Remove line item
 *
 * Schema: pco_line_items table
 * - id, pco_id (bigint), change_event_line_item_id
 * - cost_code, description, quantity, uom, unit_cost
 * - line_amount (generated), line_type, category, subcontractor_id
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ projectId: string; pcoId: string }>;
}

/**
 * GET - List all line items for a PCO
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, pcoId } = await params;
    const numericPcoId = parseInt(pcoId, 10);

    if (isNaN(numericPcoId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("pco_line_items")
      .select("*")
      .eq("pco_id", numericPcoId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Failed to fetch PCO line items:", error);
      return NextResponse.json(
        { error: "Failed to fetch line items", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("PCO line items list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - Add a line item to a PCO
 * Body: { cost_code?, description, quantity?, uom?, unit_cost?, line_type?, category?, subcontractor_id?, change_event_line_item_id? }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, pcoId } = await params;
    const numericProjectId = parseInt(projectId, 10);
    const numericPcoId = parseInt(pcoId, 10);

    if (isNaN(numericProjectId) || isNaN(numericPcoId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify PCO exists
    const { data: pco, error: pcoError } = await supabase
      .from("potential_change_orders")
      .select("id, title")
      .eq("id", numericPcoId)
      .eq("project_id", numericProjectId)
      .single();

    if (pcoError || !pco) {
      return NextResponse.json(
        { error: "PCO not found" },
        { status: 404 }
      );
    }

    if (!body.description || typeof body.description !== "string") {
      return NextResponse.json(
        { error: "Validation error", details: "description is required" },
        { status: 400 }
      );
    }

    const insertData: Record<string, any> = {
      pco_id: numericPcoId,
      description: body.description,
      cost_code: body.cost_code || null,
      quantity: body.quantity ?? null,
      uom: body.uom || null,
      unit_cost: body.unit_cost ?? null,
      line_type: body.line_type || null,
      category: body.category || null,
      subcontractor_id: body.subcontractor_id || null,
      change_event_line_item_id: body.change_event_line_item_id || null,
    };

    const { data, error } = await supabase
      .from("pco_line_items")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Failed to add PCO line item:", error);
      return NextResponse.json(
        { error: "Failed to add line item", details: error.message },
        { status: 400 }
      );
    }

    // Write timeline event
    await supabase.from("timeline_events").insert({
      project_id: numericProjectId,
      parent_type: "PCO",
      parent_id: numericPcoId.toString(),
      event_type: "UPDATED",
      actor_id: user.id,
      summary: `Line item added: "${body.description}"`,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("PCO add line item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update a line item
 * Body: { id (required), ...fields to update }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, pcoId } = await params;
    const numericProjectId = parseInt(projectId, 10);
    const numericPcoId = parseInt(pcoId, 10);

    if (isNaN(numericProjectId) || isNaN(numericPcoId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!body.id) {
      return NextResponse.json(
        { error: "Validation error", details: "id is required" },
        { status: 400 }
      );
    }

    // Verify line item belongs to this PCO
    const { data: existing, error: fetchError } = await supabase
      .from("pco_line_items")
      .select("id")
      .eq("id", body.id)
      .eq("pco_id", numericPcoId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Line item not found in this PCO" },
        { status: 404 }
      );
    }

    const allowedFields = [
      "cost_code",
      "description",
      "quantity",
      "uom",
      "unit_cost",
      "line_type",
      "category",
      "subcontractor_id",
      "change_event_line_item_id",
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("pco_line_items")
      .update(updates)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update PCO line item:", error);
      return NextResponse.json(
        { error: "Failed to update line item", details: error.message },
        { status: 400 }
      );
    }

    // Write timeline event
    await supabase.from("timeline_events").insert({
      project_id: numericProjectId,
      parent_type: "PCO",
      parent_id: numericPcoId.toString(),
      event_type: "UPDATED",
      actor_id: user.id,
      summary: `Line item updated: ${Object.keys(updates).join(", ")}`,
      metadata: { line_item_id: body.id },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("PCO update line item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a line item from a PCO
 * Body: { lineItemId: number }
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, pcoId } = await params;
    const numericProjectId = parseInt(projectId, 10);
    const numericPcoId = parseInt(pcoId, 10);

    if (isNaN(numericProjectId) || isNaN(numericPcoId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!body.lineItemId) {
      return NextResponse.json(
        { error: "Validation error", details: "lineItemId is required" },
        { status: 400 }
      );
    }

    // Delete and return the deleted item for confirmation
    const { data, error } = await supabase
      .from("pco_line_items")
      .delete()
      .eq("id", body.lineItemId)
      .eq("pco_id", numericPcoId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Line item not found in this PCO" },
        { status: 404 }
      );
    }

    // Write timeline event
    await supabase.from("timeline_events").insert({
      project_id: numericProjectId,
      parent_type: "PCO",
      parent_id: numericPcoId.toString(),
      event_type: "UPDATED",
      actor_id: user.id,
      summary: `Line item removed: "${data.description || "unnamed"}"`,
      metadata: { line_item_id: body.lineItemId },
      created_at: new Date().toISOString(),
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("PCO delete line item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
