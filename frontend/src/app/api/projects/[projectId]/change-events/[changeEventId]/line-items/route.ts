import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createLineItemSchema, updateLineItemSchema } from '../../validation';
import { ZodError } from 'zod';
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{
    projectId: string;
    changeEventId: string;
  }>;
}

/**
 * GET /api/projects/[id]/change-events/[changeEventId]/line-items
 * Returns all line items for a change event
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/change-events/[changeEventId]/line-items#GET",
  async ({ request, params }) => {
  
    const { projectId, changeEventId } = await params;
    const supabase = await createClient();

    // Verify change event exists
    const { data: changeEvent, error: eventError } = await supabase
      .from('change_events')
      .select('id')
      .eq('project_id', parseInt(projectId, 10))
      .eq('id', changeEventId)
      .is('deleted_at', null)
      .single();

    if (eventError || !changeEvent) {
      throw new GuardrailError({
        code: "ROUTE_BINDING_MISSING",
        where: "projects/[projectId]/change-events/[changeEventId]/line-items#GET",
        message: "Change event not found.",
        status: 404,
        severity: "low",
      });
    }

    // Get line items with budget_line details
    const { data: lineItems, error } = await supabase
      .from('change_event_line_items')
      .select(`
        *,
        budget_line:budget_lines!budget_code_id(
          id,
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
      `)
      .eq('change_event_id', changeEventId)
      .order('sort_order', { ascending: true });

    if (error) {
      return apiErrorResponse(error);
    }

    // Batch reverse-map budget_lines.id → project_cost_codes.id
    // vendor_id directly stores companies.id — no remap needed.
    // Done as two bulk queries (not per-item) to avoid N+1.
    const budgetCodeIds = [...new Set(
      (lineItems || []).map(i => i.budget_code_id).filter(Boolean)
    )] as string[];
    const vendorIds = [...new Set(
      (lineItems || []).map(i => i.vendor_id).filter(Boolean)
    )] as string[];

    // budget_lines.id → project_cost_codes.id
    // Join budget_lines to project_cost_codes on (cost_code_id, cost_type_id, project_id)
    const budgetLineToProjectCostCode = new Map<string, string>();
    if (budgetCodeIds.length > 0) {
      const { data: budgetLines } = await supabase
        .from('budget_lines')
        .select('id, cost_code_id, cost_type_id')
        .in('id', budgetCodeIds);

      if (budgetLines && budgetLines.length > 0) {
        const { data: pccs } = await supabase
          .from('project_cost_codes')
          .select('id, cost_code_id, cost_type_id')
          .eq('project_id', parseInt(projectId, 10));

        if (pccs) {
          for (const bl of budgetLines) {
            const match = pccs.find(
              p => p.cost_code_id === bl.cost_code_id && p.cost_type_id === bl.cost_type_id
            );
            if (match) budgetLineToProjectCostCode.set(bl.id, match.id);
          }
        }
      }
    }

    // vendor_id stores companies.id — no remap needed.

    // Batch-fetch commitment names from purchase_orders + subcontracts.
    // commitment_id has no enforced FK so we query both tables by unique IDs.
    const commitmentIds = [...new Set(
      (lineItems || []).map(i => i.commitment_id).filter(Boolean)
    )] as string[];

    const commitmentMap = new Map<
      string,
      {
        id: string;
        contract_number: string | null;
        title: string | null;
        company_name: string | null;
        display_name?: string | null;
      }
    >();
    if (commitmentIds.length > 0) {
      const [{ data: pos }, { data: subs }] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select('id, contract_number, title, contract_company_id')
          .in('id', commitmentIds),
        supabase
          .from('subcontracts')
          .select('id, contract_number, title, contract_company_id')
          .in('id', commitmentIds),
      ]);

      const companyIds = [
        ...new Set(
          [...(pos || []), ...(subs || [])]
            .map((record) => record.contract_company_id)
            .filter((value): value is string => Boolean(value)),
        ),
      ];

      const companyNameById = new Map<string, string | null>();
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);

        for (const company of companies || []) {
          companyNameById.set(company.id, company.name ?? null);
        }
      }

      for (const po of pos || []) {
        commitmentMap.set(po.id, {
          id: po.id,
          contract_number: po.contract_number,
          title: po.title,
          company_name: po.contract_company_id
            ? (companyNameById.get(po.contract_company_id) ?? null)
            : null,
        });
      }

      for (const sub of subs || []) {
        commitmentMap.set(sub.id, {
          id: sub.id,
          contract_number: sub.contract_number,
          title: sub.title,
          company_name: sub.contract_company_id
            ? (companyNameById.get(sub.contract_company_id) ?? null)
            : null,
        });
      }
    }

    // Format response
    const formattedItems = (lineItems || []).map(item => {
      const quantity = item.quantity || 0;
      const unitCost = item.unit_cost || 0;
      const extendedAmount = quantity * unitCost;

      return {
        id: item.id,
        changeEventId: item.change_event_id,
        budgetCodeId: item.budget_code_id,
        projectBudgetCodeId: item.budget_code_id
          ? (budgetLineToProjectCostCode.get(item.budget_code_id) ?? item.budget_code_id)
          : undefined,
        budgetLine: item.budget_line || undefined,
        description: item.description,
        vendorId: item.vendor_id,
        formVendorId: item.vendor_id ?? undefined,
        vendor: item.vendor || undefined,
        contractId: item.contract_id,
        commitmentId: item.commitment_id,
        commitmentType: item.commitment_type,
        commitmentLineItemId: item.commitment_line_item_id,
        commitment: item.commitment_id ? (commitmentMap.get(item.commitment_id) ?? undefined) : undefined,
        quantity: item.quantity,
        unitOfMeasure: item.unit_of_measure,
        unitCost: item.unit_cost,
        extendedAmount: extendedAmount,
        costRom: item.cost_rom,
        revenueRom: item.revenue_rom,
        nonCommittedCost: item.non_committed_cost,
        sortOrder: item.sort_order || 0,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        _links: {
          self: `/api/projects/${projectId}/change-events/${changeEventId}/line-items/${item.id}`,
        },
      };
    });

    return NextResponse.json({
      data: formattedItems,
      _links: {
        self: `/api/projects/${projectId}/change-events/${changeEventId}/line-items`,
        changeEvent: `/api/projects/${projectId}/change-events/${changeEventId}`,
      },
    });
    },
);

/**
 * POST /api/projects/[id]/change-events/[changeEventId]/line-items
 * Creates a new line item for a change event
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/change-events/[changeEventId]/line-items#POST",
  async ({ request, params }) => {
  
    const { projectId, changeEventId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const guard = await requirePermission(projectIdNum, "change_orders", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/change-events/[changeEventId]/line-items#POST", message: "Authentication required." });
    }

    // Validate request body
    const validatedData = createLineItemSchema.parse(body);

    // Verify change event exists and is not closed
    const { data: changeEvent, error: eventError } = await supabase
      .from('change_events')
      .select('id, status')
      .eq('project_id', parseInt(projectId, 10))
      .eq('id', changeEventId)
      .is('deleted_at', null)
      .single();

    if (eventError || !changeEvent) {
      throw new GuardrailError({
        code: "ROUTE_BINDING_MISSING",
        where: "projects/[projectId]/change-events/[changeEventId]/line-items#POST",
        message: "Change event not found.",
        status: 404,
        severity: "low",
      });
    }

    if (changeEvent.status === 'Closed' || changeEvent.status === 'Void') {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/change-events/[changeEventId]/line-items#POST",
        message: `Cannot add line items to a ${changeEvent.status.toLowerCase()} change event.`,
        status: 409,
        severity: "low",
      });
    }

    // Resolve budgetCodeId: could be budget_lines.id OR project_cost_codes.id
    let resolvedBudgetCodeId: string | null = validatedData.budgetCodeId ?? null;
    if (validatedData.budgetCodeId) {
      // First try budget_lines directly
      const { data: budgetLine } = await supabase
        .from('budget_lines')
        .select('id, project_id')
        .eq('id', validatedData.budgetCodeId)
        .single();

      if (budgetLine) {
        if (budgetLine.project_id !== parseInt(projectId, 10)) {
          throw new GuardrailError({
            code: "INVALID_PAYLOAD",
            where: "projects/[projectId]/change-events/[changeEventId]/line-items#POST",
            message: "Budget code does not belong to this project.",
            status: 400,
            severity: "low",
          });
        }
      } else {
        // Not a budget_lines ID — try project_cost_codes and find matching budget_line
        const { data: pcc } = await supabase
          .from('project_cost_codes')
          .select('id, cost_code_id, cost_type_id')
          .eq('id', validatedData.budgetCodeId)
          .single();

        if (pcc) {
          if (!pcc.cost_type_id) {
            throw new GuardrailError({
              code: "INVALID_PAYLOAD",
              where: "projects/[projectId]/change-events/[changeEventId]/line-items#POST",
              message: `Project cost code ${validatedData.budgetCodeId} has no cost_type_id; cannot resolve budget line.`,
            });
          }
          const pccCostTypeId: string = pcc.cost_type_id;
          const { data: matchingBudgetLine } = await supabase
            .from('budget_lines')
            .select('id')
            .eq('project_id', parseInt(projectId, 10))
            .eq('cost_code_id', pcc.cost_code_id)
            .eq('cost_type_id', pccCostTypeId)
            .single();

          if (matchingBudgetLine) {
            resolvedBudgetCodeId = matchingBudgetLine.id;
          } else {
            // Cost code exists but has no budget line — auto-create one
            const { data: newBudgetLine, error: createError } = await supabase
              .from('budget_lines')
              .insert({
                project_id: parseInt(projectId, 10),
                cost_code_id: pcc.cost_code_id,
                cost_type_id: pccCostTypeId,
              })
              .select('id')
              .single();

            if (newBudgetLine) {
              resolvedBudgetCodeId = newBudgetLine.id;
            } else {
              console.error(
                `[line-items POST] Failed to auto-create budget_line for project_cost_code ${validatedData.budgetCodeId}:`,
                createError?.message,
              );
              throw new GuardrailError({
                code: "INVALID_PAYLOAD",
                where: "projects/[projectId]/change-events/[changeEventId]/line-items#POST",
                message: "Failed to resolve budget code.",
                status: 400,
                severity: "low",
                details: {
                  reason: `Could not create budget line for cost code. ${createError?.message || ""}`,
                },
                cause: createError ?? undefined,
              });
            }
          }
        } else {
          throw new GuardrailError({
            code: "INVALID_PAYLOAD",
            where: "projects/[projectId]/change-events/[changeEventId]/line-items#POST",
            message: `Invalid budget code: ID ${validatedData.budgetCodeId} not found in budget_lines or project_cost_codes.`,
            status: 400,
            severity: "low",
          });
        }
      }
    }

    // vendor_id FK targets companies(id) directly — store as-is.
    const resolvedVendorId = validatedData.vendorId;

    // Calculate extended amount for cost_rom if not provided
    const quantity = validatedData.quantity || 0;
    const unitCost = validatedData.unitCost || 0;
    const extendedAmount = quantity * unitCost;

    // Create the line item
    const { data, error } = await supabase
      .from('change_event_line_items')
      .insert({
        change_event_id: changeEventId,
        budget_code_id: resolvedBudgetCodeId || undefined,
        description: validatedData.description,
        vendor_id: resolvedVendorId || undefined,
        // SENSITIVE: this writes a contract foreign key; preserve UUID exactly.
        contract_id: validatedData.contractId || undefined,
        commitment_id: validatedData.commitmentId || undefined,
        commitment_type: validatedData.commitmentType || undefined,
        commitment_line_item_id: validatedData.commitmentLineItemId || undefined,
        quantity: validatedData.quantity || undefined,
        unit_of_measure: validatedData.unitOfMeasure || undefined,
        unit_cost: validatedData.unitCost || undefined,
        cost_rom: validatedData.costRom !== undefined ? validatedData.costRom : extendedAmount,
        revenue_rom: validatedData.revenueRom || undefined,
        non_committed_cost: validatedData.nonCommittedCost || undefined,
        sort_order: validatedData.sortOrder,
      })
      .select(`
        *,
        budget_line:budget_lines!budget_code_id(
          id,
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
      `)
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    // Update change event modification timestamp
    await supabase
      .from('change_events')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', changeEventId);

    // Format response
    const response = {
      id: data.id,
      changeEventId: data.change_event_id,
      budgetCodeId: data.budget_code_id,
      budgetLine: data.budget_line || undefined,
      description: data.description,
      vendorId: data.vendor_id,
      vendor: data.vendor || undefined,
      contractId: data.contract_id,
      quantity: data.quantity,
      unitOfMeasure: data.unit_of_measure,
      unitCost: data.unit_cost,
      extendedAmount: extendedAmount,
      costRom: data.cost_rom,
      revenueRom: data.revenue_rom,
      nonCommittedCost: data.non_committed_cost,
      sortOrder: data.sort_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      _links: {
        self: `/api/projects/${projectId}/change-events/${changeEventId}/line-items/${data.id}`,
        changeEvent: `/api/projects/${projectId}/change-events/${changeEventId}`,
      },
    };

    return NextResponse.json(response, { status: 201 });
    },
);

/**
 * PUT /api/projects/[id]/change-events/[changeEventId]/line-items
 * Bulk update line items (for reordering)
 */
