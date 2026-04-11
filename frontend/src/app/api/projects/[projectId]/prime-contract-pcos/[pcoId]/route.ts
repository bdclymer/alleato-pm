/**
 * ============================================================================
 * PRIME CONTRACT PCO API ROUTE (Single Resource)
 * ============================================================================
 *
 * GET    /api/projects/[projectId]/prime-contract-pcos/[pcoId] - Get PCO detail
 * PATCH  /api/projects/[projectId]/prime-contract-pcos/[pcoId] - Update PCO
 * DELETE /api/projects/[projectId]/prime-contract-pcos/[pcoId] - Delete PCO
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string; pcoId: string }>;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const updatePcoSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["draft", "pending", "approved", "void"]).optional(),
  schedule_impact: z.number().int().optional().nullable(),
  due_date: z.string().optional().nullable(),
  designated_reviewer_id: z.string().uuid().optional().nullable(),
});

// ---------------------------------------------------------------------------
// GET /api/projects/[projectId]/prime-contract-pcos/[pcoId]
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, pcoId } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectIdNum = parseInt(projectId, 10);

    // Get PCO with prime contract info
    const { data: pco, error } = await supabase
      .from("prime_contract_pcos")
      .select(
        `
        *,
        prime_contract:prime_contracts!prime_contract_pcos_prime_contract_id_fkey(
          id,
          contract_number,
          title,
          status
        )
      `,
      )
      .eq("project_id", projectIdNum)
      .eq("id", pcoId)
      .single();

    if (error || !pco) {
      return NextResponse.json(
        { error: "Prime contract PCO not found" },
        { status: 404 },
      );
    }

    // Get line items
    const { data: lineItems } = await supabase
      .from("pco_line_items")
      .select(
        `
        *,
        change_event:change_events!pco_line_items_change_event_id_fkey(
          id,
          number,
          title
        )
      `,
      )
      .eq("pco_id", pcoId)
      .eq("pco_type", "prime")
      .order("sort_order", { ascending: true });

    // Get linked change events
    const { data: changeEventLinks } = await supabase
      .from("change_event_pco_links")
      .select(
        `
        *,
        change_event:change_events!change_event_pco_links_change_event_id_fkey(
          id,
          number,
          title,
          status,
          scope,
          type
        )
      `,
      )
      .eq("pco_id", pcoId)
      .eq("pco_type", "prime");

    // Compute totals from line items
    const items = lineItems || [];
    const totalAmount = items.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );

    const response = {
      ...pco,
      line_items: items,
      line_items_count: items.length,
      calculated_amount: pco.total_amount ?? totalAmount,
      change_event_links: changeEventLinks || [],
      _links: {
        self: `/api/projects/${projectId}/prime-contract-pcos/${pcoId}`,
        promote: `/api/projects/${projectId}/prime-contract-pcos/${pcoId}/promote`,
        lineItems: `/api/projects/${projectId}/prime-contract-pcos/${pcoId}/line-items`,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/projects/[projectId]/prime-contract-pcos/[pcoId]
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, pcoId } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectIdNum = parseInt(projectId, 10);
    const body = await request.json();
    const validatedData = updatePcoSchema.parse(body);

    // Get existing PCO
    const { data: existingPco, error: fetchError } = await supabase
      .from("prime_contract_pcos")
      .select("*")
      .eq("project_id", projectIdNum)
      .eq("id", pcoId)
      .single();

    if (fetchError || !existingPco) {
      return NextResponse.json(
        { error: "Prime contract PCO not found" },
        { status: 404 },
      );
    }

    // Only allow updates if status is draft or pending
    if (existingPco.status !== "draft" && existingPco.status !== "pending") {
      return NextResponse.json(
        {
          error: "Cannot update PCO",
          details:
            "Only PCOs with status 'draft' or 'pending' can be updated",
        },
        { status: 409 },
      );
    }

    // Build update payload
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (validatedData.title !== undefined) updates.title = validatedData.title;
    if (validatedData.description !== undefined)
      updates.description = validatedData.description;
    if (validatedData.status !== undefined) updates.status = validatedData.status;
    if (validatedData.schedule_impact !== undefined)
      updates.schedule_impact = validatedData.schedule_impact;
    if (validatedData.due_date !== undefined)
      updates.due_date = validatedData.due_date;
    if (validatedData.designated_reviewer_id !== undefined)
      updates.designated_reviewer_id = validatedData.designated_reviewer_id;

    // Update
    const { data, error } = await supabase
      .from("prime_contract_pcos")
      .update(updates)
      .eq("id", pcoId)
      .select(
        `
        *,
        prime_contract:prime_contracts!prime_contract_pcos_prime_contract_id_fkey(
          id,
          contract_number,
          title
        )
      `,
      )
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }
    return apiErrorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/projects/[projectId]/prime-contract-pcos/[pcoId]
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, pcoId } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectIdNum = parseInt(projectId, 10);

    // Get existing PCO
    const { data: existingPco, error: fetchError } = await supabase
      .from("prime_contract_pcos")
      .select("id, status")
      .eq("project_id", projectIdNum)
      .eq("id", pcoId)
      .single();

    if (fetchError || !existingPco) {
      return NextResponse.json(
        { error: "Prime contract PCO not found" },
        { status: 404 },
      );
    }

    // Only allow deletion if status is draft
    if (existingPco.status !== "draft") {
      return NextResponse.json(
        {
          error: "Cannot delete PCO",
          details: "Only PCOs with status 'draft' can be deleted",
        },
        { status: 409 },
      );
    }

    // Delete associated line items first
    await supabase
      .from("pco_line_items")
      .delete()
      .eq("pco_id", pcoId)
      .eq("pco_type", "prime");

    // Delete associated change event links
    await supabase
      .from("change_event_pco_links")
      .delete()
      .eq("pco_id", pcoId)
      .eq("pco_type", "prime");

    // Delete the PCO
    const { error } = await supabase
      .from("prime_contract_pcos")
      .delete()
      .eq("id", pcoId);

    if (error) {
      return apiErrorResponse(error);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
