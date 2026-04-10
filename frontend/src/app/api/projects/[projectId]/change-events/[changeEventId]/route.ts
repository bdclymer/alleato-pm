import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { updateChangeEventSchema } from "../validation";
import { ZodError } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; changeEventId: string }>;
}

interface VerticalMarkupRow {
  percentage: number | null;
  calculation_order: number | null;
  compound: boolean | null;
}

function computeMarkupAdditions(
  baseCost: number,
  baseRevenue: number,
  markups: VerticalMarkupRow[],
): { cost: number; revenue: number } {
  if (markups.length === 0) {
    return { cost: 0, revenue: 0 };
  }

  const sortedMarkups = [...markups].sort(
    (a, b) => (a.calculation_order ?? 0) - (b.calculation_order ?? 0),
  );

  let runningCostBase = baseCost;
  let runningRevenueBase = baseRevenue;
  let totalCostMarkup = 0;
  let totalRevenueMarkup = 0;

  for (const markup of sortedMarkups) {
    const percentage = Number(markup.percentage || 0);
    if (!Number.isFinite(percentage) || percentage <= 0) {
      continue;
    }

    const rate = percentage / 100;
    const costMarkup = runningCostBase * rate;
    const revenueMarkup = runningRevenueBase * rate;

    totalCostMarkup += costMarkup;
    totalRevenueMarkup += revenueMarkup;

    if (markup.compound) {
      runningCostBase += costMarkup;
      runningRevenueBase += revenueMarkup;
    }
  }

  return {
    cost: totalCostMarkup,
    revenue: totalRevenueMarkup,
  };
}