export const PUT = withApiGuardrails(
  "projects/[projectId]/change-events/[changeEventId]/line-items#PUT",
  async ({ request, params }) => {
  
    const { projectId, changeEventId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const guard = await requirePermission(projectIdNum, "change_orders", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/change-events/[changeEventId]/line-items#PUT", message: "Authentication required." });
    }

    // Verify change event exists
    const { data: changeEvent, error: eventError } = await supabase
      .from('change_events')
      .select('id, status')
      .eq('project_id', parseInt(projectId, 10))
      .eq('id', changeEventId)
      .is('deleted_at', null)
      .single();

    if (eventError || !changeEvent) {
      throw new GuardrailError({
        code: "ROUTE_BINDING_MISSING",
        where: "projects/[projectId]/change-events/[changeEventId]/line-items#PUT",
        message: "Change event not found.",
        status: 404,
        severity: "low",
      });
    }

    if (changeEvent.status === 'Closed' || changeEvent.status === 'Void') {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/change-events/[changeEventId]/line-items#PUT",
        message: `Cannot update line items in a ${changeEvent.status.toLowerCase()} change event.`,
        status: 409,
        severity: "low",
      });
    }

    // Expect array of { id, sortOrder }
    if (!Array.isArray(body)) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "projects/[projectId]/change-events/[changeEventId]/line-items#PUT",
        message: "Request body must be an array of line item updates.",
        status: 400,
        severity: "low",
      });
    }

    // Update sort orders
    const updates = body.map(item =>
      supabase
        .from('change_event_line_items')
        .update({ sort_order: item.sortOrder })
        .eq('id', item.id)
        .eq('change_event_id', changeEventId)
    );

    await Promise.all(updates);

    // Update change event modification timestamp
    await supabase
      .from('change_events')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', changeEventId);

    return NextResponse.json({ message: 'Line items reordered successfully' });
    },
);
