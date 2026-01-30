import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { updateChangeEventSchema } from "../validation";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ projectId: string; changeEventId: string }>;
}

/**
 * GET /api/projects/[id]/change-events/[changeEventId]
 * Returns a single change event with full details including line items, attachments, and history
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeEventId } = await params;
    const supabase = await createClient();

    // Get change event with related data
    const { data: changeEvent, error } = await supabase
      .from("change_events")
      .select(
        `
        *,
        change_event_line_items(
          id,
          description,
          budget_code_id,
          quantity,
          unit_of_measure,
          unit_cost,
          revenue_rom,
          cost_rom,
          non_committed_cost,
          vendor_id,
          contract_id,
          sort_order,
          created_at,
          updated_at
        ),
        change_event_history(
          id,
          field_name,
          old_value,
          new_value,
          change_type,
          changed_at,
          changed_by
        )
      `,
      )
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", changeEventId)
      .is("deleted_at", null)
      .single();

    if (error || !changeEvent) {
      return NextResponse.json(
        { error: "Change event not found" },
        { status: 404 },
      );
    }

    // Calculate totals from line items
    const lineItems = changeEvent.change_event_line_items || [];
    const totals = {
      revenueRom: lineItems
        .reduce((sum: number, item: any) => sum + (item.revenue_rom || 0), 0)
        .toFixed(2),
      costRom: lineItems
        .reduce((sum: number, item: any) => sum + (item.cost_rom || 0), 0)
        .toFixed(2),
      nonCommittedCost: lineItems
        .reduce(
          (sum: number, item: any) => sum + (item.non_committed_cost || 0),
          0,
        )
        .toFixed(2),
      lineItemsCount: lineItems.length,
    };

    // Get creator info
    const { data: creator } = await supabase
      .from("people")
      .select("id, email, first_name, last_name")
      .eq("id", changeEvent.created_by)
      .single();

    // Format response
    const response = {
      id: changeEvent.id,
      number: changeEvent.number,
      title: changeEvent.title,
      type: changeEvent.type,
      reason: changeEvent.reason,
      scope: changeEvent.scope,
      status: changeEvent.status,
      origin: changeEvent.origin,
      description: changeEvent.description,
      expectingRevenue: changeEvent.expecting_revenue,
      lineItemRevenueSource: changeEvent.line_item_revenue_source,
      primeContractId: changeEvent.prime_contract_id,
      totals,
      lineItems: lineItems.map((item: any) => ({
        id: item.id,
        description: item.description,
        budgetCodeId: item.budget_code_id,
        quantity: item.quantity,
        unitOfMeasure: item.unit_of_measure,
        unitCost: item.unit_cost,
        revenueRom: item.revenue_rom,
        costRom: item.cost_rom,
        nonCommittedCost: item.non_committed_cost,
        vendorId: item.vendor_id,
        contractId: item.contract_id,
        sortOrder: item.sort_order,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
      history: (changeEvent.change_event_history || []).map((entry: any) => ({
        id: entry.id,
        fieldName: entry.field_name,
        oldValue: entry.old_value,
        newValue: entry.new_value,
        changeType: entry.change_type,
        changedAt: entry.changed_at,
        changedBy: entry.changed_by,
      })),
      createdAt: changeEvent.created_at,
      createdBy: creator,
      updatedAt: changeEvent.updated_at,
      _links: {
        self: `/api/projects/${projectId}/change-events/${changeEventId}`,
        edit: `/api/projects/${projectId}/change-events/${changeEventId}`,
        delete: `/api/projects/${projectId}/change-events/${changeEventId}`,
        lineItems: `/api/projects/${projectId}/change-events/${changeEventId}/line-items`,
        attachments: `/api/projects/${projectId}/change-events/${changeEventId}/attachments`,
        history: `/api/projects/${projectId}/change-events/${changeEventId}/history`,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/projects/[id]/change-events/[changeEventId]
 * Updates a change event (partial update)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeEventId } = await params;
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

    // Validate request body
    const validatedData = updateChangeEventSchema.parse(body);

    // Get existing change event
    const { data: existingEvent, error: fetchError } = await supabase
      .from("change_events")
      .select("*")
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", changeEventId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { error: "Change event not found" },
        { status: 404 },
      );
    }

    // Map validated data to database schema
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (validatedData.title !== undefined) updates.title = validatedData.title;
    if (validatedData.type !== undefined) updates.type = validatedData.type;
    if (validatedData.reason !== undefined)
      updates.reason = validatedData.reason;
    if (validatedData.scope !== undefined) updates.scope = validatedData.scope;
    if (validatedData.description !== undefined)
      updates.description = validatedData.description;
    if (validatedData.status !== undefined)
      updates.status = validatedData.status;
    if (validatedData.expectingRevenue !== undefined)
      updates.expecting_revenue = validatedData.expectingRevenue;
    if (validatedData.lineItemRevenueSource !== undefined)
      updates.line_item_revenue_source = validatedData.lineItemRevenueSource;
    if (validatedData.primeContractId !== undefined)
      updates.prime_contract_id = validatedData.primeContractId;

    // Update the change event
    const { data, error } = await supabase
      .from("change_events")
      .update(updates)
      .eq("id", changeEventId)
      .select(
        `
        *,
        change_event_line_items(
          id,
          description,
          budget_code_id,
          quantity,
          unit_of_measure,
          unit_cost,
          revenue_rom,
          cost_rom,
          non_committed_cost,
          vendor_id,
          contract_id,
          sort_order,
          created_at,
          updated_at
        )
      `,
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update change event", details: error.message },
        { status: 400 },
      );
    }

    // Create audit log entries for changed fields
    const auditEntries = [];
    for (const [field, newValue] of Object.entries(updates)) {
      if (
        field !== "updated_at" &&
        field !== "updated_by" &&
        existingEvent[field] !== newValue
      ) {
        auditEntries.push({
          change_event_id: changeEventId,
          field_name: field,
          old_value: existingEvent[field]?.toString() || null,
          new_value: newValue?.toString() || null,
          changed_by: user.id,
          change_type: "UPDATE",
        });
      }
    }

    if (auditEntries.length > 0) {
      await supabase.from("change_event_history").insert(auditEntries);
    }

    // Format response
    const response = {
      id: data.id,
      number: data.number,
      title: data.title,
      type: data.type,
      reason: data.reason,
      scope: data.scope,
      status: data.status,
      origin: data.origin,
      description: data.description,
      expectingRevenue: data.expecting_revenue,
      lineItemRevenueSource: data.line_item_revenue_source,
      primeContractId: data.prime_contract_id,
      updatedAt: data.updated_at,
      updatedBy: {
        id: user.id,
        email: user.email,
      },
      lineItems: (data.change_event_line_items || []).map((item: any) => ({
        id: item.id,
        description: item.description,
        budgetCodeId: item.budget_code_id,
        quantity: item.quantity,
        unitOfMeasure: item.unit_of_measure,
        unitCost: item.unit_cost,
        revenueRom: item.revenue_rom,
        costRom: item.cost_rom,
        nonCommittedCost: item.non_committed_cost,
        vendorId: item.vendor_id,
        contractId: item.contract_id,
        sortOrder: item.sort_order,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
      _links: {
        self: `/api/projects/${projectId}/change-events/${changeEventId}`,
      },
    };

    return NextResponse.json(response);
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/projects/[id]/change-events/[changeEventId]
 * Soft deletes a change event by setting deleted_at timestamp
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeEventId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if change event exists
    const { data: existingEvent, error: fetchError } = await supabase
      .from("change_events")
      .select("id, status, deleted_at")
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", changeEventId)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { error: "Change event not found" },
        { status: 404 },
      );
    }

    // Check if already deleted
    if (existingEvent.deleted_at) {
      return NextResponse.json(
        { error: "Change event already deleted" },
        { status: 400 },
      );
    }

    // Check if event can be deleted (only Open or Void status)
    if (existingEvent.status !== "Open" && existingEvent.status !== "Void") {
      return NextResponse.json(
        {
          error: "Cannot delete change event",
          details:
            "Only change events with status Open or Void can be deleted",
        },
        { status: 409 },
      );
    }

    // Soft delete the change event
    const { error } = await supabase
      .from("change_events")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", changeEventId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete change event", details: error.message },
        { status: 400 },
      );
    }

    // Create audit log entry
    await supabase.from("change_event_history").insert({
      change_event_id: changeEventId,
      field_name: "deleted_at",
      old_value: null,
      new_value: new Date().toISOString(),
      changed_by: user.id,
      change_type: "DELETE",
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