/**
 * GET /api/projects/[id]/change-events/[changeEventId]
 * Returns a single change event with full details including line items, attachments, and history
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeEventId } = await params;
    const supabase = await createClient();

    // Get change event with related data including budget_line and vendor joins
    const { data: changeEvent, error } = await supabase
      .from("change_events")
      .select(
        `
        *,
        prime_contract:prime_contracts!prime_contract_id(
          id,
          contract_number,
          title
        ),
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
          commitment_id,
          commitment_type,
          commitment_line_item_id,
          sort_order,
          created_at,
          updated_at,
          budget_line:budget_lines!budget_code_id(
            id,
            project_budget_code_id,
            description,
            cost_code:cost_codes!cost_code_id(
              id,
              title,
              division_id,
              division_title
            )
          ),
          vendor:companies!vendor_id(
            id,
            name
          )
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

    // Resolve commitment names for line items
    const lineItems = changeEvent.change_event_line_items || [];
    const commitmentIds = [...new Set(lineItems.filter((li: any) => li.commitment_id).map((li: any) => li.commitment_id))];
    const commitmentMap: Record<string, { contract_number: string; title: string }> = {};

    if (commitmentIds.length > 0) {
      // Check subcontracts
      const { data: subs } = await supabase
        .from("subcontracts")
        .select("id, contract_number, title")
        .in("id", commitmentIds);
      (subs || []).forEach((s: any) => { commitmentMap[s.id] = s; });

      // Check purchase orders for any not found in subcontracts
      const remainingIds = commitmentIds.filter((id: string) => !commitmentMap[id]);
      if (remainingIds.length > 0) {
        const { data: pos } = await supabase
          .from("purchase_orders")
          .select("id, contract_number, title")
          .in("id", remainingIds);
        (pos || []).forEach((p: any) => { commitmentMap[p.id] = p; });
      }
    }

    // Map budget_lines IDs to project_cost_codes IDs for edit form compatibility
    // budget_code_id on line items references budget_lines.id, but the BudgetCodeSelector uses project_cost_codes.id
    const budgetLineIds = [...new Set(lineItems.filter((li: any) => li.budget_code_id).map((li: any) => li.budget_code_id))];
    const budgetLineToProjectCodeMap: Record<string, string> = {};
    if (budgetLineIds.length > 0) {
      // Get budget lines with cost_code_id and cost_type_id
      const { data: budgetLines } = await supabase
        .from("budget_lines")
        .select("id, cost_code_id, cost_type_id")
        .in("id", budgetLineIds);

      if (budgetLines && budgetLines.length > 0) {
        // Get project_cost_codes for this project to match against
        const { data: projectCostCodes } = await supabase
          .from("project_cost_codes")
          .select("id, cost_code_id, cost_type_id")
          .eq("project_id", parseInt(projectId, 10))
          .eq("is_active", true);

        if (projectCostCodes) {
          for (const bl of budgetLines as any[]) {
            const matchingPcc = projectCostCodes.find((pcc: any) =>
              pcc.cost_code_id === bl.cost_code_id && pcc.cost_type_id === bl.cost_type_id
            );
            if (matchingPcc) {
              budgetLineToProjectCodeMap[bl.id] = matchingPcc.id;
            }
          }
        }
      }
    }

    const baseRevenueRom = lineItems.reduce(
      (sum: number, item: any) => sum + (item.revenue_rom || 0),
      0,
    );
    const baseCostRom = lineItems.reduce(
      (sum: number, item: any) => sum + (item.cost_rom || 0),
      0,
    );
    const baseNonCommittedCost = lineItems.reduce(
      (sum: number, item: any) => sum + (item.non_committed_cost || 0),
      0,
    );

    const { data: projectMarkups } = await supabase
      .from("vertical_markup")
      .select("percentage, calculation_order, compound")
      .eq("project_id", parseInt(projectId, 10));

    const applyMarkup = changeEvent.expecting_revenue !== false;
    const markupAdditions = computeMarkupAdditions(
      baseCostRom,
      baseRevenueRom,
      applyMarkup ? ((projectMarkups || []) as VerticalMarkupRow[]) : [],
    );

    // Calculate totals from line items + project financial markup
    const totals = {
      revenueRom: (baseRevenueRom + markupAdditions.revenue).toFixed(2),
      costRom: (baseCostRom + markupAdditions.cost).toFixed(2),
      nonCommittedCost: baseNonCommittedCost.toFixed(2),
      lineItemsCount: lineItems.length,
    };

    // Get creator info via users_auth bridge table
    let creator = null;
    if (changeEvent.created_by) {
      const { data: userAuth } = await supabase
        .from("users_auth")
        .select("person_id")
        .eq("auth_user_id", changeEvent.created_by)
        .single();

      if (userAuth?.person_id) {
        const { data: person } = await supabase
          .from("people")
          .select("id, email, first_name, last_name")
          .eq("id", userAuth.person_id)
          .single();
        creator = person;
      }

      // Fallback: try auth user email if people lookup fails
      if (!creator) {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(changeEvent.created_by);
        if (authUser) {
          creator = { id: authUser.id, email: authUser.email, first_name: null, last_name: null };
        }
      }
    }

    // Format response
    const response = {
      id: changeEvent.id,
      number: changeEvent.number,
      title: changeEvent.title,
      type: changeEvent.type,
      reason: changeEvent.reason,
      scope: changeEvent.scope,
      status: changeEvent.status,
      workflowStage: (changeEvent as any).workflow_stage ?? null,
      origin: changeEvent.origin,
      description: changeEvent.description,
      expectingRevenue: changeEvent.expecting_revenue,
      lineItemRevenueSource: changeEvent.line_item_revenue_source,
      primeContractId: changeEvent.prime_contract_id,
      primeContract: changeEvent.prime_contract || null,
      totals,
      lineItems: lineItems.map((item: any) => {
        const quantity = item.quantity || 0;
        const unitCost = item.unit_cost || 0;
        return {
          id: item.id,
          description: item.description,
          budgetCodeId: item.budget_code_id,
          // projectBudgetCodeId maps budget_lines → project_cost_codes for form selectors
          projectBudgetCodeId: budgetLineToProjectCodeMap[item.budget_code_id] || item.budget_line?.project_budget_code_id || null,
          budgetLine: item.budget_line || null,
          quantity: item.quantity,
          unitOfMeasure: item.unit_of_measure,
          unitCost: item.unit_cost,
          extendedAmount: quantity * unitCost,
          revenueRom: item.revenue_rom,
          costRom: item.cost_rom,
          nonCommittedCost: item.non_committed_cost,
          vendorId: item.vendor_id,
          vendor: item.vendor || null,
          contractId: item.contract_id,
          commitmentId: item.commitment_id,
          commitmentType: item.commitment_type,
          commitmentLineItemId: item.commitment_line_item_id,
          commitment: item.commitment_id ? commitmentMap[item.commitment_id] || null : null,
          sortOrder: item.sort_order,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
      }),
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
    return apiErrorResponse(error);
  }
}

/**
 * PATCH /api/projects/[id]/change-events/[changeEventId]
 * Updates a change event (partial update)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeEventId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const guard = await requirePermission(projectIdNum, "change_orders", "write");
    if (guard.denied) return guard.response;

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
    if (validatedData.origin !== undefined)
      updates.origin = validatedData.origin;
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
          updated_at,
          budget_line:budget_lines!budget_code_id(
            id,
            project_budget_code_id,
            description,
            cost_code:cost_codes!cost_code_id(
              id,
              title,
              division_id,
              division_title
            )
          ),
          vendor:companies!vendor_id(
            id,
            name
          )
        )
      `,
      )
      .single();

    if (error) {
      return apiErrorResponse(error);
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
      lineItems: (data.change_event_line_items || []).map((item: any) => {
        const quantity = item.quantity || 0;
        const unitCost = item.unit_cost || 0;
        return {
          id: item.id,
          description: item.description,
          budgetCodeId: item.budget_code_id,
          budgetLine: item.budget_line || null,
          quantity: item.quantity,
          unitOfMeasure: item.unit_of_measure,
          unitCost: item.unit_cost,
          extendedAmount: quantity * unitCost,
          revenueRom: item.revenue_rom,
          costRom: item.cost_rom,
          nonCommittedCost: item.non_committed_cost,
          vendorId: item.vendor_id,
          vendor: item.vendor || null,
          contractId: item.contract_id,
          sortOrder: item.sort_order,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
      }),
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
    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/projects/[id]/change-events/[changeEventId]
 * Soft deletes a change event by setting deleted_at timestamp
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeEventId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const guard = await requirePermission(projectIdNum, "change_orders", "admin");
    if (guard.denied) return guard.response;

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
      return apiErrorResponse(error);
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
    return apiErrorResponse(error);
  }
}
